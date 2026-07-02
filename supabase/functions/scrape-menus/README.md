# scrape-menus — ops guide (TASK-030)

Scheduled daily at 09:30 UTC (~5:30 AM ET) by `pg_cron` (migration `0004_cron_scrape.sql`).
Menu source details + recapture instructions: `SOURCE.md`.

## Manual trigger (local stack)

```bash
# from the repo root, with `npx supabase start` running:
npx supabase functions serve scrape-menus --no-verify-jwt &
curl -X POST "http://127.0.0.1:54321/functions/v1/scrape-menus" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY from `npx supabase status`>"
```

## Manual trigger (hosted project)

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/scrape-menus" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

## Re-run a specific date

Append `?date=YYYY-MM-DD`:

```bash
curl -X POST ".../functions/v1/scrape-menus?date=2026-08-20" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

The run is idempotent: `menu_days` upserts on `(hall, date, meal_period)` and the
day's `menu_items` are replaced wholesale. A hall that is closed (`closed`) or has
no posted menu (`not_posted`) produces **no** `menu_day` and leaves prior data
untouched.

## Response shape

```json
{ "ok": true, "summary": [
  { "hall": "The Dish at McAlister", "mealPeriod": "lunch", "status": "ok", "items": 42, "estimated": 17 },
  { "hall": "Schilletter Dining Hall", "mealPeriod": "lunch", "status": "closed", "items": 0 }
] }
```

## Required function secrets

`OPENROUTER_API_KEY` (estimation; skipped gracefully if missing), `USDA_API_KEY`
(optional, DEMO_KEY fallback), `SENTRY_DSN` (alerting). Set via
`npx supabase secrets set KEY=value` on the hosted project.
