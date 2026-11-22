import type { ReactNode } from 'react';
import { Clock3, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { stepPhase, untilText, shiftText, type LiveStep } from '@/lib/bakeday';
import { whenText } from './text';

/**
 * The Up next card: the next step, its countdown, its note and cue, and a Done button. From 30 minutes before bulk
 * should end, a turn's card leads with the dough: check it, and preshape now if it is ready.
 */
export function NowCard({
  next,
  then,
  shift,
  now,
  onDone,
  bulk,
  doughCheck,
}: {
  next: LiveStep;
  then?: LiveStep;
  shift: number;
  now: number;
  onDone: () => void;
  bulk?: ReactNode;
  doughCheck?: { readiness?: string; onReady: () => void };
}) {
  const due = +next.at <= now;
  return (
    <section className={`now-card phase-${stepPhase(next.id)}${due ? ' is-due' : ''}`} aria-label="Up next">
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
      {next.readiness && (
        <p className="readiness-cue">
          <strong>Ready when:</strong> {next.readiness}
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
