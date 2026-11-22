/** Rounding, dates and durations, written the way the planner shows them. */

/** Rounds half away from zero, negative values included, as the source spreadsheet did. */
export function round(n: number, places = 0) {
  const factor = 10 ** places;
  return (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * factor)) / factor;
}

/** A local date as `YYYY-MM-DD`. */
export function dateString(d: Date) {
  return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A local clock time as `HH:MM`. */
export const clockText = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Minutes as `45 min`, `4h` or `3h 19m`. */
export function durationText(minutes: number) {
  const h = Math.floor(minutes / 60),
    m = round(minutes % 60, 1);
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m} min`;
}

/** How long until a step, or how long ago it was due. */
export function untilText(ms: number) {
  const min = Math.round(ms / 60000);
  return min === 0 ? 'due now' : min > 0 ? `in ${durationText(min)}` : `due ${durationText(-min)} ago`;
}

/** How far the plan has moved from check-offs, or nothing when it has not. */
export function shiftText(minutes: number) {
  return minutes === 0
    ? ''
    : `Running ${durationText(Math.abs(minutes))} ${minutes > 0 ? 'behind' : 'ahead of'} plan. Later steps have moved to match.`;
}
