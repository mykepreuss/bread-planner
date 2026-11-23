import { schedule, type PlanInput, type Step } from './schedule.ts';
import { clockText, dateString } from './text.ts';

/** Quiet hours run from after 10:30 PM until 7:00 AM. */
function isQuietTime(at: Date) {
  const minute = at.getHours() * 60 + at.getMinutes() + at.getSeconds() / 60;
  return minute > 22 * 60 + 30 || minute < 7 * 60;
}

/**
 * Hands-on steps that start during quiet hours, and mixing or shaping that starts before the cutoff but runs past it
 * (`continues`). Rests need no one, and steps already checked or skipped (`completed`) drop off.
 */
export function quietHourActions<T extends Step>(steps: T[], completed: string[] = []) {
  const checked = new Set(completed);
  return steps.flatMap((step) => {
    if (checked.has(step.id) || !step.handsOn || !Number.isFinite(step.at.getTime())) return [];
    const startsQuiet = isQuietTime(step.at);
    const end = new Date(step.at.getTime() + step.activeMinutes * 60000);
    const continues = step.activeMinutes > 0 && (isQuietTime(end) || dateString(step.at) !== dateString(end));
    return startsQuiet || continues ? [{ step, continues: !startsQuiet }] : [];
  });
}

const QUARTER = 15 * 60000,
  HALF_DAY = 12 * 60 * 60000;

/** How far into quiet hours a time is, in minutes: 0 outside them, else to the nearer of 10:30 PM and 7:00 AM. */
function quietDepth(at: Date) {
  if (!isQuietTime(at)) return 0;
  const minute = at.getHours() * 60 + at.getMinutes() + at.getSeconds() / 60;
  return minute > 22 * 60 + 30 ? Math.min(minute - (22 * 60 + 30), 24 * 60 - minute + 7 * 60) : 7 * 60 - minute;
}

/** The plan with the leaven at `at`, its quiet-hour actions, and how far into quiet hours they fall in all. */
function tryStart(input: PlanInput, at: Date) {
  const steps = schedule({ ...input, anchor: 'leaven', date: dateString(at), time: clockText(at) });
  const found = quietHourActions(steps),
    depth = found.reduce(
      (sum, { step, continues }) =>
        sum + quietDepth(continues ? new Date(step.at.getTime() + step.activeMinutes * 60000) : step.at),
      0,
    );
  return { steps, actions: found.length, depth };
}

/**
 * The leaven start that leaves the fewest hands-on steps in quiet hours, and how many it leaves. Added at Michael's
 * request on November 22, 2026, so a plan with night work can suggest a start with less (decision 15). It tries every
 * quarter hour for 24 hours from 12 hours before the planned leaven start (or from `from`, if later), plans each with
 * the leaven at that time, skipping a plan whose first step, such as House's starter feed, would already be past, and keeps the one with the fewest quiet-hour actions; of those, the one whose
 * actions fall least far into quiet hours (a leaven at 6:15 AM, not 3:00 AM), then the nearest to the planned start,
 * and the later of two as near. A step that runs past 10:30 PM counts by how far it runs. Null when the plan has no
 * leaven step.
 */
export function quietestStart(input: PlanInput, from: number): { at: Date; actions: number } | null {
  const planned = schedule(input).find((s) => s.id === 'leaven');
  if (!planned) return null;
  const start = planned.at.getTime(),
    first = Math.ceil(Math.max(start - HALF_DAY, from) / QUARTER) * QUARTER;
  let best: { at: Date; actions: number; depth: number } | null = null;
  for (let i = 0; i < 96; i++) {
    const at = new Date(first + i * QUARTER);
    const { steps, actions, depth } = tryStart(input, at);
    // A plan must start no earlier than `from`: House's starter feed comes 11 hours before its leaven.
    if (!steps.length || steps[0].at.getTime() < from) continue;
    const better =
      !best ||
      actions < best.actions ||
      (actions === best.actions &&
        (depth < best.depth || (depth === best.depth && Math.abs(+at - start) <= Math.abs(+best.at - start))));
    if (better) best = { at, actions, depth };
  }
  return best && { at: best.at, actions: best.actions };
}

/**
 * The leaven start the planner suggests when no start has been chosen (decision 25): of the plans whose first step
 * starts on a quarter hour from the one `now` is in through the next 24 hours, the one with the fewest quiet-hour
 * actions, then the least far into quiet hours, then the soonest. The first step can be less than 15 minutes past, so a
 * start that has just come stays put until the next quarter hour. The date and time in `input` don't matter. Null when
 * the plan has no leaven step, as for a blend with no flour.
 */
export function suggestedStart(input: PlanInput, now: number): { at: Date; actions: number } | null {
  const sample = tryStart(input, new Date(Math.floor(now / QUARTER) * QUARTER)).steps,
    leaven = sample.find((s) => s.id === 'leaven');
  if (!leaven) return null;
  // How long the first step comes before the leaven: 11 hours for House's starter feed, none for Tartine.
  const lead = leaven.at.getTime() - sample[0].at.getTime(),
    first = Math.floor(now / QUARTER) * QUARTER;
  let best: { at: Date; actions: number; depth: number } | null = null;
  for (let i = 0; i < 96; i++) {
    const at = new Date(first + lead + i * QUARTER);
    const { steps, actions, depth } = tryStart(input, at);
    if (!steps.length) continue;
    if (!best || actions < best.actions || (actions === best.actions && depth < best.depth))
      best = { at, actions, depth };
  }
  return best && { at: best.at, actions: best.actions };
}
