// revenuecat-webhook Edge Function (TASK-056, PRD § Webhook Handling).
// Validates the shared secret, then idempotently upserts the subscriptions
// mirror row for the mapped user (app_user_id = Supabase user id).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { receiptEmailHtml, sendEmail, welcomeEmailHtml } from '../_shared/resend.ts';
import { captureException } from '../_shared/sentry.ts';

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  period_type?: string; // 'TRIAL' | 'INTRO' | 'NORMAL'
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
}

/** Map a RevenueCat event to the subscriptions.status value. */
function statusForEvent(event: RevenueCatEvent): 'trial' | 'active' | 'expired' | null {
  switch (event.type) {
    case 'INITIAL_PURCHASE':
      return event.period_type === 'TRIAL' ? 'trial' : 'active';
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      return 'active';
    case 'CANCELLATION':
      // Auto-renew turned off; access continues until EXPIRATION arrives.
      return null;
    case 'BILLING_ISSUE':
      // Grace period keeps access; EXPIRATION will end it if unresolved.
      return null;
    case 'EXPIRATION':
      return 'expired';
    default:
      return null; // TEST, TRANSFER, etc. — acknowledge without changes
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Shared-secret auth (PRD § API security).
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  const provided = req.headers.get('Authorization') ?? '';
  if (!expected || provided.replace(/^Bearer\s+/i, '') !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const event = payload?.event as RevenueCatEvent | undefined;
    if (!event?.app_user_id) return Response.json({ received: true });

    // Anonymous RevenueCat ids (`$RCAnonymousID:...`) can't map to a profile.
    if (!UUID_PATTERN.test(event.app_user_id)) {
      return Response.json({ received: true, skipped: 'non-uuid app_user_id' });
    }

    const status = statusForEvent(event);
    if (status === null) return Response.json({ received: true });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase.from('subscriptions').upsert(
      {
        user_id: event.app_user_id,
        status,
        entitlement: event.entitlement_ids?.[0] ?? 'pro',
        expires_at: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;

    // TASK-061: welcome + receipt emails on the first purchase (trial start).
    if (event.type === 'INITIAL_PURCHASE') {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(event.app_user_id);
        const email = authUser?.user?.email;
        if (email) {
          await sendEmail(email, 'Welcome to MacroMom — your free week starts now', welcomeEmailHtml());
          await sendEmail(
            email,
            'Your MacroMom subscription is confirmed',
            receiptEmailHtml(status === 'trial' ? '7-day free trial' : 'MacroMom Pro'),
          );
        }
      } catch (emailErr) {
        // Email is best-effort — never fail the webhook over it.
        await captureException(emailErr, { job: 'revenuecat-webhook', stage: 'email' });
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    await captureException(err, { job: 'revenuecat-webhook' });
    return Response.json({ error: 'processing failed' }, { status: 500 });
  }
});
