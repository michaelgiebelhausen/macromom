// Fixed-window rate limiting backed by Postgres (TASK-065, NFR Security).
// Window = 1 minute. Fails OPEN: a rate-limit infrastructure error never
// blocks a legitimate request.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export async function checkRateLimit(
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
  maxPerMinute: number,
): Promise<boolean> {
  try {
    const windowStart = new Date();
    windowStart.setSeconds(0, 0);
    const key = `${bucket}:${userId}:${windowStart.toISOString()}`;

    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_key: key,
      p_window_start: windowStart.toISOString(),
    });
    if (error) throw error;
    return (data as number) <= maxPerMinute;
  } catch (err) {
    console.warn('[ratelimit] check failed open:', err);
    return true;
  }
}

/** Warm 429 (NFR: friendly throttle response). */
export function throttleResponse(): Response {
  return Response.json(
    { error: 'Whoa, easy tiger — give me a few seconds and try again.', code: 'RATE_LIMITED' },
    { status: 429 },
  );
}
