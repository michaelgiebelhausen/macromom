// recommend Edge Function (TASK-032/033, PRD § API Specification).
// Auth: user JWT. Composes/returns 2-3 plates for (hall, meal, date); cached
// per unique key. Edge cases: missing targets → ONBOARDING; no menu → 404.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

import { isEntitled, paywallResponse } from '../_shared/entitlement.ts';
import { checkRateLimit, throttleResponse } from '../_shared/ratelimit.ts';
import { generateRecommendation } from '../_shared/recommend-core.ts';
import { captureException } from '../_shared/sentry.ts';

const BodySchema = z.object({
  diningHallId: z.string().uuid(),
  mealPeriod: z.enum(['breakfast', 'lunch', 'dinner']),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function todayEt(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Resolve the calling user from their JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await anonClient.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Service client for reads/writes (RLS-independent; user id is pinned above).
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // NFR Security: ≤ 30 recommend calls/min/user.
  if (!(await checkRateLimit(supabase, 'recommend', user.id, 30))) return throttleResponse();

  // FR-007: server-side subscription gate — never trust the client alone.
  if (!(await isEntitled(supabase, user.id))) return paywallResponse();

  try {
    const result = await generateRecommendation(
      supabase,
      user.id,
      body.diningHallId,
      body.date ?? todayEt(),
      body.mealPeriod,
    );

    switch (result.status) {
      case 'ok':
        return Response.json({
          plates: result.plates,
          cached: result.cached,
          ...(result.note ? { note: result.note } : {}),
        });
      case 'no_targets':
        return Response.json(
          { error: 'Finish onboarding so I can build your plan', code: 'ONBOARDING' },
          { status: 409 },
        );
      case 'no_menu':
        return Response.json(
          { error: 'No menu available for this hall/date/meal yet' },
          { status: 404 },
        );
    }
  } catch (err) {
    await captureException(err, { job: 'recommend', userId: user.id });
    return Response.json(
      { error: 'Hmm, I couldn’t build plates just now. Give me a sec and try again?' },
      { status: 500 },
    );
  }
});
