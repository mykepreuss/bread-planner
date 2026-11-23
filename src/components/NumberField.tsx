import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { round } from '@/domain/text';
import type { FlourKey } from '@/domain/recipes';
import { setSetting, type SettingKey } from '@/state/actions';
import { usePlanner } from './calculator';
import { g } from './text';

/** A field's id (`field-<cell>`), label, unit and limits. */
export type FieldSpec = { cell: string; label: string; unit: string; min?: number; max?: number; step?: number };

const sliderRanges: Record<string, { min: number; max: number; step: number }> = {
  hydration: { min: 50, max: 100, step: 1 },
  leaven: { min: 0, max: 50, step: 1 },
  salt: { min: 0, max: 5, step: 0.1 },
  reserve: { min: 0, max: 100, step: 1 },
};

/** A number input that keeps what is typed until it is valid, and shows the allowed range when it is not. */
function Amount({
  value,
  onChange,
  label,
  id,
  min = 0,
  step = 0.1,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  id?: string;
  min?: number;
  step?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(round(value, 3)));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(round(value, 3)));
  }, [value, focused]);
  const n = Number(draft);
  const invalid =
    draft.trim() === '' ||
    !Number.isFinite(n) ||
    n < min ||
    (max !== undefined && n > max) ||
    (step === 1 && !Number.isInteger(n));
  return (
    <>
      <Input
        id={id}
        aria-label={label}
        aria-invalid={invalid}
        title={invalid ? `Enter ${step === 1 ? 'a whole number' : 'a number'} of at least ${min}` : undefined}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          const num = e.target.valueAsNumber;
          if (
            Number.isFinite(num) &&
            num >= min &&
            (max === undefined || num <= max) &&
            (step !== 1 || Number.isInteger(num))
          )
            onChange(num);
        }}
        onBlur={() => {
          setFocused(false);
          if (invalid) setDraft(String(round(value, 3)));
        }}
      />
      {invalid && (
        <span className="input-error">
          Use {step === 1 ? 'a whole number' : 'a number'}{' '}
          {max === undefined ? `≥ ${min}` : `from ${min} to ${max}`}{' '}
        </span>
      )}
    </>
  );
}
/**
 * A number field, with a slider for the percentages. It shows `value`, calls `onChange` with each valid entry, and
 * accepts nothing below `min` (the spec's minimum unless given).
 */
export function NumberField({
  spec,
  value,
  onChange,
  min = spec.min ?? 0,
  compact = false,
  context,
}: {
  spec: FieldSpec;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  compact?: boolean;
  context?: string;
}) {
  const range = compact ? undefined : sliderRanges[spec.cell];
  const rangeMin = range ? Math.max(min, Math.min(range.min, Math.floor(value / 10) * 10)) : 0,
    rangeMax = range ? Math.max(range.max, Math.ceil(value / 10) * 10, rangeMin + 10) : 0;
  return (
    <div className={compact ? 'cell-control' : 'number-field'}>
      {!compact && <Label htmlFor={`field-${spec.cell}`}>{spec.label}</Label>}
      <div className="amount-wrap">
        <Amount
          id={`field-${spec.cell}`}
          label={context ? `${spec.label} (${context})` : spec.label}
          value={value}
          min={min}
          max={spec.cell === 'reserve' ? 100 : spec.max}
          step={spec.step ?? 0.001}
          onChange={onChange}
        />
        <span className="unit">{spec.unit}</span>
      </div>
      {range && (
        <div className="range-control">
          <Slider
            aria-label={`Adjust ${spec.label.toLowerCase()}`}
            aria-valuetext={`${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} percent`}
            value={[value]}
            min={rangeMin}
            max={rangeMax}
            step={range.step}
            onValueChange={([next]) => onChange(next)}
          />
          <div className="range-limits" aria-hidden="true">
            <span>{g(rangeMin)}%</span>
            <span>{g(rangeMax)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Field names of the leaven build, as the page's ids use them. */
const BUILD = { buildSeed: 'starter', buildBread: 'flour', buildWheat: 'wheat', buildWater: 'water' } as const;
/** The selected recipe's setting behind a field: its value and the change that sets it. */
function useSetting(cell: string) {
  const { state, update } = usePlanner(),
    settings = state.recipes[state.recipe].settings;
  const key: SettingKey = Object.hasOwn(BUILD, cell)
    ? `build:${BUILD[cell as keyof typeof BUILD]}`
    : cell.startsWith('flour_')
      ? `flour:${cell.slice(6) as FlourKey}`
      : (cell as SettingKey);
  const value = key.startsWith('build:')
    ? settings.build[key.slice(6) as keyof typeof settings.build]
    : key.startsWith('flour:')
      ? (settings.flours[key.slice(6) as FlourKey] ?? 0)
      : settings[key as 'count' | 'weight' | 'leaven' | 'salt' | 'reserve' | 'autolyse'];
  return { value, onChange: (n: number) => update((s) => setSetting(s, key, n)) };
}
/** A number field for one of the selected recipe's settings. */
export function SettingField({ spec, compact }: { spec: FieldSpec; compact?: boolean }) {
  const { value, onChange } = useSetting(spec.cell);
  return <NumberField spec={spec} value={value} onChange={onChange} compact={compact} />;
}
export function FieldGroup({ specs }: { specs: FieldSpec[] }) {
  return (
    <div className="field-grid">
      {specs.map((spec) => (
        <SettingField key={spec.cell} spec={spec} />
      ))}
    </div>
  );
}
/** The spec for a setting's field. */
export function spec(cell: string, label: string, unit: string, min = 0, step = 0.001): FieldSpec {
  return { cell, label, unit, min, step };
}
