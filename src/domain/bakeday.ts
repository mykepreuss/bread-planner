import type { Step } from './schedule.ts';
import { durationText } from './text.ts';

/** A step as it stands on bake day: when it was planned, and when it now falls or was actually done. */
export type LiveStep = Step & { planned: Date; actual?: Date };

const MINUTE = 60000;
/** The turn number in a step id, from 1, or 0. Saved checklists can hold turns beyond the plan's, added for cool dough. */
export const turnOf = (id: string) => Number(/^turn(\d+)$/.exec(id)?.[1] ?? 0);

/** Check-off times are kept to the minute, so shifted steps land on whole minutes. */
export function stampNow(now = Date.now()) {
  return Math.round(now / MINUTE) * MINUTE;
}

/**
 * Moves the plan to follow the dough. Each checked step with a recorded time takes that time. Unchecked steps after
 * it keep their planned spacing from the latest checked step that moves the plan, so a late leaven moves everything
 * that follows, while a late turn moves nothing.
 */
export function liveSchedule(steps: Step[], done: string[], doneAt: Record<string, number> = {}) {
  const checked = new Set(done);
  let shift = 0;
  const live: LiveStep[] = steps.map((step) => {
    const t = checked.has(step.id) ? doneAt[step.id] : undefined;
    if (typeof t === 'number' && Number.isFinite(t)) {
      if (step.movesPlan) shift = t - step.at.getTime();
      return { ...step, planned: step.at, actual: new Date(t), at: new Date(t) };
    }
    return { ...step, planned: step.at, at: new Date(step.at.getTime() + shift) };
  });
  return { steps: live, shift: Math.round(shift / MINUTE) };
}

/** Bulk steps (its start and the turns) left unchecked once a later step is checked were skipped: the dough was ready sooner. */
export function skippedSteps(steps: Step[], done: string[]) {
  const checked = new Set(done),
    last = steps.reduce((index, step, i) => (checked.has(step.id) ? i : index), -1);
  return steps.filter((step, i) => i < last && !checked.has(step.id) && step.bulk).map((step) => step.id);
}

/**
 * Bulk estimate from dough temperature, agreed with Michael on 2026-11-15: the planned bulk counts as dough at 78°F,
 * and fermentation time doubles for every 15°F (8°C) cooler and halves for every 15°F warmer (The Sourdough Journey's
 * rule). Since 2026-11-21 the estimate moves the plan; see `followDough`.
 */
export const BULK_REFERENCE_F = 78,
  BULK_DOUBLING_F = 15;
export type TempUnit = 'F' | 'C';
export const toF = (n: number, unit: TempUnit) => (unit === 'F' ? n : (n * 9) / 5 + 32);
export const fromF = (n: number, unit: TempUnit) => (unit === 'F' ? n : ((n - 32) * 5) / 9);
export const tempLimits = { F: { min: 50, max: 100 }, C: { min: 10, max: 38 } } as const;
export const inTempRange = (n: number, unit: TempUnit) =>
  Number.isFinite(n) && n >= tempLimits[unit].min && n <= tempLimits[unit].max;
/** A dough temperature taken during bulk, after the one taken after mixing: when, in epoch milliseconds, and °F. */
export type BulkReading = { at: number; f: number };

/**
 * Turns fall every 30 minutes from the start of bulk, and none comes closer than 15 minutes to preshape. Cool dough
 * gets at most one more hour of folds (two turns), as Tartine allows; after that it rests covered until it is ready.
 * From 30 minutes before bulk should end, the dough decides: the turn card leads with checking it.
 */
const TURN_EVERY = 30,
  TURN_MARGIN = 15,
  MAX_EXTRA_TURNS = 2,
  CHECK_LEAD = 30;
/** Fermentation speed relative to dough at the 78°F reference. */
const rate = (f: number) => 2 ** ((f - BULK_REFERENCE_F) / BULK_DOUBLING_F);
const ofKind = <T extends Step>(steps: T[], kind: Step['kind']) => steps.find((s) => s.kind === kind);

/**
 * Treats bulk as progress toward the planned length at 78°F. The after-mixing reading applies from the start of bulk,
 * and each later reading from when it was taken, so a new reading re-times only what is left. Readings from before
 * this bake's final mix belong to an earlier bake and are ignored.
 */
export function bulkEstimate(steps: LiveStep[], doughTempF: number | null, later: BulkReading[] = []) {
  const start = ofKind(steps, 'bulk'),
    end = ofKind(steps, 'preshape');
  if (doughTempF === null || !Number.isFinite(doughTempF) || !start || !end) return null;
  const planned = Math.round((end.planned.getTime() - start.planned.getTime()) / MINUTE),
    begin = start.at.getTime(),
    mix = ofKind(steps, 'mix'),
    since = mix ? Math.min(mix.at.getTime(), begin) : begin;
  // A reading belongs to this bake from the final mix on. One taken before bulk started, or in its first minute, applies from the start.
  const segments = [
    { from: begin, f: doughTempF },
    ...later
      .filter((r) => r.at >= since)
      .sort((a, b) => a.at - b.at)
      .map((r) => ({ from: Math.max(r.at, begin), f: r.f })),
  ];
  let left = planned,
    ready = begin;
  for (let i = 0; i < segments.length; i++) {
    const { from, f } = segments[i],
      next = segments[i + 1]?.from ?? Infinity,
      needs = (left / rate(f)) * MINUTE;
    if (from + needs <= next) {
      ready = from + needs;
      break;
    }
    left -= ((next - from) / MINUTE) * rate(f);
  }
  const minutes = Math.round((ready - begin) / MINUTE),
    readyAt = new Date(begin + minutes * MINUTE),
    checkFrom = new Date(Math.max(begin, readyAt.getTime() - CHECK_LEAD * MINUTE));
  return { planned, minutes, difference: minutes - planned, readyAt, checkFrom, plannedEnd: end.at, segments };
}
export type BulkEstimate = NonNullable<ReturnType<typeof bulkEstimate>>;

/** The steady dough temperature, in °F, that would finish bulk at the original preshape from `now`, counting the fermentation already done. Null once that time has passed or bulk is done. */
export function holdTemperature(e: BulkEstimate, now: number) {
  const target = e.plannedEnd.getTime();
  const from = Math.max(now, e.segments[0].from);
  let done = 0;
  e.segments.forEach((s, i) => {
    const stop = Math.min(e.segments[i + 1]?.from ?? Infinity, from);
    if (stop > s.from) done += ((stop - s.from) / MINUTE) * rate(s.f);
  });
  const left = e.planned - done,
    available = (target - from) / MINUTE;
  return left > 0 && available > 0 ? BULK_REFERENCE_F + BULK_DOUBLING_F * Math.log2(left / available) : null;
}

/**
 * The live schedule with bulk following the dough. Without a temperature it is `liveSchedule` unchanged. With one,
 * preshape moves to the estimated end of bulk and everything after it keeps its spacing, as a late check-off would.
 * Turns stay on their 30-minute marks from the start of bulk: ones that no longer fit 15 minutes before preshape drop
 * off, and cool dough gets up to two more, as Michael chose on 2026-11-21. Checked turns always stay, and preshape
 * never comes before the latest one. Once preshape or a later step is checked, the estimate moves nothing: the turns
 * shown are the ones due before preshape was actually done, plus any that were checked.
 */
export function followDough(
  steps: Step[],
  done: string[],
  doneAt: Record<string, number> = {},
  doughTempF: number | null = null,
  later: BulkReading[] = [],
) {
  const base = liveSchedule(steps, done, doneAt),
    estimate = bulkEstimate(base.steps, doughTempF, later);
  const checked = new Set(done),
    turns = steps.filter((s) => s.turn > 0),
    shapeAt = steps.findIndex((s) => s.kind === 'preshape'),
    lastChecked = Math.max(0, ...done.map(turnOf));
  const checkFrom = (shapeTime?: Date) =>
    estimate ? estimate.checkFrom : shapeTime ? new Date(shapeTime.getTime() - CHECK_LEAD * MINUTE) : null;
  if (!turns.length || shapeAt < 0 || !ofKind(steps, 'bulk') || (!estimate && lastChecked <= turns.length))
    return {
      ...base,
      estimate,
      turns: null,
      bulkMinutes: null,
      checkFrom: checkFrom(ofKind(base.steps, 'preshape')?.at),
    };
  const bulkOver = steps.slice(shapeAt).some((s) => checked.has(s.id));
  const rest = ofKind(steps, 'bulk')!,
    begin = ofKind(base.steps, 'bulk')!.at.getTime(),
    shape = ofKind(base.steps, 'preshape')!;
  const latestChecked = Math.max(
    ...base.steps.filter((s) => s.actual && s.bulk).map((s) => s.actual!.getTime()),
    -Infinity,
  );
  // While bulk runs it ends at the estimate; once preshape is done, at that time. Never before the latest checked turn.
  const end = estimate
    ? Math.max(shape.actual ? shape.actual.getTime() : estimate.readyAt.getTime(), latestChecked)
    : null;
  const turnAt = (n: number) => begin + n * TURN_EVERY * MINUTE;
  const inTime = (n: number) =>
    end === null ? n <= turns.length : bulkOver ? turnAt(n) < end : turnAt(n) <= end - TURN_MARGIN * MINUTE;
  const cap = turns.length + MAX_EXTRA_TURNS,
    fits = (n: number) => inTime(n) && n <= cap;
  const keep = (n: number) => checked.has(`turn${n}`) || fits(n);
  const kept = steps.filter((s) => !s.turn || keep(s.turn)),
    last = turns.at(-1)!,
    extra: Step[] = [];
  for (let n = turns.length + 1; fits(n) || n <= lastChecked; n++)
    if (keep(n))
      extra.push({
        ...last,
        id: `turn${n}`,
        title: `Turn ${n}`,
        turn: n,
        minutes: TURN_EVERY,
        at: new Date(rest.at.getTime() + n * TURN_EVERY * MINUTE),
      });
  kept.splice(
    kept.findIndex((s) => s.kind === 'preshape'),
    0,
    ...extra,
  );
  // While bulk runs, preshape waits for the dough: it and every later step (none checked yet) move to the estimated end.
  const result = liveSchedule(kept, done, doneAt),
    moving = estimate !== null && !bulkOver,
    from = result.steps.findIndex((s) => s.kind === 'preshape');
  const delta = moving ? end! - result.steps[from].at.getTime() : 0,
    moved = delta
      ? result.steps.map((s, i) => (i < from ? s : { ...s, at: new Date(s.at.getTime() + delta) }))
      : result.steps;
  const bulkMinutes = bulkOver && shape.actual ? Math.round((shape.actual.getTime() - begin) / MINUTE) : null;
  return {
    steps: moved,
    shift: result.shift,
    estimate,
    bulkMinutes,
    checkFrom: checkFrom(moved[from].at),
    turns: moving
      ? { planned: turns.length, now: kept.filter((s) => s.turn > 0).length, capped: inTime(cap + 1) }
      : null,
  };
}

/** Adds a reading. One taken in the same minute as an earlier one replaces it, so a corrected typo counts once. */
export function withReading(readings: BulkReading[], reading: BulkReading) {
  return [...readings.filter((r) => r.at !== reading.at), reading].sort((a, b) => a.at - b.at);
}

/** Once preshape is done: how long bulk actually took, and what the temperature estimate said. */
export function bulkDoneText(minutes: number, e?: BulkEstimate | null) {
  return `Bulk took ${durationText(minutes)}.${e ? ` The estimate was ${durationText(e.minutes)}.` : ''}`;
}

/** The bulk note: how long bulk should take, whether that moved the plan, and how to get back on plan. */
export function bulkAdvice(
  e: BulkEstimate,
  time: (d: Date) => string,
  options: {
    turns?: { planned: number; now: number; capped?: boolean } | null;
    hold?: number | null;
    temp?: (f: number) => string;
  } = {},
) {
  const lead = `Bulk should take about ${durationText(e.minutes)}, ready around ${time(e.readyAt)}.`,
    check = `Start checking the dough from ${time(e.checkFrom)}.`;
  if (Math.abs(e.difference) < 15) return `${lead} That is close to the plan. ${check}`;
  const { turns, hold, temp } = options,
    changed =
      turns && turns.now !== turns.planned
        ? ` The plan now has ${turns.now} ${turns.now === 1 ? 'turn' : 'turns'} instead of ${turns.planned}.`
        : '';
  const back =
    hold != null && temp && hold >= 68 && hold <= 86
      ? ` To preshape at ${time(e.plannedEnd)} as first planned, keep the dough near ${temp(hold)}.`
      : '';
  const early = e.difference < 0,
    fold = early
      ? ''
      : ` ${turns?.capped ? 'Keep folding every 30 minutes for up to one more hour, then leave the dough covered until it is ready.' : 'Keep folding every 30 minutes until then.'}`;
  return `${lead} That is ${durationText(Math.abs(e.difference))} ${early ? 'before' : 'after'} the original preshape, so preshape and every later step have moved ${early ? 'earlier' : 'later'}.${fold}${changed} ${check}${back}`;
}

/** Sets a recorded check-off to the local date and clock time shown in its two fields. Returns null for an incomplete or impossible entry. */
export function retime(date: string, hhmm: string) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date),
    t = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!d || !t || +t[1] > 23 || +t[2] > 59) return null;
  const at = new Date(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  return at.getFullYear() === +d[1] && at.getMonth() === +d[2] - 1 && at.getDate() === +d[3] ? at.getTime() : null;
}

/** Minutes from each step's start to the next step's start, from the live times. Steps that start together, and the last step, get 0. */
export function stepGaps(steps: { id: string; at: Date }[]) {
  return new Map(
    steps.map((s, i) => [
      s.id,
      steps[i + 1] ? Math.max(0, Math.round((steps[i + 1].at.getTime() - s.at.getTime()) / MINUTE)) : 0,
    ]),
  );
}
