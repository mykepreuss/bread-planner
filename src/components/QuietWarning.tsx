import { Moon } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import type { LiveStep } from '@/domain/bakeday';
import type { QuietFix } from '@/view/schedule';
import { calendarText, timeText } from './text';

/** What a suggested start leaves in quiet hours. */
const leaves = (n: number) =>
  n === 0 ? 'nothing falls in quiet hours' : `${n} ${n === 1 ? 'action falls' : 'actions fall'} in quiet hours`;

/**
 * The warning above the schedule when hands-on steps fall after 10:30 PM or before 7:00 AM. Before anything is
 * checked, it suggests the nearest leaven start with less night work, and for a Tartine recipe one with the other
 * proof when that has less still (see `fixesFor`).
 */
export function QuietWarning({
  actions,
  fixes,
  proof,
  fresh,
  onFix,
}: {
  actions: { step: LiveStep; continues: boolean }[];
  fixes: QuietFix[];
  /** The plan's proof, so a suggestion that changes it says so. */
  proof: 'cold' | 'warm';
  /** Nothing is checked yet, so the plan can still move. */
  fresh: boolean;
  onFix: (fix: QuietFix) => void;
}) {
  const advice = !fresh
    ? 'Try an earlier start or a different finish time. '
    : fixes.length === 0
      ? 'No other start time has less. '
      : '';
  return (
    <section className="quiet-warning" role="region" aria-label="Quiet hours warning">
      <Moon size={22} />
      <div>
        <h2>
          {actions.length} {actions.length === 1 ? 'action needs' : 'actions need'} you during quiet hours
        </h2>
        <p>{`Hands-on work is scheduled after 10:30 PM or before 7:00 AM. ${advice}Overnight rests are fine.`}</p>
        {fixes.map((fix) => {
          const time = timeText(fix.at),
            other = fix.proof !== proof;
          return (
            <p key={fix.proof} className="quiet-fix">
              <span>{`${other ? `With a ${fix.proof} proof, start` : 'Start'} the leaven at ${time} on ${calendarText(fix.at)} and ${leaves(fix.actions)}.`}</span>
              <Button type="button" variant="outline" onClick={() => onFix(fix)}>
                {other ? `Use a ${fix.proof} proof at ${time}` : `Start at ${time}`}
              </Button>
            </p>
          );
        })}
        <Accordion type="single" collapsible className="quiet-details">
          <AccordionItem value="actions">
            <AccordionTrigger>View affected steps</AccordionTrigger>
            <AccordionContent>
              <ul>
                {actions.map(({ step, continues }) => (
                  <li key={step.id}>
                    <time dateTime={step.at.toISOString()}>
                      {calendarText(step.at)} at {timeText(step.at)}
                    </time>
                    <span>
                      {step.title}
                      {continues && <small>Continues past 10:30 PM</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
