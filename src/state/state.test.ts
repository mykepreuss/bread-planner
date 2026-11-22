import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, recipeById } from '../domain/recipes.ts';
import { formula, totalHydration } from '../domain/formula.ts';
import { schedule } from '../domain/schedule.ts';
import { freshState, planOf, selected, tomorrow, type PlannerState } from './schema.ts';
import { loadState, serialize, fromV6, STORAGE_V5, STORAGE_V6 } from './load.ts';
import * as act from './actions.ts';

// Times here are built and read in the same local zone, so these tests hold in any time zone.
const at = (y: number, m: number, d: number, h: number, min: number, s = 0) =>
  new Date(y, m - 1, d, h, min, s).getTime();
const NOW = at(2026, 11, 21, 15, 20);
const storage = (entries: Record<string, string>) => (key: string) => entries[key] ?? null;

/** Freezes a state all the way down, so an action that changed it in place would throw. */
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) frozen(v);
    Object.freeze(value);
  }
  return value;
}
/** A House plan for the day `NOW` falls on, with the given checks and readings. */
function plan(change: (s: PlannerState) => void = () => {}): PlannerState {
  const s = freshState(NOW);
  s.date = '2026-11-21';
  change(s);
  return frozen(s);
}

test('a fresh planner opens Preuss House tomorrow at 9:00 AM, with every recipe at its own copy of the defaults', () => {
  const s = freshState(NOW);
  assert.equal(s.recipe, 'house');
  assert.deepEqual(
    s.order,
    RECIPES.map((r) => r.id),
  );
  assert.equal(s.date, '2026-11-22');
  assert.equal(s.time, '09:00');
  assert.deepEqual([s.anchor, s.proof, s.ovenCapacity, s.reheat, s.tempUnit], ['leaven', 'cold', 2, 30, 'F']);
  for (const r of RECIPES) {
    assert.deepEqual(s.recipes[r.id].settings, r.defaults, r.id);
    assert.notEqual(s.recipes[r.id].settings, r.defaults, `${r.id} has its own copy`);
    assert.deepEqual(s.recipes[r.id].bake, { done: [], doneAt: {}, doughTemp: null, bulkTemps: [] });
  }
  assert.equal(tomorrow(at(2026, 12, 31, 23, 59)), '2027-01-01');
});

test('loading prefers version 6, falls back to version 5, and starts fresh from anything else', () => {
  const v5 = {
    version: 5,
    plan: { recipe: 'tartine', order: ['house', 'tartine'], date: '2026-11-13', time: '08:00' },
  };
  const fromFive = loadState(storage({ [STORAGE_V5]: JSON.stringify(v5) }), NOW);
  assert.deepEqual(
    [fromFive.recipe, fromFive.order, fromFive.date, fromFive.time],
    ['tartine', ['house', 'tartine'], '2026-11-13', '08:00'],
  );
  const six = { ...freshState(NOW), recipe: 'red-rye', date: '2026-12-01' };
  const both = storage({ [STORAGE_V5]: JSON.stringify(v5), [STORAGE_V6]: serialize(six) });
  assert.deepEqual(loadState(both, NOW), six, 'version 6 wins over version 5');
  for (const broken of [
    '{not json',
    'null',
    '"x"',
    JSON.stringify({ version: 7, plan: six }),
    JSON.stringify({ version: 6 }),
  ])
    assert.equal(
      loadState(storage({ [STORAGE_V5]: JSON.stringify(v5), [STORAGE_V6]: broken }), NOW).recipe,
      'tartine',
      `unusable version 6: ${broken}`,
    );
  const nothings: Record<string, string>[] = [
    {},
    { [STORAGE_V5]: '{not json' },
    { [STORAGE_V5]: JSON.stringify({ version: 4, plan: {} }) },
  ];
  for (const nothing of nothings) assert.deepEqual(loadState(storage(nothing), NOW), freshState(NOW));
});

test('a saved planner loads back exactly, whatever was checked, timed or measured', () => {
  const s = act.addReading(
    act.setDoughTemp(act.setChecked(act.setChecked(plan(), 'leaven', true, NOW), 'turn9', true, NOW + 3600000), 81.5),
    84,
    NOW + 7200000,
  );
  const edited = act.setSetting(
    act.setSetting(act.selectRecipe(s, 'five-flour'), 'flour:fife', 0),
    'build:starter',
    40,
  );
  for (const state of [
    freshState(NOW),
    s,
    edited,
    { ...edited, tempUnit: 'C' as const, anchor: 'done' as const, proof: 'warm' as const, ovenCapacity: 1, reheat: 45 },
  ])
    assert.deepEqual(fromV6(JSON.parse(serialize(state)), NOW), state);
});

test('version 6 saves are checked as version 5 ones were', () => {
  const s = JSON.parse(serialize(freshState(NOW)));
  Object.assign(s.plan.recipes.house.settings, { count: 1.5, reserve: 200, hydration: null, leaven: -3 });
  s.plan.recipes.house.settings.flours.rye = 'x';
  s.plan.recipes.house.bake = {
    done: ['leaven', 3],
    doneAt: { leaven: 1, mix: 2 },
    doughTemp: 140,
    bulkTemps: [
      { at: 5, f: 80 },
      { at: 5, f: 82 },
      { at: 'x', f: 80 },
    ],
  };
  Object.assign(s.plan, {
    order: ['bogus', 'tartine', 'tartine'],
    recipe: 'house',
    ovenCapacity: 3,
    reheat: -1,
    tempUnit: 'K',
    date: '2026-2-1',
  });
  const loaded = fromV6(s, NOW)!,
    house = loaded.recipes.house;
  assert.deepEqual(
    [
      house.settings.count,
      house.settings.reserve,
      house.settings.hydration,
      house.settings.leaven,
      house.settings.flours.rye,
    ],
    [2, (100 / 780) * 100, 78, 20, 10],
  );
  assert.deepEqual(house.bake, {
    done: ['leaven'],
    doneAt: { leaven: 1 },
    doughTemp: null,
    bulkTemps: [{ at: 5, f: 82 }],
  });
  assert.deepEqual(
    [loaded.order, loaded.recipe, loaded.ovenCapacity, loaded.reheat, loaded.tempUnit, loaded.date],
    [['tartine'], 'tartine', 2, 30, 'F', '2026-11-22'],
  );
  assert.equal(recipeById('manual-rye'), undefined);
});

test('checking a step records the minute, and unchecking forgets it', () => {
  const checked = act.setChecked(plan(), 'leaven', true, at(2026, 11, 21, 9, 40, 31));
  assert.deepEqual(selected(checked).bake.done, ['leaven']);
  assert.equal(selected(checked).bake.doneAt.leaven, at(2026, 11, 21, 9, 41));
  const again = act.setChecked(act.setChecked(checked, 'feed', true, NOW), 'leaven', true, NOW);
  assert.deepEqual(selected(again).bake.done, ['feed', 'leaven'], 'checking again moves it to the end, as before');
  const unchecked = act.setChecked(again, 'leaven', false, NOW);
  assert.deepEqual([selected(unchecked).bake.done, Object.keys(selected(unchecked).bake.doneAt)], [['feed'], ['feed']]);
});

test('Done at takes an exact date and time, and ignores an incomplete one', () => {
  const s = act.setChecked(plan(), 'leaven', true, NOW);
  assert.equal(
    selected(act.setDoneAt(s, 'leaven', '2026-11-20', '23:50')).bake.doneAt.leaven,
    at(2026, 11, 20, 23, 50),
  );
  for (const [date, time] of [
    ['', '09:00'],
    ['2026-11-20', ''],
    ['2026-02-30', '09:00'],
    ['2026-11-20', '24:00'],
  ])
    assert.equal(act.setDoneAt(s, 'leaven', date, time), s, `${date} ${time}`);
});

test('a new date or time clears the dough temperatures only while nothing is checked', () => {
  const temps = plan((s) => Object.assign(s.recipes.house.bake, { doughTemp: 84, bulkTemps: [{ at: NOW, f: 82 }] }));
  for (const change of [
    (s: PlannerState) => act.setDate(s, '2026-11-23'),
    (s: PlannerState) => act.setTime(s, '10:00'),
  ]) {
    assert.deepEqual([selected(change(temps)).bake.doughTemp, selected(change(temps)).bake.bulkTemps], [null, []]);
    const underway = act.setChecked(temps, 'feed', true, NOW);
    assert.equal(selected(change(underway)).bake.doughTemp, 84);
  }
  assert.equal(act.setDate(temps, '2026-11-23').date, '2026-11-23');
  assert.equal(act.setTime(temps, '10:00').time, '10:00');
});

test('Plan the next bake moves the date to tomorrow and clears the temperatures, but keeps the checklist', () => {
  const s = act.setDoughTemp(act.setChecked(plan(), 'feed', true, NOW), 80),
    next = act.planNextBake(s, NOW);
  assert.equal(next.date, '2026-11-22');
  assert.equal(selected(next).bake.doughTemp, null);
  assert.deepEqual(selected(next).bake.done, ['feed']);
});

test('Clear checklist clears the checks, their times and the temperatures of the selected recipe only', () => {
  const other = act.setChecked(act.selectRecipe(plan(), 'tartine'), 'leaven', true, NOW);
  const s = act.addReading(
    act.setDoughTemp(act.setChecked(act.selectRecipe(other, 'house'), 'mix', true, NOW), 82),
    84,
    NOW,
  );
  const cleared = act.clearChecklist(s);
  assert.deepEqual(selected(cleared).bake, { done: [], doneAt: {}, doughTemp: null, bulkTemps: [] });
  assert.deepEqual(cleared.recipes.tartine.bake.done, ['leaven']);
});

test('readings in the same minute replace each other, stay in time order, and can be removed', () => {
  let s = act.addReading(plan(), 84, at(2026, 11, 21, 15, 10));
  s = act.addReading(s, 80, at(2026, 11, 21, 14, 40));
  s = act.addReading(s, 82, at(2026, 11, 21, 15, 10, 20));
  assert.deepEqual(selected(s).bake.bulkTemps, [
    { at: at(2026, 11, 21, 14, 40), f: 80 },
    { at: at(2026, 11, 21, 15, 10), f: 82 },
  ]);
  assert.deepEqual(selected(act.removeReading(s, at(2026, 11, 21, 14, 40))).bake.bulkTemps, [
    { at: at(2026, 11, 21, 15, 10), f: 82 },
  ]);
});

test('typing a total hydration keeps the dough weight and shows the total typed', () => {
  for (const id of RECIPES.map((r) => r.id)) {
    const s = act.selectRecipe(plan(), id),
      before = formula(selected(s).recipe, selected(s).settings)!;
    for (const total of [72, 80, 85.5]) {
      const after = act.setTotalHydration(s, total),
        r = formula(selected(after).recipe, selected(after).settings)!;
      assert.ok(Math.abs(r.total - before.total) < 1e-9, `${id} weight`);
      assert.ok(Math.abs(totalHydration(selected(after).settings) - total) < 1e-9, `${id} ${total}%`);
    }
  }
});

test('settings change only the selected recipe, and Restore defaults puts back its settings and clears its bake', () => {
  let s = act.setSetting(plan(), 'count', 4);
  s = act.setSetting(s, 'flour:rye', 0);
  s = act.setSetting(s, 'build:water', 200);
  s = act.setChecked(s, 'feed', true, NOW);
  s = act.setChecked(act.selectRecipe(s, 'tartine'), 'leaven', true, NOW);
  s = act.selectRecipe(s, 'house');
  const house = selected(s).settings;
  assert.deepEqual([house.count, house.flours.rye, house.build.water], [4, 0, 200]);
  assert.deepEqual(s.recipes.tartine.settings, RECIPES[1].defaults);
  const restored = act.restoreDefaults(act.setOvenCapacity(s, 1));
  assert.deepEqual(selected(restored).settings, RECIPES[0].defaults);
  assert.deepEqual(selected(restored).bake.done, []);
  assert.deepEqual(restored.recipes.tartine.bake.done, ['leaven'], 'other recipes keep their bake');
  assert.equal(restored.ovenCapacity, 1, 'shared settings stay');
});

test('planning around the finish, and back, keeps every step where it was', () => {
  for (const id of RECIPES.map((r) => r.id))
    for (const s of [
      act.selectRecipe(plan(), id),
      act.setProof(act.setOvenCapacity(act.selectRecipe(plan(), id), 1), 'warm'),
    ]) {
      const times = (x: PlannerState) => schedule(planOf(x)).map((step) => `${step.id} ${step.at.getTime()}`);
      const done = act.setAnchor(s, 'done');
      assert.equal(done.anchor, 'done');
      assert.deepEqual(times(done), times(s), `${id} to the finish`);
      assert.deepEqual(times(act.setAnchor(done, 'leaven')), times(s), `${id} back`);
    }
});

test('the shared settings and recipe choice change as asked, and only to a recipe on the menu', () => {
  const s = plan();
  assert.equal(act.selectRecipe(s, 'red-rye').recipe, 'red-rye');
  assert.equal(act.selectRecipe(s, 'manual-rye'), s);
  assert.deepEqual(
    [
      act.setOvenCapacity(s, 1).ovenCapacity,
      act.setReheat(s, 0).reheat,
      act.setProof(s, 'warm').proof,
      act.setTempUnit(s, 'C').tempUnit,
    ],
    [1, 0, 'warm', 'C'],
  );
});
