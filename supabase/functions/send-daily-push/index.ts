// send-daily-push Edge Function (TASK-038, PRD § API Specification, FR-006).
// Cron-invoked per meal window. Eligible = push token + trial/active
// subscription + meal window enabled. Ensures a recommendation exists, then
// sends a warm push deep-linking to /today. Skips users with no menu
// (Edge Cases → Notifications: never deep-link into an empty state).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { generateRecommendation } from '../_shared/recommend-core.ts';
import { captureException } from '../_shared/sentry.ts';

type Meal = 'breakfast' | 'lunch' | 'dinner';

const PUSH_COPY: Record<Meal, string[]> = {
  breakfast: [
    'Morning, sunshine! I picked your breakfast plates — come see.',
    'Rise and fuel! Today’s breakfast plan is ready for you.',
  ],
  lunch: [
    'Lunchtime! I found plates at your hall that hit your goals — take a peek.',
    'Midday check-in: your lunch is sorted. Come grab the plan.',
  ],
  dinner: [
    'Dinner’s decided — I lined up plates that fit your day perfectly.',
    'Wrap the day right: your dinner picks are ready.',
  ],
};

function currentMealEt(): Meal {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  return 'dinner';
}

function todayEt(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const meal = (url.searchParams.get('meal') as Meal | null) ?? currentMealEt();
  // Test hook: push to one user regardless of subscription state.
  const forceUser = url.searchParams.get('force_user');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const date = todayEt();
  const summary = { meal, date, eligible: 0, sent: 0, skippedNoMenu: 0, errors: 0 };

  try {
    // Tokens joined with profile notification windows + subscription status.
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('user_id, expo_push_token, profiles!inner(notif_meal_windows, onboarding_complete)');
    if (error) throw error;

    const { data: subs } = await supabase.from('subscriptions').select('user_id, status');
    const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s.status]));

    const messages: { to: string; title: string; body: string; data: Record<string, string> }[] =
      [];

    for (const row of tokens ?? []) {
      const profile = row.profiles as unknown as {
        notif_meal_windows: string[] | null;
        onboarding_complete: boolean;
      };
      const windows = profile.notif_meal_windows ?? [];
      const subStatus = subByUser.get(row.user_id) ?? 'none';
      const entitled = subStatus === 'trial' || subStatus === 'active';
      const isForced = forceUser === row.user_id;

      if (!isForced && (!profile.onboarding_complete || !windows.includes(meal) || !entitled)) {
        continue;
      }
      summary.eligible++;

      try {
        // Primary hall → ensure a recommendation exists before nudging.
        const { data: primaryHall } = await supabase
          .from('user_halls')
          .select('dining_hall_id')
          .eq('user_id', row.user_id)
          .eq('is_primary', true)
          .maybeSingle();
        if (!primaryHall) continue;

        const rec = await generateRecommendation(
          supabase,
          row.user_id,
          primaryHall.dining_hall_id,
          date,
          meal,
        );
        if (rec.status !== 'ok') {
          summary.skippedNoMenu++;
          continue; // no menu → no push (never deep-link to an empty state)
        }

        messages.push({
          to: row.expo_push_token,
          title: 'MacroMom',
          body: PUSH_COPY[meal][Math.floor(Math.random() * PUSH_COPY[meal].length)],
          data: { url: '/today', hallId: primaryHall.dining_hall_id, mealPeriod: meal },
        });
      } catch (err) {
        summary.errors++;
        await captureException(err, { job: 'send-daily-push', userId: row.user_id, meal });
      }
    }

    // Expo push API accepts batches of up to 100.
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        summary.sent += chunk.length;
      } else {
        summary.errors++;
        await captureException(new Error(`expo push HTTP ${res.status}`), {
          job: 'send-daily-push',
        });
      }
    }
  } catch (err) {
    await captureException(err, { job: 'send-daily-push', stage: 'top-level' });
    return Response.json({ error: String(err).slice(0, 300), summary }, { status: 500 });
  }

  return Response.json({ ok: true, summary });
});
