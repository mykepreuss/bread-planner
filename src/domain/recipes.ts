import type { AddIns } from './addins.ts';

/**
 * The recipes, as data. Each default is written as the sum it came from in the source spreadsheet or the book, so it
 * equals the value the app has always started with. White & Whole Wheat, Red Spring & Rye, Five-Flour and Four-Flour
 * Sourdough were removed at Michael's request on November 22, 2026, with the flours only they used; they are in git
 * history. The same day he asked for four more from Tartine Bread: Tartine Olive, Tartine Sesame, Tartine Whole Wheat
 * and Tartine Country Rye. Then he asked for Olive and Sesame to follow Preuss House where logical, and renamed the
 * recipes: Preuss Country Bread (Preuss House), Tartine Country Bread (Original Tartine), Olive Bread and Sesame Bread
 * (decision 17). Ids are unchanged, and code comments still use the shorter names.
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
 * is the flour in the leaven build besides whole wheat. `addIns` are worked in after the first turn, with either
 * method (see addins.ts). `initialMix`, for Tartine recipes only, replaces the Basic Country Bread's initial mix: the
 * rest after it, in minutes, and its step's note. Every later step moves with the rest. `autolyse`, for Tartine recipes
 * only, replaces the initial mix and rest instead: the flour and first water rest for `minutes`, ending as the leaven
 * is ready, and the leaven then goes in with the salt and reserved water. `coldProof`, for Tartine recipes only, is the
 * refrigerated final proof in minutes, in place of the book's 12 hours.
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
  autolyse?: { minutes: number; note: string };
  coldProof?: number;
  defaults: Settings;
};

/** A part as a percentage of a whole, in the order the source formulas divide. */
const share = (part: number, whole: number) => (part / whole) * 100;
/** The House leaven build, per 1,000 g of added flour. */
const houseBuild = { starter: 28, flour: 71, wheat: 71, water: 142 };
/**
 * Preuss House's defaults: 800 g Anita's, 100 g whole wheat, 100 g rye; 780 g water with 100 g held back; 200 g leaven;
 * 20 g salt. Olive and Sesame use them too (decision 16).
 */
const preussDefaults = (): Settings => ({
  count: 2,
  weight: 1000,
  hydration: 78,
  leaven: 20,
  salt: 2,
  reserve: share(100, 780),
  flours: { anita: 80, wheat: 10, rye: 10 },
  build: { ...houseBuild },
});

export const RECIPES: Recipe[] = [
  {
    id: 'house',
    name: 'Preuss Country Bread',
    description: "Anita's all-purpose flour with whole wheat and rye. Autolyse, then an overnight cold proof.",
    method: 'house',
    flours: ['anita', 'wheat', 'rye'],
    late: ['rye'],
    buildFlour: 'anita',
    defaults: preussDefaults(),
  },
  {
    id: 'tartine',
    name: 'Tartine Country Bread',
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
    // The olive mixture from Tartine Bread, page 88, added at Michael's request on November 22, 2026. The same day he
    // asked for it to follow Preuss House where that is logical (decision 16): its dough, leaven, 1½-hour autolyse,
    // turns, overnight cold proof and oven, with the olive mixture worked in after the first turn, as the book does.
    id: 'olive',
    name: 'Olive Bread',
    description:
      'Preuss Country Bread dough with olives, herbes de Provence, lemon zest and, if you like, toasted nuts, worked in after the first turn. A mix of green and oil-cured black olives works well.',
    method: 'house',
    flours: ['anita', 'wheat', 'rye'],
    late: ['rye'],
    buildFlour: 'anita',
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
    // Preuss House's defaults. The add-ins are the book's for its two loaves, scaled by dough weight against these.
    defaults: preussDefaults(),
  },
  {
    // Tartine Bread page 90, "Sesame": 1 cup of seeds for the book's two loaves. Like Olive, it follows Preuss House
    // where that is logical (decision 16): the seeds go into Preuss House's dough after the first turn.
    id: 'sesame',
    name: 'Sesame Bread',
    description:
      'Preuss Country Bread dough and timing, with toasted sesame seeds worked in after the first turn. The seeds toast as the autolyse finishes.',
    method: 'house',
    flours: ['anita', 'wheat', 'rye'],
    late: ['rye'],
    buildFlour: 'anita',
    addIns: {
      title: 'Add the toasted sesame seeds',
      note: 'Scatter over the dough {list}. Wet them with a splash of water, then work them in by hand, pinching the dough through your fingers and slicing through it with the side of your hand until the seeds are evenly spread. Bulk then carries on as planned.',
      items: [{ amount: 1, unit: ['cup', 'cups'], what: 'unhulled sesame seeds, toasted and cooled' }],
      // About 15 minutes to heat the oven, 10 minutes, a stir, 10 to 15 minutes more, then 20 minutes to cool: an hour,
      // so the seeds are cool by Turn 1. From a 9:00 AM leaven that is 1:45 PM, as the autolyse finishes.
      prep: {
        title: 'Toast the sesame seeds',
        note: 'Heat the oven to 400°F / 204°C. Give the seeds 10 minutes on a rimmed baking sheet in a single layer, then stir them so the darker ones at the edges move to the middle. Return them for another 10 to 15 minutes, until thoroughly toasted, and let them cool for 20 minutes. They go into the dough at Turn 1.',
        minutesBefore: 60,
      },
    },
    defaults: preussDefaults(),
  },
  {
    id: 'whole-wheat',
    name: 'Tartine Whole Wheat',
    description:
      'The book’s 70/30 whole-wheat and all-purpose loaf. The flour soaks in cool water for 2 hours before the leaven goes in, and the loaves proof 18½ hours in the fridge, so a leaven started in the evening bakes two mornings later. If the dough runs lively, lower the leaven toward 15%.',
    method: 'tartine',
    flours: ['wheat', 'ap'],
    late: [],
    buildFlour: 'white',
    // Michael's choices on November 22, 2026 (decision 16), so a cold-proofed bake keeps out of quiet hours. The book
    // rests this dough 40 to 60 minutes with the leaven in. Instead the flour and water rest 2 hours on their own, as
    // the leaven finishes: SourdoughGuru's autolyse guide gives 1 to 2 hours at room temperature for dough that is
    // mostly whole wheat, and The Perfect Loaf's keeps the levain out. The loaves then proof 18½ hours in the fridge,
    // not 12, so a leaven from 9:00 to 10:30 PM keeps every step out of quiet hours and bakes two mornings later.
    autolyse: {
      minutes: 120,
      note: 'Mix the whole-wheat and all-purpose flour with the initial water, about 75°F / 24°C, by hand until no dry flour is left. Cover and rest while the leaven finishes, so the bran softens before the leaven goes in.',
    },
    coldProof: 1110,
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
  {
    id: 'country-rye',
    name: 'Tartine Country Rye',
    description:
      'The book’s country rye: just enough medium-fine whole rye with white bread flour for a sweet rye flavour without much sourness. Cooler water and a longer rest after mixing than Original Tartine.',
    method: 'tartine',
    flours: ['rye', 'white'],
    late: [],
    buildFlour: 'white',
    initialMix: {
      rest: 50,
      note: 'Stir the leaven used into the initial water, about 75°F / 24°C, until it disperses. Add the rye and white-bread flour and mix by hand until no dry flour is left. Cover and rest for 40 to 60 minutes.',
    },
    // Tartine Bread, page 118: 170 g medium-fine whole rye, 830 g white bread flour; 800 g water; 200 g leaven, built
    // as for Original Tartine; 20 g salt, added after the rest. As for Tartine Whole Wheat, 50 g of the water is
    // assumed to wait for the salt, as in the Basic Country Bread. Added at Michael's request on November 22, 2026.
    defaults: {
      count: 2,
      weight: 1010,
      hydration: 80,
      leaven: 20,
      salt: 2,
      reserve: share(50, 800),
      flours: { rye: 17, white: 83 },
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
