import { calendarText, dateString, timeText } from '@/lib/model';

/** A weight or percentage as the screen writes it: grouped, with at most one decimal. */
export const g = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
/** A time as the bake-day card writes it: the time alone today, with the date on any other day. */
export function whenText(at: Date, now: number) {
  return dateString(at) === dateString(new Date(now)) ? timeText(at) : `${calendarText(at)} at ${timeText(at)}`;
}
