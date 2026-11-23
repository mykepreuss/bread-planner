import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, recipeById, defaultSettings, type Recipe, type Settings } from './recipes.ts';
import { addInLines } from './addins.ts';
import { formula } from './formula.ts';
import { schedule, type PlanInput } from './schedule.ts';
import { freshState } from '../state/schema.ts';
import * as act from '../state/actions.ts';
import { scheduleView } from '../view/schedule.ts';

// Olive, the olive mixture from Tartine Bread, page 88, added at Michael's request on November 22, 2026, and the same day
// made a Preuss House variation (decision 16): Preuss House's dough and timing, with the mixture worked in after the
// first turn. Times are built and read in the local zone, so these tests hold in any time zone.
const NOW = new Date(2026, 10, 21, 15, 20).getTime();

function recipe(id: string): Recipe {
  const r = recipeById(id);
  assert.ok(r, `no recipe ${id}`);
  return r;
}
/** A plan for 9:00 AM on 21 October 2026 with the recipe's default settings, changed as given. */
function plan(id: string, change: Partial<Settings> = {}, input: Partial<PlanInput> = {}): PlanInput {
  return {
    recipe: recipe(id),
    settings: { ...defaultSettings(recipe(id)), ...change },
    date: '2026-10-21',
    time: '09:00',
    anchor: 'leaven',
    proof: 'cold',
    ovenCapacity: 2,
    reheat: 30,
    ...input,
  };
}
/** The Ingredients tab's add-in lines for these settings: scaled against the recipe's default batch. */
function lines(change: Partial<Settings> = {}) {
  const olive = recipe('olive');
  assert.ok(olive.addIns, 'Olive has add-ins');
  return addInLines(olive.addIns, { ...defaultSettings(olive), ...change }, olive.defaults);
}
const noteWith = (list: string) =>
  `In a bowl, stir together ${list}. Scatter the mixture over the dough, add a splash of water, and work it in by hand, cutting through and folding the dough until it is evenly spread. Then carry on with bulk as planned.`;

test('Olive is on the menu right after Original Tartine, with Preuss House’s method, flours, leaven build and defaults', () => {
  const ids = RECIPES.map((r) => r.id);
  assert.equal(ids.indexOf('olive'), ids.indexOf('tartine') + 1, ids.join(', '));
  const olive = recipe('olive'),
    house = recipe('house');
  assert.equal(olive.name, 'Olive');
  assert.match(olive.description, /^Preuss House dough with olives/);
  assert.deepEqual(
    [olive.method, olive.flours, olive.late, olive.buildFlour, olive.defaults],
    [house.method, house.flours, house.late, house.buildFlour, house.defaults],
  );
  assert.deepEqual(defaultSettings(olive), defaultSettings(house));
  // Copied, not shared: each recipe's data is its own, and frozen.
  for (const key of ['flours', 'late', 'defaults'] as const) assert.notEqual(olive[key], house[key], key);
  assert.notEqual(olive.defaults.flours, house.defaults.flours);
  assert.notEqual(olive.defaults.build, house.defaults.build);
  assert.ok(Object.isFrozen(olive.defaults.build) && Object.isFrozen(olive.addIns!.items[0]));
  assert.equal(house.addIns, undefined, 'Preuss House has no add-ins');
  assert.equal(olive.addIns?.title, 'Add the olive mixture');
});

test('its add-ins at the default batch read as the book lists them, the nuts marked optional', () => {
  assert.deepEqual(lines(), [
    '3 cups pitted olives, coarsely chopped',
    '2 cups toasted walnuts or hazelnuts, coarsely chopped (optional)',
    '2 teaspoons dried herbes de Provence',
    'Grated zest of 1 lemon',
  ]);
});

test('its add-ins scale with the loaf count and the loaf weight', () => {
  assert.deepEqual(lines({ count: 3 }), [
    '4½ cups pitted olives, coarsely chopped',
    '3 cups toasted walnuts or hazelnuts, coarsely chopped (optional)',
    '3 teaspoons dried herbes de Provence',
    'Grated zest of 1½ lemons',
  ]);
  assert.deepEqual(lines({ count: 1 }), [
    '1½ cups pitted olives, coarsely chopped',
    '1 cup toasted walnuts or hazelnuts, coarsely chopped (optional)',
    '1 teaspoon dried herbes de Provence',
    'Grated zest of ½ lemon',
  ]);
  assert.deepEqual(lines({ weight: 2000 }), [
    '6 cups pitted olives, coarsely chopped',
    '4 cups toasted walnuts or hazelnuts, coarsely chopped (optional)',
    '4 teaspoons dried herbes de Provence',
    'Grated zest of 2 lemons',
  ]);
  assert.deepEqual(lines({ count: 1, weight: 2000 }), lines(), 'one loaf of twice the weight is the book batch');
});

test('its schedule is Preuss House’s plus one add-in step at Turn 1’s time, right after it, listing the scaled amounts', () => {
  for (const ovenCapacity of [1, 2])
    for (const anchor of ['leaven', 'done'] as const) {
      const at = `${ovenCapacity} at once, ${anchor}`,
        olive = schedule(plan('olive', {}, { ovenCapacity, anchor })),
        house = schedule(plan('house', {}, { ovenCapacity, anchor }));
      assert.ok(house.length > 0, at);
      assert.deepEqual(
        olive.filter((s) => s.id !== 'addins'),
        house,
        `${at}: every other step is Preuss House's, at its time`,
      );
      const ids = olive.map((s) => s.id),
        turn1 = ids.indexOf('turn1');
      assert.deepEqual(ids.slice(turn1, turn1 + 3), ['turn1', 'addins', 'turn2'], at);
      assert.equal(olive.filter((s) => s.kind === 'addin').length, 1, at);
      const step = olive[turn1 + 1];
      assert.equal(+step.at, +olive[turn1].at, `${at}: at Turn 1's time`);
      assert.deepEqual(
        [step.kind, step.title, step.minutes, step.phase, step.handsOn, step.movesPlan, step.bulk, step.turn],
        ['addin', 'Add the olive mixture', 0, 'room', true, false, true, 0],
        at,
      );
      assert.equal(
        step.note,
        noteWith(
          '3 cups pitted olives, coarsely chopped; 2 cups toasted walnuts or hazelnuts, coarsely chopped (optional); 2 teaspoons dried herbes de Provence; grated zest of 1 lemon',
        ),
        at,
      );
    }
  const three = schedule(plan('olive', { count: 3 })).find((s) => s.id === 'addins');
  assert.equal(
    three?.note,
    noteWith(
      '4½ cups pitted olives, coarsely chopped; 3 cups toasted walnuts or hazelnuts, coarsely chopped (optional); 3 teaspoons dried herbes de Provence; grated zest of 1½ lemons',
    ),
  );
});

test('its formula, the weights on the Ingredients tab, is Preuss House’s', () => {
  for (const change of [{}, { count: 3, weight: 800 }, { hydration: 80, leaven: 15, reserve: 10 }]) {
    const olive = plan('olive', change).settings,
      house = plan('house', change).settings;
    const weights = formula(recipe('olive'), olive);
    assert.ok(weights, JSON.stringify(change));
    assert.deepEqual(weights, formula(recipe('house'), house), JSON.stringify(change));
  }
});

test('with the steps through Turn 1 checked, Up next is the add-in step, offering the dough temperature as a turn does', () => {
  let olive = act.selectRecipe(freshState(NOW), 'olive');
  assert.equal(olive.recipe, 'olive');
  for (const id of ['feed', 'leaven', 'autolyse', 'mix', 'rest', 'turn1']) olive = act.setChecked(olive, id, true, NOW);
  // Preuss House at the same point in bulk, with Turn 1 up next.
  let house = act.selectRecipe(freshState(NOW), 'house');
  for (const id of ['feed', 'leaven', 'autolyse', 'mix', 'rest']) house = act.setChecked(house, id, true, NOW);
  for (const doughTemp of [null, 78]) {
    const v = scheduleView(act.setDoughTemp(olive, doughTemp), NOW, String),
      turn = scheduleView(act.setDoughTemp(house, doughTemp), NOW, String);
    assert.deepEqual([turn.next?.id, turn.skipped], ['turn1', []]);
    assert.deepEqual(
      [v.next?.id, v.next?.kind, v.next?.title, v.then?.id, v.skipped],
      ['addins', 'addin', 'Add the olive mixture', 'turn2', []],
      `dough temperature ${doughTemp}`,
    );
    assert.match(v.next!.note, /^In a bowl, stir together 3 cups pitted olives, coarsely chopped; /);
    assert.equal(v.temperatureField, doughTemp === null ? 'after mixing' : 'now', `dough temperature ${doughTemp}`);
    assert.equal(v.temperatureField, turn.temperatureField, `dough temperature ${doughTemp}`);
  }
});
