import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Addition } from '@/domain/schedule';
import { g } from './text';

/**
 * What a mixing step adds to the dough, each with its own tick-off, so none hides in a sentence. The Up next card and
 * the timeline can both show a step's list, so `place` keeps their ids apart.
 */
export function Additions({
  place,
  additions,
  added,
  onAdded,
}: {
  place: 'now' | 'timeline';
  additions: Addition[];
  added: string[];
  onAdded: (id: string, added: boolean) => void;
}) {
  return (
    <ul className="additions" aria-label="Add to the dough">
      {additions.map((a) => {
        const id = `${place}-add-${a.id.replace(':', '-')}`;
        return (
          <li key={a.id}>
            <Checkbox id={id} checked={added.includes(a.id)} onCheckedChange={(v) => onAdded(a.id, v === true)} />
            <Label htmlFor={id}>
              {a.name} <span className="addition-weight">{g(a.grams)} g</span>
            </Label>
          </li>
        );
      })}
    </ul>
  );
}
