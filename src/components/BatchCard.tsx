import { Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from './Panel';
import { NumberField, spec } from './NumberField';
import { g } from './text';

/** "Your batch" on the Schedule tab: the loaf count, and the dough it makes. */
export function BatchCard({
  weight,
  total,
  hydration,
  onViewIngredients,
}: {
  weight: number;
  total?: number;
  hydration: number;
  onViewIngredients: () => void;
}) {
  return (
    <Panel title="Your batch" icon={<Wheat size={18} />} className="setup-card">
      <NumberField spec={spec('count', 'Number of loaves', 'loaves', 1, 1)} />
      <div className="batch-facts">
        <span>
          <strong>{g(weight)} g</strong> per loaf
        </span>
        <span>
          <strong>{total === undefined ? '—' : g(total)} g</strong> total dough
        </span>
        <span>
          <strong>{Math.round(hydration)}%</strong> total hydration
        </span>
      </div>
      <Button variant="link" className="text-link" onClick={() => onViewIngredients()}>
        View ingredients
      </Button>
    </Panel>
  );
}
