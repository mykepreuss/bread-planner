import { Snowflake } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { durationText } from '@/domain/text';
import type { coldProofWindow } from '@/domain/schedule';
import { Panel } from './Panel';
import { NumberField } from './NumberField';
import { calendarText, loafText, timeText } from './text';

/** "Oven and proof": loaves baked at once, the reheat between batches, and the cold proof or Tartine's final proof. */
export function OvenCard({
  ovenCapacity,
  proof,
  reheat,
  onCapacity,
  onReheat,
  onProof,
  book,
  batches,
  count,
  proofWindow,
}: {
  ovenCapacity: number;
  proof: 'cold' | 'warm';
  reheat: number;
  onCapacity: (capacity: number) => void;
  onReheat: (minutes: number) => void;
  onProof: (proof: 'cold' | 'warm') => void;
  book: boolean;
  batches: number;
  count: number;
  proofWindow: ReturnType<typeof coldProofWindow>;
}) {
  return (
    <Panel title="Oven and proof" className="setup-card">
      <div className="field-grid">
        <div className="number-field">
          <Label htmlFor="oven-capacity">Loaves baked at once</Label>
          <Select value={String(ovenCapacity)} onValueChange={(v) => onCapacity(Number(v))}>
            <SelectTrigger id="oven-capacity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 loaf</SelectItem>
              <SelectItem value="2">2 loaves</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {batches > 1 && (
          <NumberField
            spec={{ cell: 'reheat', label: 'Reheat between batches', unit: 'min', step: 1 }}
            value={reheat}
            onChange={onReheat}
          />
        )}
      </div>
      <p className="field-note">
        <strong>
          {batches} {batches === 1 ? 'batch' : 'batches'}
        </strong>{' '}
        for {loafText(count)}.
      </p>
      {!book && proofWindow && (
        <div className="cold-proof-summary">
          <div>
            <Snowflake size={18} />
            <strong>Cold proof, {durationText(proofWindow.minutes)}</strong>
          </div>
          <p>
            <span>
              {calendarText(proofWindow.start)} at {timeText(proofWindow.start)}
            </span>
            <span>
              to {calendarText(proofWindow.end)} at {timeText(proofWindow.end)}
            </span>
          </p>
          <span className="cold-proof-status">
            {proofWindow.overnight ? 'Overnight cold ferment' : 'Daytime proof with this start time'}
          </span>
        </div>
      )}
      {book && (
        <>
          <Label className="proof-label">Final proof</Label>
          <Select value={proof} onValueChange={(v) => onProof(v as 'cold' | 'warm')}>
            <SelectTrigger aria-label="Final proof">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cold">Refrigerated, 10 to 12 hours</SelectItem>
              <SelectItem value="warm">Warm, 3 to 4 hours</SelectItem>
            </SelectContent>
          </Select>
          <p className="field-note">
            {proof === 'cold'
              ? 'Allows 60 minutes to warm each batch.'
              : 'Later batches wait longer during serial baking. Judge their condition before loading.'}
          </p>
        </>
      )}
    </Panel>
  );
}
