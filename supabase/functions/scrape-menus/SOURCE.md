# Clemson Menu Source — CampusDish / Elevate DXP (Aramark)

**Status: RESOLVED & LIVE-VERIFIED** on 2026-07-02 (46 lunch items with full macros
returned for The Dish at McAlister).

Clemson has **completed** the Aramark migration to Elevate DXP. The legacy REST feed
(`api.campusdish.com/v1/...`) now returns 500 and must not be used. The public menu
site is `clemson.mydininghub.com` (campusdish.com redirects there); all data flows
through one GraphQL mesh.

## Endpoint

```
GET https://api.elevate-dxp.com/api/mesh/c087f756-cc72-4649-a36f-3a41b700c519/graphql
    ?query=<url-encoded GraphQL>&variables=<url-encoded JSON>&operationName=<name>
```

- **Queries must be sent as GET** (Varnish returns 455 for POSTed queries; POST is
  for mutations only). Responses are edge-cached — polite by design.
- Tenant id `c087f756-cc72-4649-a36f-3a41b700c519` = Clemson ("campus" campusUrlKey).

## Required headers (captured from the live site 2026-07-02)

```
x-api-key: ElevateAPIProd
store: ch_clemson_en
magento-website-code: ch_clemson
magento-store-code: ch_clemson
magento-store-view-code: ch_clemson_en
magento-customer-group: b6589fc6ab0dc82cf12099d1c2d40ab994e8410c   (guest group hash)
aem-elevate-clientpath: ch/clemson/en
accept: application/graphql-response+json,application/json;q=0.9
referer: https://clemson.mydininghub.com/
user-agent: <normal browser UA>
```

Missing `store` → Varnish 450; wrong method → 455; missing `x-api-key` → 403.

## Key queries

1. **getLocations** — all campus locations. `variables: {"campus_url_key":"campus"}`.
   Residential dining halls have `location_category_ids` containing
   `aramark_location_category_global_2`.
2. **getLocation** — per-hall detail: `hasActiveMenus` (false = closed/no menus, e.g.
   Schilletter in summer), `maxMenusDate` (last date with a published menu),
   `children` (station id → name map), `display_nutrition_information`.
   `variables: {"campus_url_key":"campus","location_url_key":"<url_key>"}`.
3. **getLocationRecipes** — the menu itself:
   ```
   variables: {"campusUrlKey":"campus","locationUrlKey":"<url_key>",
               "date":"YYYY-MM-DD","mealPeriod":<int>,"viewType":"DAILY"}
   ```
   Returns `locationRecipesMap.stationSkuMap` (station id → skus) and
   `products.items[]` with `attributes[{name,value}]`.

Full query texts live in `adapters/campusdish.ts`.

## Meal period IDs (Commerce_mealPeriods)

| id | name |
|----|------|
| 10 | Breakfast |
| 25 | Lunch |
| 16 | Dinner |
| 13 | Brunch |
| 28/1/53 | Morning Snack / Afternoon Snack / Limited Dinner |

## Clemson residential halls (live 2026-07-02)

| Hall | url_key (= dining_halls.external_ref) | uid | notes |
|------|--------------------------------------|-----|-------|
| Schilletter Dining Hall | `schilletter-dining-hall` | NDIw | hasActiveMenus=false in summer |
| The Dish at McAlister | `the-dish-at-mcalister` | NDk1 | active; verified full macros |
| Community Hub | `community-hub` | NDcx | active (Douthit Hills area) |

## Nutrition attributes on each product

`calories`, `protein`, `total_carbohydrates`, `total_fat`, `saturated_fat`,
`trans_fat`, `dietary_fiber`, `sugars`, `sodium`, `cholesterol`, `calcium`, `iron`,
`serving_size` + `serving_unit` (+ `serving_combined`, e.g. "3 ozw"),
`allergen_statement`, `marketing_name`, `marketing_description`, `recipe_id`.

Values are strings like `"25.515000"` — parse as float, per serving.
~40% of returned items (configurable parents/variants) lack macro attributes —
those go through the grounded estimation fallback (`estimate.ts`) and are flagged
`nutrition_source='estimated'`.

## Risks / recapture

- Headers or the guest-group hash may change as Aramark iterates on Elevate. If the
  scraper starts getting 403/450, re-run the capture (headless browser on
  `clemson.mydininghub.com/en/location/<hall>`, filter `api.elevate-dxp.com`) and
  update `campuses.menu_source_config`.
- `hasActiveMenus=false` ⇒ create no menu_day (warm "closed today" state), not an error.
- Never trust `allergen_statement` gaps; allergens come only from the vendor.
