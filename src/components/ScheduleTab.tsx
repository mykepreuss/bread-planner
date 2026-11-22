import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { coldProofWindow, dateString, round } from '@/lib/model';
import {
  definitions,
  calculateRecipe,
  recipeSchedule,
  quietHourActions,
  totalHydration,
  type Planner,
  type Profile,
} from '@/lib/recipes';
import {
  followDough,
  holdTemperature,
  withReading,
  bulkDoneText,
  turnNumber,
  retime,
  stepGaps,
  stampNow,
  skippedSteps,
  bulkAdvice,
  fromF,
} from '@/lib/bakeday';
import { useCalc } from './calculator';
import { useNow } from './useNow';
import { whenText } from './text';
import { DoughTemperature, Remeasure, type TempUnit } from './DoughTemperature';
import { NowCard } from './NowCard';
import { QuietWarning } from './QuietWarning';
import { PlanCard } from './PlanCard';
import { BatchCard } from './BatchCard';
import { OvenCard } from './OvenCard';
import { Timeline } from './Timeline';

/**
 * The Schedule tab. It works out the live schedule from the selected recipe's plan, check-offs and dough temperatures,
 * and holds the bake-day actions: checking a step, correcting when it was done, temperature readings, and starting
 * the next bake.
 */
export function ScheduleTab({ values, onViewIngredients }: { values: Planner; onViewIngredients: () => void }) {
  const form = useCalc();
  const definition = definitions[values.recipe],
    book = definition.method === 'tartine',
    profile = values.recipes[values.recipe],
    calc = calculateRecipe(values);
  const total = calc?.total,
    hydration = totalHydration(profile.params),
    weight = profile.params.weight,
    count = profile.params.count,
    batches = Math.ceil(count / values.ovenCapacity);
  const now = useNow(),
    checks = profile.done,
    doneAt = profile.doneAt;
  const readings = profile.bulkTemps;
  const planned = useMemo(() => recipeSchedule(values), [values]),
    { steps, shift, estimate, turns, bulkMinutes, checkFrom } = useMemo(
      () => followDough(planned, checks, doneAt, profile.doughTemp, readings),
      [planned, checks, doneAt, profile.doughTemp, readings],
    );
  const doneStep = steps.find((s) => s.id === 'done'),
    firstStep = steps[0];
  const skipped = skippedSteps(steps, checks),
    settled = [...checks, ...skipped];
  const remaining = steps.filter((s) => !settled.includes(s.id)),
    completed = steps.filter((s) => checks.includes(s.id)).length,
    next = remaining[0],
    days = Array.from(new Set(steps.map((s) => dateString(s.at))));
  const stale = doneStep !== undefined && +doneStep.at < now && (completed === 0 || remaining.length === 0);
  const tempText = (f: number) =>
    `${round(fromF(f, values.tempUnit), values.tempUnit === 'C' ? 1 : 0)}°${values.tempUnit}`;
  const advice =
    bulkMinutes !== null
      ? bulkDoneText(bulkMinutes, estimate)
      : estimate
        ? bulkAdvice(estimate, (at) => whenText(at, now), {
            turns,
            hold: holdTemperature(estimate, now),
            temp: tempText,
          })
        : undefined;
  const setProfile = (change: Partial<Profile>) =>
    form.setFieldValue('recipes', (previous) => ({
      ...previous,
      [values.recipe]: { ...previous[values.recipe], ...change },
    }));
  const setDoughTemp = (doughTemp: number | null) => setProfile({ doughTemp });
  const addReading = (f: number) => setProfile({ bulkTemps: withReading(readings, { at: stampNow(), f }) });
  const removeReading = (at: number) => setProfile({ bulkTemps: readings.filter((r) => r.at !== at) });
  // Dough temperatures belong to one bake. A new bake (a new date or time before anything is checked, or Plan the next bake) starts without them.
  const clearTemps = () => {
    if (profile.doughTemp !== null || readings.length) setProfile({ doughTemp: null, bulkTemps: [] });
  };
  const changeWhen = (field: { handleChange: (v: string) => void }, value: string) => {
    field.handleChange(value);
    if (!checks.length) clearTemps();
  };
  const onUnit = (u: TempUnit) => form.setFieldValue('tempUnit', u);
  const afterMixField = (id: string) => (
    <DoughTemperature
      id={id}
      valueF={profile.doughTemp}
      unit={values.tempUnit}
      onChange={setDoughTemp}
      onUnit={onUnit}
      advice={advice}
    />
  );
  const nowBulk = (id: string) => {
    const during = id === 'shape' || turnNumber(id) > 0;
    if (during && profile.doughTemp !== null)
      return (
        <Remeasure id="now-dough-temp" unit={values.tempUnit} onUnit={onUnit} onAdd={addReading} advice={advice} />
      );
    if (during || id === 'rest') return afterMixField('now-dough-temp');
  };
  const shapeStep = steps.find((s) => s.id === 'shape');
  const doughCheck =
    next && turnNumber(next.id) > 0 && shapeStep && checkFrom && now >= +checkFrom
      ? { readiness: shapeStep.readiness, onReady: () => toggle('shape', true) }
      : undefined;
  function planNext() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    form.setFieldValue('date', dateString(tomorrow));
    clearTemps();
  }
  const gaps = stepGaps(steps);
  const nightActions = quietHourActions(steps, settled),
    nightIds = new Set(nightActions.map(({ step }) => step.id));
  const proofWindow = coldProofWindow(steps);
  const setProgress = (done: string[], times: Record<string, number>) => setProfile({ done, doneAt: times });
  const toggle = (id: string, checked: boolean) => {
    const times = { ...doneAt };
    if (checked) times[id] = stampNow();
    else delete times[id];
    setProgress(checked ? [...checks.filter((x) => x !== id), id] : checks.filter((x) => x !== id), times);
  };
  const retimeStep = (id: string, date: string, hhmm: string) => {
    const t = retime(date, hhmm);
    if (t !== null) setProgress(checks, { ...doneAt, [id]: t });
  };
  function changeAnchor(anchor: 'leaven' | 'done') {
    const step = planned.find((s) => s.id === anchor);
    if (step) {
      form.setFieldValue('date', dateString(step.at));
      form.setFieldValue(
        'time',
        `${String(step.at.getHours()).padStart(2, '0')}:${String(step.at.getMinutes()).padStart(2, '0')}`,
      );
    }
    form.setFieldValue('anchor', anchor);
  }
  const clearChecklist = () => {
    setProgress([], {});
    clearTemps();
  };
  return (
    <>
      {next && !stale && (
        <NowCard
          next={next}
          then={remaining[1]}
          shift={shift}
          now={now}
          onDone={() => toggle(next.id, true)}
          bulk={nowBulk(next.id)}
          doughCheck={doughCheck}
        />
      )}
      {nightActions.length > 0 && <QuietWarning actions={nightActions} />}
      <div className={`schedule-layout${checks.length > 0 && !stale ? ' is-underway' : ''}`}>
        <div className="schedule-sidebar">
          <PlanCard anchor={values.anchor} onAnchor={changeAnchor} onWhen={changeWhen} doneStep={doneStep} />
          <BatchCard weight={weight} total={total} hydration={hydration} onViewIngredients={onViewIngredients} />
          <OvenCard
            ovenCapacity={values.ovenCapacity}
            proof={values.proof}
            book={book}
            batches={batches}
            count={count}
            proofWindow={proofWindow}
          />
          <div className="sidebar-note">
            <Info size={17} />
            <p>
              Readiness comes before the clock. Wait until the dough is ready, then check the step. Later steps move to
              match.
            </p>
          </div>
        </div>
        <Timeline
          steps={steps}
          days={days}
          checks={checks}
          skipped={skipped}
          next={next}
          stale={stale}
          nightIds={nightIds}
          gaps={gaps}
          completed={completed}
          firstStep={firstStep}
          doneStep={doneStep}
          remaining={remaining}
          book={book}
          proofWindow={proofWindow}
          onClear={clearChecklist}
          onPlanNext={planNext}
          onToggle={toggle}
          onRetime={retimeStep}
          onRemoveReading={removeReading}
          afterMixField={afterMixField}
          readings={readings}
          tempText={tempText}
        />
      </div>
    </>
  );
}
