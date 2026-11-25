import { FLOUR_NAMES, type FlourKey, type Recipe, type Settings } from './recipes.ts';
import { isWeighed } from './addins.ts';

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
/** The added hydration that gives a total hydration exactly. */
export function addedHydration(total: number, s: Settings) {
  const leaven = leavenFractions(s);
  return clean(total * (1 + (s.leaven * leaven.flour) / 100) - s.leaven * leaven.water);
}
/**
 * The added hydration to save for a total hydration typed or slid to (decision 30). The flour stays, so only the
 * water changes, and it is a whole number of grams per loaf whenever that still shows the total given, as it does for
 * every recipe's 500 g of flour. Never below no added water.
 */
export function hydrationFor(total: number, s: Settings) {
  const exact = Math.max(0, addedHydration(total, s));
  if (!(s.loafFlour > 0)) return exact;
  const whole = (Math.round((s.loafFlour * exact) / 100) / s.loafFlour) * 100;
  return Math.round(totalHydration({ ...s, hydration: whole })) === Math.round(total) ? whole : exact;
}

/** A recipe's ingredients that count in the dough's weight but not its flour or hydration, as a percentage of the flour. */
export function extraPercent(recipe: Recipe) {
  const weighed = (recipe.addIns?.items ?? []).filter(isWeighed);
  return [...(recipe.extras ?? []), ...weighed].reduce((a, x) => a + x.percent, 0);
}

export type Weighed = [name: string, grams: number];

/**
 * The weights for a recipe's settings: the dough's flour, water, leaven and salt, each flour's share, any dry
 * ingredients that are not flour (`extras`), the two mixing stages, the weighed add-ins worked in during bulk
 * (`addIns`), the dough's weight in all and per loaf, and the leaven build made, used, kept or still needed. The flour
 * is the loaves' flour, and everything else follows from it (decision 30). Extras and weighed add-ins count in the
 * dough's weight but not its hydration. The water held back is never more than the water. Null when there is no
 * flour to scale from.
 */
export function formula(recipe: Recipe, s: Settings) {
  const flour = s.count * s.loafFlour,
    part = (key: FlourKey) => s.flours[key] || 0,
    parts = recipe.flours.reduce((a, k) => a + part(k), 0),
    weighed = (recipe.addIns?.items ?? []).filter(isWeighed);
  if (parts <= 0 || !Number.isFinite(flour) || !(flour > 0)) return null;
  const total = flour * (1 + (s.hydration + s.leaven + s.salt + extraPercent(recipe)) / 100),
    water = (flour * s.hydration) / 100,
    used = (flour * s.leaven) / 100,
    salt = (flour * s.salt) / 100,
    finalWater = Math.min(water, (flour * s.held) / 100);
  const flours = recipe.flours.map((key) => ({
    key,
    name: FLOUR_NAMES[key],
    grams: clean((flour * part(key)) / parts),
    percent: (100 * part(key)) / parts,
  }));
  // The book's Tartine method puts the leaven in the initial mix; a Tartine recipe with its own autolyse adds it later.
  const tartine = recipe.method === 'tartine' && !recipe.autolyse;
  // Dry ingredients that are not flour, such as wheat germ, go in with the first flours.
  const extras: Weighed[] = (recipe.extras ?? []).map((x) => [x.name, (flour * x.percent) / 100]);
  // Weighed add-ins, such as Oat Porridge's porridge, go in during bulk, at the add-in step (decision 27).
  const addIns: Weighed[] = weighed.map((x) => [x.name, (flour * x.percent) / 100]);
  const initial: Weighed[] = [
    ...flours.filter((f) => f.grams > 0 && !recipe.late.includes(f.key)).map((f): Weighed => [f.name, f.grams]),
    ...extras,
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
    loafWeight: total / s.count,
    flour,
    water,
    used,
    salt,
    hydration: s.hydration,
    totalHydration: totalHydration(s),
    totalFlour,
    totalWater,
    flours,
    extras,
    addIns,
    initial,
    final,
    madeParts,
    made,
    reserve: balance(made - used),
    shortfall: balance(used - made),
  };
}
export type Formula = NonNullable<ReturnType<typeof formula>>;
