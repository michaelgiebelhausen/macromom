-- Cache for grounded macro estimates, keyed on normalized item name + serving
-- (PRD § Menu Ingestion Architecture Tier 2). Service-role access only.

CREATE TABLE estimate_cache (
  cache_key TEXT PRIMARY KEY,          -- normalized_name|serving
  calories INT,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE estimate_cache ENABLE ROW LEVEL SECURITY;
-- no policies: only the service role (bypasses RLS) touches this table
GRANT ALL ON estimate_cache TO service_role;
