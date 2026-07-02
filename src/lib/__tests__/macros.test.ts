import { bmr, calculateTargets, ftInToCm, lbToKg } from '../macros';

describe('bmr (Mifflin-St Jeor)', () => {
  it('matches the textbook male example', () => {
    // 25y, 180cm, 80kg male: 10*80 + 6.25*180 - 5*25 + 5 = 1805
    expect(bmr('male', 25, 180, 80)).toBe(1805);
  });

  it('matches the textbook female example', () => {
    // 20y, 165cm, 60kg female: 600 + 1031.25 - 100 - 161 = 1370.25
    expect(bmr('female', 20, 165, 60)).toBeCloseTo(1370.25);
  });

  it('uses the midpoint constant when sex is unspecified', () => {
    const male = bmr('male', 25, 180, 80);
    const female = bmr('female', 25, 180, 80);
    expect(bmr('unspecified', 25, 180, 80)).toBeCloseTo((male + female) / 2);
  });
});

describe('calculateTargets', () => {
  const college19Male = {
    sex: 'male' as const,
    age: 19,
    heightCm: ftInToCm(5, 11), // ~180cm
    weightKg: lbToKg(165), // ~75kg
    activityLevel: 'moderate' as const,
  };

  it('produces sensible targets for a build_muscle college male', () => {
    const t = calculateTargets({ ...college19Male, goal: 'build_muscle' });
    // TDEE ≈ 1805-ish BMR × 1.55 ≈ 2800; +10% ≈ 3080
    expect(t.calories).toBeGreaterThan(2800);
    expect(t.calories).toBeLessThan(3400);
    expect(t.proteinG).toBe(Math.round(lbToKg(165) * 2.0)); // ~150g
    expect(t.carbsG).toBeGreaterThan(200);
    expect(t.fatG).toBeGreaterThan(50);
  });

  it('cuts calories for lose_fat vs maintain', () => {
    const cut = calculateTargets({ ...college19Male, goal: 'lose_fat' });
    const maintain = calculateTargets({ ...college19Male, goal: 'maintain' });
    expect(cut.calories).toBeLessThan(maintain.calories);
  });

  it('macros reconcile to calories within rounding error (4/4/9)', () => {
    const t = calculateTargets({ ...college19Male, goal: 'maintain' });
    const kcalFromMacros = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    expect(Math.abs(kcalFromMacros - t.calories)).toBeLessThanOrEqual(12);
  });

  it('never returns below the calorie floor', () => {
    const t = calculateTargets({
      sex: 'female',
      age: 22,
      heightCm: 150,
      weightKg: 42,
      activityLevel: 'low',
      goal: 'lose_fat',
    });
    expect(t.calories).toBeGreaterThanOrEqual(1200);
  });

  it('carbs never go negative', () => {
    const t = calculateTargets({
      sex: 'female',
      age: 30,
      heightCm: 148,
      weightKg: 40,
      activityLevel: 'low',
      goal: 'lose_fat',
    });
    expect(t.carbsG).toBeGreaterThanOrEqual(0);
  });
});
