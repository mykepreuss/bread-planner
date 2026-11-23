import { FLOUR_NAMES, type FlourKey, type Recipe, type Settings } from './recipes.ts';

/** Tiny values from subtracting nearly equal numbers count as zero. */
const clean = (n: number) => (Math.abs(n) < 1e-12 ? 0 : n);
/** Leaven balances compare sums of separately scaled parts, so sub-microgram differences are arithmetic noise, not a deficit. */
const balance = (n: number) => Math.max(0, Math.abs(n) < 1e-6 ? 0 : n);

/**
 * The flour and water shares of the leaven. Mature starter is half flour and half water. Only the portion of the build
 * used in the dough counts; an empty build is taken as 100% hydration.
 */
function leavenFractions(s: Settings) {
  const flour = s.build.starter / 2 + s.build.flour + s.build.wheat,
    water = s.build.starter / 2 + s.build.water,
    total = flour + water;
  return total > 0 ? { flour: flour / total, water: water / total } : { flour: 0.5, water: 0.5 };
}

/** Total hydration: all the water over all the flour, counting the leaven used. Settings store added hydration. */
export function totalHydration(s: Settings) {
  const leaven = leavenFractions(s);
  return (s.hydration + s.leaven * leaven.water) / (1 + (s.leaven * leaven.flour) / 100);
}
/** The added hydration that gives a total hydration, so typing a total keeps the dough weight. */
export function addedHydration(total: number, s: Settings) {
  const leaven = leavenFractions(s);
  return clean(total * (1 + (s.leaven * leaven.flour) / 100) - s.leaven * leaven.water);
}

export type Weighed = [name: string, grams: number];

/**
 * The weights for a recipe's settings: the dough's flour, water, leaven and salt, each flour's share, the two mixing
 * stages, and the leaven build made, used, kept or still needed. Null when there is no flour to scale from.
 */
export function formula(recipe: Recipe, s: Settings) {
  const total = s.count * s.weight,
    part = (key: FlourKey) => s.flours[key] || 0,
    parts = recipe.flours.reduce((a, k) => a + part(k), 0),
    denominator = 1 + (s.hydration + s.leaven + s.salt) / 100;
  if (parts <= 0 || !Number.isFinite(total) || denominator <= 0) return null;
  const flour = total / denominator,
    water = (flour * s.hydration) / 100,
    used = (flour * s.leaven) / 100,
    salt = (flour * s.salt) / 100,
    finalWater = (water * s.reserve) / 100;
  const flours = recipe.flours.map((key) => ({
    key,
    name: FLOUR_NAMES[key],
    grams: clean((flour * part(key)) / parts),
    percent: (100 * part(key)) / parts,
  }));
  // The book's Tartine method puts the leaven in the initial mix; a Tartine recipe with its own autolyse adds it later.
  const tartine = recipe.method === 'tartine' && !recipe.autolyse;
  const initial: Weighed[] = [
    ...flours.filter((f) => f.grams > 0 && !recipe.late.includes(f.key)).map((f): Weighed => [f.name, f.grams]),
    ['Water', water - finalWater],
  ];
  if (tartine) initial.unshift(['Leaven used', used]);
  const final: Weighed[] = [
    ...flours.filter((f) => f.grams > 0 && recipe.late.includes(f.key)).map((f): Weighed => [f.name, f.grams]),
    ...(tartine ? [] : [['Leaven used', used] as Weighed]),
    ['Salt', salt],
    ['Water', finalWater],
  ];
  const madeParts = [s.build.starter, s.build.flour, s.build.wheat, s.build.water].map((g) => (g * flour) / 1000),
    made = madeParts.reduce((a, b) => a + b, 0);
  const leaven = leavenFractions(s),
    totalFlour = flour + used * leaven.flour,
    totalWater = water + used * leaven.water;
  return {
    total,
    flour,
    water,
    used,
    salt,
    hydration: s.hydration,
    totalHydration: totalHydration(s),
    totalFlour,
    totalWater,
    flours,
    initial,
    final,
    madeParts,
    made,
    reserve: balance(made - used),
    shortfall: balance(used - made),
  };
}
export type Formula = NonNullable<ReturnType<typeof formula>>;
