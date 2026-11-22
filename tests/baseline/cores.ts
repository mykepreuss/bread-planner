/**
 * The two cores the baseline can observe: the old one in src/lib, which the app used until step 3b of the rebuild,
 * and the new one in src/domain with the Schedule tab's view (src/view). Each takes a v5 planner, the shape the
 * record's inputs have, and answers the same questions, so one observation (observe.ts) can be compared across them.
 */
import {
  calculateRecipe,
  recipeSchedule,
  quietHourActions,
  totalHydration,
  type Planner,
} from '../../src/lib/recipes.ts';
import { coldProofWindow, dateString, durationText, round } from '../../src/lib/model.ts';
import * as old from '../../src/lib/bakeday.ts';
import { recipeById, type FlourKey, type Recipe, type Settings } from '../../src/domain/recipes.ts';
import { formula, totalHydration as domainTotalHydration } from '../../src/domain/formula.ts';
import { schedule, coldProofWindow as domainColdProofWindow, type Step } from '../../src/domain/schedule.ts';
import { quietHourActions as domainQuietHourActions } from '../../src/domain/quiet.ts';
import * as next from '../../src/domain/bakeday.ts';
import * as text from '../../src/domain/text.ts';
import { scheduleView } from '../../src/view/schedule.ts';
import type { PlannerState } from '../../src/state/schema.ts';

export type ViewStep = {
  id: string;
  title: string;
  at: Date;
  planned: Date;
  actual?: Date;
  note?: string;
  readiness?: string;
};
export type Estimate = {
  planned: number;
  minutes: number;
  difference: number;
  readyAt: Date;
  checkFrom: Date;
  plannedEnd: Date;
};
type Turns = { planned: number; now: number; capped?: boolean } | null;
type Weighed = [string, number];

/** What the Schedule tab works out for the selected recipe at a moment. */
export type View = {
  steps: ViewStep[];
  shift: number;
  estimate: Estimate | null;
  turns: Turns;
  bulkMinutes: number | null;
  checkFrom: Date | null;
  checks: string[];
  doneStep?: ViewStep;
  skipped: string[];
  remaining: ViewStep[];
  completed: number;
  next?: ViewStep;
  then?: ViewStep;
  stale: boolean;
  advice?: string;
  doughCheck: boolean;
  temperatureField: 'now' | 'after mixing' | null;
  night: { step: { id: string }; continues: boolean }[];
  gaps: Map<string, number>;
  proofWindow: { start: Date; end: Date; minutes: number; overnight: boolean } | null;
  batches: number;
  days: string[];
  underway: boolean;
  allDone: boolean;
  totalMinutes: number | null;
};

export interface Core {
  name: 'old' | 'new';
  /** The Schedule tab: the old core's rules as ScheduleTab held them, or the new view module. */
  view(plan: Planner, now: number, when: (d: Date) => string): View;
  /** The live schedule for the selected recipe: its plan, moved by check-offs and the dough temperature. */
  follow(plan: Planner): {
    steps: ViewStep[];
    shift: number;
    estimate: Estimate | null;
    turns: Turns;
    bulkMinutes: number | null;
    checkFrom: Date | null;
  };
  skipped(steps: ViewStep[], done: string[]): string[];
  phase(step: ViewStep): string;
  quiet(steps: ViewStep[], settled: string[]): { step: { id: string }; continues: boolean }[];
  coldProof(steps: ViewStep[]): { start: Date; end: Date; minutes: number; overnight: boolean } | null;
  gaps(steps: ViewStep[]): Map<string, number>;
  advice(
    e: Estimate,
    time: (d: Date) => string,
    options: { turns?: Turns; hold?: number | null; temp?: (f: number) => string },
  ): string;
  hold(e: Estimate, now: number): number | null;
  bulkDone(minutes: number, e: Estimate | null): string;
  turnNumber(id: string): number;
  formula(plan: Planner): {
    total: number;
    flour: number;
    water: number;
    used: number;
    salt: number;
    hydration: number;
    totalHydration: number;
    totalFlour: number;
    totalWater: number;
    flours: { key: string; name: string; grams: number; percent: number }[];
    initial: Weighed[];
    final: Weighed[];
    made: number;
    madeParts: number[];
    reserve: number;
    shortfall: number;
    dustingRice: number;
  } | null;
  /** The lowest total hydration the field accepts: the total with no added water. */
  hydrationFloor(plan: Planner): number;
  text: { duration(min: number): string; until(ms: number): string; shift(min: number): string };
  helpers: {
    retime(date: string, hhmm: string): number | null;
    stampNow(now: number): number;
    withReading(readings: { at: number; f: number }[], reading: { at: number; f: number }): { at: number; f: number }[];
    toF(n: number, unit: 'F' | 'C'): number;
    fromF(n: number, unit: 'F' | 'C'): number;
    inTempRange(n: number, unit: 'F' | 'C'): boolean;
  };
}

/** Each core is handed back only the steps and estimates it made itself. */
const own = <T>(x: unknown) => x as T;

/** The Schedule tab's rules as the old ScheduleTab (src/components/ScheduleTab.tsx before step 3b) held them. */
function oldView(core: Core, plan: Planner, now: number, when: (d: Date) => string): View {
  const profile = plan.recipes[plan.recipe],
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
        ? core.advice(estimate, when, { turns, hold: core.hold(estimate, now), temp: tempText })
        : undefined;
  const shape = steps.find((s) => s.id === 'shape');
  const during = next !== undefined && (next.id === 'shape' || core.turnNumber(next.id) > 0);
  return {
    steps,
    shift,
    estimate,
    turns,
    bulkMinutes,
    checkFrom,
    checks,
    doneStep,
    skipped,
    remaining,
    completed,
    next,
    then: remaining[1],
    stale,
    advice,
    doughCheck:
      next !== undefined &&
      core.turnNumber(next.id) > 0 &&
      shape !== undefined &&
      checkFrom !== null &&
      now >= +checkFrom,
    temperatureField:
      next === undefined
        ? null
        : during && profile.doughTemp !== null
          ? 'now'
          : during || next.id === 'rest'
            ? 'after mixing'
            : null,
    night: core.quiet(steps, settled),
    gaps: core.gaps(steps),
    proofWindow: core.coldProof(steps),
    batches: Math.ceil(profile.params.count / plan.ovenCapacity),
    days: [...new Set(steps.map((s) => dateString(s.at)))],
    underway: checks.length > 0 && !stale,
    allDone: remaining.length === 0 && steps.length > 0,
    totalMinutes: first && doneStep ? (+doneStep.at - +first.at) / 60000 : null,
  };
}

export const oldCore: Core = {
  name: 'old',
  view: (plan, now, when) => oldView(oldCore, plan, now, when),
  follow(plan) {
    const p = plan.recipes[plan.recipe];
    return old.followDough(recipeSchedule(plan), p.done, p.doneAt, p.doughTemp, p.bulkTemps);
  },
  skipped: (steps, done) => old.skippedSteps(own(steps), done),
  phase: (step) => old.stepPhase(step.id),
  quiet: (steps, settled) => quietHourActions(own(steps), settled),
  coldProof: (steps) => coldProofWindow(own(steps)),
  gaps: (steps) => old.stepGaps(steps),
  advice: (e, time, options) => old.bulkAdvice(own(e), time, options),
  hold: (e, now) => old.holdTemperature(own(e), now),
  bulkDone: (minutes, e) => old.bulkDoneText(minutes, own(e)),
  turnNumber: old.turnNumber,
  formula: (plan) => calculateRecipe(plan),
  hydrationFloor: (plan) => totalHydration({ ...plan.recipes[plan.recipe].params, hydration: 0 }),
  text: { duration: durationText, until: old.untilText, shift: old.shiftText },
  helpers: {
    retime: old.retime,
    stampNow: old.stampNow,
    withReading: old.withReading,
    toF: old.toF,
    fromF: old.fromF,
    inTempRange: old.inTempRange,
  },
};

/** The new core's recipe for the selected id. The new core has no `manual-rye`, which no saved data can reach. */
function recipeOf(plan: Planner): Recipe {
  const recipe = recipeById(plan.recipe);
  if (!recipe) throw new Error(`The new core has no recipe ${plan.recipe}`);
  return recipe;
}

/** The new core's settings for the selected recipe, from its saved v5 parameters. */
export function settingsOf(plan: Planner): Settings {
  const recipe = recipeOf(plan),
    q = plan.recipes[plan.recipe].params;
  return {
    count: q.count,
    weight: q.weight,
    hydration: q.hydration,
    leaven: q.leaven,
    salt: q.salt,
    reserve: q.reserve,
    flours: Object.fromEntries(recipe.flours.map((k: FlourKey) => [k, q[`flour_${k}`]])),
    build: { starter: q.buildSeed, flour: q.buildBread, wheat: q.buildWheat, water: q.buildWater },
  };
}

/** The new planner state for a v5 planner, taken as it is: loading would correct a few recorded plans, which the record keeps. */
function stateOf(plan: Planner): PlannerState {
  const p = plan.recipes[plan.recipe];
  return {
    recipe: plan.recipe,
    order: plan.order,
    date: plan.date,
    time: plan.time,
    anchor: plan.anchor,
    proof: plan.proof,
    ovenCapacity: plan.ovenCapacity,
    reheat: plan.reheat,
    tempUnit: plan.tempUnit,
    recipes: {
      [plan.recipe]: {
        settings: settingsOf(plan),
        bake: { done: p.done, doneAt: p.doneAt, doughTemp: p.doughTemp, bulkTemps: p.bulkTemps },
      },
    },
    created: { date: plan.legacy.date, time: plan.legacy.time },
  };
}

export const newCore: Core = {
  name: 'new',
  view(plan, now, when) {
    const v = scheduleView(stateOf(plan), now, when);
    return { ...v, checks: v.bake.done };
  },
  follow(plan) {
    const p = plan.recipes[plan.recipe];
    const planned = schedule({
      recipe: recipeOf(plan),
      settings: settingsOf(plan),
      date: plan.date,
      time: plan.time,
      anchor: plan.anchor,
      proof: plan.proof,
      ovenCapacity: plan.ovenCapacity,
      reheat: plan.reheat,
    });
    return next.followDough(planned, p.done, p.doneAt, p.doughTemp, p.bulkTemps);
  },
  skipped: (steps, done) => next.skippedSteps(own(steps), done),
  phase: (step) => own<Step>(step).phase,
  quiet: (steps, settled) => domainQuietHourActions(own<Step[]>(steps), settled),
  coldProof: (steps) => domainColdProofWindow(own(steps)),
  gaps: (steps) => next.stepGaps(steps),
  advice: (e, time, options) => next.bulkAdvice(own(e), time, options),
  hold: (e, now) => next.holdTemperature(own(e), now),
  bulkDone: (minutes, e) => next.bulkDoneText(minutes, own(e)),
  turnNumber: next.turnOf,
  formula: (plan) => formula(recipeOf(plan), settingsOf(plan)),
  hydrationFloor: (plan) => domainTotalHydration({ ...settingsOf(plan), hydration: 0 }),
  text: { duration: text.durationText, until: text.untilText, shift: text.shiftText },
  helpers: {
    retime: next.retime,
    stampNow: next.stampNow,
    withReading: next.withReading,
    toF: next.toF,
    fromF: next.fromF,
    inTempRange: next.inTempRange,
  },
};

export const cores = [oldCore, newCore];
