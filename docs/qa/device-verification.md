# Device / Credential Verification Checklist

The build machine is Windows (no iOS simulator, no Apple credentials), so these
verifications from the roadmap are implemented in code but must be confirmed on
real infrastructure. Each is a one-time check.

## Needs a physical iPhone (dev build via EAS)

- [ ] **TASK-001** — App launches via `npx expo start` + dev client.
- [ ] **TASK-007** — Sign in with Apple completes; session persists across restarts.
- [ ] **TASK-008** — Routing guard: signed-out → sign-in; incomplete onboarding → onboarding; else Today.
- [ ] **TASK-037** — Push token saved to `push_tokens` on device.
- [ ] **TASK-038/040** — Push arrives and deep-links to `/today` with hall/meal preselected.
- [ ] **TASK-043/044** — Plate camera capture → upload → verdict end to end.

## Needs accounts / keys (one-time setup)

- [ ] **Supabase cloud project** — Creation was denied to the agent by the permission
      system. Run:
      `npx supabase projects create macromom --org-id vkgmgytjhzndyzfemxbg --region us-east-1`
      then `npx supabase link --project-ref <ref>` and `npx supabase db push`.
      Copy URL + anon key into `.env` (see `.env.example`).
- [ ] **Apple Developer** — App ID `com.macromom.app` with Sign in with Apple; Services ID +
      key for the Supabase Apple provider (PRD § Provider Configuration).
- [ ] **TASK-011** — Set `EXPO_PUBLIC_SENTRY_DSN`, throw a test error, confirm the event in
      Sentry with no tokens/PII.
- [ ] **TASK-012** — `eas build --profile development --platform ios` (needs Apple
      credentials + `eas login`).
- [ ] **PostHog key** (`EXPO_PUBLIC_POSTHOG_KEY`) — events verification for TASK-021/041/051/059/062.
- [ ] **RevenueCat** — TASK-052–059: App Store Connect products, RevenueCat app + `pro`
      entitlement, sandbox purchase flow.
- [ ] **OpenRouter / USDA / Resend keys** — set as Supabase function secrets:
      `OPENROUTER_API_KEY`, `USDA_API_KEY` (optional, `DEMO_KEY` works), `RESEND_API_KEY`,
      `REVENUECAT_WEBHOOK_AUTH`, `SENTRY_DSN`.

## Verified locally instead (this machine)

- Migrations + RLS: applied and probed against the local Supabase stack (Docker).
- App bundling: `npx expo export --platform web`, `tsc --noEmit`, `expo lint` all pass.
- Business logic: unit tests (macros, scoring) run in CI-style via `npm test`.
