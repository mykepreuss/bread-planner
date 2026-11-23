import { RECIPES, defaultSettings, recipeById, type Recipe, type Settings } from '../domain/recipes.ts';
import type { BulkReading, TempUnit } from '../domain/bakeday.ts';
import type { PlanInput } from '../domain/schedule.ts';
import { dateString } from '../domain/text.ts';

/**
 * One bake of a recipe: the steps checked, when each was done, the mixing additions ticked, and the dough
 * temperatures taken during bulk.
 */
export type Bake = {
  done: string[];
  /** When each checked step was done, in epoch milliseconds. */
  doneAt: Record<string, number>;
  /** The dough temperature after mixing, in °F. */
  doughTemp: number | null;
  /** Later readings during bulk, in time order, one per minute. */
  bulkTemps: BulkReading[];
  /** The additions ticked off at a mixing step, by id, such as `mix:salt`. */
  added: string[];
};
export type RecipeState = { settings: Settings; bake: Bake };

/**
 * Everything the planner saves (version 6). Each recipe keeps its own settings and bake; the rest is shared: the
 * selected recipe, the menu order, when the bake is planned, the Tartine proof, the oven and the temperature unit.
 */
export type PlannerState = {
  recipe: string;
  order: string[];
  date: string;
  time: string;
  anchor: 'leaven' | 'done';
  /**
   * Whether Michael chose the date and time. Until he does, or once the start he chose has passed, and while nothing
   * is checked, the planner shows its own suggested start instead (decisions 25 and 26; see `shownState`). A new
   * planner, "Plan the next bake" and "Use suggested start" leave it to the planner; setting a date, a time or a
   * suggested quiet start, or checking a step, chooses it.
   */
  timeChosen: boolean;
  proof: 'cold' | 'warm';
  ovenCapacity: number;
  /** The most loaves mixed in one bowl; a bigger batch is mixed in several bowls. */
  mixCapacity: number;
  reheat: number;
  tempUnit: TempUnit;
  recipes: Record<string, RecipeState>;
};

export const emptyBake = (): Bake => ({ done: [], doneAt: {}, doughTemp: null, bulkTemps: [], added: [] });

/** The day after `now`, as `YYYY-MM-DD`: where a new plan starts. */
export function tomorrow(now: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return dateString(d);
}

/**
 * A new planner: Preuss House, every recipe at its defaults, and no start chosen, so the planner suggests one. The
 * saved date and time, the leaven at 9:00 AM tomorrow, are kept for when it can't.
 */
export function freshState(now: number): PlannerState {
  return {
    recipe: 'house',
    order: RECIPES.map((r) => r.id),
    date: tomorrow(now),
    time: '09:00',
    anchor: 'leaven',
    timeChosen: false,
    proof: 'cold',
    ovenCapacity: 2,
    mixCapacity: 2,
    reheat: 30,
    tempUnit: 'F',
    recipes: Object.fromEntries(RECIPES.map((r) => [r.id, { settings: defaultSettings(r), bake: emptyBake() }])),
  };
}

/** The selected recipe. Loading guarantees it exists. */
export function selected(state: PlannerState): { recipe: Recipe } & RecipeState {
  return { recipe: recipeById(state.recipe)!, ...state.recipes[state.recipe] };
}

/** What the schedule needs from the state, for the selected recipe. */
export function planOf(state: PlannerState): PlanInput {
  const { recipe, settings } = selected(state);
  return {
    recipe,
    settings,
    date: state.date,
    time: state.time,
    anchor: state.anchor,
    proof: state.proof,
    ovenCapacity: state.ovenCapacity,
    mixCapacity: state.mixCapacity,
    reheat: state.reheat,
  };
}
