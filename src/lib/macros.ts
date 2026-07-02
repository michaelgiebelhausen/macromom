/**
 * Macro-target calculation (PRD § Open Questions #2, FR-002).
 *
 * Methodology: Mifflin-St Jeor BMR × activity multiplier, adjusted by goal,
 * protein set per kg of bodyweight, fat as a % of calories, carbs the remainder.
 *
 * ⚠️ The CONSTANTS below are a documented, sensible baseline. They are designed
 * to be swapped 1:1 with Alyssa's certified methodology numbers — change the
 * values, not the shape.
 */

export type Goal = 'lose_fat' | 'build_muscle' | 'maintain' | 'eat_healthier';
export type ActivityLevel = 'low' | 'moderate' | 'high';
export type Sex = 'male' | 'female' | 'unspecified';

export interface MacroInputs {
  sex: Sex;
  age: number; // years
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// ── Replaceable constants (Alyssa's methodology plugs in here) ─────────────

/** TDEE = BMR × activity multiplier. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  low: 1.35,
  moderate: 1.55,
  high: 1.75,
};

/** Calorie adjustment applied to TDEE per goal (fraction). */
export const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  lose_fat: -0.2,
  build_muscle: 0.1,
  maintain: 0,
  eat_healthier: 0,
};

/** Protein grams per kg of bodyweight per goal. */
export const PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose_fat: 2.0,
  build_muscle: 2.0,
  maintain: 1.6,
  eat_healthier: 1.6,
};

/** Fat share of total calories per goal (fraction). */
export const FAT_CALORIE_SHARE: Record<Goal, number> = {
  lose_fat: 0.25,
  build_muscle: 0.25,
  maintain: 0.3,
  eat_healthier: 0.3,
};

/** Never recommend below this calorie floor (safety). */
export const CALORIE_FLOOR = 1200;

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

// ── Calculation ────────────────────────────────────────────────────────────

/** Mifflin-St Jeor BMR. `unspecified` sex uses the midpoint of both constants. */
export function bmr(sex: Sex, age: number, heightCm: number, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const sexConstant = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return base + sexConstant;
}

export function calculateTargets(inputs: MacroInputs): MacroTargets {
  const tdee =
    bmr(inputs.sex, inputs.age, inputs.heightCm, inputs.weightKg) *
    ACTIVITY_MULTIPLIERS[inputs.activityLevel];

  const calories = Math.max(
    CALORIE_FLOOR,
    Math.round(tdee * (1 + GOAL_CALORIE_ADJUSTMENT[inputs.goal])),
  );

  const proteinG = Math.round(inputs.weightKg * PROTEIN_G_PER_KG[inputs.goal]);
  const fatG = Math.round((calories * FAT_CALORIE_SHARE[inputs.goal]) / KCAL_PER_G.fat);
  const carbsG = Math.max(
    0,
    Math.round(
      (calories - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat) / KCAL_PER_G.carbs,
    ),
  );

  return { calories, proteinG, carbsG, fatG };
}

// ── Unit helpers (US units in UI, metric in storage) ───────────────────────

export const lbToKg = (lb: number): number => lb * 0.45359237;
export const kgToLb = (kg: number): number => kg / 0.45359237;
export const ftInToCm = (ft: number, inches: number): number => (ft * 12 + inches) * 2.54;
