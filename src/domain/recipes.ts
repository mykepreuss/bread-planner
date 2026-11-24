import type { AddIns } from './addins.ts';
import { HOUSE, TARTINE } from './methods.ts';

/**
 * The recipes, as data. Each default is written as the sum it came from in the source spreadsheet or the book, so it
 * equals the value the app has always started with. White & Whole Wheat, Red Spring & Rye, Five-Flour and Four-Flour
 * Sourdough were removed at Michael's request on November 22, 2026, with the flours only they used; they are in git
 * history. The same day he asked for four more from Tartine Bread: Tartine Olive, Tartine Sesame, Tartine Whole Wheat
 * and Tartine Country Rye. Then he asked for Olive and Sesame to follow Preuss House where logical, and renamed the
 * recipes: Preuss Country Bread (Preuss House), Tartine Country Bread (Original Tartine), Olive Bread and Sesame Bread
 * (decision 17). Ids are unchanged, and code comments still use the shorter names.
 */

export type FlourKey = 'anita' | 'white' | 'wheat' | 'rye' | 'ap' | 'emmer' | 'highext';
export const FLOUR_NAMES: Record<FlourKey, string> = {
  anita: "Anita's all-purpose flour",
  white: 'White-bread flour',
  wheat: 'Whole-wheat flour',
  rye: 'Rye flour',
  ap: 'All-purpose flour',
  emmer: 'Emmer or einkorn flour',
  highext: 'High-extraction wheat flour',
};

/** A flour name as it reads mid-sentence: lowercase, except a name that starts with a proper noun. */
export function inSentence(name: string) {
  return /^Anita's/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1).toLowerCase();
}

/**
 * What a baker sets for a recipe. Percentages are of added flour, except `reserve`, the share of added water held
 * back for the final mix. `hydration` is added water; the screen shows total hydration (see `totalHydration`). The
 * leaven build is in grams per 1,000 g of added flour. `autolyse` is in whole minutes, from `MIN_AUTOLYSE` to the
 * recipe's `maxAutolyse`: the autolyse, which ends as the leaven is ready, or for a recipe with the leaven in its initial
 * mix, the rest after that mix, which every later step follows (decisions 22 and 23).
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
  autolyse: number;
};
/**
 * The shortest autolyse or rest, 15 minutes, for every recipe (decision 23): at 0 the step still told the baker to rest
 * the flour while the leaven finished.
 */
export const MIN_AUTOLYSE = 15;
/**
 * The longest autolyse for mostly white flour, 2 hours: the guides Michael reviewed give about an hour, and SourdoughGuru
 * 20 minutes to 2 hours (decisions 15 and 23). Preuss Country Bread, Olive Bread and Sesame Bread share it.
 */
const PREUSS_MAX_AUTOLYSE = 120;

/**
 * `method` is how the dough is mixed and timed (see methods.ts). `late` flours go into the final mix. `buildFlour`
 * is the flour in the leaven build besides whole wheat. `addIns` are worked in after the first turn, with either
 * method (see addins.ts). `initialMix`, for Tartine recipes only, replaces the note of the Basic Country Bread's
 * initial mix. `autolyse`, for Tartine recipes only, replaces the initial mix and rest instead, with the note given:
 * the flour and first water rest on their own, ending as the leaven is ready, and the leaven then goes in with the salt
 * and reserved water. How long either rests is the setting `autolyse`. `coldProof`, for Tartine recipes only, is the
 * refrigerated final proof in minutes, in place of the book's 12 hours. `maxAutolyse` is the longest `autolyse` the
 * baker can set, in minutes: what the recipe's book pages or the autolyse guides give (decision 23). `extras` are dry
 * ingredients that are not flour, such as wheat germ, as a percentage of the flour: they go into the first mix with
 * the flour and count in the dough's weight, but not in its hydration. `finalShape`, for Tartine recipes only, is
 * added to the final shape step's note.
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
  initialMix?: { note: string };
  autolyse?: { note: string };
  coldProof?: number;
  maxAutolyse: number;
  extras?: { name: string; percent: number }[];
  finalShape?: string;
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
  autolyse: HOUSE.autolyse,
});

/** The initial mix of Tartine Book No. 3's wheat-germ doughs, Emmer/Einkorn and Oat Porridge. */
const BOOK_3_MIX = {
  note: 'Disperse the leaven used in the initial water, about 80°F / 27°C. Add the flours and the wheat germ; mix until no dry flour remains. Cover and rest; the book gives 25 to 40 minutes.',
};

export const RECIPES: Recipe[] = [
  {
    id: 'house',
    name: 'Preuss Country Bread',
    description: 'Feed the starter the evening before, mix in the afternoon, and bake the next morning.',
    method: 'house',
    flours: ['anita', 'wheat', 'rye'],
    late: ['rye'],
    buildFlour: 'anita',
    maxAutolyse: PREUSS_MAX_AUTOLYSE,
    defaults: preussDefaults(),
  },
  {
    id: 'tartine',
    name: 'Tartine Country Bread',
    description: 'Start the leaven in the evening. With the cold proof, it bakes two mornings later.',
    method: 'tartine',
    flours: ['white', 'wheat'],
    late: [],
    buildFlour: 'white',
    // Michael's choice on November 23, 2026 (decision 21), so a cold-proofed bake keeps out of quiet hours: the loaves
    // proof 18 hours in the fridge, not 12, so a leaven from 9:00 to 10:30 PM keeps every step out of them. The book's
    // 30-minute rest with the leaven in stays, so the fridge is the only change from the book; Preuss Country Bread is
    // the version of this dough with an autolyse.
    coldProof: 1080,
    // The book gives 25 to 40 minutes for the rest with the leaven in (decision 23).
    maxAutolyse: 40,
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
      autolyse: TARTINE.rest,
    },
  },
  {
    // The olive mixture from Tartine Bread, page 88, added at Michael's request on November 22, 2026. The same day he
    // asked for it to follow Preuss House where that is logical (decision 16): its dough, leaven, 1½-hour autolyse,
    // turns, overnight cold proof and oven, with the olive mixture worked in after the first turn, as the book does.
    id: 'olive',
    name: 'Olive Bread',
    description:
      'Preuss Country Bread with olives, herbes de Provence and lemon zest worked in after Turn 1. Pit and chop the olives before you mix; green and oil-cured black together work well. Toasted nuts are optional.',
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
    maxAutolyse: PREUSS_MAX_AUTOLYSE,
    defaults: preussDefaults(),
  },
  {
    // Tartine Bread page 90, "Sesame": 1 cup of seeds for the book's two loaves. Like Olive, it follows Preuss House
    // where that is logical (decision 16): the seeds go into Preuss House's dough after the first turn.
    id: 'sesame',
    name: 'Sesame Bread',
    description:
      'Preuss Country Bread with toasted sesame seeds worked in after Turn 1. Toasting and cooling the seeds uses the oven for the hour before.',
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
    maxAutolyse: PREUSS_MAX_AUTOLYSE,
    defaults: preussDefaults(),
  },
  {
    id: 'whole-wheat',
    name: 'Tartine Whole Wheat',
    description:
      'Start the leaven in the evening. With the cold proof, it bakes two mornings later. Whole wheat ferments fast: if the dough runs lively, lower the leaven toward 15%.',
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
      note: 'Mix the whole-wheat and all-purpose flour with the initial water, about 75°F / 24°C, by hand until no dry flour is left. Cover and rest while the leaven finishes, so the bran softens before the leaven goes in.',
    },
    coldProof: 1110,
    // SourdoughGuru gives 1 to 2 hours at room temperature for dough that is half whole wheat or more (decision 23).
    maxAutolyse: 120,
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
      autolyse: 120,
    },
  },
  {
    id: 'country-rye',
    name: 'Tartine Country Rye',
    description:
      'A mild, barely sour rye. Use medium-fine whole rye. Start the leaven in the evening. With the cold proof, it bakes two mornings later.',
    method: 'tartine',
    flours: ['rye', 'white'],
    late: [],
    buildFlour: 'white',
    initialMix: {
      note: 'Stir the leaven used into the initial water, about 75°F / 24°C, until it disperses. Add the rye and white-bread flour and mix by hand until no dry flour is left. Cover and rest; the book gives 40 to 60 minutes.',
    },
    // Michael's choice on November 22, 2026 (decision 20), so a cold-proofed bake keeps out of quiet hours: the loaves
    // proof 17½ hours in the fridge, not 12, so a leaven from 9:00 to 10:30 PM keeps every step out of them. The book's
    // rest with the leaven in stays: both autolyse guides he reviewed warn that rye is high in enzymes, and
    // SourdoughGuru gives a blend with under 30% rye only a 20- to 30-minute autolyse.
    coldProof: 1050,
    // The book gives 40 to 60 minutes for the rest with the leaven in (decision 23).
    maxAutolyse: 60,
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
      // The book's 50-minute rest with the leaven in, the middle of its 40 to 60.
      autolyse: 50,
    },
  },
  {
    // Tartine Book No. 3, page 72, "Emmer/Einkorn", added at Michael's request on November 23, 2026 (decision 24). The
    // book makes it by its master method, which Michael confirmed is Tartine Bread's Basic Country Bread, so it is
    // mixed and timed as Tartine Country Bread is, with its 18-hour fridge (decision 21).
    id: 'emmer',
    name: 'Tartine Emmer/Einkorn',
    description:
      "You'll need emmer or einkorn flour, high-extraction wheat flour and wheat germ. Start the leaven in the evening. With the cold proof, it bakes two mornings later.",
    method: 'tartine',
    // Medium-strong wheat flour is the white-bread flour here, a choice made for Michael (decision 24).
    flours: ['white', 'emmer', 'highext'],
    late: [],
    buildFlour: 'white',
    initialMix: BOOK_3_MIX,
    extras: [{ name: 'Wheat germ', percent: 7 }],
    finalShape: 'For a bran crust, roll the round in coarse bran before it goes into the basket, bran side down.',
    coldProof: 1080,
    // The Basic Country Bread's 25 to 40 minutes for the rest with the leaven in (decision 23).
    maxAutolyse: 40,
    // Page 72: 400 g medium-strong wheat flour, 300 g whole-grain emmer or einkorn flour, 300 g high-extraction wheat
    // flour; 70 g wheat germ (7%); 850 g water (85%); 150 g leaven (15%), built as for Tartine Country Bread; 25 g fine
    // sea salt (2.5%). Two loaves of 2,095 g / 2. As for Whole Wheat and Country Rye, 50 g of the water is assumed to
    // wait for the salt, as in the Basic Country Bread.
    defaults: {
      count: 2,
      weight: 1047.5,
      hydration: 85,
      leaven: 15,
      salt: 2.5,
      reserve: share(50, 850),
      flours: { white: 40, emmer: 30, highext: 30 },
      build: { starter: 15, flour: 100, wheat: 100, water: 200 },
      autolyse: TARTINE.rest,
    },
  },
  {
    // Tartine Book No. 3, page 178, "Oat Porridge", added at Michael's request on November 23, 2026 (decision 27). Made
    // by the book's master method, the Basic Country Bread (decision 24), as Emmer/Einkorn is: Tartine Country Bread's
    // plan, rest and 18-hour fridge. After the first two series of turns, about an hour into bulk, the cooked, cooled
    // porridge goes in, with the almonds and almond oil if wanted. The porridge is page 168's: 2 parts water to 1 part
    // rolled oats, cooked until creamy, about 15 minutes, seasoned with salt and spread thin to cool. The book's option
    // of fermenting the oats overnight before cooking them is left out.
    id: 'oat-porridge',
    name: 'Tartine Oat Porridge',
    description:
      'Cook oat porridge the morning you mix. It goes in after Turn 2, with almonds and almond oil if you like. Start the leaven in the evening. With the cold proof, it bakes two mornings later.',
    method: 'tartine',
    // Medium-strong wheat flour is the white-bread flour, as for Emmer/Einkorn (decision 24).
    flours: ['highext', 'white'],
    late: [],
    buildFlour: 'white',
    initialMix: BOOK_3_MIX,
    extras: [{ name: 'Wheat germ', percent: 7 }],
    addIns: {
      title: 'Add the oat porridge',
      note: 'Add the cooled porridge and, if you are using them, the almonds and almond oil. Work them in gently by hand, folding and pinching, until they are evenly spread through the dough. Then carry on with bulk as planned.',
      // The book's baker's percentages: 500 g porridge, 200 g almonds and 50 g almond oil to 1,000 g flour.
      items: [
        { name: 'Oat porridge', percent: 50, what: 'cooked oat porridge, cooled' },
        { name: 'Almonds', percent: 20, what: 'almonds, toasted and coarsely chopped', optional: true },
        { name: 'Almond oil', percent: 5, what: 'almond oil', optional: true },
      ],
      afterTurn: 2,
      // Page 168 makes about 500 g of porridge from 250 g oats and 500 g water. Started 2 hours before Turn 2, half an
      // hour before the initial mix, it has cooked by the mix and had 1½ hours spread thin to cool.
      prep: {
        title: 'Cook the oat porridge',
        note: 'In a saucepan over medium heat, stir {g:25} rolled oats into {g:50} water. Cook, stirring now and then, until the oats soften and turn creamy, about 15 minutes, and season with a pinch of salt. Spread the porridge thinly on a baking sheet to cool to room temperature; it goes into the dough after Turn 2. If you are adding almonds, toast {g:20} almonds until fragrant and chop them coarsely. Porridge made up to a week ahead and kept covered in the fridge works too: take it out now to warm up.',
        minutesBefore: 120,
      },
    },
    // Page 178: roll the dough in chopped oat flakes and place it in the basket flake side down. Page 170 chops flakes
    // by pulsing them in a food processor.
    finalShape:
      'For an oat crust, roll the round in rolled oats pulsed coarse in a food processor before it goes into the basket, oat side down.',
    coldProof: 1080,
    // The Basic Country Bread's 25 to 40 minutes for the rest with the leaven in (decision 23).
    maxAutolyse: 40,
    // Page 178: 500 g high-extraction wheat flour, 500 g medium-strong wheat flour; 70 g wheat germ (7%); 750 g water
    // (75%); 150 g leaven (15%), built as for Tartine Country Bread; 25 g fine sea salt (2.5%); 500 g porridge (50%),
    // 200 g almonds (20%) and 50 g almond oil (5%). Two loaves of 2,745 g / 2. As for Emmer/Einkorn, 50 g of the water
    // is assumed to wait for the salt, as in the Basic Country Bread.
    defaults: {
      count: 2,
      weight: 1372.5,
      hydration: 75,
      leaven: 15,
      salt: 2.5,
      reserve: share(50, 750),
      flours: { highext: 50, white: 50 },
      build: { starter: 15, flour: 100, wheat: 100, water: 200 },
      autolyse: TARTINE.rest,
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
