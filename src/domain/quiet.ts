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

/**
 * The leaven start that leaves the fewest hands-on steps in quiet hours, and how many it leaves. Added at Michael's
 * request on November 22, 2026, so a plan with night work can suggest a start with less (decision 15). It tries every
 * quarter hour from 12 hours before the planned leaven start (or from `from`, if later) to 24 hours after that, plans
 * each with the leaven at that time, and keeps the one with the fewest quiet-hour actions; of those, the one whose
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
    const steps = schedule({ ...input, anchor: 'leaven', date: dateString(at), time: clockText(at) });
    // A start the clocks skip, such as 2:30 AM as summer time begins, has no plan.
    if (!steps.length) continue;
    const found = quietHourActions(steps),
      actions = found.length,
      depth = found.reduce(
        (sum, { step, continues }) =>
          sum + quietDepth(continues ? new Date(step.at.getTime() + step.activeMinutes * 60000) : step.at),
        0,
      );
    const better =
      !best ||
      actions < best.actions ||
      (actions === best.actions &&
        (depth < best.depth || (depth === best.depth && Math.abs(+at - start) <= Math.abs(+best.at - start))));
    if (better) best = { at, actions, depth };
  }
  return best && { at: best.at, actions: best.actions };
}
