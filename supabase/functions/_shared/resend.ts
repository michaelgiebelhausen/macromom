// Resend transactional email (TASK-061). Server-side key only; silently
// no-ops without RESEND_API_KEY so dev environments never block on email.

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return false;

  const from = Deno.env.get('RESEND_FROM') ?? 'MacroMom <hello@macromom.app>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
    signal: AbortSignal.timeout(15000),
  });
  return res.ok;
}

export function welcomeEmailHtml(): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto; color: #2E2A26;">
    <h1 style="color: #E85440;">Welcome to the family!</h1>
    <p>Hi sweetie,</p>
    <p>Your free week of MacroMom starts now. Here's how it works:</p>
    <ul>
      <li>Every day I read your dining hall's real menu.</li>
      <li>Before each meal I'll nudge you with 2–3 plates that fit your goals.</li>
      <li>Snap a photo of your plate anytime for a quick portion gut-check.</li>
    </ul>
    <p>No logging, no guessing — just grab the plate and go.</p>
    <p>Proud of you already,<br/>MacroMom</p>
  </div>`;
}

export function receiptEmailHtml(plan: string): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto; color: #2E2A26;">
    <h1 style="color: #E85440;">You're all set!</h1>
    <p>Your MacroMom subscription (${plan}) is confirmed through your Apple ID.</p>
    <p>Manage or cancel anytime in your iPhone's Settings → Apple ID → Subscriptions.
       Apple sends the official receipt separately.</p>
    <p>Let's eat well,<br/>MacroMom</p>
  </div>`;
}
