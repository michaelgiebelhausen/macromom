import { useQuery } from '@tanstack/react-query';

import { getCustomerInfo, hasProEntitlement, revenuecatConfigured } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';

export interface SubscriptionState {
  /** DB mirror (server source of truth for gating). */
  dbStatus: 'trial' | 'active' | 'expired' | 'none';
  /** RevenueCat SDK grant — immediate after purchase, before webhook sync. */
  sdkEntitled: boolean;
  /** UI entitlement: either source (server still gates independently). */
  entitled: boolean;
  expiresAt: string | null;
}

/** Combined subscription state (TASK-057/058). */
export function useSubscription(userId: string | undefined) {
  return useQuery({
    queryKey: ['subscription', userId],
    enabled: !!userId,
    refetchInterval: (query) => {
      // While the webhook is catching up to an SDK grant, poll gently.
      const data = query.state.data;
      if (data && data.sdkEntitled && data.dbStatus !== 'trial' && data.dbStatus !== 'active') {
        return 5000;
      }
      return false;
    },
    queryFn: async (): Promise<SubscriptionState> => {
      const { data: row } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('user_id', userId!)
        .maybeSingle();

      const dbStatus = (row?.status ?? 'none') as SubscriptionState['dbStatus'];
      const dbEntitled = dbStatus === 'trial' || dbStatus === 'active';

      let sdkEntitled = false;
      if (revenuecatConfigured()) {
        sdkEntitled = hasProEntitlement(await getCustomerInfo());
      }

      return {
        dbStatus,
        sdkEntitled,
        entitled: dbEntitled || sdkEntitled,
        expiresAt: row?.expires_at ?? null,
      };
    },
  });
}
