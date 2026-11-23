import { formula, totalHydration } from '../domain/formula.ts';
import { schedule, coldProofWindow, mixingBowls } from '../domain/schedule.ts';
import {
  followDough,
  skippedSteps,
  holdTemperature,
  bulkAdvice,
  bulkDoneText,
  fromF,
  stepGaps,
  type LiveStep,
} from '../domain/bakeday.ts';
import { quietHourActions, quietestStart } from '../domain/quiet.ts';
import { dateString, round } from '../domain/text.ts';
import { planOf, selected, type PlannerState } from '../state/schema.ts';
import { setChecked } from '../state/actions.ts';

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
  const skipped = skippedSteps(steps, bake.done, planned),
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
  const during = next !== undefined && (next.kind === 'preshape' || next.kind === 'addin' || next.turn > 0);
  const temperatureField: 'now' | 'after mixing' | null =
    next === undefined
      ? null
      : during && bake.doughTemp !== null
        ? 'now'
        : during || next.kind === 'bulk'
          ? 'after mixing'
          : null;
  const night = quietHourActions(steps, settled);
  // Before anything is checked, a plan with night work suggests a start with less (decision 15).
  const quietFixes = night.length > 0 && bake.done.length === 0 ? fixesFor(state, night.length, now) : [];
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
    quietFixes,
    gaps: stepGaps(steps),
    proofWindow: coldProofWindow(steps),
    days: Array.from(new Set(steps.map((s) => dateString(s.at)))),
    count,
    batches: Math.ceil(count / state.ovenCapacity),
    bowls: mixingBowls(count, state.mixCapacity),
    total: calc?.total,
    hydration: totalHydration(settings),
    weight: settings.weight,
    underway: bake.done.length > 0 && !stale,
    allDone: remaining.length === 0 && steps.length > 0,
    totalMinutes: firstStep && doneStep ? (doneStep.at.getTime() - firstStep.at.getTime()) / 60000 : null,
  };
}
export type ScheduleView = ReturnType<typeof scheduleView>;

/** A leaven start the quiet-hours warning suggests, with the proof it needs and the quiet-hour actions it leaves. */
export type QuietFix = { at: Date; actions: number; proof: 'cold' | 'warm' };

/**
 * The starts the quiet-hours warning suggests for a plan with `actions` quiet-hour actions: the quietest leaven start
 * with this proof, if it leaves fewer, and for a Tartine recipe the quietest with the other proof, if it leaves fewer
 * still. Added at Michael's request on November 22, 2026: with the book's 12-hour leaven and 12-hour fridge, no start
 * kept a cold-proofed Tartine bake out of quiet hours, but an evening leaven with a warm proof did. Since decisions 19
 * to 21 gave each Tartine recipe a longer fridge, a cold proof always has a night-free start, so the other proof is
 * offered when a warm proof has none, as with eight loaves baked one at a time.
 */
function fixesFor(state: PlannerState, actions: number, now: number): QuietFix[] {
  const input = planOf(state),
    fixes: QuietFix[] = [];
  const same = quietestStart(input, now),
    planned = schedule(input).find((s) => s.id === 'leaven');
  // Never the plan's own start: a dough temperature left after unchecking every step can count more night work than
  // the plan itself has.
  if (same && same.actions < actions && +same.at !== +planned!.at) fixes.push({ ...same, proof: state.proof });
  if (input.recipe.method === 'tartine') {
    const proof = state.proof === 'cold' ? 'warm' : 'cold',
      other = quietestStart({ ...input, proof }, now);
    if (other && other.actions < Math.min(actions, same?.actions ?? actions)) fixes.push({ ...other, proof });
  }
  return fixes;
}

/** One check asks first when it would skip more than this many earlier steps that count; see `skipsOnCheck`. */
export const ASK_BEFORE_SKIPPING = 3;

/**
 * The steps that checking `id` at `now` would newly mark Skipped, and whether the planner asks first. Added at Michael's
 * request on November 22, 2026: a mis-tap on the last step passed over the whole bake. Once bulk's start time has come,
 * the start of bulk and the turns don't count towards asking: skipping them then is how a bake goes when the dough is
 * ready early. Before it, they count, so a tap on preshape the evening before asks.
 */
export function skipsOnCheck(state: PlannerState, id: string, now: number) {
  const current = scheduleView(state, now, String),
    before = new Set(current.skipped);
  const after = scheduleView(setChecked(state, id, true, now), now, String);
  const skips = after.steps.filter((s) => after.skipped.includes(s.id) && !before.has(s.id));
  const start = current.steps.find((s) => s.kind === 'bulk'),
    bulkDue = start !== undefined && start.at.getTime() <= now;
  return { skips, ask: skips.filter((s) => !(bulkDue && s.bulk)).length > ASK_BEFORE_SKIPPING };
}
