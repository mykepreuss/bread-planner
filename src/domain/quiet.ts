import type { Step } from './schedule.ts';
import { dateString } from './text.ts';

/** Quiet hours run from after 10:30 PM until 7:00 AM. */
function isQuietTime(at: Date) {
  const minute = at.getHours() * 60 + at.getMinutes() + at.getSeconds() / 60;
  return minute > 22 * 60 + 30 || minute < 7 * 60;
}

/**
 * Hands-on steps that start during quiet hours, and mixing or shaping that starts before the cutoff but runs past it
 * (`continues`). Rests and the cooling mark need no one, and steps already checked or skipped (`completed`) drop off.
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
