// delete-account Edge Function (TASK-066 — Apple requires in-app deletion).
// Removes the caller's plate photos, then deletes the auth user; every user
// table cascades from profiles → auth.users (PRD § Data Model).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { captureException } from '../_shared/sentry.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await anonClient.auth.getUser();
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // 1. Plate photos (storage does not cascade).
    const { data: files } = await supabase.storage.from('plate-photos').list(user.id, {
      limit: 1000,
    });
    if (files && files.length > 0) {
      await supabase.storage.from('plate-photos').remove(files.map((f) => `${user.id}/${f.name}`));
    }

    // 2. Auth user → cascades profiles, user_halls, recommendations,
    //    meal_logs, subscriptions, push_tokens.
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return Response.json({ deleted: true });
  } catch (err) {
    await captureException(err, { job: 'delete-account', userId: user.id });
    return Response.json(
      { error: 'Hmm, that didn’t finish. Try again in a moment?' },
      { status: 500 },
    );
  }
});
