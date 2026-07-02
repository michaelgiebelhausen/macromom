// Deterministic macro-fit scoring pass (TASK-031, PRD § Open Questions #3).
// Runs BEFORE the model: filters noise, ranks by goal fit, and provides the
// fallback plate builder when the model is unavailable. Pure functions only.

export interface ScorableItem {
  id: string;
  name: string;
  station: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export interface MacroTargetSet {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type Goal = 'lose_fat' | 'build_muscle' | 'maintain' | 'eat_healthier';
export type MealPeriodName = 'breakfast' | 'lunch' | 'dinner';

/** Share of the daily budget assigned to each meal. */
export const MEAL_SHARE: Record<MealPeriodName, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.4,
};

export function mealTargets(daily: MacroTargetSet, meal: MealPeriodName): MacroTargetSet {
  const share = MEAL_SHARE[meal];
  return {
    calories: Math.round(daily.calories * share),
    protein_g: Math.round(daily.protein_g * share),
    carbs_g: Math.round(daily.carbs_g * share),
    fat_g: Math.round(daily.fat_g * share),
  };
}

/** Protein emphasis by goal (relative weight of protein density in the score). */
const PROTEIN_WEIGHT: Record<Goal, number> = {
  lose_fat: 2.0,
  build_muscle: 2.0,
  maintain: 1.2,
  eat_healthier: 1.0,
};

const NOISE_PATTERN =
  /\b(ketchup|mustard|mayo|mayonnaise|ranch|dressing|syrup|jelly|jam|butter|creamer|sauce|salsa|relish|sprinkles|croutons|coffee|tea|water|ice)\b/i;

/** Items worth putting on a plate: have macros and aren't condiments. */
export function isPlateWorthy(item: ScorableItem): boolean {
  return (
    item.calories !== null &&
    item.protein_g !== null &&
    item.carbs_g !== null &&
    item.fat_g !== null &&
    item.calories >= 40 &&
    !NOISE_PATTERN.test(item.name)
  );
}

/**
 * Score a single item for this user's meal. Higher = better fit.
 * Protein density dominates for muscle/fat goals; oversized single items
 * (> 80% of the meal's calorie budget) are penalized.
 */
export function scoreItem(item: ScorableItem, meal: MacroTargetSet, goal: Goal): number {
  if (!isPlateWorthy(item)) return -Infinity;
  const cal = item.calories!;
  const proteinDensity = item.protein_g! / Math.max(cal, 1); // g per kcal
  let score = proteinDensity * 100 * PROTEIN_WEIGHT[goal];

  // Reasonably sized building blocks beat monoliths.
  if (cal > meal.calories * 0.8) score -= 5;
  // A little reward for substantial (non-trivial) items.
  if (cal >= 120 && cal <= meal.calories * 0.6) score += 2;
  return score;
}

export function rankItems(
  items: ScorableItem[],
  daily: MacroTargetSet,
  meal: MealPeriodName,
  goal: Goal,
): ScorableItem[] {
  const targets = mealTargets(daily, meal);
  return items
    .filter(isPlateWorthy)
    .map((item) => ({ item, score: scoreItem(item, targets, goal) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}

export function plateTotals(items: ScorableItem[]): MacroTargetSet {
  return {
    calories: Math.round(items.reduce((s, i) => s + (i.calories ?? 0), 0)),
    protein_g: Math.round(items.reduce((s, i) => s + (i.protein_g ?? 0), 0)),
    carbs_g: Math.round(items.reduce((s, i) => s + (i.carbs_g ?? 0), 0)),
    fat_g: Math.round(items.reduce((s, i) => s + (i.fat_g ?? 0), 0)),
  };
}

/** How close a plate is to the meal targets (0 = perfect; lower magnitude better). */
export function plateDeviation(totals: MacroTargetSet, meal: MacroTargetSet): number {
  const calDev = Math.abs(totals.calories - meal.calories) / Math.max(meal.calories, 1);
  // Protein below target hurts double — protein is the promise.
  const proteinGap = (meal.protein_g - totals.protein_g) / Math.max(meal.protein_g, 1);
  const proteinDev = proteinGap > 0 ? proteinGap * 2 : Math.abs(proteinGap) * 0.5;
  return calDev + proteinDev;
}

const FALLBACK_WHY: Record<Goal, string[]> = {
  build_muscle: [
    'Protein front and center — exactly what your muscles ordered.',
    'This one keeps the gains coming without overthinking it.',
    'Solid fuel: high protein, steady carbs. Go get it.',
  ],
  lose_fat: [
    'Filling and high-protein while keeping calories honest.',
    'Big on protein, easy on calories — right on plan.',
    'This plate keeps you full without blowing the budget.',
  ],
  maintain: [
    'Nicely balanced — right in your everyday sweet spot.',
    'Steady as she goes: balanced macros, no drama.',
    'A comfortable, balanced plate that fits your day.',
  ],
  eat_healthier: [
    'A well-rounded plate — simple, real food.',
    'Balanced and easy — a genuinely good choice today.',
    'Nothing fancy, just a solid healthy plate.',
  ],
};

export interface FallbackPlate {
  item_ids: string[];
  why: string;
}

/**
 * Greedy fallback composer (model unavailable / timeout): build up to `count`
 * plates from the ranked list, each anchored on a different top item.
 */
export function buildFallbackPlates(
  ranked: ScorableItem[],
  daily: MacroTargetSet,
  meal: MealPeriodName,
  goal: Goal,
  count = 3,
): FallbackPlate[] {
  const targets = mealTargets(daily, meal);
  const plateCount = Math.min(count, Math.max(1, Math.floor(ranked.length / 2)));

  // Round-robin partition so each plate draws from a distinct item pool —
  // otherwise every fallback plate is the same top items reshuffled.
  const pools: ScorableItem[][] = Array.from({ length: plateCount }, () => []);
  ranked.forEach((item, i) => pools[i % plateCount].push(item));

  const plates: FallbackPlate[] = [];
  pools.forEach((pool, poolIndex) => {
    const plate: ScorableItem[] = [];
    for (const item of pool) {
      if (plate.length >= 4) break;
      const nextTotals = plateTotals([...plate, item]);
      if (nextTotals.calories <= targets.calories * 1.15) plate.push(item);
    }
    if (plate.length >= 2) {
      plates.push({
        item_ids: plate.map((i) => i.id),
        why: FALLBACK_WHY[goal][poolIndex % FALLBACK_WHY[goal].length],
      });
    }
  });
  return plates;
}
