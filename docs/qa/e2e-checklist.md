# End-to-End Test Checklist (TASK-071)

Run on a **physical iPhone** with a **development/TestFlight build**, the cloud
Supabase project live, and **StoreKit sandbox** signed in. Check each box with
date + initials.

## Fresh install → magic moment

- [ ] Fresh install launches to sign-in (cream background, MacroMom title)
- [ ] Sign in with Apple completes; relaunch keeps the session
- [ ] Email OTP fallback: code arrives, signs in
- [ ] Onboarding: goal → stats (invalid input shows gentle errors) → halls
      (can't proceed with none) → targets reveal shows 4 sensible numbers
- [ ] Lands on Today; recommendations show 2–3 plates with macros + "why"
- [ ] Hall selector + meal segmented control refetch correctly
- [ ] Closed hall shows "Closed today"; pre-scrape morning shows "not posted yet"

## Notifications

- [ ] Push permission prompt appears once; token row lands in `push_tokens`
- [ ] Manual `send-daily-push?meal=lunch&force_user=<id>` delivers a push
- [ ] Tapping the push opens Today with the right hall + meal in < 1.5s
- [ ] `recommendation_tapthrough` event appears in PostHog

## Camera & logging

- [ ] "Check my plate" opens camera with framing guide
- [ ] Capture → preview → "Check it" → verdict in < 6s, warm copy
- [ ] Blurry/dark photo → "try a clearer photo", no verdict
- [ ] Airplane-mode upload → retry once → friendly error
- [ ] "I ate this" logs the plate; Progress shows the day's bars
- [ ] 3 protein-hit days show the streak celebration banner

## Subscription (sandbox)

- [ ] New user hits paywall from Today's "free week" state
- [ ] Trial purchase completes via Apple sheet; `subscriptions.status = trial`
- [ ] Recommendations unlock immediately after purchase
- [ ] Welcome + confirmation emails arrive (Resend)
- [ ] Restore Purchases on a second device re-grants access
- [ ] Sandbox-expire the trial → recommend returns PAYWALL; paywall shows again
- [ ] `trial_started` funnel event in PostHog

## Settings & account

- [ ] Editing weight/goal updates targets instantly
- [ ] Manage Subscription opens Apple's subscription page
- [ ] Privacy Policy link opens
- [ ] Sign out returns to sign-in without residual data on screen
- [ ] Delete Account removes rows from every user table + storage folder
      (verify in Supabase dashboard), returns to sign-in

## Performance spot-checks (NFR)

- [ ] Cold open → Today content < 3s on LTE
- [ ] Push tap → Today < 1.5s
- [ ] Cached recommend responds < 2s

**Result:** ☐ PASS ☐ FAIL — notes:
