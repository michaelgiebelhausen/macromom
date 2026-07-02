-- MacroMom initial schema (PRD § Data Model).
-- All timestamps TIMESTAMPTZ. RLS is enabled in 0002_rls.sql.

-- profiles: one row per authenticated user (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  goal VARCHAR(30) NOT NULL DEFAULT 'maintain',   -- 'lose_fat' | 'build_muscle' | 'maintain' | 'eat_healthier'
  sex VARCHAR(20),                                -- for macro calc
  age INT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  activity_level VARCHAR(20) DEFAULT 'moderate',  -- 'low' | 'moderate' | 'high'
  target_calories INT,                            -- computed at onboarding
  target_protein_g INT,
  target_carbs_g INT,
  target_fat_g INT,
  notif_meal_windows JSONB DEFAULT '["breakfast","lunch","dinner"]',
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- campuses: seeded; Clemson only for MVP
CREATE TABLE campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(60) UNIQUE NOT NULL,               -- 'clemson'
  timezone VARCHAR(60) NOT NULL DEFAULT 'America/New_York',
  menu_source VARCHAR(40),                        -- 'campusdish' | 'nutrislice' | 'dineoncampus' | 'html'
  menu_source_config JSONB,                       -- source-specific ids/urls
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- dining_halls: per campus
CREATE TABLE dining_halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  external_ref VARCHAR(120),                      -- id in the menu source
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_halls: which halls a user follows (M:N)
CREATE TABLE user_halls (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dining_hall_id UUID NOT NULL REFERENCES dining_halls(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, dining_hall_id)
);

-- menu_days: one row per hall per date per meal period
CREATE TABLE menu_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dining_hall_id UUID NOT NULL REFERENCES dining_halls(id) ON DELETE CASCADE,
  menu_date DATE NOT NULL,
  meal_period VARCHAR(20) NOT NULL,               -- 'breakfast' | 'lunch' | 'dinner'
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dining_hall_id, menu_date, meal_period)
);

-- menu_items: individual foods within a menu_day, with nutrition
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_day_id UUID NOT NULL REFERENCES menu_days(id) ON DELETE CASCADE,
  station VARCHAR(120),                           -- 'Grill', 'Salad Bar', etc.
  name VARCHAR(200) NOT NULL,
  serving_desc VARCHAR(120),                      -- '1 breast', '1 cup'
  calories INT,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  nutrition_source VARCHAR(20) DEFAULT 'scraped', -- 'scraped' | 'estimated'
  tags JSONB,                                     -- ['vegetarian','gluten_free']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- recommendations: generated plates per user per day per meal
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dining_hall_id UUID NOT NULL REFERENCES dining_halls(id),
  menu_date DATE NOT NULL,
  meal_period VARCHAR(20) NOT NULL,
  plates JSONB NOT NULL,                          -- [{items:[menu_item_id...], totals:{...}, why:"..."}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, dining_hall_id, menu_date, meal_period)
);

-- meal_logs: what the user actually ate
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  meal_period VARCHAR(20),
  source_recommendation_id UUID REFERENCES recommendations(id),
  items JSONB,                                    -- chosen items + portions
  total_calories INT,
  total_protein_g NUMERIC,
  total_carbs_g NUMERIC,
  total_fat_g NUMERIC,
  photo_path TEXT,                                -- Supabase Storage key
  portion_feedback JSONB                          -- {verdict, note}
);

-- subscriptions: mirror of RevenueCat entitlement state
CREATE TABLE subscriptions (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'none',     -- 'trial' | 'active' | 'expired' | 'none'
  entitlement VARCHAR(40),                        -- 'pro'
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- push_tokens: device tokens for notifications
CREATE TABLE push_tokens (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform VARCHAR(10) DEFAULT 'ios',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, expo_push_token)
);

-- Indexes (PRD § Indexes; unique constraints above already create their own)
CREATE INDEX idx_menu_items_menu_day ON menu_items (menu_day_id);
CREATE INDEX idx_recommendations_user_date ON recommendations (user_id, menu_date);
CREATE INDEX idx_meal_logs_user_logged ON meal_logs (user_id, logged_at);
CREATE INDEX idx_user_halls_user ON user_halls (user_id);
