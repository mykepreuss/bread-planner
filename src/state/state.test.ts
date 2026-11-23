import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_AUTOLYSE, RECIPES, defaultSettings, recipeById, type Settings } from '../domain/recipes.ts';
import { formula, totalHydration } from '../domain/formula.ts';
import { schedule } from '../domain/schedule.ts';
import { freshState, planOf, selected, tomorrow, type PlannerState } from './schema.ts';
import { loadState, serialize, fromV5, fromV6, STORAGE_V5, STORAGE_V6 } from './load.ts';
import * as act from './actions.ts';
import { inTempRange, toF } from '../domain/bakeday.ts';

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
    assert.deepEqual(s.recipes[r.id].bake, { done: [], doneAt: {}, doughTemp: null, bulkTemps: [], added: [] });
  }
  assert.equal(tomorrow(at(2026, 12, 31, 23, 59)), '2027-01-01');
});

test('loading prefers version 6, falls back to version 5, and starts fresh from anything else', () => {
  const v5 = {
    version: 5,
    plan: { recipe: 'tartine', order: ['house', 'tartine'], date: '2026-11-13', time: '08:00' },
  };
  const fromFive = loadState(storage({ [STORAGE_V5]: JSON.stringify(v5) }), NOW);
  // A saved menu gains the recipes it doesn't name, after its own (since November 22, 2026).
  assert.deepEqual(
    [fromFive.recipe, fromFive.order, fromFive.date, fromFive.time],
    ['tartine', ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer'], '2026-11-13', '08:00'],
  );
  const six = { ...freshState(NOW), recipe: 'tartine', date: '2026-12-01' };
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

test('a saved planner loads back exactly, whatever was checked, timed, ticked or measured', () => {
  const s = act.setAdded(
    act.addReading(
      act.setDoughTemp(act.setChecked(act.setChecked(plan(), 'leaven', true, NOW), 'turn9', true, NOW + 3600000), 81.5),
      84,
      NOW + 7200000,
    ),
    'mix:salt',
    true,
  );
  const edited = act.setSetting(act.setSetting(act.selectRecipe(s, 'tartine'), 'flour:wheat', 0), 'build:starter', 40);
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
    added: ['mix:salt', 3, 'mix:salt', null],
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
    added: ['mix:salt'],
  });
  // The menu keeps Tartine first and gains the rest, so the saved House stays selected. Before November 22, 2026 a
  // menu without House left it out, and Tartine was selected instead.
  assert.deepEqual(
    [loaded.order, loaded.recipe, loaded.ovenCapacity, loaded.reheat, loaded.tempUnit, loaded.date],
    [['tartine', 'house', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer'], 'house', 2, 30, 'F', '2026-11-22'],
  );
  assert.equal(recipeById('manual-rye'), undefined);
});

test('every setting a version 5 or version 6 save holds loads as saved, for every recipe, zeros included', () => {
  const v5 = (recipe: (typeof RECIPES)[number], s: Settings) => ({
    count: s.count,
    weight: s.weight,
    hydration: s.hydration,
    leaven: s.leaven,
    salt: s.salt,
    reserve: s.reserve,
    ...Object.fromEntries(recipe.flours.map((k) => [`flour_${k}`, s.flours[k]])),
    buildSeed: s.build.starter,
    buildBread: s.build.flour,
    buildWheat: s.build.wheat,
    buildWater: s.build.water,
  });
  for (const recipe of RECIPES) {
    const d = defaultSettings(recipe);
    // A distinct valid value for every setting, none of them its default.
    const distinct: Settings = {
      count: d.count + 1,
      weight: d.weight + 7,
      hydration: d.hydration + 1.5,
      leaven: d.leaven + 2.5,
      salt: d.salt + 0.25,
      reserve: d.reserve + 3,
      flours: Object.fromEntries(recipe.flours.map((k, i) => [k, (d.flours[k] ?? 0) + 11 + i])),
      build: {
        starter: d.build.starter + 3,
        flour: d.build.flour + 5,
        wheat: d.build.wheat + 7,
        water: d.build.water + 9,
      },
      // 10 minutes shorter: Whole Wheat's default is already its longest (decision 23).
      autolyse: d.autolyse - 10,
    };
    // 0 wherever 0 is allowed: everything but the loaf count and weight, and the autolyse, whose least is 15 minutes.
    const zeros: Settings = {
      ...distinct,
      hydration: 0,
      leaven: 0,
      salt: 0,
      reserve: 0,
      flours: Object.fromEntries(recipe.flours.map((k) => [k, 0])),
      build: { starter: 0, flour: 0, wheat: 0, water: 0 },
      autolyse: MIN_AUTOLYSE,
    };
    for (const [name, want] of [
      ['distinct values', distinct],
      ['zeros', zeros],
    ] as const) {
      const params = v5(recipe, want);
      const five = fromV5({ version: 5, plan: { recipe: recipe.id, recipes: { [recipe.id]: { params } } } }, NOW);
      // Version 5 had no autolyse setting, so it loads at the recipe's default.
      assert.deepEqual(
        five.recipes[recipe.id].settings,
        { ...want, autolyse: d.autolyse },
        `${recipe.id}, ${name}, from version 5`,
      );
      const six = fromV6(
        { version: 6, plan: { recipe: recipe.id, recipes: { [recipe.id]: { settings: want } } } },
        NOW,
      )!;
      assert.deepEqual(six.recipes[recipe.id].settings, want, `${recipe.id}, ${name}, from version 6`);
    }
  }
});

test('the autolyse is whole minutes from 15 to the recipe’s longest, and a save without one, or with one outside that, gets the recipe default (decisions 22 and 23)', () => {
  const load = (autolyse: unknown, id = 'house') => {
    const settings = { ...defaultSettings(recipeById(id)!), autolyse };
    if (autolyse === undefined) delete (settings as Partial<Settings>).autolyse;
    return fromV6({ version: 6, plan: { recipes: { [id]: { settings } } } }, NOW)!.recipes[id].settings.autolyse;
  };
  // Each recipe's longest is what its book pages or the autolyse guides give.
  assert.deepEqual(Object.fromEntries(RECIPES.map((r) => [r.id, r.maxAutolyse])), {
    house: 120,
    tartine: 40,
    olive: 120,
    sesame: 120,
    'whole-wheat': 120,
    'country-rye': 60,
    emmer: 40,
  });
  for (const r of RECIPES) {
    const d = defaultSettings(r).autolyse;
    assert.ok(d >= MIN_AUTOLYSE && d <= r.maxAutolyse, `${r.id}: its default ${d} is in its range`);
    for (const kept of [MIN_AUTOLYSE, r.maxAutolyse - 1, r.maxAutolyse])
      assert.equal(load(kept, r.id), kept, `${r.id}: ${kept} is kept`);
    for (const bad of [r.maxAutolyse + 1, MIN_AUTOLYSE - 1, 0])
      assert.equal(load(bad, r.id), d, `${r.id}: ${bad} falls back to ${d}`);
  }
  for (const kept of [15, 60, 90, 119, 120]) assert.equal(load(kept), kept, `${kept} is kept`);
  // A save made between decisions 22 and 23 could hold up to 720 minutes, or 0.
  for (const bad of [undefined, null, -1, 0, 14, 121, 270, 720, 90.5, '90', NaN, Infinity])
    assert.equal(load(bad), 90, `${String(bad)} falls back`);
  assert.equal(load(-5, 'whole-wheat'), 120, 'Whole Wheat falls back to its own default');
  assert.equal(load(undefined, 'country-rye'), 50, 'Country Rye falls back to its own default');
});

test('a saved date must be a real calendar date and a time must be from 00:00 to 23:59, or they fall back', () => {
  // A date falls back to tomorrow (2026-11-22) and a time to 9:00 AM. Kept values use other dates and times.
  const load = (date: unknown, time: unknown) => {
    const s = fromV6({ version: 6, plan: { date, time } }, NOW)!;
    return `${s.date} ${s.time}`;
  };
  for (const [date, time] of [
    ['2026-12-05', '00:00'],
    ['2026-12-05', '23:59'],
    ['2028-02-29', '09:15'],
    ['2000-02-29', '12:00'],
    ['2026-12-31', '06:00'],
    ['0202-11-22', '07:30'],
  ])
    assert.equal(load(date, time), `${date} ${time}`, `${date} ${time} is kept`);
  for (const date of ['2026-02-29', '1900-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-10', '2026-11-00'])
    assert.equal(load(date, '07:30'), '2026-11-22 07:30', `${date} falls back`);
  for (const time of ['24:00', '25:00', '23:60', '99:99'])
    assert.equal(load('2026-12-05', time), '2026-12-05 09:00', `${time} falls back`);
  // The last day of every month is kept and the day after falls back, in a common year and a leap year.
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (const [year, leap] of [
    [2027, false],
    [2028, true],
  ] as const)
    days.forEach((n, i) => {
      const month = String(i + 1).padStart(2, '0'),
        last = n + (leap && i === 1 ? 1 : 0);
      assert.equal(
        load(`${year}-${month}-${last}`, '07:30'),
        `${year}-${month}-${last} 07:30`,
        `${year}-${month}-${last}`,
      );
      assert.equal(load(`${year}-${month}-${last + 1}`, '07:30'), '2026-11-22 07:30', `${year}-${month}-${last + 1}`);
    });
  // Only the whole value counts: nothing may come before or after it.
  for (const date of ['x2026-12-05', '2026-12-05x', ' 2026-12-05'])
    assert.equal(load(date, '07:30'), '2026-11-22 07:30', `${JSON.stringify(date)} falls back`);
  for (const time of ['07:30:00', 'x07:30', '07:30 '])
    assert.equal(load('2026-12-05', time), '2026-12-05 09:00', `${JSON.stringify(time)} falls back`);
});

test("a House blend saved before Anita's flour keeps its red spring parts, and one with neither gets the default", () => {
  const house = (params: Record<string, number>) =>
    fromV5({ version: 5, plan: { recipes: { house: { params } } } }, NOW).recipes.house.settings.flours;
  assert.deepEqual(house({ flour_red: 60, flour_wheat: 25, flour_rye: 15 }), { anita: 60, wheat: 25, rye: 15 });
  assert.deepEqual(house({ flour_anita: 70, flour_red: 60 }), { anita: 70, wheat: 10, rye: 10 });
  assert.deepEqual(house({}), { anita: 80, wheat: 10, rye: 10 });
  // Only House had red spring flour before Anita's, and the recipes that kept it were removed on November 22, 2026.
  const tartine = fromV5({ version: 5, plan: { recipes: { tartine: { params: { flour_red: 50 } } } } }, NOW).recipes
    .tartine.settings.flours;
  assert.deepEqual(tartine, { white: 90, wheat: 10 }, "Tartine doesn't take red spring parts");
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

test('Plan the next bake moves the date to tomorrow and starts afresh: no checks, times, ticks or temperatures (decision 1)', () => {
  const s = act.setAdded(
      act.addReading(
        act.setDoughTemp(act.setChecked(act.setChecked(plan(), 'feed', true, NOW), 'leaven', true, NOW), 80),
        82,
        NOW,
      ),
      'mix:salt',
      true,
    ),
    next = act.planNextBake(s, NOW);
  assert.equal(next.date, '2026-11-22');
  assert.deepEqual(selected(next).bake, { done: [], doneAt: {}, doughTemp: null, bulkTemps: [], added: [] });
  // Other recipes' bakes are their own.
  const other = act.setChecked(act.selectRecipe(s, 'tartine'), 'leaven', true, NOW);
  assert.deepEqual(act.planNextBake(other, NOW).recipes.house.bake, s.recipes.house.bake);
});

test('Clear checklist clears the checks, their times, the ticks and the temperatures of the selected recipe only', () => {
  const other = act.setAdded(
    act.setChecked(act.selectRecipe(plan(), 'tartine'), 'leaven', true, NOW),
    'mix:salt',
    true,
  );
  const s = act.setAdded(
    act.addReading(act.setDoughTemp(act.setChecked(act.selectRecipe(other, 'house'), 'mix', true, NOW), 82), 84, NOW),
    'mix:leaven',
    true,
  );
  assert.deepEqual(selected(s).bake.added, ['mix:leaven']);
  const cleared = act.clearChecklist(s);
  assert.deepEqual(selected(cleared).bake, { done: [], doneAt: {}, doughTemp: null, bulkTemps: [], added: [] });
  assert.deepEqual(cleared.recipes.tartine.bake.done, ['leaven']);
  assert.deepEqual(cleared.recipes.tartine.bake.added, ['mix:salt']);
});

test('ticking an addition is kept for the selected recipe, unticking removes it, and neither checks or moves a step', () => {
  const start = act.setChecked(plan(), 'leaven', true, NOW),
    salted = act.setAdded(act.setAdded(start, 'mix:salt', true), 'mix:water', true);
  assert.deepEqual(selected(salted).bake.added, ['mix:salt', 'mix:water']);
  // A second tick of the same addition counts once.
  assert.deepEqual(selected(act.setAdded(salted, 'mix:salt', true)).bake.added, ['mix:water', 'mix:salt']);
  assert.deepEqual(selected(act.setAdded(salted, 'mix:salt', false)).bake.added, ['mix:water']);
  // Unticking one that was never ticked changes nothing.
  assert.deepEqual(selected(act.setAdded(start, 'mix:salt', false)).bake.added, []);
  // The checklist and its times are as they were, and every other recipe has nothing ticked.
  assert.deepEqual(selected(salted).bake.done, ['leaven']);
  assert.deepEqual(selected(salted).bake.doneAt, selected(start).bake.doneAt);
  assert.deepEqual(salted.recipes.tartine.bake.added, []);
  // Restore defaults starts the recipe's bake over, ticks included.
  assert.deepEqual(selected(act.restoreDefaults(salted)).bake.added, []);
});

test('a new date or time clears the final-mix ticks while nothing is checked, as it does the temperatures', () => {
  const ticked = act.setAdded(plan(), 'mix:salt', true);
  assert.deepEqual(selected(act.setDate(ticked, '2026-11-23')).bake.added, []);
  assert.deepEqual(selected(act.setTime(ticked, '10:00')).bake.added, []);
  // Once a step is checked it is the same bake, so the ticks stay.
  const underway = act.setAdded(act.setChecked(plan(), 'leaven', true, NOW), 'mix:salt', true);
  assert.deepEqual(selected(act.setDate(underway, '2026-11-23')).bake.added, ['mix:salt']);
  // Clear checklist clears ticks even when nothing is checked.
  assert.deepEqual(selected(act.clearChecklist(ticked)).bake.added, []);
});

test('loaves per mix is shared by every recipe, saved, and falls back to 2 when missing or not a whole number of 1 or more', () => {
  const s = act.setMixCapacity(plan(), 3);
  assert.equal(s.mixCapacity, 3);
  assert.equal(planOf(act.selectRecipe(s, 'tartine')).mixCapacity, 3);
  assert.equal(fromV6(JSON.parse(serialize(s)), NOW)!.mixCapacity, 3);
  assert.equal(freshState(NOW).mixCapacity, 2);
  const saved = JSON.parse(serialize(s));
  for (const bad of [undefined, 0, -1, 1.5, '3', null, Infinity]) {
    saved.plan.mixCapacity = bad;
    assert.equal(fromV6(saved, NOW)!.mixCapacity, 2, String(bad));
  }
  saved.plan.mixCapacity = 12;
  assert.equal(fromV6(saved, NOW)!.mixCapacity, 12);
  const five = { version: 5, plan: { recipe: 'house', recipes: { house: { params: {} } } } };
  assert.equal(fromV5(five, NOW).mixCapacity, 2);
});

test('a save from before the tick-offs loads with nothing ticked, from version 5 or version 6', () => {
  const six = JSON.parse(serialize(act.setChecked(plan(), 'mix', true, NOW)));
  delete six.plan.recipes.house.bake.added;
  const loaded = fromV6(six, NOW)!;
  assert.deepEqual(loaded.recipes.house.bake.added, []);
  assert.deepEqual(loaded.recipes.house.bake.done, ['mix']);
  const five = { version: 5, plan: { recipe: 'house', recipes: { house: { params: {}, done: ['mix'] } } } };
  assert.deepEqual(fromV5(five, NOW).recipes.house.bake.added, []);
  // Anything that is not a list of ids loads as nothing ticked.
  for (const bad of ['mix:salt', { 'mix:salt': true }, 7, null]) {
    six.plan.recipes.house.bake.added = bad;
    assert.deepEqual(fromV6(six, NOW)!.recipes.house.bake.added, []);
  }
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

test('a missing or invalid saved date or time falls back to tomorrow at 9:00 AM, as for a new plan (decision 4)', () => {
  // A version 5 save's creation date is no longer used.
  const upgraded = fromV5(
    { version: 5, plan: { date: '', time: '9:00', legacy: { date: '2026-10-20', time: '07:30' } } },
    NOW,
  );
  assert.deepEqual([upgraded.date, upgraded.time], ['2026-11-22', '09:00']);
  // Saved as version 6 with the date field cleared, it reloads on tomorrow's date.
  const six = JSON.parse(serialize(act.setDate(act.setTime(plan(), '06:45'), '')));
  const reloaded = fromV6(six, NOW)!;
  assert.deepEqual([reloaded.date, reloaded.time], ['2026-11-22', '06:45']);
  // A creation date and time saved by an earlier release are ignored, and no longer saved.
  six.plan.created = { date: '2026-10-20', time: '07:30' };
  six.plan.time = '25:00';
  assert.deepEqual([fromV6(six, NOW)!.date, fromV6(six, NOW)!.time], ['2026-11-22', '09:00']);
  assert.equal('created' in JSON.parse(serialize(fromV6(six, NOW)!)).plan, false);
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
    // A total below what the leaven and starter build already bring stops at no added water.
    assert.equal(selected(act.setTotalHydration(s, 0)).settings.hydration, 0, `${id} at 0%`);
  }
});

test('settings change only the selected recipe, and Restore defaults puts back its settings and clears its bake', () => {
  let s = act.setSetting(plan(), 'count', 4);
  s = act.setSetting(s, 'flour:rye', 0);
  s = act.setSetting(s, 'build:water', 200);
  s = act.setSetting(s, 'autolyse', 45);
  s = act.setChecked(s, 'feed', true, NOW);
  s = act.setChecked(act.selectRecipe(s, 'tartine'), 'leaven', true, NOW);
  s = act.selectRecipe(s, 'house');
  const house = selected(s).settings;
  assert.deepEqual([house.count, house.flours.rye, house.build.water, house.autolyse], [4, 0, 200, 45]);
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
  assert.equal(act.selectRecipe(s, 'tartine').recipe, 'tartine');
  assert.equal(act.selectRecipe(s, 'red-rye'), s, 'a removed recipe is not on the menu');
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

test('every temperature the °C field accepts is kept on reload, from 10°C to 37.7°C (decision 5)', () => {
  assert.deepEqual(
    [9.9, 10, 37.7, 37.8, 38].map((c) => inTempRange(c, 'C')),
    [false, true, true, false, false],
  );
  for (const c of [10, 26, 37.7]) {
    const s = act.addReading(act.setDoughTemp(plan(), toF(c, 'C')), toF(c, 'C'), NOW),
      back = fromV6(JSON.parse(serialize(s)), NOW)!.recipes.house.bake;
    assert.equal(back.doughTemp, toF(c, 'C'), `${c}°C after mixing`);
    assert.deepEqual(
      back.bulkTemps.map((r) => r.f),
      [toF(c, 'C')],
      `${c}°C later`,
    );
  }
});

test('a save with one of the four removed recipes selected opens on Preuss House, keeps House and Tartine as saved, and starts the new Tartine recipes at their defaults', () => {
  const six = ['house', 'tartine', 'white-wheat', 'red-rye', 'five-flour', 'four-flour'];
  const checked = { done: ['leaven'], doneAt: { leaven: NOW }, doughTemp: 78, bulkTemps: [], added: [] };
  const recipes = Object.fromEntries(
    six.map((id) => [id, { settings: { count: 3 }, bake: id === 'red-rye' || id === 'tartine' ? checked : {} }]),
  );
  for (const [name, saved] of [
    ['version 6', { [STORAGE_V6]: JSON.stringify({ version: 6, plan: { recipe: 'red-rye', order: six, recipes } }) }],
    [
      'version 5',
      {
        [STORAGE_V5]: JSON.stringify({
          version: 5,
          plan: { recipe: 'five-flour', order: six, recipes: { tartine: { params: { count: 3 }, ...checked } } },
        }),
      },
    ],
  ] as const) {
    const s = loadState(storage(saved), NOW);
    // The saved menu names none of the three Tartine recipes added the same day; the loader adds them after it.
    const all = ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer'];
    assert.deepEqual([s.recipe, s.order, Object.keys(s.recipes)], ['house', all, all], name);
    assert.equal(s.recipes.tartine.settings.count, 3, `${name}: Tartine keeps its settings`);
    assert.deepEqual(s.recipes.tartine.bake.done, ['leaven'], `${name}: and its checklist`);
    assert.deepEqual(
      s.recipes.olive,
      {
        settings: defaultSettings(recipeById('olive')!),
        bake: { done: [], doneAt: {}, doughTemp: null, bulkTemps: [], added: [] },
      },
      `${name}: Olive, which the save doesn't hold, starts at its defaults`,
    );
    assert.deepEqual(
      s.recipes.sesame,
      {
        settings: recipeById('sesame')!.defaults,
        bake: { done: [], doneAt: {}, doughTemp: null, bulkTemps: [], added: [] },
      },
      `${name}: Sesame, which the save doesn't hold, starts at its defaults`,
    );
    // `white-wheat` was White & Whole Wheat, not Tartine Whole Wheat (`whole-wheat`): nothing saved for it carries over.
    assert.deepEqual(
      s.recipes['whole-wheat'],
      {
        settings: defaultSettings(recipeById('whole-wheat')!),
        bake: { done: [], doneAt: {}, doughTemp: null, bulkTemps: [], added: [] },
      },
      `${name}: Tartine Whole Wheat is at its defaults`,
    );
  }
});

test('a saved menu keeps its own order and gains, at the end, every recipe it does not name', () => {
  const load = (order: unknown) =>
    loadState(storage({ [STORAGE_V6]: JSON.stringify({ version: 6, plan: { order } }) }), NOW).order;
  assert.deepEqual(load(['tartine', 'house']), [
    'tartine',
    'house',
    'olive',
    'sesame',
    'whole-wheat',
    'country-rye',
    'emmer',
  ]);
  assert.deepEqual(load(['sesame', 'red-rye', 'sesame']), [
    'sesame',
    'house',
    'tartine',
    'olive',
    'whole-wheat',
    'country-rye',
    'emmer',
  ]);
  assert.deepEqual(load(['four-flour']), [
    'house',
    'tartine',
    'olive',
    'sesame',
    'whole-wheat',
    'country-rye',
    'emmer',
  ]);
  assert.deepEqual(load('house'), ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer']);
  const s = loadState(
    storage({ [STORAGE_V6]: JSON.stringify({ version: 6, plan: { recipe: 'tartine', order: ['tartine'] } }) }),
    NOW,
  );
  assert.equal(act.selectRecipe(s, 'whole-wheat').recipe, 'whole-wheat', 'a recipe added since the save can be chosen');
});

test('Olive and Sesame saved with Original Tartine’s dough load fresh at Preuss House’s; saved with the new dough, and every other recipe, they load as saved (decision 16)', () => {
  // Before decision 16 they were Tartine variations: white and whole-wheat flour, 75% hydration, a Tartine leaven build.
  const tartineDough = {
    count: 3,
    weight: 985,
    hydration: 75,
    leaven: 20,
    salt: 2,
    reserve: (50 / 750) * 100,
    flours: { white: 90, wheat: 10 },
    build: { starter: 15, flour: 100, wheat: 100, water: 200 },
  };
  const bake = { done: ['leaven', 'autolyse'], doneAt: { leaven: NOW - 3600000, autolyse: NOW }, doughTemp: 78 };
  const edited = { ...defaultSettings(recipeById('olive')!), count: 3, hydration: 76 };
  const plan = {
    recipe: 'olive',
    recipes: {
      olive: { settings: tartineDough, bake },
      sesame: { settings: edited, bake },
      tartine: { settings: tartineDough, bake },
    },
  };
  const s = loadState(storage({ [STORAGE_V6]: JSON.stringify({ version: 6, plan }) }), NOW);
  assert.equal(s.recipe, 'olive');
  assert.deepEqual(
    s.recipes.olive.settings,
    defaultSettings(recipeById('olive')!),
    'the old dough is not carried over',
  );
  assert.deepEqual(s.recipes.olive.bake, { done: [], doneAt: {}, doughTemp: null, bulkTemps: [], added: [] });
  assert.deepEqual(s.recipes.sesame.settings, edited, 'a save in the new dough keeps its edits');
  assert.deepEqual(s.recipes.sesame.bake.done, ['leaven', 'autolyse']);
  // Original Tartine still uses white and whole-wheat flour, so its save loads as it was, with the default rest
  // after mixing, which saves from then didn't hold (decision 22).
  assert.deepEqual(s.recipes.tartine.settings, { ...tartineDough, autolyse: 30 });
  assert.equal(s.recipes.tartine.bake.doughTemp, 78);
  // The rule is for Olive and Sesame only: Preuss House with a flour it doesn't use keeps its settings and checklist.
  const house = { ...defaultSettings(recipeById('house')!), count: 4 },
    stray = { ...house, flours: { ...house.flours, red: 0 } };
  const h = loadState(
    storage({ [STORAGE_V6]: JSON.stringify({ version: 6, plan: { recipes: { house: { settings: stray, bake } } } }) }),
    NOW,
  );
  assert.deepEqual(h.recipes.house.settings, house);
  assert.deepEqual(h.recipes.house.bake.done, ['leaven', 'autolyse']);
});
