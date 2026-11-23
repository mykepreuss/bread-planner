import { defaultSettings, type FlourKey, type Settings } from '../domain/recipes.ts';
import { addedHydration } from '../domain/formula.ts';
import { schedule } from '../domain/schedule.ts';
import { retime, stampNow, withReading, type TempUnit } from '../domain/bakeday.ts';
import { suggestedStart } from '../domain/quiet.ts';
import { clockText, dateString } from '../domain/text.ts';
import { emptyBake, planOf, tomorrow, type Bake, type PlannerState } from './schema.ts';

/**
 * Every change the screen can make, as a function from one state to the next. None changes the state it is given.
 * Bake-day changes apply to the selected recipe; each recipe keeps its own settings and bake.
 */

/** The selected recipe's state with `change` applied. */
function update(state: PlannerState, change: { settings?: Settings; bake?: Partial<Bake> }): PlannerState {
  const current = state.recipes[state.recipe];
  return {
    ...state,
    recipes: {
      ...state.recipes,
      [state.recipe]: {
        settings: change.settings ?? current.settings,
        bake: change.bake ? { ...current.bake, ...change.bake } : current.bake,
      },
    },
  };
}
const bakeOf = (state: PlannerState) => state.recipes[state.recipe].bake;
const settingsOf = (state: PlannerState) => state.recipes[state.recipe].settings;

/** Dough temperatures and final-mix ticks belong to one bake, so a new bake starts without them. */
function clearTemperatures(state: PlannerState) {
  const bake = bakeOf(state);
  return bake.doughTemp !== null || bake.bulkTemps.length || bake.added.length
    ? update(state, { bake: { doughTemp: null, bulkTemps: [], added: [] } })
    : state;
}

export const selectRecipe = (state: PlannerState, id: string): PlannerState =>
  state.order.includes(id) ? { ...state, recipe: id } : state;

/** A number setting of the selected recipe. The field accepts only valid values; see Amount. */
export type SettingKey =
  | 'count'
  | 'weight'
  | 'leaven'
  | 'salt'
  | 'reserve'
  | 'autolyse'
  | `flour:${FlourKey}`
  | `build:${keyof Settings['build']}`;
export function setSetting(state: PlannerState, key: SettingKey, value: number): PlannerState {
  const s = settingsOf(state);
  if (key.startsWith('flour:'))
    return update(state, { settings: { ...s, flours: { ...s.flours, [key.slice(6)]: value } } });
  if (key.startsWith('build:'))
    return update(state, { settings: { ...s, build: { ...s.build, [key.slice(6)]: value } } });
  return update(state, { settings: { ...s, [key]: value } });
}

/** Typing a total hydration saves the added hydration that gives it, so the dough weight stays the same. */
export function setTotalHydration(state: PlannerState, total: number): PlannerState {
  const s = settingsOf(state);
  return update(state, { settings: { ...s, hydration: Math.max(0, addedHydration(total, s)) } });
}

/** Restores the selected recipe's settings and clears its bake. Other recipes and the shared settings stay. */
export function restoreDefaults(state: PlannerState): PlannerState {
  return {
    ...state,
    recipes: {
      ...state.recipes,
      [state.recipe]: { settings: defaultSettings(planOf(state).recipe), bake: emptyBake() },
    },
  };
}

export const setOvenCapacity = (state: PlannerState, capacity: number): PlannerState => ({
  ...state,
  ovenCapacity: capacity,
});
/** Loaves per mix: the most loaves of dough one bowl holds. The field accepts only whole numbers of 1 or more. */
export const setMixCapacity = (state: PlannerState, loaves: number): PlannerState => ({
  ...state,
  mixCapacity: loaves,
});
export const setReheat = (state: PlannerState, minutes: number): PlannerState => ({ ...state, reheat: minutes });
export const setProof = (state: PlannerState, proof: 'cold' | 'warm'): PlannerState => ({ ...state, proof });
export const setTempUnit = (state: PlannerState, unit: TempUnit): PlannerState => ({ ...state, tempUnit: unit });

/**
 * What the planner shows at `now`. While no start has been chosen and nothing is checked, that is the suggested start
 * (decision 24): the soonest whose plan has the fewest quiet-hour actions, from the quarter hour `now` is in (see
 * `suggestedStart`). A plan made from the last loaf out stays so, with that time moved to match. Otherwise, and when
 * there is no plan to suggest a start for, it is the saved state.
 */
export function shownState(state: PlannerState, now: number): PlannerState {
  if (state.timeChosen || bakeOf(state).done.length) return state;
  const start = suggestedStart(planOf(state), now);
  if (!start) return state;
  const moved = { ...state, anchor: 'leaven' as const, date: dateString(start.at), time: clockText(start.at) };
  return state.anchor === 'done' ? setAnchor(moved, 'done') : moved;
}

/**
 * A new date or time, from what the planner shows at `now` (the moment the screen last worked out the suggestion), so
 * a new date keeps the suggested time and the other way round. It is Michael's choice from then on. Before anything is checked it is a new bake, so the dough temperatures
 * and final-mix ticks clear.
 */
export function setDate(state: PlannerState, date: string, now: number): PlannerState {
  const next = { ...shownState(state, now), date, timeChosen: true };
  return bakeOf(state).done.length ? next : clearTemperatures(next);
}
export function setTime(state: PlannerState, time: string, now: number): PlannerState {
  const next = { ...shownState(state, now), time, timeChosen: true };
  return bakeOf(state).done.length ? next : clearTemperatures(next);
}

/**
 * Plans around the leaven start or the last loaf out. The date and time change to that step's, so every step stays
 * where it was. A suggested start stays a suggestion, now shown in the other terms.
 */
export function setAnchor(state: PlannerState, anchor: 'leaven' | 'done'): PlannerState {
  const step = schedule(planOf(state)).find((s) => s.id === anchor);
  return step ? { ...state, date: dateString(step.at), time: clockText(step.at), anchor } : { ...state, anchor };
}

/**
 * Starts the leaven at `at`, with the proof given: a start the quiet-hours warning suggests, which chooses it. A plan
 * made from the last loaf out stays so, with that time moved to match. Before anything is checked it is a new bake, as
 * for `setDate`.
 */
export function startLeavenAt(state: PlannerState, at: Date, proof: 'cold' | 'warm'): PlannerState {
  const moved = {
      ...state,
      proof,
      anchor: 'leaven' as const,
      date: dateString(at),
      time: clockText(at),
      timeChosen: true,
    },
    next = state.anchor === 'done' ? setAnchor(moved, 'done') : moved;
  return bakeOf(state).done.length ? next : clearTemperatures(next);
}

/**
 * Starts the next bake: the checklist, its times and the dough temperatures clear (decision 1 in docs/BEHAVIOUR.md),
 * and the start is left to the planner, which suggests one (decision 24). The saved date moves to tomorrow for when it
 * can't. It is offered only once a plan has ended, when nothing is checked or every step is checked or skipped.
 */
export function planNextBake(state: PlannerState, now: number): PlannerState {
  return clearChecklist({ ...state, date: tomorrow(now), timeChosen: false });
}

/**
 * Checks a step at `now`, rounded to the minute, or unchecks it and forgets its time. The first check of a suggested
 * plan keeps it: the bake has started at the start shown, which is the suggestion at `shownAt`, the moment the screen
 * last worked it out (`now` if not given), so a tap just after a quarter hour keeps the plan on the screen.
 */
export function setChecked(
  state: PlannerState,
  id: string,
  checked: boolean,
  now: number,
  shownAt: number = now,
): PlannerState {
  if (checked && !state.timeChosen) state = { ...shownState(state, shownAt), timeChosen: true };
  const bake = bakeOf(state),
    doneAt = { ...bake.doneAt };
  if (checked) doneAt[id] = stampNow(now);
  else delete doneAt[id];
  const others = bake.done.filter((x) => x !== id);
  return update(state, { bake: { done: checked ? [...others, id] : others, doneAt } });
}

/** Corrects when a checked step was done. An incomplete or impossible date or time is ignored. */
export function setDoneAt(state: PlannerState, id: string, date: string, hhmm: string): PlannerState {
  const t = retime(date, hhmm);
  return t === null ? state : update(state, { bake: { doneAt: { ...bakeOf(state).doneAt, [id]: t } } });
}

/** Ticks or unticks one addition of a mixing step, such as the salt. It records no time and moves nothing. */
export function setAdded(state: PlannerState, id: string, added: boolean): PlannerState {
  const others = bakeOf(state).added.filter((x) => x !== id);
  return update(state, { bake: { added: added ? [...others, id] : others } });
}

/** Clears the selected recipe's checklist, check-off times, ticked additions and dough temperatures. */
export function clearChecklist(state: PlannerState): PlannerState {
  return clearTemperatures(update(state, { bake: { done: [], doneAt: {} } }));
}

export const setDoughTemp = (state: PlannerState, f: number | null): PlannerState =>
  update(state, { bake: { doughTemp: f } });

/** A later reading, taken at `now`. One in the same minute as an earlier one replaces it. */
export function addReading(state: PlannerState, f: number, now: number): PlannerState {
  return update(state, { bake: { bulkTemps: withReading(bakeOf(state).bulkTemps, { at: stampNow(now), f }) } });
}
export function removeReading(state: PlannerState, at: number): PlannerState {
  return update(state, { bake: { bulkTemps: bakeOf(state).bulkTemps.filter((r) => r.at !== at) } });
}
