/**
 * The two cores the baseline can observe: the old one in src/lib, which the app uses until step 3 of the rebuild,
 * and the new one in src/domain. Each takes a v5 planner, the shape saved data has today, and answers the same
 * questions, so one observation (observe.ts) can be compared across them.
 */
import {
  calculateRecipe,
  recipeSchedule,
  quietHourActions,
  totalHydration,
  type Planner,
} from '../../src/lib/recipes.ts';
import { coldProofWindow, durationText } from '../../src/lib/model.ts';
import * as old from '../../src/lib/bakeday.ts';
import { RECIPE_BY_ID, type FlourKey, type Settings } from '../../src/domain/recipes.ts';
import { formula, totalHydration as domainTotalHydration } from '../../src/domain/formula.ts';
import { schedule, coldProofWindow as domainColdProofWindow, type Step } from '../../src/domain/schedule.ts';
import { quietHourActions as domainQuietHourActions } from '../../src/domain/quiet.ts';
import * as next from '../../src/domain/bakeday.ts';
import * as text from '../../src/domain/text.ts';

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

export interface Core {
  name: 'old' | 'new';
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

export const oldCore: Core = {
  name: 'old',
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

/** The new core's settings for the selected recipe, from its saved v5 parameters. */
export function settingsOf(plan: Planner): Settings {
  const recipe = RECIPE_BY_ID[plan.recipe],
    q = plan.recipes[plan.recipe].params;
  if (!recipe) throw new Error(`The new core has no recipe ${plan.recipe}`);
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

export const newCore: Core = {
  name: 'new',
  follow(plan) {
    const p = plan.recipes[plan.recipe];
    const planned = schedule({
      recipe: RECIPE_BY_ID[plan.recipe],
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
  formula: (plan) => formula(RECIPE_BY_ID[plan.recipe], settingsOf(plan)),
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
