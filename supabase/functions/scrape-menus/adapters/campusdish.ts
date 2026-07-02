// CampusDish / Elevate DXP (Aramark) adapter — covers Clemson.
// Protocol details + live verification notes: ../SOURCE.md
// Queries MUST be sent as GET (the Varnish edge rejects POSTed queries).

import type {
  AdapterResult,
  MealPeriodName,
  MenuAdapter,
  NormalizedMenuItem,
  VendorConfig,
} from './types.ts';

const GET_LOCATION_QUERY = `query getLocation($campus_url_key:String!$location_url_key:String!){getLocation(campusUrlKey:$campus_url_key locationUrlKey:$location_url_key){commerceAttributes{uid url_key hasActiveMenus maxMenusDate children{id name}}}}`;

const GET_RECIPES_QUERY = `query getLocationRecipes($campusUrlKey:String!$locationUrlKey:String!$date:String!$mealPeriod:Int$viewType:Commerce_MenuViewType!){getLocationRecipes(campusUrlKey:$campusUrlKey locationUrlKey:$locationUrlKey date:$date mealPeriod:$mealPeriod viewType:$viewType){locationRecipesMap{stationSkuMap{id skus}}products{items{name sku attributes{name value}}}}}`;

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

interface GqlProduct {
  name: string;
  sku: string;
  attributes: { name: string; value: string }[] | null;
}

async function gqlGet<T>(
  config: VendorConfig,
  query: string,
  variables: Record<string, unknown>,
  operationName: string,
): Promise<T> {
  const params = new URLSearchParams({
    query,
    variables: JSON.stringify(variables),
    operationName,
  });
  const res = await fetch(`${config.mesh_url}?${params}`, {
    headers: {
      accept: 'application/graphql-response+json,application/json;q=0.9',
      'user-agent': DEFAULT_UA,
      ...(config.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`campusdish mesh ${operationName} HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(
      `campusdish mesh ${operationName}: ${JSON.stringify(json.errors[0]).slice(0, 300)}`,
    );
  }
  return json.data as T;
}

function attrMap(product: GqlProduct): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of product.attributes ?? []) map.set(a.name, a.value);
  return map;
}

function num(map: Map<string, string>, key: string): number | null {
  const raw = map.get(key);
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const campusdishAdapter: MenuAdapter = {
  vendor: 'campusdish',

  async fetchDayMenu(
    config: VendorConfig,
    campusSlug: string,
    hallExternalRef: string,
    date: string,
    mealPeriod: MealPeriodName,
  ): Promise<AdapterResult> {
    const campusUrlKey = config.campus_url_key ?? 'campus';

    // 1. Hall status + station names
    const locData = await gqlGet<{
      getLocation: {
        commerceAttributes: {
          hasActiveMenus: boolean;
          maxMenusDate: string | null;
          children: { id: number; name: string }[] | null;
        };
      } | null;
    }>(
      config,
      GET_LOCATION_QUERY,
      { campus_url_key: campusUrlKey, location_url_key: hallExternalRef },
      'getLocation',
    );

    const loc = locData.getLocation?.commerceAttributes;
    if (!loc || !loc.hasActiveMenus) return { status: 'closed', items: [] };
    if (loc.maxMenusDate && date > loc.maxMenusDate) return { status: 'not_posted', items: [] };

    const stationNames = new Map<number, string>();
    for (const child of loc.children ?? []) stationNames.set(child.id, child.name);

    // 2. The day's menu for this meal period
    const mealPeriodId = config.meal_period_ids?.[mealPeriod];
    const recData = await gqlGet<{
      getLocationRecipes: {
        locationRecipesMap: { stationSkuMap: { id: number; skus: string[] }[] | null } | null;
        products: { items: GqlProduct[] | null } | null;
      } | null;
    }>(
      config,
      GET_RECIPES_QUERY,
      {
        campusUrlKey,
        locationUrlKey: hallExternalRef,
        date,
        mealPeriod: mealPeriodId,
        viewType: 'DAILY',
      },
      'getLocationRecipes',
    );

    const products = recData.getLocationRecipes?.products?.items ?? [];
    if (products.length === 0) return { status: 'not_posted', items: [] };

    // sku → station name (first station wins when a sku appears at several)
    const skuStation = new Map<string, string>();
    for (const st of recData.getLocationRecipes?.locationRecipesMap?.stationSkuMap ?? []) {
      const name = stationNames.get(st.id) ?? null;
      if (!name) continue;
      for (const sku of st.skus) {
        if (!skuStation.has(sku)) skuStation.set(sku, name);
      }
    }

    const items: NormalizedMenuItem[] = [];
    const seen = new Set<string>();
    for (const product of products) {
      const attrs = attrMap(product);
      // Skip raw ingredients and web-hidden rows — they aren't plate choices.
      if (attrs.get('ingredient_item') === 'yes') continue;
      if (attrs.get('is_hide_from_web_menu') === 'yes') continue;

      const name = (attrs.get('marketing_name') || product.name || '').trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const calories = num(attrs, 'calories');
      const protein = num(attrs, 'protein');
      const carbs = num(attrs, 'total_carbohydrates');
      const fat = num(attrs, 'total_fat');
      const hasMacros = calories !== null && protein !== null && carbs !== null && fat !== null;

      items.push({
        campus: campusSlug,
        location: hallExternalRef,
        meal_period: mealPeriod,
        date,
        station: skuStation.get(product.sku) ?? null,
        item_name: name,
        serving_size: attrs.get('serving_combined')?.trim() || null,
        calories: calories === null ? null : Math.round(calories),
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        source: 'vendor',
        confidence: hasMacros ? 1 : 0, // 0 ⇒ estimation fallback fills + reflags
        tags: [],
      });
    }

    return { status: 'ok', items };
  },
};
