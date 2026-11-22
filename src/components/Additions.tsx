import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Addition } from '@/domain/schedule';
import { g } from './text';

/** One list of tick-offs. `place` keeps the Up next card's ids apart from the timeline's. */
function List({
  place,
  label,
  additions,
  added,
  onAdded,
}: {
  place: 'now' | 'timeline';
  label: string;
  additions: Addition[];
  added: string[];
  onAdded: (id: string, added: boolean) => void;
}) {
  return (
    <ul className="additions" aria-label={label}>
      {additions.map((a) => {
        const id = `${place}-add-${a.id.replaceAll(':', '-')}`;
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

/**
 * What a mixing step adds to the dough, each with its own tick-off, so none hides in a sentence. Mixed in several
 * bowls, each bowl has its own list, so the salt can't go into one and be missed in the other.
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
  const bowls = [...new Set(additions.map((a) => a.bowl ?? 0))];
  if (bowls.length === 1 && bowls[0] === 0)
    return <List place={place} label="Add to the dough" additions={additions} added={added} onAdded={onAdded} />;
  return (
    <div className="additions-bowls">
      {bowls.map((bowl) => (
        <div key={bowl}>
          <p className="additions-bowl">Bowl {bowl}</p>
          <List
            place={place}
            label={`Add to bowl ${bowl}`}
            additions={additions.filter((a) => a.bowl === bowl)}
            added={added}
            onAdded={onAdded}
          />
        </div>
      ))}
    </div>
  );
}
