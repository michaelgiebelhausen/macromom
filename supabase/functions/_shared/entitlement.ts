// Server-side entitlement check (TASK-057, FR-007).
// Gate on the DB mirror of RevenueCat state — never trust the client alone.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** 3-day grace past expires_at covers webhook hiccups and billing retries. */
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export async function isEntitled(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return false;
  if (data.status !== 'trial' && data.status !== 'active') return false;
  if (data.expires_at && new Date(data.expires_at).getTime() + GRACE_MS < Date.now()) {
    return false;
  }
  return true;
}

export function paywallResponse(): Response {
  return Response.json({ error: 'Subscription required', code: 'PAYWALL' }, { status: 402 });
}
