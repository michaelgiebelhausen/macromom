# Edge-Case Sweep (TASK-070) — PRD § 11 walkthrough

Every scenario in PRD § Edge Cases & Error Handling, where it's implemented,
and how it was verified. ✅ = verified locally against the running stack;
📱 = implemented, needs the device/e2e pass (`e2e-checklist.md`).

## Menu Ingestion

| Scenario | Implementation | Status |
|---|---|---|
| Source structure changed | Adapter throws → per-hall try/catch in `scrape-menus/index.ts` logs to Sentry, keeps prior data, run continues; hall reads as "not posted yet" | ✅ (throws produce `status:"error"` rows in the run summary; other halls unaffected) |
| Menu posted late | Cron retries daily; `useMenu` returns `not-posted` before 7 AM ET; `send-daily-push` skips users whose rec can't be built | ✅ (Community Hub returned `not_posted`; no menu_day created) |
| Item missing macros | `estimate.ts`: cache → USDA+LLM → flagged `estimated`; UI shows `*` badge on cards and preview | ✅ pipeline path (LLM leg needs OPENROUTER_API_KEY — checklist) |
| Hall closed | Adapter `hasActiveMenus=false` → `closed`, no menu_day; Today shows warm "Closed today" | ✅ (Schilletter, summer closure, live) |

## Recommendations

| Scenario | Implementation | Status |
|---|---|---|
| Model API error/timeout | `recommend-core`: 20s timeout, one retry, then deterministic fallback composer; cached rec served first | ✅ (fallback path is the verified path; 3 distinct plates) |
| Menu too sparse | `< 6` scorable items → honest note "Slim pickings today…" with best available plates | ✅ (code path; note passes through API + Today renders it) |
| User targets missing | `no_targets` → 409 `ONBOARDING`; Today shows "finish setting up" state | ✅ (fresh user without profile targets got 409) |

## Portion Camera

| Scenario | Implementation | Status |
|---|---|---|
| Blurry/unreadable | Vision returns `readable:false` → 422; camera shows "clearer photo" retake state | 📱 (needs key + device) |
| Upload fails | `uploadOnce` retried once, then warm error + retake | 📱 |
| Low confidence | `confidence < 0.6` strips the numeric estimate — verdict + note only | ✅ (server logic; response shape verified) |

## Auth & Subscription

| Scenario | Implementation | Status |
|---|---|---|
| Token expires mid-session | supabase-js auto-refresh + foreground-only refresh via AppState; SecureStore chunked persistence | 📱 (persistence across restarts) |
| Purchase ok, webhook delayed | `useSubscription` polls every 5s while SDK-entitled but DB row lags; server reconciles on webhook | ✅ (webhook → row → unlock verified; poll logic code-reviewed) |
| Restore on new device | `restorePurchases` in paywall + Settings | 📱 (sandbox) |
| Billing issue | Webhook leaves access during grace (no status change until EXPIRATION); 3-day grace in `entitlement.ts` | ✅ (EXPIRATION flips to blocked; BILLING_ISSUE is a no-op) |

## Notifications

| Scenario | Implementation | Status |
|---|---|---|
| Permission denied | `registerPushToken` returns null, no token row; app fully functional; no re-prompt nagging | ✅ (logic) / 📱 (device prompt) |
| No menu at push time | `send-daily-push` skips the user (`skippedNoMenu` counter) — never deep-links to an empty state | ✅ (live: skip counted for closed halls) |
