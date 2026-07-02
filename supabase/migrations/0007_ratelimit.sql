-- Fixed-window rate-limit counters (TASK-065). Service-role only.

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,               -- bucket:user:window_start
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON rate_limits TO service_role;

-- Atomic increment; returns the post-increment count for the window.
CREATE OR REPLACE FUNCTION increment_rate_limit(p_key TEXT, p_window_start TIMESTAMPTZ)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO new_count;

  -- Opportunistic cleanup of stale windows (> 1 hour old).
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';

  RETURN new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_rate_limit(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_rate_limit(TEXT, TIMESTAMPTZ) TO service_role;
