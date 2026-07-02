// scrape-menus Edge Function (TASK-025/026, PRD § API Specification).
// For each active hall × meal period: fetch via the vendor adapter, estimate
// missing macros, and upsert menu_days + menu_items idempotently.
// Failure policy (PRD § Edge Cases → Menu Ingestion): a hall/meal failure is
// logged to Sentry and skipped — prior data stays intact, the run continues.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { captureException } from '../_shared/sentry.ts';
import { campusdishAdapter } from './adapters/campusdish.ts';
import type { MealPeriodName, MenuAdapter, VendorConfig } from './adapters/types.ts';
import { estimateMissingMacros } from './estimate.ts';

const ADAPTERS: Record<string, MenuAdapter> = {
  campusdish: campusdishAdapter,
  // nutrislice / dineoncampus / bite adapters slot in here (SOURCE.md build order)
};

const MEAL_PERIODS: MealPeriodName[] = ['breakfast', 'lunch', 'dinner'];

function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // en-CA → YYYY-MM-DD
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const dateOverride = url.searchParams.get('date'); // re-run a specific day (README)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const summary: Record<string, unknown>[] = [];

  try {
    const { data: campuses, error: campusError } = await supabase
      .from('campuses')
      .select('id, slug, timezone, menu_source, menu_source_config');
    if (campusError) throw campusError;

    for (const campus of campuses ?? []) {
      const adapter = ADAPTERS[campus.menu_source ?? ''];
      if (!adapter) {
        await captureException(new Error(`no adapter for menu_source=${campus.menu_source}`), {
          campus: campus.slug,
        });
        continue;
      }
      const config = campus.menu_source_config as VendorConfig;
      const date = dateOverride ?? todayInTimezone(campus.timezone);

      const { data: halls, error: hallsError } = await supabase
        .from('dining_halls')
        .select('id, name, external_ref')
        .eq('campus_id', campus.id)
        .eq('active', true);
      if (hallsError) throw hallsError;

      for (const hall of halls ?? []) {
        for (const mealPeriod of MEAL_PERIODS) {
          try {
            const result = await adapter.fetchDayMenu(
              config,
              campus.slug,
              hall.external_ref,
              date,
              mealPeriod,
            );

            if (result.status !== 'ok' || result.items.length === 0) {
              summary.push({ hall: hall.name, mealPeriod, status: result.status, items: 0 });
              continue; // closed / not posted → no menu_day, prior data intact
            }

            const estimated = await estimateMissingMacros(result.items, supabase);

            // Idempotent upsert on (dining_hall_id, menu_date, meal_period)
            const { data: menuDay, error: dayError } = await supabase
              .from('menu_days')
              .upsert(
                {
                  dining_hall_id: hall.id,
                  menu_date: date,
                  meal_period: mealPeriod,
                  scraped_at: new Date().toISOString(),
                },
                { onConflict: 'dining_hall_id,menu_date,meal_period' },
              )
              .select('id')
              .single();
            if (dayError) throw dayError;

            // Replace the day's items wholesale (single writer = the cron job)
            const { error: delError } = await supabase
              .from('menu_items')
              .delete()
              .eq('menu_day_id', menuDay.id);
            if (delError) throw delError;

            const rows = result.items.map((item) => ({
              menu_day_id: menuDay.id,
              station: item.station,
              name: item.item_name.slice(0, 200),
              serving_desc: item.serving_size?.slice(0, 120) ?? null,
              calories: item.calories,
              protein_g: item.protein_g,
              carbs_g: item.carbs_g,
              fat_g: item.fat_g,
              nutrition_source: item.source === 'vendor' ? 'scraped' : 'estimated',
              tags: item.tags,
            }));
            const { error: insError } = await supabase.from('menu_items').insert(rows);
            if (insError) throw insError;

            summary.push({
              hall: hall.name,
              mealPeriod,
              status: 'ok',
              items: rows.length,
              estimated,
            });
          } catch (err) {
            // Fail safe per hall/meal: log + alert, keep prior data, continue.
            await captureException(err, {
              job: 'scrape-menus',
              campus: campus.slug,
              hall: hall.name,
              mealPeriod,
              date,
            });
            summary.push({
              hall: hall.name,
              mealPeriod,
              status: 'error',
              error: String(err).slice(0, 200),
            });
          }
        }
      }
    }
  } catch (err) {
    await captureException(err, { job: 'scrape-menus', stage: 'top-level' });
    return Response.json({ error: String(err).slice(0, 300), summary }, { status: 500 });
  }

  return Response.json({ ok: true, summary });
});
