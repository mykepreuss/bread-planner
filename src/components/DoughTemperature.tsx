import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { inTempRange, toF, fromF, tempLimits } from '@/lib/bakeday';

export type TempUnit = 'F' | 'C';
/** The number field and °F/°C switch shared by both dough temperature forms, with an optional action beside them. */
function TempRow({
  id,
  draft,
  unit,
  invalid,
  onDraft,
  onUnit,
  onFocus,
  onBlur,
  children,
}: {
  id: string;
  draft: string;
  unit: TempUnit;
  invalid: boolean;
  onDraft: (v: string) => void;
  onUnit: (u: TempUnit) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  children?: ReactNode;
}) {
  const limits = tempLimits[unit];
  return (
    <>
      <div className="dough-temp-row">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={0.5}
          min={limits.min}
          max={limits.max}
          placeholder={unit === 'F' ? '78' : '26'}
          value={draft}
          aria-invalid={invalid}
          onFocus={onFocus}
          onChange={(e) => onDraft(e.target.value)}
          onBlur={onBlur}
        />
        <Select value={unit} onValueChange={(v) => onUnit(v as TempUnit)}>
          <SelectTrigger className="temp-unit" aria-label="Temperature unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="F">°F</SelectItem>
            <SelectItem value="C">°C</SelectItem>
          </SelectContent>
        </Select>
        {children}
      </div>
      {invalid && (
        <span className="input-error">
          Use {limits.min} to {limits.max}°{unit}
        </span>
      )}
    </>
  );
}
/** Measured dough temperature, stored in °F and entered in either unit. An empty field clears it. */
export function DoughTemperature({
  id,
  valueF,
  unit,
  onChange,
  onUnit,
  advice,
}: {
  id: string;
  valueF: number | null;
  unit: TempUnit;
  onChange: (f: number | null) => void;
  onUnit: (u: TempUnit) => void;
  advice?: string;
}) {
  const shown = valueF === null ? '' : String(Math.round(fromF(valueF, unit) * 10) / 10);
  const [draft, setDraft] = useState(shown),
    [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(shown);
  }, [shown, focused]);
  const invalid = draft.trim() !== '' && !inTempRange(Number(draft), unit);
  const change = (v: string) => {
    setDraft(v);
    if (v.trim() === '') onChange(null);
    else if (inTempRange(Number(v), unit)) onChange(toF(Number(v), unit));
  };
  return (
    <div className="dough-temp">
      <Label htmlFor={id}>Dough temperature after mixing</Label>
      <TempRow
        id={id}
        draft={draft}
        unit={unit}
        invalid={invalid}
        onDraft={change}
        onUnit={onUnit}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (invalid) setDraft(shown);
        }}
      />
      <p className="bulk-advice" aria-live="polite">
        {advice ??
          'Measure the dough after mixing to estimate how long bulk will take. The plan counts 78°F / 26°C as normal.'}
      </p>
    </div>
  );
}
/** A later reading during bulk. It is added with the time it was taken, and re-times only the fermentation still to come. */
export function Remeasure({
  id,
  unit,
  onUnit,
  onAdd,
  advice,
}: {
  id: string;
  unit: TempUnit;
  onUnit: (u: TempUnit) => void;
  onAdd: (f: number) => void;
  advice?: string;
}) {
  const [draft, setDraft] = useState(''),
    entered = draft.trim() !== '',
    valid = entered && inTempRange(Number(draft), unit);
  return (
    <form
      className="dough-temp"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) {
          onAdd(toF(Number(draft), unit));
          setDraft('');
        }
      }}
    >
      {advice && (
        <p className="bulk-advice lead" aria-live="polite">
          {advice}
        </p>
      )}
      <Label htmlFor={id}>Dough temperature now</Label>
      <TempRow id={id} draft={draft} unit={unit} invalid={entered && !valid} onDraft={setDraft} onUnit={onUnit}>
        <Button type="submit" variant="outline" disabled={!valid}>
          Update
        </Button>
      </TempRow>
    </form>
  );
}
