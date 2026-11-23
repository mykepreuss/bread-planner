/**
 * What the planner shows, in the shape baseline.json records. Step 0 of the rebuild recorded these observations from
 * the code of the time, and every later step must reproduce them. They are taken through the code the app runs: the
 * core in src/domain, the Schedule tab's view in src/view and the saved-data loader in src/state. Inputs are plain
 * data, with recipe settings under their version 5 names (`flour_anita`, `buildSeed`), so the record outlives the code
 * it was taken from.
 *
 * Everything runs in America/Vancouver (`useBaselineTimeZone`). Times are written as local wall-clock time with the
 * UTC offset, such as `2026-11-22 09:00 -08`, so a daylight-saving change shows.
 */
import { defaultSettings, recipeById, type FlourKey, type Recipe, type Settings } from '../../src/domain/recipes.ts';
import { addedHydration, formula, totalHydration } from '../../src/domain/formula.ts';
import { schedule } from '../../src/domain/schedule.ts';
import { fromF, inTempRange, retime, stampNow, toF, withReading, type BulkReading } from '../../src/domain/bakeday.ts';
import { clockText, dateString, durationText, shiftText, untilText } from '../../src/domain/text.ts';
import { scheduleView } from '../../src/view/schedule.ts';
import { freshState, planOf, selected, type PlannerState } from '../../src/state/schema.ts';
import { loadState, STORAGE_V5 } from '../../src/state/load.ts';
import { useVancouverRule } from './vancouver.ts';

export const TIME_ZONE = 'America/Vancouver';
/**
 * The baseline runs in America/Vancouver. The npm scripts start Node with TZ=America/Vancouver, which a Mac applies.
 * Vercel's build machines cannot, so there `Date` becomes VancouverDate, which follows the zone's rule;
 * vancouver.test.ts checks that rule against the real zone wherever it exists. BASELINE_ZONE=rule forces the rule,
 * to run here what Vercel runs. Returns which one is in use.
 */
export function useBaselineTimeZone(): 'host' | 'rule' {
  // Forcing the rule also leaves the host in UTC, as Vercel's machines are, so nothing can lean on the host's zone.
  if (process.env.BASELINE_ZONE === 'rule') process.env.TZ = 'UTC';
  else if (process.env.TZ !== TIME_ZONE) process.env.TZ = TIME_ZONE;
  const inVancouver = () =>
    new Date('2026-07-01T12:00:00').getTimezoneOffset() === 420 &&
    new Date('2026-12-01T12:00:00').getTimezoneOffset() === 480;
  if (process.env.BASELINE_ZONE !== 'rule' && inVancouver()) return 'host';
  useVancouverRule();
  if (!inVancouver()) throw new Error(`The baseline needs the ${TIME_ZONE} time zone.`);
  return 'rule';
}

/** Local wall-clock time and UTC offset, such as `2026-11-22 09:00 -08`. */
export function stamp(t: Date | number) {
  const d = new Date(t);
  if (!Number.isFinite(+d)) return 'invalid';
  const offset = -d.getTimezoneOffset() / 60;
  return `${dateString(d)} ${clockText(d)} ${offset < 0 ? '-' : '+'}${String(Math.abs(offset)).padStart(2, '0')}`;
}
/**
 * Runs `run` with the clock stopped at `at`: `Date.now()` and `new Date()` give that moment, and dates built from a
 * value work as usual. With `plainText`, a date's toLocaleTimeString and toLocaleDateString give `HH:MM` and
 * `YYYY-MM-DD`, so times on the rendered screen read the same on any machine, whatever its locale.
 */
export function atMoment<T>(at: number, run: () => T, plainText = false): T {
  const Real = Date;
  class Frozen extends Real {
    constructor(...args: unknown[]) {
      if (args.length) super(...(args as [number]));
      else super(at);
    }
    static now() {
      return at;
    }
  }
  if (plainText) {
    Frozen.prototype.toLocaleTimeString = function () {
      return clockText(this);
    };
    Frozen.prototype.toLocaleDateString = function () {
      return dateString(this);
    };
  }
  globalThis.Date = Frozen as DateConstructor;
  try {
    return run();
  } finally {
    globalThis.Date = Real;
  }
}

/** Epoch milliseconds for a local `YYYY-MM-DD HH:MM`. */
export function local(s: string) {
  const v = +new Date(`${s.replace(' ', 'T')}:00`);
  if (!Number.isFinite(v)) throw new Error(`Not a local time: ${s}`);
  return v;
}

/**
 * One plan as the baker set it up. `params` are the saved v5 recipe settings for the selected recipe; `totalHydration`
 * is applied after them, as typing into the Total hydration field does. Check-off and reading times are local.
 */
export type PlanInput = {
  recipe: string;
  date: string;
  time: string;
  anchor?: 'leaven' | 'done';
  proof?: 'cold' | 'warm';
  ovenCapacity?: number;
  /** Loaves per mix; 2 when not given. */
  mixCapacity?: number;
  reheat?: number;
  tempUnit?: 'F' | 'C';
  params?: Record<string, number>;
  totalHydration?: number;
  done?: string[];
  doneAt?: Record<string, string>;
  doughTemp?: number | null;
  bulkTemps?: { at: string; f: number }[];
  /** The mixing additions ticked off, by id, such as `mix:salt`. */
  added?: string[];
  now: string;
};
export type FormulaInput = { recipe: string; params?: Record<string, number>; totalHydration?: number };
export type HelperCall = { fn: string; args: unknown[] };

/** Version 5 names for the build settings, as the record's inputs give them. */
const BUILD = { buildSeed: 'starter', buildBread: 'flour', buildWheat: 'wheat', buildWater: 'water' } as const;
const SCALARS = ['count', 'weight', 'hydration', 'leaven', 'salt', 'reserve'] as const;

/** A recipe's settings with the input's version 5 `params` applied over its defaults, and `autolyse`, which version 5 didn't have. */
function settingsFrom(recipe: Recipe, params: Record<string, number> = {}): Settings {
  const s = defaultSettings(recipe);
  for (const [key, value] of Object.entries(params)) {
    const flour = key.slice(6) as FlourKey;
    if (key in BUILD) s.build[BUILD[key as keyof typeof BUILD]] = value;
    else if (key.startsWith('flour_') && recipe.flours.includes(flour)) s.flours[flour] = value;
    else if ((SCALARS as readonly string[]).includes(key)) s[key as (typeof SCALARS)[number]] = value;
    else if (key === 'autolyse') s.autolyse = value;
    else throw new Error(`${recipe.id} has no setting ${key}`);
  }
  return s;
}
/** A recipe's settings under their version 5 names, as the record writes them. */
export function v5Params(recipe: Recipe, s: Settings): Record<string, number> {
  return {
    ...Object.fromEntries(SCALARS.map((k) => [k, s[k]])),
    ...Object.fromEntries(recipe.flours.map((k) => [`flour_${k}`, s.flours[k]])),
    buildSeed: s.build.starter,
    buildBread: s.build.flour,
    buildWheat: s.build.wheat,
    buildWater: s.build.water,
  };
}

/** The planner for an input, taken as it is: loading saved data would correct a few recorded plans, which the record keeps. */
export function plannerState(i: PlanInput | (FormulaInput & { date?: string; time?: string })): PlannerState {
  const recipe = recipeById(i.recipe);
  if (!recipe) throw new Error(`Unknown recipe ${i.recipe}`);
  const full = i as Partial<PlanInput>,
    settings = settingsFrom(recipe, i.params);
  if (i.totalHydration !== undefined) settings.hydration = Math.max(0, addedHydration(i.totalHydration, settings));
  const base = freshState(local(LOADED_AT));
  return {
    ...base,
    recipe: i.recipe,
    date: full.date ?? '2026-11-22',
    time: full.time ?? '09:00',
    anchor: full.anchor ?? 'leaven',
    proof: full.proof ?? 'cold',
    ovenCapacity: full.ovenCapacity ?? 2,
    mixCapacity: full.mixCapacity ?? 2,
    reheat: full.reheat ?? 30,
    tempUnit: full.tempUnit ?? 'F',
    recipes: {
      ...base.recipes,
      [i.recipe]: {
        settings,
        bake: {
          done: [...(full.done ?? [])],
          doneAt: Object.fromEntries(Object.entries(full.doneAt ?? {}).map(([id, t]) => [id, local(t)])),
          doughTemp: full.doughTemp ?? null,
          bulkTemps: (full.bulkTemps ?? []).map((r) => ({ at: local(r.at), f: r.f })),
          added: [...(full.added ?? [])],
        },
      },
    },
  };
}

/**
 * The Schedule tab for one plan: every step as the timeline shows it, and what the Up next card, the notices and the
 * bake summary show, as src/view/schedule.ts works them out for the app's ScheduleTab. app.test.ts checks the real
 * screen against the record too.
 */
export function observePlan(i: PlanInput) {
  const now = local(i.now),
    v = scheduleView(plannerState(i), now, stamp),
    { steps, skipped, stale, next, doneStep, estimate, checkFrom } = v,
    checks = v.bake.done;
  const quiet = new Map(v.night.map((a) => [a.step.id, a.continues ? 'continues' : 'starts']));
  const gaps = v.gaps,
    proof = v.proofWindow;
  return {
    steps: steps.map((s) => ({
      id: s.id,
      title: s.title,
      at: stamp(s.at),
      phase: s.phase,
      gap: gaps.get(s.id) ?? 0,
      ...(s.note !== undefined && { note: s.note }),
      ...(s.readiness !== undefined && { ready: s.readiness }),
      // A mixing step's tick-offs: each ingredient, its grams, and whether it is ticked.
      ...(s.additions && {
        additions: s.additions.map((a) => ({
          id: a.id,
          name: a.name,
          grams: a.grams,
          ...(a.bowl !== undefined && { bowl: a.bowl }),
          ticked: v.bake.added.includes(a.id),
        })),
      }),
      ...(+s.planned !== +s.at && { planned: stamp(s.planned) }),
      ...(s.actual && { actual: stamp(s.actual) }),
      ...(checks.includes(s.id)
        ? { state: 'done' }
        : skipped.includes(s.id)
          ? { state: 'skipped' }
          : !stale && next?.id === s.id
            ? { state: 'next' }
            : {}),
      ...(quiet.has(s.id) && { quiet: quiet.get(s.id) }),
    })),
    view: {
      batches: v.batches,
      bowls: v.bowls,
      finish: doneStep ? stamp(doneStep.at) : null,
      totalTime: v.totalMinutes !== null ? durationText(v.totalMinutes) : null,
      checked: v.completed,
      stale,
      underway: v.underway,
      allDone: v.allDone,
      days: v.days,
      upNext:
        next && !stale
          ? {
              id: next.id,
              countdown: untilText(+next.at - now),
              then: v.then?.id ?? null,
              doughCheck: v.doughCheck,
              temperatureField: v.temperatureField,
            }
          : null,
      shift: v.shift,
      shiftText: shiftText(v.shift),
      estimate: estimate && {
        planned: estimate.planned,
        minutes: estimate.minutes,
        difference: estimate.difference,
        readyAt: stamp(estimate.readyAt),
        checkFrom: stamp(estimate.checkFrom),
        plannedEnd: stamp(estimate.plannedEnd),
      },
      turns: v.turns,
      bulkMinutes: v.bulkMinutes,
      checkFrom: checkFrom ? stamp(checkFrom) : null,
      advice: v.advice ?? null,
      quietHours: v.night.length,
      quietFixes: v.quietFixes.map((f) => ({ proof: f.proof, at: stamp(f.at), actions: f.actions })),
      coldProof: proof && {
        start: stamp(proof.start),
        end: stamp(proof.end),
        minutes: proof.minutes,
        overnight: proof.overnight,
      },
    },
  };
}

/** The Ingredients tab for one recipe: the weights, totals and leaven balance it shows. Null when it cannot calculate. */
export function observeFormula(i: FormulaInput) {
  const { recipe, settings } = selected(plannerState(i)),
    r = formula(recipe, settings);
  if (!r) return null;
  return {
    total: r.total,
    flour: r.flour,
    water: r.water,
    used: r.used,
    salt: r.salt,
    addedHydration: r.hydration,
    totalHydration: r.totalHydration,
    shownHydration: Math.round(r.totalHydration),
    hydrationMin: Math.ceil(totalHydration({ ...settings, hydration: 0 })),
    totalFlour: r.totalFlour,
    totalWater: r.totalWater,
    flours: r.flours.map((f) => ({ key: f.key, name: f.name, grams: f.grams, percent: f.percent })),
    initial: r.initial,
    final: r.final,
    made: r.made,
    madeParts: r.madeParts,
    reserve: r.reserve,
    shortfall: r.shortfall,
  };
}

/**
 * Saved data is loaded at this moment. Without a valid saved date a plan starts the next day, so loading at a fixed
 * moment keeps that date the same on every run, and far from every date the cases save.
 */
export const LOADED_AT = '2030-01-01 12:00';

/**
 * Saved browser data, stored as the version 5 save it is, after loading: the settings (under their version 5 names),
 * checklists and readings it gives every recipe, and the selected plan's times.
 */
export function observeRestore(saved: unknown) {
  const text = JSON.stringify(saved ?? null),
    s = loadState((key) => (key === STORAGE_V5 ? text : null), local(LOADED_AT));
  return {
    recipe: s.recipe,
    order: s.order,
    date: s.date,
    time: s.time,
    anchor: s.anchor,
    proof: s.proof,
    ovenCapacity: s.ovenCapacity,
    mixCapacity: s.mixCapacity,
    reheat: s.reheat,
    tempUnit: s.tempUnit,
    recipes: Object.fromEntries(
      Object.entries(s.recipes).map(([id, { settings, bake }]) => [
        id,
        {
          params: v5Params(recipeById(id)!, settings),
          done: bake.done,
          doneAt: Object.fromEntries(Object.entries(bake.doneAt).map(([k, t]) => [k, stamp(t)])),
          doughTemp: bake.doughTemp,
          bulkTemps: bake.bulkTemps.map((b) => ({ at: stamp(b.at), f: b.f })),
          added: bake.added,
        },
      ]),
    ),
    schedule: schedule(planOf(s)).map((step) => `${step.id} ${stamp(step.at)}`),
  };
}

/** Small helpers whose wording or rounding the screen shows directly. */
export function observeHelper({ fn, args }: HelperCall): unknown {
  const a = args as never[],
    h = { retime, stampNow, withReading, toF, fromF, inTempRange };
  switch (fn) {
    case 'retime': {
      const t = h.retime(a[0], a[1]);
      return t === null ? null : stamp(t);
    }
    case 'untilText':
      return untilText(a[0]);
    case 'shiftText':
      return shiftText(a[0]);
    case 'durationText':
      return durationText(a[0]);
    case 'stampNow':
      return stamp(h.stampNow(local(a[0]) + (a[1] as number) * 1000));
    case 'withReading': {
      const read = (r: { at: string; f: number }): BulkReading => ({ at: local(r.at), f: r.f });
      return h
        .withReading((a[0] as { at: string; f: number }[]).map(read), read(a[1]))
        .map((r) => ({ at: stamp(r.at), f: r.f }));
    }
    case 'toF':
      return h.toF(a[0], a[1]);
    case 'fromF':
      return h.fromF(a[0], a[1]);
    case 'inTempRange':
      return h.inTempRange(a[0], a[1]);
    default:
      throw new Error(`Unknown helper ${fn}`);
  }
}
