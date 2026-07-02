-- Seed: Clemson campus + active residential dining halls (TASK-014, TASK-022).
-- Halls + external_refs live-verified against the Elevate DXP mesh on 2026-07-02
-- (see supabase/functions/scrape-menus/SOURCE.md). external_ref = Elevate url_key.

INSERT INTO campuses (name, slug, timezone, menu_source, menu_source_config)
VALUES (
  'Clemson University',
  'clemson',
  'America/New_York',
  'campusdish',
  '{
    "vendor": "campusdish-elevate",
    "campus_url_key": "campus",
    "tenant_id": "c087f756-cc72-4649-a36f-3a41b700c519",
    "mesh_url": "https://api.elevate-dxp.com/api/mesh/c087f756-cc72-4649-a36f-3a41b700c519/graphql",
    "headers": {
      "x-api-key": "ElevateAPIProd",
      "store": "ch_clemson_en",
      "magento-website-code": "ch_clemson",
      "magento-store-code": "ch_clemson",
      "magento-store-view-code": "ch_clemson_en",
      "magento-customer-group": "b6589fc6ab0dc82cf12099d1c2d40ab994e8410c",
      "aem-elevate-clientpath": "ch/clemson/en",
      "referer": "https://clemson.mydininghub.com/"
    },
    "meal_period_ids": { "breakfast": 10, "lunch": 25, "dinner": 16 }
  }'::jsonb
);

INSERT INTO dining_halls (campus_id, name, external_ref, active)
SELECT c.id, h.name, h.external_ref, TRUE
FROM campuses c,
  (VALUES
    ('Schilletter Dining Hall', 'schilletter-dining-hall'),
    ('The Dish at McAlister', 'the-dish-at-mcalister'),
    ('Community Hub', 'community-hub')
  ) AS h(name, external_ref)
WHERE c.slug = 'clemson';
