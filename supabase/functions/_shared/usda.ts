// USDA FoodData Central search — grounding source for macro estimation.
// Free API; DEMO_KEY works for low volume. https://fdc.nal.usda.gov/api-guide

export interface UsdaCandidate {
  description: string;
  dataType: string;
  /** per 100 g */
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
}

const NUTRIENT_IDS = { calories: 1008, protein: 1003, carbs: 1005, fat: 1004 } as const;

export async function searchUsda(query: string, limit = 5): Promise<UsdaCandidate[]> {
  const key = Deno.env.get('USDA_API_KEY') ?? 'DEMO_KEY';
  const params = new URLSearchParams({
    api_key: key,
    query,
    pageSize: String(limit),
    dataType: 'Foundation,SR Legacy,Survey (FNDDS)',
  });
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`usda HTTP ${res.status}`);
  const json = await res.json();

  return (json.foods ?? []).map(
    (food: {
      description: string;
      dataType: string;
      foodNutrients?: { nutrientId: number; value: number }[];
    }) => {
      const nutrient = (id: number) =>
        food.foodNutrients?.find((n) => n.nutrientId === id)?.value ?? null;
      return {
        description: food.description,
        dataType: food.dataType,
        caloriesPer100g: nutrient(NUTRIENT_IDS.calories),
        proteinPer100g: nutrient(NUTRIENT_IDS.protein),
        carbsPer100g: nutrient(NUTRIENT_IDS.carbs),
        fatPer100g: nutrient(NUTRIENT_IDS.fat),
      };
    },
  );
}
