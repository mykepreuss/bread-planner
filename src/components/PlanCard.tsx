import { Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { LiveStep } from '@/domain/bakeday';
import { calendarText, timeText } from './text';

/**
 * "When are we baking?": plan around the leaven or the finish, the date and time, and when baking is complete. Before
 * a start is chosen, the date and time are the planner's suggestion, and it says so.
 */
export function PlanCard({
  anchor,
  date,
  time,
  onAnchor,
  onDate,
  onTime,
  doneStep,
  suggested,
}: {
  anchor: 'leaven' | 'done';
  date: string;
  time: string;
  onAnchor: (anchor: 'leaven' | 'done') => void;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
  doneStep?: LiveStep;
  /** The date and time are the planner's suggested start, not ones Michael chose. */
  suggested?: boolean;
}) {
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
          <div>
            <Label htmlFor="plan-date">{anchor === 'leaven' ? 'Leaven date' : 'Last batch date'}</Label>
            <Input id="plan-date" type="date" value={date} onChange={(e) => onDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="plan-time">Time</Label>
            <Input id="plan-time" type="time" value={time} onChange={(e) => onTime(e.target.value)} />
          </div>
        </div>
        {suggested && <p className="plan-suggested">Suggested. Change the date or time to choose your own.</p>}
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
