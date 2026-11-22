import type { ReactNode } from 'react';
import { Clock3, RotateCcw, Snowflake, Moon, X, Wheat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { clockText, dateString, durationText } from '@/domain/text';
import type { coldProofWindow } from '@/domain/schedule';
import type { BulkReading, LiveStep } from '@/domain/bakeday';
import { calendarText, timeText } from './text';

/** What a step row needs: its state, and the actions it can take. */
type StepActions = {
  onToggle: (id: string, checked: boolean) => void;
  onRetime: (id: string, date: string, hhmm: string) => void;
  onRemoveReading: (at: number) => void;
  afterMixField: (id: string) => ReactNode;
  readings: BulkReading[];
  tempText: (f: number) => string;
};

/** One step on the timeline: its check box, time, title and badges, Done at fields, note and cue, and the gap to the next step. Start of bulk also has the dough temperature. */
function TimelineStep({
  step,
  done,
  skip,
  isNext,
  quiet,
  gap,
  onToggle,
  onRetime,
  onRemoveReading,
  afterMixField,
  readings,
  tempText,
}: StepActions & {
  step: LiveStep;
  done: boolean;
  skip: boolean;
  isNext: boolean;
  quiet: boolean;
  gap?: number;
}) {
  return (
    <div
      className={`timeline-step phase-${step.phase} ${done ? 'is-done' : ''} ${skip ? 'is-skipped' : ''} ${isNext ? 'is-next' : ''}`}
    >
      <div className="step-check">
        <Checkbox
          id={`step-${step.id}`}
          checked={done}
          onCheckedChange={(v) => onToggle(step.id, v === true)}
          aria-label={`Complete ${step.title}`}
        />
      </div>
      <time dateTime={step.at.toISOString()}>{timeText(step.at)}</time>
      <div className="step-details">
        <Label htmlFor={`step-${step.id}`}>
          {step.title}
          {step.id === 'fridge' && <Snowflake size={14} />}{' '}
          {isNext && (
            <Badge variant="secondary" className="next-badge">
              Up next
            </Badge>
          )}
          {skip && (
            <Badge variant="outline" className="skipped-badge">
              Skipped
            </Badge>
          )}
          {quiet && (
            <Badge variant="outline" className="quiet-badge">
              <Moon size={12} /> Quiet hours
            </Badge>
          )}
        </Label>
        {done && step.actual && (
          <div className="done-at" role="group" aria-labelledby={`done-at-label-${step.id}`}>
            <span className="done-at-label" id={`done-at-label-${step.id}`}>
              Done at
            </span>
            <Input
              type="date"
              aria-label={`Date ${step.title} was done`}
              value={dateString(step.actual)}
              onChange={(e) => onRetime(step.id, e.target.value, clockText(step.actual!))}
            />
            <Input
              type="time"
              aria-label={`Time ${step.title} was done`}
              value={clockText(step.actual)}
              onChange={(e) => onRetime(step.id, dateString(step.actual!), e.target.value)}
            />
          </div>
        )}
        {step.note && <p>{step.note}</p>}
        {step.readiness && (
          <p className="readiness-cue">
            <strong>Ready when:</strong> {step.readiness}
          </p>
        )}
        {step.id === 'rest' && (
          <>
            {afterMixField('timeline-dough-temp')}
            {readings.length > 0 && (
              <ul className="bulk-readings" aria-label="Later dough temperatures">
                {readings.map((r) => (
                  <li key={r.at}>
                    <span>
                      <strong>{tempText(r.f)}</strong> at {timeText(new Date(r.at))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove the ${tempText(r.f)} reading from ${timeText(new Date(r.at))}`}
                      onClick={() => onRemoveReading(r.at)}
                    >
                      <X size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {(gap ?? 0) > 0 && (
        <span className="step-gap">
          <span className="sr-only">Next step in </span>
          {durationText(gap!)}
        </span>
      )}
    </div>
  );
}

/** The Bake schedule: the total time and checklist count, the notices, and every step grouped by day. */
export function Timeline({
  steps,
  days,
  checks,
  skipped,
  next,
  stale,
  nightIds,
  gaps,
  completed,
  firstStep,
  doneStep,
  remaining,
  book,
  proofWindow,
  onClear,
  onPlanNext,
  ...actions
}: StepActions & {
  steps: LiveStep[];
  days: string[];
  checks: string[];
  skipped: string[];
  next?: LiveStep;
  stale: boolean;
  nightIds: Set<string>;
  gaps: Map<string, number>;
  completed: number;
  firstStep?: LiveStep;
  doneStep?: LiveStep;
  remaining: LiveStep[];
  book: boolean;
  proofWindow: ReturnType<typeof coldProofWindow>;
  onClear: () => void;
  onPlanNext: () => void;
}) {
  return (
    <section className="timeline-section" aria-labelledby="schedule-heading">
      <div className="section-heading">
        <div>
          <h2 id="schedule-heading">Bake schedule</h2>
        </div>
      </div>
      <div className="timeline-meta">
        <span>
          <Clock3 size={14} />
          {firstStep && doneStep ? durationText((+doneStep.at - +firstStep.at) / 60000) : 'Set a date and time'} total
        </span>
        <span>
          {completed} of {steps.length} steps checked
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Clear checklist" disabled={!completed} onClick={onClear}>
              <RotateCcw size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear this recipe's checklist</TooltipContent>
        </Tooltip>
      </div>
      {!book && proofWindow && !proofWindow.overnight && (
        <p className="notice overnight-warning" role="status">
          This cold proof falls within one calendar day. For an overnight ferment, shift your start or finish time so
          this rest spans the night. The dates below show your current plan.
        </p>
      )}
      {stale && doneStep && (
        <p className="notice" role="status">
          <span>
            This plan ended {calendarText(doneStep.at)}.{' '}
            <Button variant="link" className="inline-link" onClick={onPlanNext}>
              Plan the next bake
            </Button>{' '}
            to move it to tomorrow and keep every setting.
          </span>
        </p>
      )}
      {!steps.length && (
        <p className="notice" role="alert">
          Choose a valid date, time, positive whole loaf count and oven capacity. A time skipped by daylight saving
          cannot be used.
        </p>
      )}
      {days.map((day, dayIndex) => (
        <div className="day-group" key={day}>
          <div className="day-heading">
            <span className="day-number">Day {dayIndex + 1}</span>
            <h3>{calendarText(steps.find((s) => dateString(s.at) === day)!.at)}</h3>
            <span className="day-rule" />
          </div>
          <div className="step-list">
            {steps
              .filter((s) => dateString(s.at) === day)
              .map((step) => (
                <TimelineStep
                  key={step.id}
                  step={step}
                  done={checks.includes(step.id)}
                  skip={skipped.includes(step.id)}
                  isNext={!stale && next?.id === step.id}
                  quiet={nightIds.has(step.id)}
                  gap={gaps.get(step.id)}
                  {...actions}
                />
              ))}
          </div>
        </div>
      ))}
      {remaining.length === 0 && steps.length > 0 && (
        <div className="bake-complete">
          <Wheat /> All batches done. Enjoy your bread.
        </div>
      )}
    </section>
  );
}
