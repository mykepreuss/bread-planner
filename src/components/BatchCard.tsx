import { Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_AUTOLYSE } from '@/domain/recipes';
import { Panel } from './Panel';
import { NumberField, SettingField, spec } from './NumberField';
import { g } from './text';

/**
 * "Your batch" on the Schedule tab: the loaf count, how many loaves one bowl mixes, the autolyse, and the dough it
 * makes. `leavenFirst` is a recipe with the leaven in its initial mix, whose setting is the rest after that mix.
 */
export function BatchCard({
  weight,
  total,
  hydration,
  mixCapacity,
  bowls,
  leavenFirst,
  onMixCapacity,
  onViewIngredients,
}: {
  weight: number;
  total?: number;
  hydration: number;
  mixCapacity: number;
  bowls: number;
  leavenFirst: boolean;
  onMixCapacity: (loaves: number) => void;
  onViewIngredients: () => void;
}) {
  return (
    <Panel title="Your batch" icon={<Wheat size={18} />} className="setup-card">
      <div className="field-grid">
        <SettingField spec={spec('count', 'Number of loaves', 'loaves', 1, 1)} />
        <NumberField
          spec={{ cell: 'mix-capacity', label: 'Loaves per mix', unit: 'loaves', min: 1, step: 1 }}
          value={mixCapacity}
          onChange={onMixCapacity}
        />
        <SettingField
          spec={{
            cell: 'autolyse',
            label: leavenFirst ? 'Rest after mixing' : 'Autolyse',
            unit: 'min',
            min: 0,
            max: MAX_AUTOLYSE,
            step: 1,
          }}
        />
      </div>
      <p className="field-note">
        {leavenFirst
          ? 'The leaven is in this mix, so the steps after it move with the rest.'
          : 'It ends as the leaven is ready, so only its start moves.'}
      </p>
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
        <span>
          <strong>
            {bowls} {bowls === 1 ? 'bowl' : 'bowls'}
          </strong>{' '}
          to mix in
        </span>
      </div>
      <Button variant="link" className="text-link" onClick={() => onViewIngredients()}>
        View ingredients
      </Button>
    </Panel>
  );
}
