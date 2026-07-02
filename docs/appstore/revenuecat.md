# RevenueCat — Project Setup (TASK-053/054)

One-time setup in the [RevenueCat dashboard](https://app.revenuecat.com).
Free under $2.5k monthly tracked revenue.

## 1. Create the app

- Project: `MacroMom` → add **iOS app** with bundle ID `com.macromom.app`.
- Paste the **App-Specific Shared Secret** from App Store Connect.
- Copy the **public iOS SDK key** (starts `appl_`) → set as
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY` in `.env` / EAS secrets.

## 2. Entitlement + offering

- Entitlement identifier: **`pro`** (the app and server gate on this).
- Products: attach `com.macromom.app.pro.monthly` and
  `com.macromom.app.pro.annual` to the `pro` entitlement.
- Offering: `default`, with two packages — `$rc_monthly` → monthly product,
  `$rc_annual` → annual product. The paywall renders whatever `default` contains.

## 3. Webhook → Supabase

- Dashboard → Integrations → Webhooks → Add:
  - URL: `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook`
  - Authorization header value: any long random string; set the same value as
    the `REVENUECAT_WEBHOOK_AUTH` function secret
    (`npx supabase secrets set REVENUECAT_WEBHOOK_AUTH=<value>`).
- Events: at minimum INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION,
  BILLING_ISSUE (defaults are fine — unknown events are ignored idempotently).

## 4. Identity

The app calls `Purchases.logIn(<supabase user id>)` after sign-in
(`src/lib/revenuecat.ts`), so RevenueCat's `app_user_id` === `profiles.id` and
the webhook can upsert the right `subscriptions` row.

## Verify

- Offerings load on a dev build (TASK-053).
- After sign-in, the RevenueCat dashboard customer shows the Supabase UUID (TASK-054).
- A sandbox purchase flips `subscriptions.status` to `trial` within seconds (TASK-056).
