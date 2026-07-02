// analyze-plate Edge Function (TASK-044/045, PRD § API Specification, FR-008).
// Signs the caller's stored photo, sends it to the OpenRouter vision model with
// their targets, and returns a qualitative portion gut-check. Low confidence →
// soft verdict; unreadable → 422 with warm copy (never a wrong verdict).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

import { isEntitled, paywallResponse } from '../_shared/entitlement.ts';
import { checkRateLimit, throttleResponse } from '../_shared/ratelimit.ts';
import {
  chatComplete,
  MODELS,
  openrouterConfigured,
  parseJsonReply,
} from '../_shared/openrouter.ts';
import { captureException } from '../_shared/sentry.ts';

const BodySchema = z.object({
  imagePath: z.string().min(3).max(300),
  recommendationId: z.string().uuid().optional(),
});

interface VisionReply {
  readable: boolean;
  verdict: 'on_target' | 'add_more' | 'reduce';
  note: string;
  confidence: number;
  estimate?: { cal: number; protein: number; carbs: number; fat: number };
}

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

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Users may only analyze photos in their own folder.
  if (!body.imagePath.startsWith(`${user.id}/`)) {
    return Response.json({ error: 'Not your photo' }, { status: 403 });
  }

  if (!openrouterConfigured()) {
    return Response.json(
      { error: 'Plate checks are warming up — try again in a little while.' },
      { status: 503 },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // NFR Security: ≤ 15 analyze-plate calls/min/user.
  if (!(await checkRateLimit(supabase, 'analyze-plate', user.id, 15))) return throttleResponse();

  // FR-007: server-side subscription gate — never trust the client alone.
  if (!(await isEntitled(supabase, user.id))) return paywallResponse();

  try {
    // Signed URL for the vision model (10 minutes is plenty).
    const { data: signed, error: signError } = await supabase.storage
      .from('plate-photos')
      .createSignedUrl(body.imagePath, 600);
    if (signError || !signed) throw signError ?? new Error('could not sign image');

    const { data: profile } = await supabase
      .from('profiles')
      .select('goal, target_calories, target_protein_g, target_carbs_g, target_fat_g')
      .eq('id', user.id)
      .maybeSingle();

    // Expected plate context when the user is checking a recommendation.
    let expectedPlate = '';
    if (body.recommendationId) {
      const { data: rec } = await supabase
        .from('recommendations')
        .select('plates')
        .eq('id', body.recommendationId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (rec?.plates) {
        const names = (rec.plates as { items: { name: string }[] }[])
          .flatMap((p) => p.items.map((i) => i.name))
          .slice(0, 12);
        expectedPlate = `They were recommended these items today: ${names.join(', ')}.`;
      }
    }

    const targetLine = profile?.target_calories
      ? `Their daily targets: ${profile.target_calories} cal, ${profile.target_protein_g}g protein, ${profile.target_carbs_g}g carbs, ${profile.target_fat_g}g fat; goal: ${profile.goal}. A single meal is roughly a third of that.`
      : 'No targets known — judge a generally balanced plate.';

    const reply = await chatComplete({
      model: MODELS.vision,
      json: true,
      maxTokens: 500,
      timeoutMs: 25000,
      messages: [
        {
          role: 'system',
          content:
            'You are MacroMom, a warm, encouraging macro-nutrition mom giving a QUALITATIVE portion gut-check from a plate photo. ' +
            'Never shame. Never invent precision you cannot see. ' +
            'Reply as JSON: {"readable":bool,"verdict":"on_target"|"add_more"|"reduce","note":"one warm sentence","confidence":0..1,' +
            '"estimate":{"cal":int,"protein":int,"carbs":int,"fat":int}}. ' +
            'If the photo is blurry/dark/not a plate of food, set readable=false. ' +
            'Include "estimate" ONLY when confidence >= 0.6. ' +
            'Example notes: "That’s a perfect plate — nice work." / "Looks great! Maybe add a little more protein next time — you’re just a bit under."',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `${targetLine} ${expectedPlate}`.trim() },
            { type: 'image_url', image_url: { url: signed.signedUrl } },
          ],
        },
      ],
    });

    const parsed = parseJsonReply<VisionReply>(reply);
    if (!parsed.readable) {
      return Response.json(
        { error: 'Could not read the plate — try a clearer photo' },
        { status: 422 },
      );
    }

    const lowConfidence = (parsed.confidence ?? 0) < 0.6;
    const result = {
      verdict: parsed.verdict,
      note: String(parsed.note ?? '').slice(0, 240),
      ...(parsed.estimate && !lowConfidence ? { estimate: parsed.estimate } : {}),
    };

    // Attach feedback to the most recent meal_log for this recommendation.
    if (body.recommendationId) {
      const { data: log } = await supabase
        .from('meal_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('source_recommendation_id', body.recommendationId)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (log) {
        await supabase
          .from('meal_logs')
          .update({ portion_feedback: result, photo_path: body.imagePath })
          .eq('id', log.id);
      }
    }

    return Response.json(result);
  } catch (err) {
    await captureException(err, { job: 'analyze-plate', userId: user.id });
    return Response.json(
      { error: 'Hmm, I couldn’t check that plate just now. Give me a sec and try again?' },
      { status: 500 },
    );
  }
});
