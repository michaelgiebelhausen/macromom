import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner';

export interface MenuItem {
  id: string;
  station: string | null;
  name: string;
  serving_desc: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  nutrition_source: 'scraped' | 'estimated';
}

/**
 * 'ok'         → menu loaded
 * 'not-posted' → nothing yet, but the day's scrape window hasn't passed (menu may still land)
 * 'closed'     → scrape ran for today and produced no menu_day ⇒ hall isn't serving
 * (TASK-029: distinct warm empty states)
 */
export type MenuStatus = 'ok' | 'not-posted' | 'closed';

export interface MenuResult {
  status: MenuStatus;
  items: MenuItem[];
  scrapedAt: string | null;
}

/** The daily scraper runs ~5:30 AM ET; past 7 AM ET an absent menu means closed. */
function scrapeWindowPassed(): boolean {
  const etHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  );
  return etHour >= 7;
}

export function useMenu(diningHallId: string | undefined, date: string, mealPeriod: MealPeriod) {
  return useQuery({
    queryKey: ['menu', diningHallId, date, mealPeriod],
    enabled: !!diningHallId,
    queryFn: async (): Promise<MenuResult> => {
      const { data: day, error: dayError } = await supabase
        .from('menu_days')
        .select('id, scraped_at')
        .eq('dining_hall_id', diningHallId!)
        .eq('menu_date', date)
        .eq('meal_period', mealPeriod)
        .maybeSingle();
      if (dayError) throw dayError;

      if (!day) {
        return {
          status: scrapeWindowPassed() ? 'closed' : 'not-posted',
          items: [],
          scrapedAt: null,
        };
      }

      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select(
          'id, station, name, serving_desc, calories, protein_g, carbs_g, fat_g, nutrition_source',
        )
        .eq('menu_day_id', day.id)
        .order('station')
        .order('name');
      if (itemsError) throw itemsError;

      return { status: 'ok', items: (items ?? []) as MenuItem[], scrapedAt: day.scraped_at };
    },
  });
}

/** Today's date in the campus timezone (Clemson = ET) as YYYY-MM-DD. */
export function todayEt(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
