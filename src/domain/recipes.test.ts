import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, recipeById, defaultSettings, type Recipe, type Settings } from './recipes.ts';
import { formula, totalHydration, addedHydration, type Weighed } from './formula.ts';
import { schedule, type PlanInput } from './schedule.ts';

// Ported from src/lib/recipes.test.ts. Plans are for 9:00 AM local time on 21 October 2026, as there, and every time
// is built and read in the local zone, so these tests hold in any time zone.
const approx = (a: number, b: number, message?: string) => assert.ok(Math.abs(a - b) < 1e-7, message ?? `${a} != ${b}`);
const IDS = ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye'];
/**
 * Preuss House set to the numbers of the retired Red Spring & Rye (removed November 22, 2026): the spreadsheet's main
 * calculator, which puts all of a 312 g build into the dough. It keeps the floating-point cases that recipe covered.
 */
const allLeaven = (s: Settings) =>
  Object.assign(s, {
    weight: 2002 / 2,
    hydration: (724 / 944) * 100,
    leaven: (312 / 944) * 100,
    salt: (22 / 944) * 100,
    reserve: (72 / 724) * 100,
    flours: { anita: (758 / 944) * 100, wheat: (83 / 944) * 100, rye: (103 / 944) * 100 },
    build: {
      starter: (28 / 944) * 1000,
      flour: (71 / 944) * 1000,
      wheat: (71 / 944) * 1000,
      water: (142 / 944) * 1000,
    },
  });

function recipe(id: string): Recipe {
  const r = recipeById(id);
  assert.ok(r, `no recipe ${id}`);
  return r;
}
/** A plan with the recipe's default settings, two loaves baked at once and a 30-minute reheat, as a new planner has. */
function plan(id: string, change: (s: Settings) => void = () => {}, input: Partial<PlanInput> = {}): PlanInput {
  const settings = defaultSettings(recipe(id));
  change(settings);
  return {
    recipe: recipe(id),
    settings,
    date: '2026-10-21',
    time: '09:00',
    anchor: 'leaven',
    proof: 'cold',
    ovenCapacity: 2,
    reheat: 30,
    ...input,
  };
}
function weigh(input: PlanInput) {
  const r = formula(input.recipe, input.settings);
  assert.ok(r, `${input.recipe.id} has no formula`);
  return r;
}
function note(input: PlanInput, id: string) {
  const step = schedule(input).find((s) => s.id === id);
  assert.ok(step, `${input.recipe.id} has no step ${id}`);
  return step.note;
}
/** A mixing stage's grams, in order. */
function grams(rows: Weighed[], expected: number[]) {
  assert.equal(rows.length, expected.length, JSON.stringify(rows));
  rows.forEach(([name, g], i) => approx(g, expected[i], `${name}: ${g} != ${expected[i]}`));
}
const sum = (rows: Weighed[]) => rows.reduce((a, [, g]) => a + g, 0);

test('total hydration includes only the used leaven while every recipe quantity stays intact', () => {
  const expected: Record<string, number> = {
    house: 80,
    tartine: (850 / 1100) * 100,
    olive: 80,
    sesame: 80,
    'whole-wheat': (900 / 1100) * 100,
    'country-rye': (900 / 1100) * 100,
  };
  const recipes = JSON.stringify(RECIPES);
  for (const id of IDS) {
    const input = plan(id),
      s = input.settings,
      before = JSON.stringify(s),
      r = weigh(input);
    approx(r.totalHydration, expected[id]);
    approx(r.totalHydration, (r.totalWater / r.totalFlour) * 100);
    approx(r.totalWater + r.totalFlour + r.salt, r.total);
    approx(addedHydration(totalHydration(s), s), s.hydration);
    assert.equal(JSON.stringify(s), before, id);
  }
  assert.equal(JSON.stringify(RECIPES), recipes);
  const h = weigh(plan('house'));
  approx(h.totalFlour, 1100);
  approx(h.totalWater, 880);
  approx(h.made, 312);
  approx(h.used, 200);
  approx(h.reserve, 112);
});

test('typing a total hydration changes the water at the same dough weight and leaves the schedule as it was', () => {
  const input = plan('house'),
    s = input.settings,
    before = schedule(input);
  s.hydration = addedHydration(80.5, s);
  approx(s.hydration, 78.55);
  const r = weigh(input);
  approx(r.totalHydration, 80.5);
  approx(r.total, 2000);
  approx(r.water / r.flour, 0.7855);
  approx(sum([...r.initial, ...r.final]), 2000);
  assert.deepEqual(
    schedule(input).map((x) => x.at),
    before.map((x) => x.at),
  );
  s.hydration = addedHydration(80, s);
  const restored = weigh(input);
  grams(restored.initial, [800, 100, 680]);
  grams(restored.final, [100, 200, 20, 100]);
});

test('total hydration follows the leaven build, taking mature starter as half water and an empty build as 100%', () => {
  const input = plan('house', (s) => {
      s.build = { starter: 20, flour: 80, wheat: 10, water: 190 };
    }),
    s = input.settings;
  // The build contains 100 g flour and 200 g water; used leaven is still 200 g.
  const r = weigh(input);
  approx(r.totalFlour, 1000 + 200 / 3);
  approx(r.totalWater, 780 + 400 / 3);
  approx(r.totalHydration, ((780 + 400 / 3) / (1000 + 200 / 3)) * 100);
  s.hydration = addedHydration(90, s);
  approx(weigh(input).totalHydration, 90);
  s.leaven = 0;
  approx(totalHydration(s), s.hydration);
  s.leaven = 20;
  s.build = { starter: 0, flour: 0, wheat: 0, water: 0 };
  s.hydration = 78;
  approx(totalHydration(s), 80);
  approx(weigh(input).shortfall, 200);
  s.build.water = 100;
  approx(totalHydration(s), 98);
  s.build.water = 0;
  s.build.flour = 100;
  approx(totalHydration(s), 65);
  approx(addedHydration(totalHydration({ ...s, hydration: 0 }), s), 0);
});

test('a recipe keeps its added-water setting and shows the total hydration that water gives', () => {
  const input = plan('house', (s) => {
      s.hydration = 73;
      s.count = 4;
    }),
    r = weigh(input);
  assert.equal(r.hydration, 73);
  assert.equal(input.settings.hydration, 73);
  approx(r.totalHydration, 83 / 1.1);
});

test('the menu lists Preuss House, Original Tartine, Olive, Sesame, Tartine Whole Wheat, then Tartine Country Rye, House uses Anita’s flour, and the red-spring variation is not one of them', () => {
  assert.deepEqual(
    RECIPES.map((r) => r.id),
    IDS,
  );
  assert.deepEqual(
    recipe('house').flours,
    ['anita', 'wheat', 'rye'],
    "House uses Anita's all-purpose flour, not red spring",
  );
  assert.equal(recipeById('manual-rye'), undefined);
});

test('base House stages, hydration and leaven reserve match the supplied recipe exactly', () => {
  const r = weigh(plan('house'));
  assert.equal(r.total, 2000);
  approx(r.flour, 1000);
  approx(r.water, 780);
  approx(r.used, 200);
  approx(r.salt, 20);
  approx(r.made, 312);
  approx(r.reserve, 112);
  assert.deepEqual(
    r.initial.map((x) => x[0]),
    ["Anita's all-purpose flour", 'Whole-wheat flour', 'Water'],
  );
  grams(r.initial, [800, 100, 680]);
  grams(r.final, [100, 200, 20, 100]);
});

test('the book recipe keeps its quantities and leaven in the initial mix, and weighs no dusting flour', () => {
  const r = weigh(plan('tartine'));
  approx(r.total, 1970);
  approx(r.hydration, 75);
  assert.equal(r.initial[0][0], 'Leaven used');
  grams(r.initial, [200, 900, 100, 700]);
  grams(r.final, [20, 50]);
  approx(r.made, 415);
  approx(r.reserve, 215);
  // The basket and dusting flour card was removed at Michael's request on November 22, 2026.
  assert.ok(!('dustingWheat' in r));
  assert.ok(!('dustingRice' in r));
});

test('every recipe conserves dough mass and scales count, loaf weight and hydration independently', () => {
  const house = plan('house');
  for (const id of IDS) {
    const input = id === 'house' ? house : plan(id),
      s = input.settings,
      other = structuredClone(house.settings);
    if (id !== 'house') s.count += 1;
    s.weight = 800;
    s.hydration += 5;
    const r = weigh(input);
    approx(sum([...r.initial, ...r.final]), s.count * 800);
    approx((100 * r.water) / r.flour, s.hydration);
    if (id !== 'house') assert.deepEqual(house.settings, other);
  }
  const fresh = defaultSettings(recipe('house'));
  assert.deepEqual([fresh.count, fresh.weight, fresh.hydration], [2, 1000, 78], 'edits never reach the defaults');
});

test('flour proportions normalize visibly to batch weights, and zero flour is a valid empty state', () => {
  const input = plan('house', (s) => {
      s.flours.anita = 60;
    }),
    r = weigh(input);
  approx(r.flours[0].percent, 75);
  approx(
    r.flours.reduce((a, f) => a + f.grams, 0),
    r.flour,
  );
  input.settings.flours = { anita: 0, wheat: 0, rye: 0 };
  assert.equal(formula(input.recipe, input.settings), null);
  assert.deepEqual(schedule(input), []);
});

test('leaven shortfall is independent of recipe identity and never creates a negative reserve', () => {
  const r = weigh(
    plan('house', (s) => {
      s.build = { starter: 0, flour: 0, wheat: 0, water: 0 };
    }),
  );
  approx(r.used, 200);
  assert.equal(r.made, 0);
  assert.equal(r.reserve, 0);
  approx(r.shortfall, 200);
});

test('each recipe schedules its own count, with an overnight House proof and planning back from the last batch', () => {
  const pad = (n: number) => String(n).padStart(2, '0');
  for (const id of IDS) {
    const input = plan(id),
      a = schedule(input),
      done = a.find((x) => x.id === 'done');
    assert.ok(done, id);
    assert.equal(
      a.filter((x) => x.id.startsWith('covered')).length,
      Math.ceil(input.settings.count / input.ovenCapacity),
      id,
    );
    const date = `${done.at.getFullYear()}-${pad(done.at.getMonth() + 1)}-${pad(done.at.getDate())}`,
      time = `${pad(done.at.getHours())}:${pad(done.at.getMinutes())}`;
    assert.deepEqual(schedule({ ...input, anchor: 'done', date, time }), a, id);
    if (recipe(id).method === 'house') {
      const fridge = a.find((x) => x.id === 'fridge');
      assert.ok(fridge, id);
      const end = new Date(fridge.at.getTime() + fridge.minutes * 60000);
      assert.notEqual(fridge.at.getDate(), end.getDate(), id);
    }
  }
});

test('recipe schedule descriptions follow the selected flours and quantities', () => {
  const input = plan('house', (s) => (s.flours = { anita: 80, wheat: 20, rye: 0 }));
  assert.ok(!note(input, 'mix').includes('rye'));
  assert.match(note(input, 'autolyse'), /Anita's all-purpose flour \(800 g\), whole-wheat flour \(200 g\)/);
});

test('arithmetic noise never reports a leaven shortfall, while real deficits still do', () => {
  const input = plan('house', allLeaven),
    r = weigh(input);
  assert.equal(r.shortfall, 0);
  assert.equal(r.reserve, 0);
  approx(r.made, 312);
  approx(r.used, 312);
  for (const id of IDS) assert.equal(weigh(plan(id)).shortfall, 0, id);
  input.settings.build.water -= 1;
  const short = weigh(input);
  approx(short.shortfall, 0.944);
  assert.equal(short.reserve, 0);
  input.settings.build.water += 2;
  const spare = weigh(input);
  approx(spare.reserve, 0.944);
  assert.equal(spare.shortfall, 0);
});

test('leaven steps list the scaled build and what is kept, for every recipe', () => {
  const house = note(plan('house'), 'leaven');
  assert.match(house, /28 g mature starter, 71 g Anita's all-purpose flour, 71 g whole-wheat flour and 142 g water/);
  assert.match(
    note(plan('house'), 'autolyse'),
    /^Mix Anita's all-purpose flour \(800 g\), whole-wheat flour \(100 g\), water \(680 g\)\./,
  );
  assert.match(house, /use 200 g in the dough and keep 112 g/);
  const tartine = note(plan('tartine'), 'leaven');
  assert.match(
    tartine,
    /15 g \(about 1 tbsp\) of mature starter with 200 g water, then add 100 g white-bread flour and 100 g whole-wheat flour/,
  );
  assert.match(tartine, /keep 215 g/);
  assert.match(note(plan('house', allLeaven), 'leaven'), /All 312 g goes into the dough/);
  const empty = plan('house', (s) => {
    s.build = { starter: 0, flour: 0, wheat: 0, water: 0 };
  });
  assert.match(note(empty, 'leaven'), /200 g less than the 200 g the dough needs/);
});

test('every refrigerated proof tells you to cover and refrigerate, and no step is left without guidance', () => {
  for (const id of IDS) {
    const input = plan(id);
    assert.match(note(input, 'fridge'), /[Rr]efrigerat/, id);
    for (const step of schedule(input)) assert.ok(step.note && step.note.length > 10, `${id}: ${step.id} has no note`);
  }
});

test('House-method turns 1 to 3 are vigorous double rounds and later turns a single round; Tartine keeps the book wording', () => {
  for (const id of ['house']) {
    const notes = Object.fromEntries(
      schedule(plan(id))
        .filter((s) => /^turn\d+$/.test(s.id))
        .map((s) => [s.id, s.note]),
    );
    assert.equal(Object.keys(notes).length, 7, id);
    for (const n of [1, 2, 3]) {
      assert.match(notes[`turn${n}`], /vigorously/i, `${id} turn ${n}`);
      assert.match(notes[`turn${n}`], /second time|twice/, `${id} turn ${n}`);
    }
    for (const n of [4, 5, 6, 7]) {
      assert.match(notes[`turn${n}`], /once/, `${id} turn ${n}`);
      assert.doesNotMatch(notes[`turn${n}`], /vigorous|twice/i, `${id} turn ${n}`);
    }
  }
  const turns = schedule(plan('tartine')).filter((s) => /^turn\d+$/.test(s.id));
  assert.equal(
    turns[0].note,
    'Wet your hand. Stretch one quadrant over the dough; rotate and repeat to fold all four sides.',
  );
  assert.ok(turns.slice(1).every((s) => s.note === 'Repeat the four-sided stretch and fold, with wet hands.'));
});

test('step notes speak to the baker, and mention later batches only when there are some', () => {
  for (const id of IDS)
    for (const proof of ['cold', 'warm'] as const)
      for (const s of schedule(plan(id, undefined, { proof })))
        assert.ok(!/supplied recipe|default is/i.test(s.note ?? ''), `${id} ${s.id}: ${s.note}`);
  const house = plan('house');
  assert.doesNotMatch(note(house, 'fridge'), /later batches/i);
  assert.match(note(house, 'done'), /Cool each loaf at least 15 minutes before slicing\./);
  house.settings.count = 4;
  assert.match(note(house, 'fridge'), /Keep later batches chilled until their own warm-up/);
  assert.match(note(house, 'out-1'), /Cool each loaf at least 15 minutes before slicing\./);
  const one = plan('tartine', (s) => {
    s.count = 1;
  });
  assert.equal(note(one, 'fridge'), 'Cover the baskets and refrigerate for 10 to 12 hours.');
});

// Moved from tests/baseline/agree.test.ts in step 3c: it tests only the new code.
test('a recipe is found only by its own id, and its defaults cannot be changed in place', () => {
  for (const r of RECIPES) assert.equal(recipeById(r.id), r);
  for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'manual-rye', ''])
    assert.equal(recipeById(id), undefined, id);
  const house = recipeById('house')!;
  assert.throws(() => {
    (house.defaults.flours as Record<string, number>).rye = 0;
  }, TypeError);
  assert.throws(() => {
    (house.defaults.build as { starter: number }).starter = 1;
  }, TypeError);
  assert.throws(() => {
    (house.flours as string[]).push('red');
  }, TypeError);
  const copy = defaultSettings(house);
  copy.flours.rye = 0;
  copy.build.starter = 1;
  assert.equal(house.defaults.flours.rye, 10, 'changing a copy leaves the defaults alone');
  assert.equal(house.defaults.build.starter, 28);
  assert.notEqual(defaultSettings(house), defaultSettings(house), 'each copy is new');
});

test('only Preuss House, Original Tartine, Olive, Sesame, Tartine Whole Wheat and Tartine Country Rye are on the menu, and the four removed recipes stay gone (Michael, November 22, 2026)', () => {
  assert.deepEqual(
    RECIPES.map((r) => [r.id, r.name]),
    [
      ['house', 'Preuss House'],
      ['tartine', 'Original Tartine'],
      ['olive', 'Olive'],
      ['sesame', 'Sesame'],
      ['whole-wheat', 'Tartine Whole Wheat'],
      ['country-rye', 'Tartine Country Rye'],
    ],
  );
  for (const gone of ['white-wheat', 'red-rye', 'five-flour', 'four-flour']) assert.equal(recipeById(gone), undefined);
});
