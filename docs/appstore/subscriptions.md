# App Store Connect — Subscription Products (TASK-052)

One-time setup in [App Store Connect](https://appstoreconnect.apple.com) →
MacroMom app → Monetization → Subscriptions. Requires the paid Apple Developer
account and the `com.macromom.app` App ID.

## Subscription group

- **Group name:** `MacroMom Pro`
- One group, both products inside (users switch between them, never stack).

## Products

| Product ID | Type | Price | Intro offer |
|---|---|---|---|
| `com.macromom.app.pro.monthly` | Auto-renewing, 1 month | $6.99 | 7-day free trial |
| `com.macromom.app.pro.annual` | Auto-renewing, 1 year | $39.99 | 7-day free trial |

Both products carry the same **7-day introductory free trial** (Intro Offer →
Free Trial → 1 week), so the trial is identical whichever plan the student picks.

## Display metadata (per product)

- Monthly display name: `MacroMom Pro (Monthly)` — description: "Daily plates,
  portion checks, and progress — billed monthly."
- Annual display name: `MacroMom Pro (Annual)` — description: "A full year of
  MacroMom for less than $3.50/month."

## Checklist

- [ ] Subscription group `MacroMom Pro` created
- [ ] Both product IDs created exactly as above (they are referenced by RevenueCat)
- [ ] 7-day free trial intro offer attached to both
- [ ] App-Specific Shared Secret generated (App Information → App-Specific Shared
      Secret) — paste into RevenueCat (see `revenuecat.md`)
- [ ] Paid Apps agreement signed (Agreements, Tax, and Banking)
- [ ] Sandbox tester account created (Users and Access → Sandbox) for TASK-071
