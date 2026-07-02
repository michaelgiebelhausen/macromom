import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { MealPeriod } from './useMenu';

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

export interface RecommendationsData {
  plates: Plate[];
  cached: boolean;
  note?: string;
}

export class RecommendError extends Error {
  constructor(
    message: string,
    public code: 'NO_MENU' | 'ONBOARDING' | 'PAYWALL' | 'UNKNOWN',
  ) {
    super(message);
  }
}

/** TASK-034: fetch 2-3 plates for a hall/meal/date via the recommend function. */
export function useRecommendations(
  diningHallId: string | undefined,
  mealPeriod: MealPeriod,
  date?: string,
) {
  return useQuery({
    queryKey: ['recommendations', diningHallId, mealPeriod, date ?? 'today'],
    enabled: !!diningHallId,
    retry: (failureCount, error) =>
      error instanceof RecommendError && error.code !== 'UNKNOWN' ? false : failureCount < 1,
    queryFn: async (): Promise<RecommendationsData> => {
      const { data, error } = await supabase.functions.invoke('recommend', {
        body: { diningHallId, mealPeriod, ...(date ? { date } : {}) },
      });
      if (error) {
        // FunctionsHttpError carries the response; map API codes to typed errors.
        const context = (error as { context?: Response }).context;
        if (context) {
          try {
            const body = await context.json();
            if (context.status === 404) throw new RecommendError(body.error, 'NO_MENU');
            if (body.code === 'ONBOARDING') throw new RecommendError(body.error, 'ONBOARDING');
            if (body.code === 'PAYWALL') throw new RecommendError(body.error, 'PAYWALL');
          } catch (e) {
            if (e instanceof RecommendError) throw e;
          }
        }
        throw new RecommendError('Could not load recommendations', 'UNKNOWN');
      }
      return data as RecommendationsData;
    },
  });
}
