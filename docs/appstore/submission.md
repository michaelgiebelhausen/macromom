# TestFlight & App Store Submission (TASK-072)

Prerequisites: Apple Developer Program membership, `eas login` (Expo account),
cloud Supabase project live with secrets set, RevenueCat configured
(`revenuecat.md`), App Store products created (`subscriptions.md`).

## 1. One-time credential setup

```bash
npx eas credentials            # let EAS create/manage the iOS distribution cert
npx eas build:configure        # links the EAS project id into app.json extra
```

Upload the APNs key when prompted (needed for push, TASK-037).

## 2. Point the app at production

Create `.env` (never committed) with the cloud project's values:

```
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_POSTHOG_KEY=<phc_...>
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<appl_...>
EXPO_PUBLIC_SENTRY_DSN=<https://...>
```

Mirror them as EAS secrets so cloud builds get them:

```bash
npx eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value ...
# (repeat per variable, environment: production)
```

Deploy the backend:

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
npx supabase functions deploy scrape-menus recommend analyze-plate revenuecat-webhook send-daily-push delete-account
npx supabase secrets set OPENROUTER_API_KEY=... USDA_API_KEY=... RESEND_API_KEY=... REVENUECAT_WEBHOOK_AUTH=... SENTRY_DSN=...
```

## 3. Build & submit

```bash
npx eas build --profile production --platform ios   # cloud build, ~15 min
npx eas submit --platform ios --latest              # uploads to App Store Connect
```

The build appears in TestFlight within ~30 minutes of processing.

## 4. TestFlight distribution (design partners)

- App Store Connect → TestFlight → Internal Testing → add Mike + Alyssa.
- External group "Clemson Design Partners": add Mike's son + the sorority
  cohort by email; first external build requires a lightweight Beta review.

## 5. App Store submission

- Complete the listing from `listing.md` (name, subtitle, keywords,
  description, screenshots).
- Privacy: point to https://macromom.app/privacy and fill the data-collection
  questionnaire per `privacy.md` (identifiers, health & fitness, photos, usage
  data — all "linked to you", none used for tracking).
- App Review notes: include a sandbox/demo account (email OTP).
- Submit for review alongside the subscription products (first subscription
  must be submitted WITH an app version).

## 6. Post-approval

- Run the full `docs/qa/e2e-checklist.md` against the production build.
- Watch Sentry + PostHog for the first cohort.
