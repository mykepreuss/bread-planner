import type { AddIns } from './addins.ts';

/**
 * The recipes, as data. Each default is written as the sum it came from in the source spreadsheet or the book, so it
 * equals the value the app has always started with. White & Whole Wheat, Red Spring & Rye, Five-Flour and Four-Flour
 * Sourdough were removed at Michael's request on November 22, 2026, with the flours only they used; they are in git
 * history. The same day he asked for three more from Tartine Bread: Tartine Olive, Tartine Sesame and Tartine Whole Wheat.
 */

export type FlourKey = 'anita' | 'white' | 'wheat' | 'rye' | 'ap';
export const FLOUR_NAMES: Record<FlourKey, string> = {
  anita: "Anita's all-purpose flour",
  white: 'White-bread flour',
  wheat: 'Whole-wheat flour',
  rye: 'Rye flour',
  ap: 'All-purpose flour',
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
 * first turn (see addins.ts). `initialMix`, for Tartine recipes only, replaces the Basic Country Bread's initial mix:
 * the rest after it, in minutes, and its step's note. Every later step moves with the rest.
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
  initialMix?: { rest: number; note: string };
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
  {
    // Tartine Bread, page 88: the Basic Country Bread dough, method and defaults, with the olive mixture after the
    // first turn. Added at Michael's request on November 22, 2026. The values are Original Tartine's, copied.
    id: 'olive',
    name: 'Tartine Olive',
    description:
      'Original Tartine dough with olives, herbes de Provence, lemon zest and, if you like, toasted nuts, worked in after the first turn. A mix of green and oil-cured black olives works well.',
    method: 'tartine',
    flours: ['white', 'wheat'],
    late: [],
    buildFlour: 'white',
    addIns: {
      title: 'Add the olive mixture',
      note: 'In a bowl, stir together {list}. Scatter the mixture over the dough, add a splash of water, and work it in by hand, cutting through and folding the dough until it is evenly spread. Then carry on with bulk as planned.',
      items: [
        { amount: 3, unit: ['cup', 'cups'], what: 'pitted olives, coarsely chopped' },
        { amount: 2, unit: ['cup', 'cups'], what: 'toasted walnuts or hazelnuts, coarsely chopped', optional: true },
        { amount: 2, unit: ['teaspoon', 'teaspoons'], what: 'dried herbes de Provence' },
        { before: 'Grated zest of', amount: 1, unit: ['lemon', 'lemons'] },
      ],
    },
    // As Original Tartine: 900 g white, 100 g whole wheat; 750 g water with 50 g held back; 200 g leaven; 20 g salt;
    // 1 tbsp (15 g) starter.
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
  {
    // Tartine Bread page 90, "Sesame": one batch of the Basic Country Bread dough with 1 cup of seeds, for 2 loaves.
    id: 'sesame',
    name: 'Tartine Sesame',
    description:
      'Original Tartine’s dough and timing, with toasted sesame seeds worked in after the first turn. The seeds toast while the dough rests.',
    method: 'tartine',
    flours: ['white', 'wheat'],
    late: [],
    buildFlour: 'white',
    addIns: {
      title: 'Add the toasted sesame seeds',
      note: 'Scatter over the dough {list}. Wet them with a splash of water, then work them in by hand, pinching the dough through your fingers and slicing through it with the side of your hand until the seeds are evenly spread. Bulk then carries on as planned.',
      items: [{ amount: 1, unit: ['cup', 'cups'], what: 'unhulled sesame seeds, toasted and cooled' }],
      // 10 minutes, a stir, 10 to 15 minutes more, then 20 minutes to cool: ready by Turn 1.
      prep: {
        title: 'Toast the sesame seeds',
        note: 'Heat the oven to 400°F / 204°C. Give the seeds 10 minutes on a rimmed baking sheet in a single layer, then stir them so the darker ones at the edges move to the middle. Return them for another 10 to 15 minutes, until thoroughly toasted, and let them cool for 20 minutes. They go into the dough at Turn 1.',
        minutesBefore: 45,
      },
    },
    // Original Tartine's defaults, copied: 900 g white, 100 g whole wheat; 750 g water with 50 g held back; 200 g
    // leaven; 20 g salt; 1 tbsp (15 g) starter.
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
  {
    id: 'whole-wheat',
    name: 'Tartine Whole Wheat',
    description:
      'The book’s 70/30 whole-wheat and all-purpose loaf, mixed with cooler water and rested longer before the salt. If the dough runs lively, lower the leaven toward 15%.',
    method: 'tartine',
    flours: ['wheat', 'ap'],
    late: [],
    buildFlour: 'white',
    // Whole wheat takes up more water, so the rest is 50 minutes, the middle of the book's 40 to 60.
    initialMix: {
      rest: 50,
      note: 'Stir the leaven used into the initial water, about 75°F / 24°C, until it disperses. Add the whole-wheat and all-purpose flour and mix by hand until no dry flour is left. Cover and rest for 40 to 60 minutes while the whole wheat soaks up the water.',
    },
    // Tartine Bread, page 114: 700 g whole wheat, 300 g all-purpose; 800 g water; 200 g leaven, built as for Original
    // Tartine; 20 g salt. The page doesn't say how much water waits for the salt; 50 g is assumed, as for the Basic
    // Country Bread.
    defaults: {
      count: 2,
      weight: 1010,
      hydration: 80,
      leaven: 20,
      salt: 2,
      reserve: share(50, 800),
      flours: { wheat: 70, ap: 30 },
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
