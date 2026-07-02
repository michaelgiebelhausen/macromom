-- Row Level Security (PRD § Security Considerations).
-- User tables: owner-only via auth.uid(). Menu/campus/hall tables: read for
-- authenticated users; writes happen only through the service role (which
-- bypasses RLS), so no write policies are defined for them.

-- ── profiles ─────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── user_halls ───────────────────────────────────────────────────────────
ALTER TABLE user_halls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_halls_all_own" ON user_halls
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── recommendations ──────────────────────────────────────────────────────
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendations_select_own" ON recommendations
  FOR SELECT USING (user_id = auth.uid());
-- inserts/updates come from the recommend Edge Function (service role)

-- ── meal_logs ────────────────────────────────────────────────────────────
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_logs_all_own" ON meal_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── subscriptions ────────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());
-- writes only via revenuecat-webhook Edge Function (service role)

-- ── push_tokens ──────────────────────────────────────────────────────────
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_all_own" ON push_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── shared, read-only reference tables ───────────────────────────────────
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campuses_read_authenticated" ON campuses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "dining_halls_read_authenticated" ON dining_halls
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_days_read_authenticated" ON menu_days
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_items_read_authenticated" ON menu_items
  FOR SELECT TO authenticated USING (true);

-- ── table-level grants (RLS filters on top of these) ─────────────────────
-- Reference tables: read-only for signed-in users.
GRANT SELECT ON campuses, dining_halls, menu_days, menu_items TO authenticated;

-- User-owned tables: full CRUD (row scope enforced by the policies above).
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, user_halls, meal_logs, push_tokens
  TO authenticated;

-- Server-written tables: users may only read their own rows.
GRANT SELECT ON recommendations, subscriptions TO authenticated;

-- The service role (Edge Functions) manages everything.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
