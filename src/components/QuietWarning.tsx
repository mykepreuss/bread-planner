import { Moon } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { calendarText, timeText } from '@/lib/model';
import type { quietHourActions } from '@/lib/recipes';

/** The warning above the schedule when hands-on steps fall after 10:30 PM or before 7:00 AM. */
export function QuietWarning({ actions }: { actions: ReturnType<typeof quietHourActions> }) {
  return (
    <section className="quiet-warning" role="region" aria-label="Quiet hours warning">
      <Moon size={22} />
      <div>
        <h2>
          {actions.length} {actions.length === 1 ? 'action needs' : 'actions need'} you during quiet hours
        </h2>
        <p>
          Hands-on work is scheduled after 10:30 PM or before 7:00 AM. Try an earlier start or a different finish time.
          Overnight rests are fine.
        </p>
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
