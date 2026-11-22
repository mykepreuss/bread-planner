/**
 * What the planner shows, in the shape baseline.json records. Step 0 of the rebuild recorded these observations, and
 * every later step must reproduce them. Plans, recipe settings and helpers are read through a core (cores.ts): the old
 * one in src/lib or the new one in src/domain. Saved data is still read through src/lib (`observeRestore`), and
 * `planner` builds inputs with it, until step 3 moves both to the new core. Inputs are plain data, so the record
 * outlives the code it was taken from.
 *
 * Everything runs in America/Vancouver (`useBaselineTimeZone`). Times are written as local wall-clock time with the
 * UTC offset, such as `2026-11-22 09:00 -08`, so a daylight-saving change shows.
 */
import { createPlanner, restorePlanner, recipeSchedule, addedHydration, type Planner } from '../../src/lib/recipes.ts';
import { dateString, round } from '../../src/lib/model.ts';
import { clockText, type BulkReading } from '../../src/lib/bakeday.ts';
import { useVancouverRule } from './vancouver.ts';
import { oldCore, type Core } from './cores.ts';

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
  reheat?: number;
  tempUnit?: 'F' | 'C';
  params?: Record<string, number>;
  totalHydration?: number;
  done?: string[];
  doneAt?: Record<string, string>;
  doughTemp?: number | null;
  bulkTemps?: { at: string; f: number }[];
  now: string;
};
export type FormulaInput = { recipe: string; params?: Record<string, number>; totalHydration?: number };
export type HelperCall = { fn: string; args: unknown[] };

export function planner(i: PlanInput | (FormulaInput & { date?: string; time?: string })): Planner {
  const p = createPlanner(),
    full = i as Partial<PlanInput>;
  if (!(i.recipe in p.recipes)) throw new Error(`Unknown recipe ${i.recipe}`);
  Object.assign(p, {
    recipe: i.recipe,
    date: full.date ?? '2026-11-22',
    time: full.time ?? '09:00',
    anchor: full.anchor ?? 'leaven',
    proof: full.proof ?? 'cold',
    ovenCapacity: full.ovenCapacity ?? 2,
    reheat: full.reheat ?? 30,
    tempUnit: full.tempUnit ?? 'F',
  });
  if (!p.order.includes(i.recipe)) p.order.push(i.recipe);
  const profile = p.recipes[i.recipe];
  Object.assign(profile.params, i.params);
  if (i.totalHydration !== undefined)
    profile.params.hydration = Math.max(0, addedHydration(i.totalHydration, profile.params));
  profile.done = [...(full.done ?? [])];
  profile.doneAt = Object.fromEntries(Object.entries(full.doneAt ?? {}).map(([id, t]) => [id, local(t)]));
  profile.doughTemp = full.doughTemp ?? null;
  profile.bulkTemps = (full.bulkTemps ?? []).map((r) => ({ at: local(r.at), f: r.f }));
  return p;
}

/**
 * The Schedule tab for one plan: every step as the timeline shows it, and what the Up next card, the notices and the
 * bake summary show. The view block mirrors the start of ScheduleTab (src/components/ScheduleTab.tsx), and
 * app.test.ts checks the real one against the record; step 3 of the rebuild moves those rules into tested code and
 * this adapter then calls it.
 */
export function observePlan(i: PlanInput, core: Core = oldCore) {
  const plan = planner(i),
    now = local(i.now),
    profile = plan.recipes[plan.recipe],
    checks = profile.done;
  const { steps, shift, estimate, turns, bulkMinutes, checkFrom } = core.follow(plan);
  const doneStep = steps.find((s) => s.id === 'done'),
    first = steps[0];
  const skipped = core.skipped(steps, checks),
    settled = [...checks, ...skipped];
  const remaining = steps.filter((s) => !settled.includes(s.id)),
    completed = steps.filter((s) => checks.includes(s.id)).length,
    next = remaining[0];
  const stale = doneStep !== undefined && +doneStep.at < now && (completed === 0 || remaining.length === 0);
  const tempText = (f: number) =>
    `${round(core.helpers.fromF(f, plan.tempUnit), plan.tempUnit === 'C' ? 1 : 0)}°${plan.tempUnit}`;
  const advice =
    bulkMinutes !== null
      ? core.bulkDone(bulkMinutes, estimate)
      : estimate
        ? core.advice(estimate, stamp, { turns, hold: core.hold(estimate, now), temp: tempText })
        : null;
  const shape = steps.find((s) => s.id === 'shape');
  const during = next !== undefined && (next.id === 'shape' || core.turnNumber(next.id) > 0);
  const night = core.quiet(steps, settled),
    quiet = new Map(night.map((a) => [a.step.id, a.continues ? 'continues' : 'starts']));
  const gaps = core.gaps(steps),
    proof = core.coldProof(steps),
    count = plan.recipes[plan.recipe].params.count;
  return {
    steps: steps.map((s) => ({
      id: s.id,
      title: s.title,
      at: stamp(s.at),
      phase: core.phase(s),
      gap: gaps.get(s.id) ?? 0,
      ...(s.note !== undefined && { note: s.note }),
      ...(s.readiness !== undefined && { ready: s.readiness }),
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
      batches: Math.ceil(count / plan.ovenCapacity),
      finish: doneStep ? stamp(doneStep.at) : null,
      totalTime: first && doneStep ? core.text.duration((+doneStep.at - +first.at) / 60000) : null,
      checked: completed,
      stale,
      underway: checks.length > 0 && !stale,
      allDone: remaining.length === 0 && steps.length > 0,
      days: [...new Set(steps.map((s) => dateString(s.at)))],
      upNext:
        next && !stale
          ? {
              id: next.id,
              countdown: core.text.until(+next.at - now),
              then: remaining[1]?.id ?? null,
              doughCheck:
                core.turnNumber(next.id) > 0 && shape !== undefined && checkFrom !== null && now >= +checkFrom,
              temperatureField:
                during && profile.doughTemp !== null ? 'now' : during || next.id === 'rest' ? 'after mixing' : null,
            }
          : null,
      shift,
      shiftText: core.text.shift(shift),
      estimate: estimate && {
        planned: estimate.planned,
        minutes: estimate.minutes,
        difference: estimate.difference,
        readyAt: stamp(estimate.readyAt),
        checkFrom: stamp(estimate.checkFrom),
        plannedEnd: stamp(estimate.plannedEnd),
      },
      turns,
      bulkMinutes,
      checkFrom: checkFrom ? stamp(checkFrom) : null,
      advice,
      quietHours: night.length,
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
export function observeFormula(i: FormulaInput, core: Core = oldCore) {
  const plan = planner(i),
    r = core.formula(plan);
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
    hydrationMin: Math.ceil(core.hydrationFloor(plan)),
    totalFlour: r.totalFlour,
    totalWater: r.totalWater,
    flours: r.flours.map((f) => ({ key: f.key, name: f.name, grams: f.grams, percent: f.percent })),
    initial: r.initial,
    final: r.final,
    made: r.made,
    madeParts: r.madeParts,
    reserve: r.reserve,
    shortfall: r.shortfall,
    dustingRice: r.dustingRice,
  };
}

/**
 * Saved data is loaded at this moment. Without a valid saved date a plan starts the next day, so loading at a fixed
 * moment keeps that date the same on every run, and far from every date the cases save.
 */
export const LOADED_AT = '2030-01-01 12:00';

/** Saved browser data after loading: the settings, checklists and readings it gives every recipe, and the selected plan's times. */
export function observeRestore(saved: unknown) {
  const p = atMoment(local(LOADED_AT), () => restorePlanner(saved));
  return {
    recipe: p.recipe,
    order: p.order,
    date: p.date,
    time: p.time,
    anchor: p.anchor,
    proof: p.proof,
    ovenCapacity: p.ovenCapacity,
    reheat: p.reheat,
    tempUnit: p.tempUnit,
    recipes: Object.fromEntries(
      Object.entries(p.recipes).map(([id, r]) => [
        id,
        {
          params: r.params,
          done: r.done,
          doneAt: Object.fromEntries(Object.entries(r.doneAt).map(([k, t]) => [k, stamp(t)])),
          doughTemp: r.doughTemp,
          bulkTemps: r.bulkTemps.map((b) => ({ at: stamp(b.at), f: b.f })),
        },
      ]),
    ),
    schedule: recipeSchedule(p).map((s) => `${s.id} ${stamp(s.at)}`),
  };
}

/** Small helpers whose wording or rounding the screen shows directly. */
export function observeHelper({ fn, args }: HelperCall, core: Core = oldCore): unknown {
  const a = args as never[],
    h = core.helpers;
  switch (fn) {
    case 'retime': {
      const t = h.retime(a[0], a[1]);
      return t === null ? null : stamp(t);
    }
    case 'untilText':
      return core.text.until(a[0]);
    case 'shiftText':
      return core.text.shift(a[0]);
    case 'durationText':
      return core.text.duration(a[0]);
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
