// Vendor-adapter contract (PRD § Menu Ingestion Architecture).
// Every vendor adapter emits this normalized record so Nutrislice / Dine On
// Campus / Bite adapters can be added later without touching callers.

export type MealPeriodName = 'breakfast' | 'lunch' | 'dinner';

export interface NormalizedMenuItem {
  /** campuses.slug */
  campus: string;
  /** dining_halls.external_ref in the vendor's namespace */
  location: string;
  meal_period: MealPeriodName;
  /** YYYY-MM-DD in the campus timezone */
  date: string;
  station: string | null;
  item_name: string;
  serving_size: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  /** 'vendor' = authoritative from the source; 'estimated' = grounded fallback */
  source: 'vendor' | 'estimated';
  /** 0..1 — vendor data is 1.0; estimates carry the estimator's confidence */
  confidence: number;
  tags: string[];
}

/** campuses.menu_source_config (vendor-specific shape, stored as JSONB). */
export interface VendorConfig {
  vendor: string;
  campus_url_key?: string;
  mesh_url?: string;
  headers?: Record<string, string>;
  meal_period_ids?: Record<MealPeriodName, number>;
  [key: string]: unknown;
}

export type MenuFetchStatus =
  | 'ok' // menu found, items returned
  | 'closed' // hall not serving (no menu_day should be created)
  | 'not_posted'; // hall active but menu missing/empty for this date/meal

export interface AdapterResult {
  status: MenuFetchStatus;
  items: NormalizedMenuItem[];
}

export interface MenuAdapter {
  vendor: string;
  fetchDayMenu(
    config: VendorConfig,
    campusSlug: string,
    hallExternalRef: string,
    date: string,
    mealPeriod: MealPeriodName,
  ): Promise<AdapterResult>;
}
