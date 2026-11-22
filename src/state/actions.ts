import { defaultSettings, type FlourKey, type Settings } from '../domain/recipes.ts';
import { addedHydration } from '../domain/formula.ts';
import { schedule } from '../domain/schedule.ts';
import { retime, stampNow, withReading, type TempUnit } from '../domain/bakeday.ts';
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

/** Dough temperatures belong to one bake, so a new bake starts without them. */
function clearTemperatures(state: PlannerState) {
  const bake = bakeOf(state);
  return bake.doughTemp !== null || bake.bulkTemps.length
    ? update(state, { bake: { doughTemp: null, bulkTemps: [] } })
    : state;
}

export const selectRecipe = (state: PlannerState, id: string): PlannerState =>
  state.order.includes(id) ? { ...state, recipe: id } : state;

/** A number setting of the selected recipe. The field accepts only valid values; see Amount. */
export type SettingKey =
  'count' | 'weight' | 'leaven' | 'salt' | 'reserve' | `flour:${FlourKey}` | `build:${keyof Settings['build']}`;
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
export const setReheat = (state: PlannerState, minutes: number): PlannerState => ({ ...state, reheat: minutes });
export const setProof = (state: PlannerState, proof: 'cold' | 'warm'): PlannerState => ({ ...state, proof });
export const setTempUnit = (state: PlannerState, unit: TempUnit): PlannerState => ({ ...state, tempUnit: unit });

/** A new date or time. Before anything is checked it is a new bake, so the dough temperatures clear. */
export function setDate(state: PlannerState, date: string): PlannerState {
  const next = { ...state, date };
  return bakeOf(state).done.length ? next : clearTemperatures(next);
}
export function setTime(state: PlannerState, time: string): PlannerState {
  const next = { ...state, time };
  return bakeOf(state).done.length ? next : clearTemperatures(next);
}

/** Plans around the leaven start or the last loaf out. The date and time change to that step's, so every step stays where it was. */
export function setAnchor(state: PlannerState, anchor: 'leaven' | 'done'): PlannerState {
  const step = schedule(planOf(state)).find((s) => s.id === anchor);
  return step ? { ...state, date: dateString(step.at), time: clockText(step.at), anchor } : { ...state, anchor };
}

/**
 * Moves the plan to tomorrow and starts the next bake: the checklist, its times and the dough temperatures clear
 * (decision 1 in docs/BEHAVIOUR.md). It is offered only once a plan has ended, when nothing is checked or every step is checked or skipped.
 */
export function planNextBake(state: PlannerState, now: number): PlannerState {
  return clearChecklist({ ...state, date: tomorrow(now) });
}

/** Checks a step at `now`, rounded to the minute, or unchecks it and forgets its time. */
export function setChecked(state: PlannerState, id: string, checked: boolean, now: number): PlannerState {
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

/** Clears the selected recipe's checklist, check-off times and dough temperatures. */
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
