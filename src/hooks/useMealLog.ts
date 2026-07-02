import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Plate } from '@/hooks/useRecommendations';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

export interface LogMealInput {
  mealPeriod: 'breakfast' | 'lunch' | 'dinner';
  /** Log a recommended plate (items + totals captured from it). */
  plate?: Plate;
  recommendationId?: string;
  photoPath?: string;
  portionFeedback?: { verdict: string; note: string };
}

/** "I ate this" (TASK-047, FR-009): create a meal_log from a recommendation. */
export function useMealLog(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LogMealInput) => {
      if (!userId) throw new Error('not signed in');
      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        meal_period: input.mealPeriod,
        source_recommendation_id: input.recommendationId ?? null,
        items: input.plate
          ? input.plate.items.map((i) => ({ id: i.id, name: i.name, serving: i.serving_desc }))
          : null,
        total_calories: input.plate?.totals.cal ?? null,
        total_protein_g: input.plate?.totals.protein ?? null,
        total_carbs_g: input.plate?.totals.carbs ?? null,
        total_fat_g: input.plate?.totals.fat ?? null,
        photo_path: input.photoPath ?? null,
        portion_feedback: input.portionFeedback ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      track('meal_logged', { meal: input.mealPeriod, fromRecommendation: !!input.plate });
      queryClient.invalidateQueries({ queryKey: ['meal-logs', userId] });
    },
  });
}
