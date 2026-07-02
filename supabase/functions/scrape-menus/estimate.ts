// Grounded AI macro-estimation fallback (TASK-024, PRD § Menu Ingestion Tier 2).
// Order of trust: estimate_cache → USDA match picked/portioned by the LLM →
// LLM-only estimate (last resort, low confidence). Items keep null macros if
// OpenRouter isn't configured — honest gaps beat confident guesses.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { chatComplete, openrouterConfigured, parseJsonReply } from '../_shared/openrouter.ts';
import { searchUsda, type UsdaCandidate } from '../_shared/usda.ts';
import type { NormalizedMenuItem } from './adapters/types.ts';

interface Estimate {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
}

export function cacheKey(name: string, serving: string | null): string {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()}|${(serving ?? '').toLowerCase().trim()}`;
}

/** Reconcile macros to known calories via 4/4/9 when the vendor gave calories. */
function reconcileToCalories(est: Estimate, knownCalories: number | null): Estimate {
  if (knownCalories === null || knownCalories <= 0) return est;
  const estKcal = est.protein_g * 4 + est.carbs_g * 4 + est.fat_g * 9;
  if (estKcal <= 0) return { ...est, calories: knownCalories };
  const scale = knownCalories / estKcal;
  return {
    calories: knownCalories,
    protein_g: Math.round(est.protein_g * scale * 10) / 10,
    carbs_g: Math.round(est.carbs_g * scale * 10) / 10,
    fat_g: Math.round(est.fat_g * scale * 10) / 10,
    confidence: est.confidence,
  };
}

async function estimateBatchWithLlm(
  batch: { item: NormalizedMenuItem; candidates: UsdaCandidate[] }[],
): Promise<(Estimate | null)[]> {
  const lines = batch.map((entry, i) => {
    const c = entry.item;
    const cands = entry.candidates
      .filter((x) => x.caloriesPer100g !== null)
      .slice(0, 4)
      .map(
        (x) =>
          `{"desc":"${x.description.slice(0, 60)}","per100g":{"cal":${x.caloriesPer100g},"p":${x.proteinPer100g},"c":${x.carbsPer100g},"f":${x.fatPer100g}}}`,
      )
      .join(', ');
    return `${i}: name="${c.item_name}" serving="${c.serving_size ?? 'unknown'}" knownCalories=${c.calories ?? 'null'} usdaCandidates=[${cands}]`;
  });

  const reply = await chatComplete({
    json: true,
    maxTokens: 3000,
    messages: [
      {
        role: 'system',
        content:
          'You estimate dining-hall menu item macros. For each item: pick the best USDA candidate if one fits, ' +
          'infer a realistic single-serving portion for a college dining hall, and compute macros for that portion. ' +
          'If knownCalories is given, your macros MUST reconcile to it (protein*4 + carbs*4 + fat*9 ≈ knownCalories). ' +
          'If no candidate fits, estimate from the dish name (lower confidence). ' +
          'Reply as JSON: {"estimates":[{"i":<index>,"calories":<int>,"protein_g":<num>,"carbs_g":<num>,"fat_g":<num>,"confidence":<0..1>} ...]}. ' +
          'Confidence: 0.8+ good USDA match; 0.5-0.7 partial; <0.5 name-only guess. Omit items you cannot estimate.',
      },
      { role: 'user', content: lines.join('\n') },
    ],
  });

  const parsed = parseJsonReply<{ estimates: (Estimate & { i: number })[] }>(reply);
  const out: (Estimate | null)[] = batch.map(() => null);
  for (const e of parsed.estimates ?? []) {
    if (
      typeof e.i === 'number' &&
      e.i >= 0 &&
      e.i < batch.length &&
      [e.calories, e.protein_g, e.carbs_g, e.fat_g].every((v) => typeof v === 'number' && v >= 0)
    ) {
      out[e.i] = {
        calories: Math.round(e.calories),
        protein_g: e.protein_g,
        carbs_g: e.carbs_g,
        fat_g: e.fat_g,
        confidence: Math.min(Math.max(e.confidence ?? 0.4, 0), 1),
      };
    }
  }
  return out;
}

/**
 * Fill missing macros in place. Returns count of items estimated.
 * Never throws — estimation failures leave items honest (null macros).
 */
export async function estimateMissingMacros(
  items: NormalizedMenuItem[],
  supabase: SupabaseClient,
): Promise<number> {
  const missing = items.filter(
    (i) => i.protein_g === null || i.carbs_g === null || i.fat_g === null || i.calories === null,
  );
  if (missing.length === 0) return 0;

  let filled = 0;

  // 1. Cache hits
  const keys = missing.map((i) => cacheKey(i.item_name, i.serving_size));
  const { data: cached } = await supabase.from('estimate_cache').select('*').in('cache_key', keys);
  const cacheMap = new Map<string, Estimate>();
  for (const row of cached ?? []) {
    cacheMap.set(row.cache_key, {
      calories: row.calories,
      protein_g: Number(row.protein_g),
      carbs_g: Number(row.carbs_g),
      fat_g: Number(row.fat_g),
      confidence: Number(row.confidence),
    });
  }

  const uncached: NormalizedMenuItem[] = [];
  for (const item of missing) {
    const hit = cacheMap.get(cacheKey(item.item_name, item.serving_size));
    if (hit) {
      applyEstimate(item, reconcileToCalories(hit, item.calories));
      filled++;
    } else {
      uncached.push(item);
    }
  }

  if (uncached.length === 0 || !openrouterConfigured()) return filled;

  // 2. USDA grounding + LLM reconcile, in batches of 15
  for (let start = 0; start < uncached.length; start += 15) {
    const slice = uncached.slice(start, start + 15);
    try {
      const withCandidates = await Promise.all(
        slice.map(async (item) => ({
          item,
          candidates: await searchUsda(item.item_name).catch(() => []),
        })),
      );
      const estimates = await estimateBatchWithLlm(withCandidates);
      const cacheRows: Record<string, unknown>[] = [];
      estimates.forEach((est, i) => {
        if (!est) return;
        const item = slice[i];
        const final = reconcileToCalories(est, item.calories);
        applyEstimate(item, final);
        filled++;
        cacheRows.push({
          cache_key: cacheKey(item.item_name, item.serving_size),
          calories: final.calories,
          protein_g: final.protein_g,
          carbs_g: final.carbs_g,
          fat_g: final.fat_g,
          confidence: final.confidence,
        });
      });
      if (cacheRows.length > 0) {
        await supabase.from('estimate_cache').upsert(cacheRows, { onConflict: 'cache_key' });
      }
    } catch (err) {
      console.error('estimate batch failed (items keep null macros):', err);
    }
  }
  return filled;
}

function applyEstimate(item: NormalizedMenuItem, est: Estimate): void {
  item.calories = est.calories;
  item.protein_g = est.protein_g;
  item.carbs_g = est.carbs_g;
  item.fat_g = est.fat_g;
  item.source = 'estimated';
  item.confidence = est.confidence;
}
