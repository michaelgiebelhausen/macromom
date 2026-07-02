// Shared recommendation engine (TASK-032/033) used by `recommend` (user JWT)
// and `send-daily-push` (service role). Deterministic scoring pre-pass, model
// plate composition, deterministic totals (never trust model math), cached in
// the recommendations table on (user, hall, date, meal).

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { chatComplete, openrouterConfigured, parseJsonReply } from './openrouter.ts';
import { captureException } from './sentry.ts';
import {
  buildFallbackPlates,
  mealTargets,
  plateTotals,
  rankItems,
  type FallbackPlate,
  type Goal,
  type MacroTargetSet,
  type MealPeriodName,
  type ScorableItem,
} from '../recommend/score.ts';

export interface PlateItem {
  id: string;
  name: string;
  station: string | null;
  serving_desc: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  nutrition_source: string;
}

export interface Plate {
  items: PlateItem[];
  totals: { cal: number; protein: number; carbs: number; fat: number };
  why: string;
}

export type RecommendResult =
  | { status: 'ok'; plates: Plate[]; cached: boolean; note?: string }
  | { status: 'no_targets' }
  | { status: 'no_menu' };

const SPARSE_THRESHOLD = 6;

export async function generateRecommendation(
  supabase: SupabaseClient,
  userId: string,
  diningHallId: string,
  date: string,
  mealPeriod: MealPeriodName,
): Promise<RecommendResult> {
  // 1. Cached?
  const { data: cached } = await supabase
    .from('recommendations')
    .select('plates')
    .eq('user_id', userId)
    .eq('dining_hall_id', diningHallId)
    .eq('menu_date', date)
    .eq('meal_period', mealPeriod)
    .maybeSingle();
  if (cached?.plates) {
    return { status: 'ok', plates: cached.plates as Plate[], cached: true };
  }

  // 2. Targets
  const { data: profile } = await supabase
    .from('profiles')
    .select('goal, target_calories, target_protein_g, target_carbs_g, target_fat_g')
    .eq('id', userId)
    .maybeSingle();
  if (
    !profile ||
    !profile.target_calories ||
    !profile.target_protein_g ||
    !profile.target_carbs_g ||
    !profile.target_fat_g
  ) {
    return { status: 'no_targets' };
  }
  const daily: MacroTargetSet = {
    calories: profile.target_calories,
    protein_g: profile.target_protein_g,
    carbs_g: profile.target_carbs_g,
    fat_g: profile.target_fat_g,
  };
  const goal = (profile.goal ?? 'maintain') as Goal;

  // 3. Menu
  const { data: menuDay } = await supabase
    .from('menu_days')
    .select('id')
    .eq('dining_hall_id', diningHallId)
    .eq('menu_date', date)
    .eq('meal_period', mealPeriod)
    .maybeSingle();
  if (!menuDay) return { status: 'no_menu' };

  const { data: items } = await supabase
    .from('menu_items')
    .select(
      'id, name, station, serving_desc, calories, protein_g, carbs_g, fat_g, nutrition_source',
    )
    .eq('menu_day_id', menuDay.id);
  const menuItems = (items ?? []) as PlateItem[];
  if (menuItems.length === 0) return { status: 'no_menu' };

  // 4. Deterministic ranking
  const scorable: ScorableItem[] = menuItems.map((i) => ({
    id: i.id,
    name: i.name,
    station: i.station,
    calories: i.calories,
    protein_g: i.protein_g === null ? null : Number(i.protein_g),
    carbs_g: i.carbs_g === null ? null : Number(i.carbs_g),
    fat_g: i.fat_g === null ? null : Number(i.fat_g),
  }));
  const ranked = rankItems(scorable, daily, mealPeriod, goal);
  if (ranked.length < 2) return { status: 'no_menu' };

  const sparse = ranked.length < SPARSE_THRESHOLD;
  const shortlist = ranked.slice(0, 25);

  // 5. Compose plates: model with one retry, deterministic fallback after that.
  let rawPlates: FallbackPlate[] | null = null;
  if (openrouterConfigured()) {
    for (let attempt = 0; attempt < 2 && !rawPlates; attempt++) {
      try {
        rawPlates = await composePlatesWithModel(shortlist, daily, mealPeriod, goal, sparse);
      } catch (err) {
        if (attempt === 1) {
          await captureException(err, { job: 'recommend', stage: 'model', userId, mealPeriod });
        }
      }
    }
  }
  if (!rawPlates || rawPlates.length === 0) {
    rawPlates = buildFallbackPlates(ranked, daily, mealPeriod, goal);
  }
  if (rawPlates.length === 0) return { status: 'no_menu' };

  // 6. Deterministic totals from real item macros
  const itemById = new Map(menuItems.map((i) => [i.id, i]));
  const plates: Plate[] = rawPlates.slice(0, 3).map((p) => {
    const plateItems = p.item_ids.map((id) => itemById.get(id)).filter((i): i is PlateItem => !!i);
    const totals = plateTotals(
      plateItems.map((i) => ({
        id: i.id,
        name: i.name,
        station: i.station,
        calories: i.calories,
        protein_g: i.protein_g === null ? null : Number(i.protein_g),
        carbs_g: i.carbs_g === null ? null : Number(i.carbs_g),
        fat_g: i.fat_g === null ? null : Number(i.fat_g),
      })),
    );
    return {
      items: plateItems,
      totals: {
        cal: totals.calories,
        protein: totals.protein_g,
        carbs: totals.carbs_g,
        fat: totals.fat_g,
      },
      why: p.why,
    };
  });
  const validPlates = plates.filter((p) => p.items.length >= 2);
  if (validPlates.length === 0) return { status: 'no_menu' };

  // 7. Cache (idempotent on the unique key)
  const { error: upsertError } = await supabase.from('recommendations').upsert(
    {
      user_id: userId,
      dining_hall_id: diningHallId,
      menu_date: date,
      meal_period: mealPeriod,
      plates: validPlates,
    },
    { onConflict: 'user_id,dining_hall_id,menu_date,meal_period' },
  );
  if (upsertError) {
    await captureException(upsertError, { job: 'recommend', stage: 'cache', userId });
  }

  return {
    status: 'ok',
    plates: validPlates,
    cached: false,
    ...(sparse
      ? { note: 'Slim pickings today — here’s your best bet from what’s out there.' }
      : {}),
  };
}

async function composePlatesWithModel(
  shortlist: ScorableItem[],
  daily: MacroTargetSet,
  mealPeriod: MealPeriodName,
  goal: Goal,
  sparse: boolean,
): Promise<FallbackPlate[]> {
  const targets = mealTargets(daily, mealPeriod);
  const menuLines = shortlist
    .map(
      (i) =>
        `${i.id} | ${i.name}${i.station ? ` (${i.station})` : ''} | ${i.calories} cal, ${i.protein_g}g P, ${i.carbs_g}g C, ${i.fat_g}g F`,
    )
    .join('\n');

  const reply = await chatComplete({
    json: true,
    maxTokens: 1200,
    timeoutMs: 20000,
    messages: [
      {
        role: 'system',
        content:
          'You are MacroMom, a warm, encouraging macro-nutrition mom helping a college student pick a dining-hall plate. ' +
          `Compose ${sparse ? '1-2' : '2-3'} distinct, appealing plates from the menu items provided (2-4 items each, use item ids EXACTLY as given). ` +
          `Each plate should approach the meal targets: ~${targets.calories} cal, ${targets.protein_g}g protein, ${targets.carbs_g}g carbs, ${targets.fat_g}g fat. ` +
          `The student's goal is ${goal.replace('_', ' ')}. Plates must be food combinations a real person would enjoy together (no dessert-only plates; a treat alongside a solid meal is fine). ` +
          'For each plate write ONE short "why" sentence in a warm mom voice — encouraging, specific to the goal, no emojis, never shaming. ' +
          'Example tone: "The grilled chicken bowl and roasted veggies are your move today — hits your protein right on target." ' +
          'Reply as JSON: {"plates":[{"item_ids":["..."],"why":"..."}]}',
      },
      { role: 'user', content: `MENU:\n${menuLines}` },
    ],
  });

  const parsed = parseJsonReply<{ plates: { item_ids: string[]; why: string }[] }>(reply);
  const valid = new Set(shortlist.map((i) => i.id));
  return (parsed.plates ?? [])
    .map((p) => ({
      item_ids: (p.item_ids ?? []).filter((id) => valid.has(id)),
      why: String(p.why ?? '').slice(0, 200),
    }))
    .filter((p) => p.item_ids.length >= 2 && p.why.length > 0);
}
