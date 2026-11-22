/**
 * The six recipes, as data. Each default is written as the sum it came from in the source spreadsheet or the book,
 * so it equals the value the app has always started with.
 */

export type FlourKey = 'anita' | 'red' | 'white' | 'wheat' | 'rye' | 'ap' | 'fife';
export const FLOUR_NAMES: Record<FlourKey, string> = {
  anita: "Anita's all-purpose flour",
  red: 'Red spring flour',
  white: 'White-bread flour',
  wheat: 'Whole-wheat flour',
  rye: 'Rye flour',
  ap: 'All-purpose flour',
  fife: 'Red Fife flour',
};

/** A flour name as it reads mid-sentence: lowercase, except names that start with a proper noun. */
export function inSentence(name: string) {
  return /^(Anita's|Red Fife)/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1).toLowerCase();
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
 * is the flour in the leaven build besides whole wheat.
 */
export type Recipe = {
  id: string;
  name: string;
  description: string;
  method: 'house' | 'tartine';
  flours: FlourKey[];
  late: FlourKey[];
  buildFlour: FlourKey;
  houseCompletion: boolean;
  defaults: Settings;
};

/** A part as a percentage of a whole, in the order the source formulas divide. */
const share = (part: number, whole: number) => (part / whole) * 100;
/** Grams per 1,000 g of added flour. */
const perKilo = (grams: number, flour: number) => (grams / flour) * 1000;
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
    houseCompletion: false,
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
    houseCompletion: false,
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
    id: 'white-wheat',
    name: 'White & Whole Wheat',
    description: 'An 80/20 white and whole-wheat loaf, with a separate autolyse and overnight cold proof.',
    method: 'house',
    flours: ['white', 'wheat'],
    late: [],
    buildFlour: 'white',
    houseCompletion: false,
    // 800 g white, 200 g whole wheat; 800 g water with 50 g held back; 200 g leaven; 20 g salt.
    defaults: {
      count: 2,
      weight: 1010,
      hydration: 80,
      leaven: 20,
      salt: 2,
      reserve: share(50, 800),
      flours: { white: 80, wheat: 20 },
      build: { ...houseBuild },
    },
  },
  {
    id: 'red-rye',
    name: 'Red Spring & Rye',
    description: 'Red spring, whole wheat and rye with extra leaven, a separate autolyse and an overnight cold proof.',
    method: 'house',
    flours: ['red', 'wheat', 'rye'],
    late: ['rye'],
    buildFlour: 'red',
    houseCompletion: false,
    // The spreadsheet's main calculator: 758 g red spring, 83 g whole wheat, 103 g rye (944 g); 724 g water with 72 g
    // held back; all 312 g of a 28/71/71/142 g build; 22 g salt; 2,002 g of dough.
    defaults: {
      count: 2,
      weight: 2002 / 2,
      hydration: share(724, 944),
      leaven: share(312, 944),
      salt: share(22, 944),
      reserve: share(72, 724),
      flours: { red: share(758, 944), wheat: share(83, 944), rye: share(103, 944) },
      build: { starter: perKilo(28, 944), flour: perKilo(71, 944), wheat: perKilo(71, 944), water: perKilo(142, 944) },
    },
  },
  {
    id: 'five-flour',
    name: 'Five-Flour Sourdough',
    description: 'All-purpose, red spring, Red Fife, whole wheat and rye.',
    method: 'house',
    flours: ['ap', 'red', 'fife', 'wheat', 'rye'],
    late: ['rye'],
    buildFlour: 'red',
    houseCompletion: true,
    // The spreadsheet's first blend, 350/350/100/100/100 g with 800 g water (50 g held back), completed with the
    // House leaven and salt.
    defaults: {
      count: 2,
      weight: 1010,
      hydration: 80,
      leaven: 20,
      salt: 2,
      reserve: share(50, 800),
      flours: { ap: 35, red: 35, fife: 10, wheat: 10, rye: 10 },
      build: { ...houseBuild },
    },
  },
  {
    id: 'four-flour',
    name: 'Four-Flour Sourdough',
    description: 'All-purpose, red spring, whole wheat and rye, with more whole wheat than the five-flour recipe.',
    method: 'house',
    flours: ['ap', 'red', 'fife', 'wheat', 'rye'],
    late: ['rye'],
    buildFlour: 'red',
    houseCompletion: true,
    // The spreadsheet's second blend, 500/600/0/250/150 g (1,500 g) with 1,200 g water (75 g held back), completed
    // with the House leaven and salt; three loaves.
    defaults: {
      count: 3,
      weight: 1010,
      hydration: 80,
      leaven: 20,
      salt: 2,
      reserve: share(75, 1200),
      flours: { ap: share(500, 1500), red: share(600, 1500), fife: 0, wheat: share(250, 1500), rye: share(150, 1500) },
      build: { ...houseBuild },
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
