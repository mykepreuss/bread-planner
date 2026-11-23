import type { ReactNode } from 'react';
import { Clock3, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LiveStep } from '@/domain/bakeday';
import { untilText, shiftText } from '@/domain/text';
import { whenText } from './text';
import { Additions } from './Additions';

/**
 * The Up next card: the next step, its countdown, its note and cue, and a Done button. A mixing step lists what goes
 * in, each with its own tick-off. From 30 minutes before bulk should end, a turn's card leads with the dough: check
 * it, and preshape now if it is ready. Before a start is chosen, it says the start is the planner's suggestion.
 */
export function NowCard({
  next,
  then,
  shift,
  now,
  onDone,
  bulk,
  doughCheck,
  added,
  onAdded,
  suggested,
}: {
  next: LiveStep;
  then?: LiveStep;
  shift: number;
  now: number;
  onDone: () => void;
  bulk?: ReactNode;
  added: string[];
  onAdded: (id: string, added: boolean) => void;
  doughCheck?: { readiness?: string; onReady: () => void };
  /** The plan is the planner's suggested start, not one Michael chose. */
  suggested?: boolean;
}) {
  const due = +next.at <= now;
  return (
    <section className={`now-card phase-${next.phase}${due ? ' is-due' : ''}`} aria-label="Up next">
      <div className="now-when">
        <span className="eyebrow">Up next</span>
        <span className="now-countdown">{untilText(+next.at - now)}</span>
      </div>
      <h2>{next.title}</h2>
      <p className="now-time">
        <time dateTime={next.at.toISOString()}>{whenText(next.at, now)}</time>
      </p>
      {doughCheck && (
        <div className="dough-check">
          <p>
            <strong>Check the dough before this turn.</strong>
            {doughCheck.readiness && <> Ready when: {doughCheck.readiness}</>}
          </p>
          <Button variant="outline" onClick={doughCheck.onReady}>
            Ready: preshape now
          </Button>
        </div>
      )}
      {next.note && <p className="now-note">{next.note}</p>}
      {next.additions && <Additions place="now" additions={next.additions} added={added} onAdded={onAdded} />}
      {next.readiness && (
        <p className="readiness-cue">
          <strong>Ready when:</strong> {next.readiness}
        </p>
      )}
      {suggested && (
        <p className="now-suggested">
          <Sparkles size={16} />
          Suggested start: the soonest with the least night work.
        </p>
      )}
      {shift !== 0 && (
        <p className="now-shift">
          <Clock3 size={16} />
          {shiftText(shift)}
        </p>
      )}
      {bulk}
      <div className="now-actions">
        <Button size="lg" onClick={onDone}>
          <Check /> Done
        </Button>
        {then && (
          <p>
            Then: {then.title} · {whenText(then.at, now)}
          </p>
        )}
      </div>
    </section>
  );
}
