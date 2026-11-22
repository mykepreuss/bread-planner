import { useEffect, useState } from 'react';
import { useSelector } from '@tanstack/react-form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { round, type InputSpec } from '@/lib/model';
import { totalHydration, addedHydration } from '@/lib/recipes';
import { useCalc } from './calculator';
import { g } from './text';

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
  onBlur,
  label,
  id,
  min = 0,
  step = 0.1,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  onBlur: () => void;
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
          onBlur();
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
/** A setting of the selected recipe: a number field, with a slider for the percentages. Total hydration is shown and typed as total, and saved as added hydration. */
export function NumberField({
  spec,
  compact = false,
  context,
  hydrationParams,
}: {
  spec: InputSpec;
  compact?: boolean;
  context?: string;
  hydrationParams?: Record<string, number>;
}) {
  const form = useCalc(),
    id = useSelector(form.store, (s) => s.values.recipe);
  const name = spec.cell === 'reheat' ? spec.cell : (`recipes.${id}.params.${spec.cell}` as const);
  const range = compact ? undefined : sliderRanges[spec.cell];
  return (
    <form.Field
      name={name}
      validators={{
        onChange: ({ value }) =>
          Number.isFinite(value) && value >= (spec.min ?? 0) ? undefined : 'Enter a valid amount',
      }}
    >
      {(field) => {
        const value = hydrationParams ? Math.round(totalHydration(hydrationParams)) : field.state.value,
          min = hydrationParams ? Math.ceil(totalHydration({ ...hydrationParams, hydration: 0 })) : (spec.min ?? 0),
          rangeMin = range ? Math.max(min, Math.min(range.min, Math.floor(value / 10) * 10)) : 0,
          rangeMax = range ? Math.max(range.max, Math.ceil(value / 10) * 10, rangeMin + 10) : 0;
        const change = (next: number) =>
          field.handleChange(hydrationParams ? Math.max(0, addedHydration(next, hydrationParams)) : next);
        return (
          <div className={compact ? 'cell-control' : 'number-field'}>
            {!compact && <Label htmlFor={`field-${spec.cell}`}>{spec.label}</Label>}
            <div className="amount-wrap">
              <Amount
                id={`field-${spec.cell}`}
                label={context ? `${spec.label} (${context})` : spec.label}
                value={value}
                min={min}
                max={spec.cell === 'reserve' ? 100 : undefined}
                step={spec.step ?? 0.001}
                onChange={change}
                onBlur={field.handleBlur}
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
                  onValueChange={([next]) => change(next)}
                  onValueCommit={field.handleBlur}
                />
                <div className="range-limits" aria-hidden="true">
                  <span>{g(rangeMin)}%</span>
                  <span>{g(rangeMax)}%</span>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </form.Field>
  );
}
export function FieldGroup({ specs }: { specs: InputSpec[] }) {
  return (
    <div className="field-grid">
      {specs.map((spec) => (
        <NumberField key={spec.cell} spec={spec} />
      ))}
    </div>
  );
}
/** The spec for a recipe setting's field. */
export function spec(cell: string, label: string, unit: string, min = 0, step = 0.001): InputSpec {
  return { key: cell, cell, label, unit, value: 0, min, step };
}
