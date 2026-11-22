import { dateString } from '../domain/text.ts';

/** A weight or percentage as the screen writes it: grouped, with at most one decimal. */
export const g = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
/** A clock time in the reader's own format, such as 9:30 AM. */
export const timeText = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
/** A date in the reader's own format, such as Saturday, Nov 21. */
export const calendarText = (d: Date) => d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
/** A loaf count, such as 1 loaf or 3 loaves. */
export const loafText = (n: number) =>
  `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${n === 1 ? 'loaf' : 'loaves'}`;
/** A time as the bake-day card writes it: the time alone today, with the date on any other day. */
export function whenText(at: Date, now: number) {
  return dateString(at) === dateString(new Date(now)) ? timeText(at) : `${calendarText(at)} at ${timeText(at)}`;
}
