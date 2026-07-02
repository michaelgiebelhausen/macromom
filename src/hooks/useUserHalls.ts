import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface UserHall {
  id: string;
  name: string;
  isPrimary: boolean;
}

/** The halls this user follows, primary first. */
export function useUserHalls(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-halls', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserHall[]> => {
      const { data, error } = await supabase
        .from('user_halls')
        .select('is_primary, dining_halls(id, name)')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data ?? [])
        .map((row) => {
          const hall = row.dining_halls as unknown as { id: string; name: string } | null;
          return hall ? { id: hall.id, name: hall.name, isPrimary: row.is_primary } : null;
        })
        .filter((h): h is UserHall => !!h)
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    },
  });
}
