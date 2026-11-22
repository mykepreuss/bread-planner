import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import * as act from '@/state/actions';
import { scheduleView, skipsOnCheck } from '@/view/schedule';
import { usePlanner } from './calculator';
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
 * The Schedule tab. It shows the live schedule for the selected recipe (src/view/schedule.ts) and turns each bake-day
 * control into a planner action: checking a step, correcting when it was done, temperature readings, and starting the
 * next bake. A check that would skip many earlier steps asks first (see `skipsOnCheck`).
 */
export function ScheduleTab({ onViewIngredients }: { onViewIngredients: () => void }) {
  const { state, update } = usePlanner(),
    now = useNow();
  const v = useMemo(() => scheduleView(state, now, (at) => whenText(at, now)), [state, now]);
  const book = v.recipe.method === 'tartine',
    checks = v.bake.done;
  const [asking, setAsking] = useState<{ id: string; title: string; skips: number } | null>(null);
  const check = (id: string, checked: boolean) => {
    if (checked) {
      const { skips, ask } = skipsOnCheck(state, id, Date.now());
      const title = v.steps.find((s) => s.id === id)?.title ?? '';
      if (ask) return setAsking({ id, title, skips: skips.length });
    }
    update((s) => act.setChecked(s, id, checked, Date.now()));
  };
  const onUnit = (u: TempUnit) => update((s) => act.setTempUnit(s, u));
  const afterMixField = (id: string) => (
    <DoughTemperature
      id={id}
      valueF={v.bake.doughTemp}
      unit={state.tempUnit}
      onChange={(f) => update((s) => act.setDoughTemp(s, f))}
      onUnit={onUnit}
      advice={v.advice}
    />
  );
  const nowBulk =
    v.temperatureField === 'now' ? (
      <Remeasure
        id="now-dough-temp"
        unit={state.tempUnit}
        onUnit={onUnit}
        onAdd={(f) => update((s) => act.addReading(s, f, Date.now()))}
        advice={v.advice}
      />
    ) : v.temperatureField === 'after mixing' ? (
      afterMixField('now-dough-temp')
    ) : undefined;
  const shape = v.shape;
  const doughCheck =
    v.doughCheck && shape ? { readiness: shape.readiness, onReady: () => check(shape.id, true) } : undefined;
  return (
    <>
      {v.next && !v.stale && (
        <NowCard
          next={v.next}
          then={v.then}
          shift={v.shift}
          now={now}
          onDone={() => check(v.next!.id, true)}
          bulk={nowBulk}
          doughCheck={doughCheck}
        />
      )}
      {v.night.length > 0 && <QuietWarning actions={v.night} />}
      <div className={`schedule-layout${v.underway ? ' is-underway' : ''}`}>
        <div className="schedule-sidebar">
          <PlanCard
            anchor={state.anchor}
            date={state.date}
            time={state.time}
            onAnchor={(anchor) => update((s) => act.setAnchor(s, anchor))}
            onDate={(date) => update((s) => act.setDate(s, date))}
            onTime={(time) => update((s) => act.setTime(s, time))}
            doneStep={v.doneStep}
          />
          <BatchCard weight={v.weight} total={v.total} hydration={v.hydration} onViewIngredients={onViewIngredients} />
          <OvenCard
            ovenCapacity={state.ovenCapacity}
            proof={state.proof}
            reheat={state.reheat}
            onCapacity={(capacity) => update((s) => act.setOvenCapacity(s, capacity))}
            onReheat={(minutes) => update((s) => act.setReheat(s, minutes))}
            onProof={(proof) => update((s) => act.setProof(s, proof))}
            book={book}
            batches={v.batches}
            count={v.count}
            proofWindow={v.proofWindow}
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
          steps={v.steps}
          days={v.days}
          checks={checks}
          skipped={v.skipped}
          next={v.next}
          stale={v.stale}
          nightIds={v.nightIds}
          gaps={v.gaps}
          completed={v.completed}
          totalMinutes={v.totalMinutes}
          allDone={v.allDone}
          doneStep={v.doneStep}
          book={book}
          proofWindow={v.proofWindow}
          onClear={() => update(act.clearChecklist)}
          onPlanNext={() => update((s) => act.planNextBake(s, Date.now()))}
          onToggle={check}
          onRetime={(id, date, hhmm) => update((s) => act.setDoneAt(s, id, date, hhmm))}
          onRemoveReading={(at) => update((s) => act.removeReading(s, at))}
          afterMixField={afterMixField}
          readings={v.bake.bulkTemps}
          tempText={v.tempText}
        />
      </div>
      <AlertDialog open={asking !== null} onOpenChange={(open) => !open && setAsking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip {asking?.skips} earlier steps?</AlertDialogTitle>
            <AlertDialogDescription>
              Checking "{asking?.title}" marks {asking?.skips} earlier steps as Skipped. You can still check them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Don't check it</AlertDialogCancel>
            <AlertDialogAction onClick={() => asking && update((s) => act.setChecked(s, asking.id, true, Date.now()))}>
              Check and skip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
