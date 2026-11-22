import { RECIPES, defaultSettings, recipeById, type FlourKey, type Recipe, type Settings } from '../domain/recipes.ts';
import { inTempRange, withReading, type BulkReading } from '../domain/bakeday.ts';
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
const DATE = /^\d{4}-\d{2}-\d{2}$/,
  TIME = /^\d{2}:\d{2}$/;

/** A setting, or its default when missing or invalid. Counts are whole and at least 1, weights at least 1, the water held back at most 100%, everything else at least 0. */
function setting(key: string, n: unknown, fallback: number) {
  const min = key === 'count' || key === 'weight' ? 1 : 0;
  return isFinite(n) && n >= min && (key !== 'count' || Number.isInteger(n)) && (key !== 'reserve' || n <= 100)
    ? n
    : fallback;
}

/** Reads a recipe's settings through `get`, which names each value as the save does. */
function settingsFrom(recipe: Recipe, get: (field: string) => unknown): Settings {
  const d = defaultSettings(recipe);
  const scalar = (key: 'count' | 'weight' | 'hydration' | 'leaven' | 'salt' | 'reserve') =>
    setting(key, get(key), d[key]);
  return {
    count: scalar('count'),
    weight: scalar('weight'),
    hydration: scalar('hydration'),
    leaven: scalar('leaven'),
    salt: scalar('salt'),
    reserve: scalar('reserve'),
    flours: Object.fromEntries(recipe.flours.map((k) => [k, setting(k, get(`flour:${k}`), d.flours[k] ?? 0)])),
    build: {
      starter: setting('starter', get('build:starter'), d.build.starter),
      flour: setting('flour', get('build:flour'), d.build.flour),
      wheat: setting('wheat', get('build:wheat'), d.build.wheat),
      water: setting('water', get('build:water'), d.build.water),
    },
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

/** The checked steps and their times, and dough temperatures between 50 and 100°F. A time is kept only for a checked step. */
function bakeFrom(source: Raw): Bake {
  const done = Array.isArray(source.done) ? source.done.filter((x): x is string => typeof x === 'string') : [];
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
  };
}

/** The shared fields and every recipe, from either version, with `fallback` for a missing or invalid date and time. */
function assemble(
  p: Raw,
  fallback: { date: string; time: string },
  settingsReader: (recipe: Recipe, source: Raw) => (field: string) => unknown,
  bakeSource: (source: Raw) => Raw,
): PlannerState {
  const saved = isObject(p.recipes) ? p.recipes : {};
  const recipes: Record<string, RecipeState> = Object.fromEntries(
    RECIPES.map((r) => {
      const source = Object.hasOwn(saved, r.id) ? saved[r.id] : undefined;
      return isObject(source)
        ? [r.id, { settings: settingsFrom(r, settingsReader(r, source)), bake: bakeFrom(bakeSource(source)) }]
        : [r.id, { settings: defaultSettings(r), bake: emptyBake() }];
    }),
  );
  const order = Array.isArray(p.order)
    ? [...new Set(p.order.filter((id): id is string => typeof id === 'string' && recipeById(id) !== undefined))]
    : RECIPES.map((r) => r.id);
  if (!order.length) order.push('house');
  const capacity = p.ovenCapacity;
  return {
    recipe: typeof p.recipe === 'string' && order.includes(p.recipe) ? p.recipe : order[0],
    order,
    date: typeof p.date === 'string' && DATE.test(p.date) ? p.date : fallback.date,
    time: typeof p.time === 'string' && TIME.test(p.time) ? p.time : fallback.time,
    anchor: p.anchor === 'done' ? 'done' : 'leaven',
    proof: p.proof === 'warm' ? 'warm' : 'cold',
    ovenCapacity:
      typeof capacity === 'number' && Number.isInteger(capacity) && capacity > 0 ? Math.min(2, capacity) : 2,
    reheat: isFinite(p.reheat) && p.reheat >= 0 ? p.reheat : 30,
    tempUnit: p.tempUnit === 'C' ? 'C' : 'F',
    recipes,
  };
}

/**
 * A version 5 save, upgraded. A missing or invalid date or time falls back to the one the save was first created
 * with (decision 4 in docs/BEHAVIOUR.md), and then to tomorrow at 9:00 AM. Anything that is not a version 5 save
 * starts fresh.
 */
export function fromV5(saved: unknown, now: number): PlannerState {
  if (!isObject(saved) || saved.version !== 5 || !isObject(saved.plan)) return freshState(now);
  const p = saved.plan,
    legacy = isObject(p.legacy) ? p.legacy : {};
  return assemble(
    p,
    {
      date: typeof legacy.date === 'string' && DATE.test(legacy.date) ? legacy.date : tomorrow(now),
      time: typeof legacy.time === 'string' && TIME.test(legacy.time) ? legacy.time : '09:00',
    },
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
    { date: tomorrow(now), time: '09:00' },
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
