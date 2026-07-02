import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  display_name: string | null;
  goal: 'lose_fat' | 'build_muscle' | 'maintain' | 'eat_healthier';
  sex: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: 'low' | 'moderate' | 'high';
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  notif_meal_windows: string[];
  onboarding_complete: boolean;
}

export function useProfile(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Invalidate the cached profile after writes (targets, settings edits). */
export function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return (userId: string) => queryClient.invalidateQueries({ queryKey: ['profile', userId] });
}
