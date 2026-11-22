import { formula, totalHydration } from '../domain/formula.ts';
import { schedule, coldProofWindow } from '../domain/schedule.ts';
import {
  followDough,
  skippedSteps,
  holdTemperature,
  bulkAdvice,
  bulkDoneText,
  fromF,
  type LiveStep,
} from '../domain/bakeday.ts';
import { quietHourActions } from '../domain/quiet.ts';
import { stepGaps } from '../domain/bakeday.ts';
import { dateString, round } from '../domain/text.ts';
import { planOf, selected, type PlannerState } from '../state/schema.ts';

/**
 * What the Schedule tab shows for a planner at a moment: the live schedule, what is up next, whether the plan has
 * ended, the bulk advice and which temperature field to offer, quiet-hour work, the cold proof, and the batch summary.
 * `when` writes a time the way the Up next card does (the time alone today, with the date on another day).
 */
export function scheduleView(state: PlannerState, now: number, when: (d: Date) => string) {
  const { recipe, settings, bake } = selected(state);
  const calc = formula(recipe, settings);
  const planned = schedule(planOf(state));
  const { steps, shift, estimate, turns, bulkMinutes, checkFrom } = followDough(
    planned,
    bake.done,
    bake.doneAt,
    bake.doughTemp,
    bake.bulkTemps,
  );
  const doneStep = steps.find((s) => s.id === 'done'),
    firstStep = steps[0];
  const skipped = skippedSteps(steps, bake.done),
    settled = [...bake.done, ...skipped];
  const remaining = steps.filter((s) => !settled.includes(s.id)),
    completed = steps.filter((s) => bake.done.includes(s.id)).length,
    next: LiveStep | undefined = remaining[0];
  // The plan has ended once its last loaf is out in the past and either nothing is checked or everything is settled.
  const stale = doneStep !== undefined && doneStep.at.getTime() < now && (completed === 0 || remaining.length === 0);
  const tempText = (f: number) =>
    `${round(fromF(f, state.tempUnit), state.tempUnit === 'C' ? 1 : 0)}°${state.tempUnit}`;
  const advice =
    bulkMinutes !== null
      ? bulkDoneText(bulkMinutes, estimate)
      : estimate
        ? bulkAdvice(estimate, when, { turns, hold: holdTemperature(estimate, now), temp: tempText })
        : undefined;
  const shape = steps.find((s) => s.kind === 'preshape');
  // From 30 minutes before bulk should end, a turn's card leads with checking the dough.
  const doughCheck =
    next !== undefined && next.turn > 0 && shape !== undefined && checkFrom !== null && now >= checkFrom.getTime();
  // Bulk steps offer the dough temperature: after mixing until there is one, then later readings.
  const during = next !== undefined && (next.kind === 'preshape' || next.turn > 0);
  const temperatureField: 'now' | 'after mixing' | null =
    next === undefined
      ? null
      : during && bake.doughTemp !== null
        ? 'now'
        : during || next.kind === 'bulk'
          ? 'after mixing'
          : null;
  const night = quietHourActions(steps, settled);
  const count = settings.count;
  return {
    recipe,
    settings,
    bake,
    calc,
    planned,
    steps,
    shift,
    estimate,
    turns,
    bulkMinutes,
    checkFrom,
    doneStep,
    firstStep,
    skipped,
    settled,
    remaining,
    completed,
    next,
    then: remaining[1] as LiveStep | undefined,
    stale,
    tempText,
    advice,
    shape,
    doughCheck,
    temperatureField,
    night,
    nightIds: new Set(night.map(({ step }) => step.id)),
    gaps: stepGaps(steps),
    proofWindow: coldProofWindow(steps),
    days: Array.from(new Set(steps.map((s) => dateString(s.at)))),
    count,
    batches: Math.ceil(count / state.ovenCapacity),
    total: calc?.total,
    hydration: totalHydration(settings),
    weight: settings.weight,
    underway: bake.done.length > 0 && !stale,
    allDone: remaining.length === 0 && steps.length > 0,
    totalMinutes: firstStep && doneStep ? (doneStep.at.getTime() - firstStep.at.getTime()) / 60000 : null,
  };
}
export type ScheduleView = ReturnType<typeof scheduleView>;
