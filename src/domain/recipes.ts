import type { AddIns } from './addins.ts';

/**
 * The two recipes, Preuss House and Original Tartine, as data. Each default is written as the sum it came from in the
 * source spreadsheet or the book, so it equals the value the app has always started with. White & Whole Wheat, Red
 * Spring & Rye, Five-Flour and Four-Flour Sourdough were removed at Michael's request on November 22, 2026, with the
 * flours only they used; they are in git history.
 */

export type FlourKey = 'anita' | 'white' | 'wheat' | 'rye';
export const FLOUR_NAMES: Record<FlourKey, string> = {
  anita: "Anita's all-purpose flour",
  white: 'White-bread flour',
  wheat: 'Whole-wheat flour',
  rye: 'Rye flour',
};

/** A flour name as it reads mid-sentence: lowercase, except a name that starts with a proper noun. */
export function inSentence(name: string) {
  return /^Anita's/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1).toLowerCase();
}

/**
 * What a baker sets for a recipe. Percentages are of added flour, except `reserve`, the share of added water held
 * back for the final mix. `hydration` is added water; the screen shows total hydration (see `totalHydration`). The
 * leaven build is in grams per 1,000 g of added flour.
 */
export type Settings = {
  count: number;
  weight: number;
  hydration: number;
  leaven: number;
  salt: number;
  reserve: number;
  flours: Partial<Record<FlourKey, number>>;
  build: { starter: number; flour: number; wheat: number; water: number };
};

/**
 * `method` is how the dough is mixed and timed (see methods.ts). `late` flours go into the final mix. `buildFlour`
 * is the flour in the leaven build besides whole wheat. `addIns`, for Tartine recipes only, are worked in after the
 * first turn (see addins.ts).
 */
export type Recipe = {
  id: string;
  name: string;
  description: string;
  method: 'house' | 'tartine';
  flours: FlourKey[];
  late: FlourKey[];
  buildFlour: FlourKey;
  addIns?: AddIns;
  defaults: Settings;
};

/** A part as a percentage of a whole, in the order the source formulas divide. */
const share = (part: number, whole: number) => (part / whole) * 100;
/** The House leaven build, per 1,000 g of added flour. */
const houseBuild = { starter: 28, flour: 71, wheat: 71, water: 142 };

export const RECIPES: Recipe[] = [
  {
    id: 'house',
    name: 'Preuss House',
    description: "Anita's all-purpose flour with whole wheat and rye. Autolyse, then an overnight cold proof.",
    method: 'house',
    flours: ['anita', 'wheat', 'rye'],
    late: ['rye'],
    buildFlour: 'anita',
    // 800 g Anita's, 100 g whole wheat, 100 g rye; 780 g water with 100 g held back; 200 g leaven; 20 g salt.
    defaults: {
      count: 2,
      weight: 1000,
      hydration: 78,
      leaven: 20,
      salt: 2,
      reserve: share(100, 780),
      flours: { anita: 80, wheat: 10, rye: 10 },
      build: { ...houseBuild },
    },
  },
  {
    id: 'tartine',
    name: 'Original Tartine',
    description:
      'The book’s 90/10 white and whole-wheat loaf, with leaven in the initial mix. Its 12-hour leaven suits an evening start.',
    method: 'tartine',
    flours: ['white', 'wheat'],
    late: [],
    buildFlour: 'white',
    // 900 g white, 100 g whole wheat; 750 g water with 50 g held back; 200 g leaven; 20 g salt; 1 tbsp (15 g) starter.
    defaults: {
      count: 2,
      weight: 985,
      hydration: 75,
      leaven: 20,
      salt: 2,
      reserve: share(50, 750),
      flours: { white: 90, wheat: 10 },
      build: { starter: 15, flour: 100, wheat: 100, water: 200 },
    },
  },
];

/** Freezes the recipes and everything in them, so code that uses a recipe or its defaults cannot change them. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const v of Object.values(value)) freeze(v);
    Object.freeze(value);
  }
  return value;
}
freeze(RECIPES);

const byId = new Map(RECIPES.map((r) => [r.id, r]));
/**
 * The recipe with this id, or undefined for any other id, such as one a corrupt save holds or the retired
 * `manual-rye`. A Map, so an id like `constructor` finds nothing rather than a built-in.
 */
export const recipeById = (id: string): Recipe | undefined => byId.get(id);
/** A recipe's default settings as a fresh copy, to start a plan from or restore, and change. */
export const defaultSettings = (recipe: Recipe): Settings => structuredClone(recipe.defaults);
