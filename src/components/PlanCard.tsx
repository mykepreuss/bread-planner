import { Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { calendarText, timeText } from '@/lib/model';
import type { LiveStep } from '@/lib/bakeday';
import { useCalc } from './calculator';

/** "When are we baking?": plan around the leaven or the finish, the date and time, and when baking is complete. */
export function PlanCard({
  anchor,
  onAnchor,
  onWhen,
  doneStep,
}: {
  anchor: 'leaven' | 'done';
  onAnchor: (anchor: 'leaven' | 'done') => void;
  onWhen: (field: { handleChange: (v: string) => void }, value: string) => void;
  doneStep?: LiveStep;
}) {
  const form = useCalc();
  return (
    <Card className="plan-card">
      <CardHeader>
        <CardTitle>When are we baking?</CardTitle>
      </CardHeader>
      <CardContent>
        <Label>Plan around</Label>
        <Select value={anchor} onValueChange={(v) => onAnchor(v as 'leaven' | 'done')}>
          <SelectTrigger className="anchor-select" aria-label="Plan around">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="leaven">Starting the leaven</SelectItem>
            <SelectItem value="done">All loaves out of the oven</SelectItem>
          </SelectContent>
        </Select>
        <div className="date-time-fields">
          <form.Field name="date">
            {(f) => (
              <div>
                <Label htmlFor="plan-date">{anchor === 'leaven' ? 'Leaven date' : 'Last batch date'}</Label>
                <Input
                  id="plan-date"
                  type="date"
                  value={f.state.value}
                  onChange={(e) => onWhen(f, e.target.value)}
                  onBlur={f.handleBlur}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="time">
            {(f) => (
              <div>
                <Label htmlFor="plan-time">Time</Label>
                <Input
                  id="plan-time"
                  type="time"
                  value={f.state.value}
                  onChange={(e) => onWhen(f, e.target.value)}
                  onBlur={f.handleBlur}
                />
              </div>
            )}
          </form.Field>
        </div>
        {doneStep && (
          <div className="finish-summary">
            <Flame size={19} />
            <div>
              <span>Baking complete</span>
              <strong>{timeText(doneStep.at)}</strong>
              <small>{calendarText(doneStep.at)}</small>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
