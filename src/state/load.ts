import {
  MIN_AUTOLYSE,
  RECIPES,
  defaultSettings,
  recipeById,
  type FlourKey,
  type Recipe,
  type Settings,
} from '../domain/recipes.ts';
import { inTempRange, withReading, type BulkReading } from '../domain/bakeday.ts';
import { extraPercent } from '../domain/formula.ts';
import { round } from '../domain/text.ts';
import { emptyBake, freshState, tomorrow, type Bake, type PlannerState, type RecipeState } from './schema.ts';

/**
 * Loading and saving. The planner saves version 6 under `bread-planner.v6`. When that is missing or unusable it
 * upgrades the version 5 save under `bread-planner.v5`, which it never writes or removes, so an older release that
 * is rolled back to still finds the plan as it was. Every value is checked as version 5 was: a missing or invalid
 * one falls back to its default. Not carried over: saves of versions 1 to 4, the hidden `manual-rye` recipe and the
 * spreadsheet cells inside each version 5 save (docs/BEHAVIOUR.md); no save on the live site can hold them.
 */
export const STORAGE_V6 = 'bread-planner.v6',
  STORAGE_V5 = 'bread-planner.v5';

type Raw = Record<string, unknown>;
const isObject = (x: unknown): x is Raw => !!x && typeof x === 'object';
const isFinite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
/** A real calendar date, written YYYY-MM-DD. */
function isDate(s: unknown): s is string {
  const m = typeof s === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (!m) return false;
  const [y, month, day] = [+m[1], +m[2], +m[3]],
    leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0,
    days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return days !== undefined && day >= 1 && day <= days;
}
/** A clock time from 00:00 to 23:59, written HH:MM. */
function isTime(s: unknown): s is string {
  const m = typeof s === 'string' ? /^(\d{2}):(\d{2})$/.exec(s) : null;
  return !!m && +m[1] <= 23 && +m[2] <= 59;
}

/**
 * A setting, or its default when missing or invalid. Counts are whole and at least 1, a loaf's flour or weight at
 * least 1 g, the water held back of a save from before decision 30 at most 100% of the water, the autolyse whole
 * minutes from 15 to the recipe's `maxAutolyse` (decision 23), everything else at least 0.
 */
function setting(key: string, n: unknown, fallback: number, maxAutolyse = Infinity) {
  const min = key === 'count' || key === 'loafFlour' || key === 'weight' ? 1 : key === 'autolyse' ? MIN_AUTOLYSE : 0,
    whole = key === 'count' || key === 'autolyse',
    max = key === 'reserve' ? 100 : key === 'autolyse' ? maxAutolyse : Infinity;
  return isFinite(n) && n >= min && n <= max && (!whole || Number.isInteger(n)) ? n : fallback;
}

/**
 * Each recipe's loaf weight and water held back, as a percentage of the water, before decision 30 made the flour the
 * base and the water held back a share of it. Only for reading saves from before then.
 */
const BEFORE_30: Record<string, { weight: number; reserve: number }> = {
  house: { weight: 1000, reserve: (100 / 780) * 100 },
  tartine: { weight: 985, reserve: (50 / 750) * 100 },
  olive: { weight: 1000, reserve: (100 / 780) * 100 },
  sesame: { weight: 1000, reserve: (100 / 780) * 100 },
  'whole-wheat': { weight: 1010, reserve: (50 / 800) * 100 },
  'country-rye': { weight: 1010, reserve: (50 / 800) * 100 },
  emmer: { weight: 1047.5, reserve: (50 / 850) * 100 },
  'oat-porridge': { weight: 1372.5, reserve: (50 / 750) * 100 },
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/**
 * The flour per loaf and the water held back, from a save that has them, or else from one made before decision 30,
 * which kept a loaf weight and a share of the water instead. A weight or share still at its old default takes the new
 * default, so a plan whose hydration alone was changed gets the recipe's whole grams of flour and water held back. Any
 * other is read as the flour, or the share of flour, that gave the same dough at the saved settings.
 */
function flourAndHeld(
  recipe: Recipe,
  get: (field: string) => unknown,
  d: Settings,
  s: Pick<Settings, 'hydration' | 'leaven' | 'salt'>,
) {
  const old = BEFORE_30[recipe.id],
    weight = setting('weight', get('weight'), NaN),
    reserve = setting('reserve', get('reserve'), NaN);
  const loafFlour =
    get('loafFlour') !== undefined || !old || Number.isNaN(weight) || near(weight, old.weight)
      ? setting('loafFlour', get('loafFlour'), d.loafFlour)
      : round(weight / (1 + (s.hydration + s.leaven + s.salt + extraPercent(recipe)) / 100), 6);
  const held =
    get('held') !== undefined || !old || Number.isNaN(reserve) || near(reserve, old.reserve)
      ? setting('held', get('held'), d.held)
      : round((reserve * s.hydration) / 100, 6);
  return { loafFlour, held };
}

/** Reads a recipe's settings through `get`, which names each value as the save does. */
function settingsFrom(recipe: Recipe, get: (field: string) => unknown): Settings {
  const d = defaultSettings(recipe);
  // The autolyse is read below, against the recipe's own longest.
  const scalar = (key: 'count' | 'hydration' | 'leaven' | 'salt') => setting(key, get(key), d[key]);
  const ratios = { hydration: scalar('hydration'), leaven: scalar('leaven'), salt: scalar('salt') },
    { loafFlour, held } = flourAndHeld(recipe, get, d, ratios);
  return {
    count: scalar('count'),
    loafFlour,
    ...ratios,
    held,
    flours: Object.fromEntries(recipe.flours.map((k) => [k, setting(k, get(`flour:${k}`), d.flours[k] ?? 0)])),
    build: {
      starter: setting('starter', get('build:starter'), d.build.starter),
      flour: setting('flour', get('build:flour'), d.build.flour),
      wheat: setting('wheat', get('build:wheat'), d.build.wheat),
      water: setting('water', get('build:water'), d.build.water),
    },
    // Saves from before November 23, 2026 have none, and get the recipe's default, as does a length outside the
    // recipe's range: since decision 23, 15 minutes to what its book or the guides give.
    autolyse: setting('autolyse', get('autolyse'), d.autolyse, recipe.maxAutolyse),
  };
}

/** Version 5 names: `flour_anita`, `buildSeed` and so on. A House blend saved before Anita's flour keeps its red spring parts. */
function fromV5Params(recipe: Recipe, params: unknown) {
  const p = isObject(params) ? params : {};
  const build: Record<string, string> = {
    starter: 'buildSeed',
    flour: 'buildBread',
    wheat: 'buildWheat',
    water: 'buildWater',
  };
  return (field: string) => {
    if (field.startsWith('flour:')) {
      const k = field.slice(6) as FlourKey;
      return p[`flour_${k}`] ?? (recipe.id === 'house' && k === 'anita' ? p.flour_red : undefined);
    }
    if (field.startsWith('build:')) return p[build[field.slice(6)]];
    return p[field];
  };
}

/** Version 6 names: `flours.anita`, `build.starter` and so on. */
function fromV6Settings(settings: unknown) {
  const s = isObject(settings) ? settings : {},
    flours = isObject(s.flours) ? s.flours : {},
    build = isObject(s.build) ? s.build : {};
  return (field: string) =>
    field.startsWith('flour:') ? flours[field.slice(6)] : field.startsWith('build:') ? build[field.slice(6)] : s[field];
}

/**
 * The checked steps and their times, the ticked additions, and dough temperatures between 50 and 100°F. A time is
 * kept only for a checked step. A save from before the tick-offs has no additions ticked.
 */
function bakeFrom(source: Raw): Bake {
  const strings = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);
  const done = strings(source.done);
  const times = isObject(source.doneAt) ? Object.entries(source.doneAt) : [];
  const temp = (t: unknown): t is number => typeof t === 'number' && inTempRange(t, 'F');
  const readings = Array.isArray(source.bulkTemps) ? source.bulkTemps : [];
  return {
    done,
    doneAt: Object.fromEntries(times.filter((e): e is [string, number] => done.includes(e[0]) && isFinite(e[1]))),
    doughTemp: temp(source.doughTemp) ? source.doughTemp : null,
    // Readings are kept in time order; two in the same minute load as the later one.
    bulkTemps: readings
      .filter((r): r is BulkReading => isObject(r) && isFinite(r.at) && temp(r.f))
      .map((r) => ({ at: r.at, f: r.f }))
      .reduce(withReading, [] as BulkReading[]),
    added: [...new Set(strings(source.added))],
  };
}

/** The recipes whose dough changed after saves of them existed: Olive and Sesame were Tartine variations (decision 16). */
const NEW_DOUGH = new Set(['olive', 'sesame']);

/**
 * Whether Olive or Sesame was saved for the dough it no longer has: its version 6 settings name a flour it doesn't use,
 * such as white-bread flour from Original Tartine's dough. Such a save loads it fresh, settings and checklist, rather
 * than mixing the old dough's values into Preuss House's. Only those two recipes, so a later change to another
 * recipe's flours doesn't wipe its save.
 */
function otherDough(recipe: Recipe, source: Raw) {
  if (!NEW_DOUGH.has(recipe.id)) return false;
  const settings = isObject(source.settings) ? source.settings : {},
    flours = isObject(settings.flours) ? settings.flours : {};
  return Object.keys(flours).some((k) => !(recipe.flours as string[]).includes(k));
}

/**
 * The shared fields and every recipe, from either version. A missing or invalid date falls back to the day after
 * `now`, and a time to 9:00 AM, as for a new plan (decision 4 in docs/BEHAVIOUR.md).
 */
function assemble(
  p: Raw,
  now: number,
  settingsReader: (recipe: Recipe, source: Raw) => (field: string) => unknown,
  bakeSource: (source: Raw) => Raw,
): PlannerState {
  const saved = isObject(p.recipes) ? p.recipes : {};
  const recipes: Record<string, RecipeState> = Object.fromEntries(
    RECIPES.map((r) => {
      const source = Object.hasOwn(saved, r.id) ? saved[r.id] : undefined;
      return isObject(source) && !otherDough(r, source)
        ? [r.id, { settings: settingsFrom(r, settingsReader(r, source)), bake: bakeFrom(bakeSource(source)) }]
        : [r.id, { settings: defaultSettings(r), bake: emptyBake() }];
    }),
  );
  const named = Array.isArray(p.order)
    ? [...new Set(p.order.filter((id): id is string => typeof id === 'string' && recipeById(id) !== undefined))]
    : [];
  // The saved menu keeps its order; a recipe it doesn't name, such as one added since, follows in menu order.
  const order = [...named, ...RECIPES.map((r) => r.id).filter((id) => !named.includes(id))];
  const capacity = p.ovenCapacity;
  return {
    recipe: typeof p.recipe === 'string' && order.includes(p.recipe) ? p.recipe : order[0],
    order,
    date: isDate(p.date) ? p.date : tomorrow(now),
    time: isTime(p.time) ? p.time : '09:00',
    anchor: p.anchor === 'done' ? 'done' : 'leaven',
    // Saves from before November 23, 2026 have none: their date and time were chosen.
    timeChosen: p.timeChosen !== false,
    proof: p.proof === 'warm' ? 'warm' : 'cold',
    ovenCapacity:
      typeof capacity === 'number' && Number.isInteger(capacity) && capacity > 0 ? Math.min(2, capacity) : 2,
    // Loaves per mix: a whole number of 1 or more. Saves from before November 22, 2026 have none, and mix 2.
    mixCapacity:
      typeof p.mixCapacity === 'number' && Number.isInteger(p.mixCapacity) && p.mixCapacity >= 1 ? p.mixCapacity : 2,
    reheat: isFinite(p.reheat) && p.reheat >= 0 ? p.reheat : 30,
    tempUnit: p.tempUnit === 'C' ? 'C' : 'F',
    recipes,
  };
}

/** A version 5 save, upgraded. Anything that is not a version 5 save starts fresh. */
export function fromV5(saved: unknown, now: number): PlannerState {
  if (!isObject(saved) || saved.version !== 5 || !isObject(saved.plan)) return freshState(now);
  const p = saved.plan;
  return assemble(
    p,
    now,
    (recipe, source) => fromV5Params(recipe, source.params),
    // Version 5 kept the bake beside the settings.
    (source) => source,
  );
}

/** A version 6 save, checked; null when it is not one. */
export function fromV6(saved: unknown, now: number): PlannerState | null {
  if (!isObject(saved) || saved.version !== 6 || !isObject(saved.plan)) return null;
  return assemble(
    saved.plan,
    now,
    (_, source) => fromV6Settings(source.settings),
    (source) => (isObject(source.bake) ? source.bake : {}),
  );
}

const parse = (text: string | null): unknown => {
  try {
    return JSON.parse(text ?? 'null');
  } catch {
    return null;
  }
};

/** The saved planner: version 6 if it is usable, else version 5 upgraded, else a fresh one. */
export function loadState(read: (key: string) => string | null, now: number): PlannerState {
  return fromV6(parse(read(STORAGE_V6)), now) ?? fromV5(parse(read(STORAGE_V5)), now);
}

/** The text to save under `STORAGE_V6`. */
export const serialize = (state: PlannerState) => JSON.stringify({ version: 6, plan: state });
