import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, FLOUR_NAMES, recipeById, defaultSettings, type Recipe } from './recipes.ts';
import { formula, type Weighed } from './formula.ts';
import { schedule, type PlanInput, type Step } from './schedule.ts';
import { dateString } from './text.ts';

/**
 * Tartine Whole Wheat, from Tartine Bread, page 114: the Basic Country Bread made with 700 g whole wheat and 300 g
 * all-purpose flour and 800 g water at about 75°F. The book rests it 40 to 60 minutes after the initial mix; since
 * decision 15 every Tartine recipe has a 2-hour autolyse alongside the leaven instead, so its times are Original
 * Tartine's. Plans start the leaven at 9:00 AM on October 21, 2026; every time is built and read in the local zone, so
 * these tests hold in any time zone. Original Tartine is checked against its plan as it was before decision 15.
 */

const NOTE =
  'Mix the whole-wheat and all-purpose flour with the initial water, about 75°F / 24°C, by hand until no dry flour is left. Cover and rest until the leaven is ready, while the whole wheat soaks up the water.';

const approx = (a: number, b: number, message?: string) => assert.ok(Math.abs(a - b) < 1e-7, message ?? `${a} != ${b}`);
function recipe(id: string): Recipe {
  const r = recipeById(id);
  assert.ok(r, `no recipe ${id}`);
  return r;
}
/** A plan at the recipe's defaults, with both loaves baked together and a 30-minute reheat, as a new planner has. */
function plan(id: string, change: Partial<PlanInput> = {}): PlanInput {
  const r = recipe(id);
  return {
    recipe: r,
    settings: defaultSettings(r),
    date: '2026-10-21',
    time: '09:00',
    anchor: 'leaven',
    proof: 'cold',
    ovenCapacity: 2,
    reheat: 30,
    ...change,
  };
}
/** A mixing stage's names and grams, in order. */
function stage(rows: Weighed[], expected: [string, number][]) {
  assert.deepEqual(
    rows.map(([name]) => name),
    expected.map(([name]) => name),
  );
  rows.forEach(([name, g], i) => approx(g, expected[i][1], `${name}: ${g} != ${expected[i][1]}`));
}
const pad = (n: number) => String(n).padStart(2, '0');
/** A local date and time as `YYYY-MM-DD HH:MM`. */
const local = (d: Date) => `${dateString(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** `YYYY-MM-DD HH:MM`, `minutes` later. */
function later(at: string, minutes: number) {
  const [y, m, d, h, min] = at.split(/[- :]/).map(Number);
  return local(new Date(y, m - 1, d, h, min + minutes));
}

type Row = [id: string, at: string, minutes: number, title: string];
const rows = (steps: Step[]): Row[] => steps.map((s) => [s.id, local(s.at), s.minutes, s.title]);

/** Original Tartine's steps up to the final shape before decision 15, the same for either proof and oven capacity. */
const TO_SHAPE: Row[] = [
  ['leaven', '2026-10-21 09:00', 720, 'Make leaven'],
  ['autolyse', '2026-10-21 21:00', 30, 'Mix dough and rest'],
  ['mix', '2026-10-21 21:30', 0, 'Add salt and final water'],
  ['rest', '2026-10-21 21:30', 30, 'Begin warm bulk fermentation'],
  ['turn1', '2026-10-21 22:00', 30, 'Turn 1'],
  ['turn2', '2026-10-21 22:30', 30, 'Turn 2'],
  ['turn3', '2026-10-21 23:00', 30, 'Turn 3'],
  ['turn4', '2026-10-21 23:30', 30, 'Turn 4'],
  ['turn5', '2026-10-22 00:00', 30, 'Turn 5'],
  ['shape', '2026-10-22 00:30', 5, 'Divide and preshape'],
  ['bench1', '2026-10-22 00:35', 30, 'Bench rest and prepare baskets'],
  ['fold', '2026-10-22 01:05', 5, 'Final shape'],
];
/** Original Tartine's plan as it was before decision 15, for each proof and oven capacity. */
const BOOK_PLANS: { name: string; change: Partial<PlanInput>; rows: Row[] }[] = [
  {
    name: 'cold proof, both loaves together',
    change: { proof: 'cold', ovenCapacity: 2 },
    rows: [
      ...TO_SHAPE,
      ['fridge', '2026-10-22 01:10', 720, 'Refrigerated final proof'],
      ['warmup', '2026-10-22 13:10', 60, 'Warm both loaves to room temperature'],
      ['preheat', '2026-10-22 13:40', 30, 'Preheat oven and Dutch oven'],
      ['covered', '2026-10-22 14:10', 20, 'Bake covered (both loaves)'],
      ['uncovered', '2026-10-22 14:30', 20, 'Remove lid'],
      ['done', '2026-10-22 14:50', 15, 'All loaves out of the oven'],
    ],
  },
  {
    name: 'warm proof, both loaves together',
    change: { proof: 'warm', ovenCapacity: 2 },
    rows: [
      ...TO_SHAPE,
      ['proof', '2026-10-22 01:10', 210, 'Warm final proof'],
      ['preheat', '2026-10-22 04:10', 30, 'Preheat oven and Dutch oven'],
      ['covered', '2026-10-22 04:40', 20, 'Bake covered (both loaves)'],
      ['uncovered', '2026-10-22 05:00', 20, 'Remove lid'],
      ['done', '2026-10-22 05:20', 15, 'All loaves out of the oven'],
    ],
  },
  {
    name: 'cold proof, one loaf at a time',
    change: { proof: 'cold', ovenCapacity: 1 },
    rows: [
      ...TO_SHAPE,
      ['fridge', '2026-10-22 01:10', 720, 'Refrigerated final proof'],
      ['warmup', '2026-10-22 13:10', 60, 'Warm batch 1 to room temperature'],
      ['preheat', '2026-10-22 13:40', 30, 'Preheat oven and Dutch oven'],
      ['covered', '2026-10-22 14:10', 20, 'Batch 1: bake covered (loaf 1)'],
      ['warmup-2', '2026-10-22 14:20', 60, 'Warm batch 2 (loaf 2)'],
      ['uncovered', '2026-10-22 14:30', 20, 'Batch 1: remove lid'],
      ['out-1', '2026-10-22 14:50', 15, 'Batch 1 out of the oven'],
      ['reheat-2', '2026-10-22 14:50', 30, 'Reheat for batch 2'],
      ['covered-2', '2026-10-22 15:20', 20, 'Batch 2: bake covered (loaf 2)'],
      ['uncovered-2', '2026-10-22 15:40', 20, 'Batch 2: remove lid'],
      ['done', '2026-10-22 16:00', 15, 'All loaves out of the oven'],
    ],
  },
  {
    name: 'warm proof, one loaf at a time',
    change: { proof: 'warm', ovenCapacity: 1 },
    rows: [
      ...TO_SHAPE,
      ['proof', '2026-10-22 01:10', 210, 'Warm final proof'],
      ['preheat', '2026-10-22 04:10', 30, 'Preheat oven and Dutch oven'],
      ['covered', '2026-10-22 04:40', 20, 'Batch 1: bake covered (loaf 1)'],
      ['uncovered', '2026-10-22 05:00', 20, 'Batch 1: remove lid'],
      ['out-1', '2026-10-22 05:20', 15, 'Batch 1 out of the oven'],
      ['reheat-2', '2026-10-22 05:20', 30, 'Reheat for batch 2'],
      ['covered-2', '2026-10-22 05:50', 20, 'Batch 2: bake covered (loaf 2)'],
      ['uncovered-2', '2026-10-22 06:10', 20, 'Batch 2: remove lid'],
      ['done', '2026-10-22 06:30', 15, 'All loaves out of the oven'],
    ],
  },
];
/** Original Tartine's notes and readiness cues with both loaves baked together. */
const REPEAT = 'Repeat the four-sided stretch and fold, with wet hands.';
const TARTINE_NOTES: Record<string, string> = {
  leaven:
    'Mix 15 g (about 1 tbsp) of mature starter with 200 g water, then add 100 g white-bread flour and 100 g whole-wheat flour. Cover at room temperature. You use 200 g in the dough and keep 215 g.',
  autolyse:
    'Mix the white and whole-wheat flour with the initial water, about 80°F / 27°C, until no dry flour remains. Cover and rest until the leaven is ready.',
  mix: 'Work in the leaven, salt and reserved water. Keep mixing if the dough separates; it should come together again.',
  rest: 'Cover and keep at 75°F to 80°F / 24°C to 27°C.',
  turn1: 'Wet your hand. Stretch one quadrant over the dough; rotate and repeat to fold all four sides.',
  turn2: REPEAT,
  turn3: REPEAT,
  turn4: REPEAT,
  turn5: REPEAT,
  shape:
    'Dust the top, divide equally and turn flour-side down. Shape taut rounds with the dusting flour on the outside.',
  bench1:
    'Cover the rounds for 30 minutes. Line proofing baskets or bowls with towels and generously dust with rice flour.',
  fold: 'Turn flour-side down. Stretch and fold the bottom, sides and top over the center; roll seam-side down into a taut round. Place seam-side up in a prepared basket.',
  fridge: 'Cover the baskets and refrigerate for 10 to 12 hours.',
  warmup: 'Remove the loaves from the refrigerator.',
  proof: 'Cover and keep at 75°F to 80°F / 24°C to 27°C for 3 to 4 hours.',
  preheat:
    'Place the lidded Dutch oven or pots in the oven and heat to 500°F / 260°C. Use one suitable pot per loaf baked at once.',
  covered:
    'Dust the loaf tops. Carefully turn seam-side down into the hot pot, score with a lame or razor, and cover. Reduce oven to 450°F / 232°C.',
  uncovered: 'Remove lid carefully: hot steam can escape. Continue at 450°F / 232°C.',
  done: 'Transfer to a wire rack. The base should sound hollow when tapped. Cool each loaf at least 15 minutes before slicing.',
};
const TARTINE_READINESS: Record<string, string> = {
  leaven:
    'Use when aerated and puffy, and a spoonful floats in room-temperature water. If it sinks, allow more fermentation before mixing.',
  shape:
    'Look for a billowy dough and 20% to 30% volume increase. The book allows up to one more hour with folds if needed; wait until the dough is ready before moving on.',
  warmup: 'Bring the dough back to room temperature before baking; use its condition, rather than the clock alone.',
  uncovered: 'Bake until the crust is a rich golden brown; extend the uncovered bake if needed.',
};
/** Each step's note, and its readiness cue where it has one. */
const notes = (steps: Step[]) => Object.fromEntries(steps.map((s) => [s.id, s.note]));
const readiness = (steps: Step[]) =>
  Object.fromEntries(steps.filter((s) => s.readiness !== undefined).map((s) => [s.id, s.readiness]));
/** The expected notes for a plan's steps, from `all`. */
const pick = (steps: Step[], all: Record<string, string>) =>
  Object.fromEntries(steps.filter((s) => s.id in all).map((s) => [s.id, all[s.id]]));

/**
 * A plan of the book's from decision 15 on: the autolyse is the last 2 hours of the leaven, and the leaven goes in with
 * the salt as the leaven is ready. The book's 30-minute rest after the initial mix is gone, so the final mix and every
 * step after it come 30 minutes earlier.
 */
function decision15(book: Row[]): Row[] {
  const i = book.findIndex(([id]) => id === 'autolyse');
  return book.map(([id, at, minutes, title], n): Row =>
    n < i
      ? [id, at, minutes, title]
      : n === i
        ? [id, later(at, -120), 120, 'Start autolyse']
        : [id, later(at, -30), minutes, id === 'mix' ? 'Add leaven, salt and final water' : title],
  );
}
const TARTINE_PLANS = BOOK_PLANS.map((p) => ({ ...p, rows: decision15(p.rows) }));

test('Tartine Whole Wheat is on the menu after the two Tartine variations, made the Tartine way', () => {
  assert.deepEqual(
    RECIPES.map((r) => [r.id, r.name, r.method]),
    [
      ['house', 'Preuss House', 'house'],
      ['tartine', 'Original Tartine', 'tartine'],
      ['olive', 'Tartine Olive', 'tartine'],
      ['sesame', 'Tartine Sesame', 'tartine'],
      ['whole-wheat', 'Tartine Whole Wheat', 'tartine'],
      ['country-rye', 'Tartine Country Rye', 'tartine'],
    ],
  );
  const r = recipe('whole-wheat');
  assert.deepEqual(r.flours, ['wheat', 'ap'], 'whole wheat, then all-purpose');
  assert.deepEqual(r.late, []);
  assert.equal(r.buildFlour, 'white');
  assert.equal(r.addIns, undefined);
  assert.equal(FLOUR_NAMES.ap, 'All-purpose flour');
  assert.equal(FLOUR_NAMES.wheat, 'Whole-wheat flour');
  assert.deepEqual(r.defaults, {
    count: 2,
    weight: 1010,
    hydration: 80,
    leaven: 20,
    salt: 2,
    // 50 g of the 800 g water is held back for the salt, as for the Basic Country Bread.
    reserve: 6.25,
    flours: { wheat: 70, ap: 30 },
    build: { starter: 15, flour: 100, wheat: 100, water: 200 },
  });
  assert.deepEqual(r.defaults.build, recipe('tartine').defaults.build, 'the leaven is built as for Original Tartine');
  assert.equal(r.autolyse, NOTE);
  assert.equal(recipe('tartine').autolyse, undefined, 'Original Tartine keeps the Basic Country autolyse note');
  assert.match(r.description, /whole-wheat/);
  assert.match(r.description, /15%/);
  // The removed White & Whole Wheat had the id `white-wheat`; it stays gone and is not this recipe.
  assert.equal(recipeById('white-wheat'), undefined);
});

test('the formula is the book’s table: 700 g whole wheat, 300 g all-purpose, 800 g water, 200 g leaven and 20 g salt', () => {
  const input = plan('whole-wheat'),
    r = formula(input.recipe, input.settings);
  assert.ok(r);
  assert.deepEqual([input.settings.count, input.settings.weight], [2, 1010]);
  approx(r.total, 2020);
  approx(r.flour, 1000);
  assert.deepEqual(
    r.flours.map((f) => [f.key, f.name]),
    [
      ['wheat', 'Whole-wheat flour'],
      ['ap', 'All-purpose flour'],
    ],
  );
  approx(r.flours[0].grams, 700);
  approx(r.flours[1].grams, 300);
  approx(r.water, 800);
  approx(r.used, 200);
  approx(r.salt, 20);
  // The leaven goes in with the salt, after the autolyse (decision 15).
  stage(r.initial, [
    ['Whole-wheat flour', 700],
    ['All-purpose flour', 300],
    ['Water', 750],
  ]);
  stage(r.final, [
    ['Leaven used', 200],
    ['Salt', 20],
    ['Water', 50],
  ]);
  approx(
    [...r.initial, ...r.final].reduce((a, [, g]) => a + g, 0),
    2020,
  );
  r.madeParts.forEach((g, i) => approx(g, [15, 100, 100, 200][i]));
  approx(r.made, 415);
  approx(r.reserve, 215);
  assert.equal(r.shortfall, 0);
  // The used leaven is half flour and half water: 1,100 g of flour and 900 g of water in all.
  approx(r.totalFlour, 1100);
  approx(r.totalWater, 900);
});

test('Original Tartine has the book’s schedule with a 2-hour autolyse ending as the leaven is ready, for either proof and oven capacity', () => {
  for (const { name, change, rows: expected } of TARTINE_PLANS) {
    const steps = schedule(plan('tartine', change));
    assert.deepEqual(rows(steps), expected, name);
    if (change.ovenCapacity === 2) {
      assert.deepEqual(notes(steps), pick(steps, TARTINE_NOTES), name);
      assert.deepEqual(readiness(steps), pick(steps, TARTINE_READINESS), name);
    }
  }
  // Spelled out once: the autolyse from 7:00 PM, the leaven in at 9:00 PM, and the loaves out 30 minutes sooner.
  const cold = schedule(plan('tartine'));
  assert.deepEqual(rows(cold).slice(0, 4), [
    ['leaven', '2026-10-21 09:00', 720, 'Make leaven'],
    ['autolyse', '2026-10-21 19:00', 120, 'Start autolyse'],
    ['mix', '2026-10-21 21:00', 0, 'Add leaven, salt and final water'],
    ['rest', '2026-10-21 21:00', 30, 'Begin warm bulk fermentation'],
  ]);
  assert.equal(local(cold.find((s) => s.id === 'done')!.at), '2026-10-22 14:20');
  assert.equal(
    local(schedule(plan('tartine', { proof: 'warm' })).find((s) => s.id === 'done')!.at),
    '2026-10-22 04:50',
  );
});

test('Tartine Whole Wheat keeps Original Tartine’s times and cues, with its own autolyse note', () => {
  for (const { name, change, rows: expected } of TARTINE_PLANS) {
    const steps = schedule(plan('whole-wheat', change));
    assert.deepEqual(rows(steps), expected, name);
    if (change.ovenCapacity === 2) {
      assert.deepEqual(notes(steps), { ...pick(steps, TARTINE_NOTES), autolyse: NOTE }, name);
      assert.deepEqual(readiness(steps), pick(steps, TARTINE_READINESS), name);
    }
  }
});

test('every Whole Wheat step is Original Tartine’s but the autolyse note, whatever the count, oven or proof', () => {
  for (const proof of ['cold', 'warm'] as const)
    for (const ovenCapacity of [1, 2, 3])
      for (const count of [1, 2, 3, 5])
        for (const [date, time] of [
          ['2026-10-21', '09:00'],
          // In America/Vancouver the clocks go back at 2:00 AM on November 1, 2026, during these plans' proofs.
          ['2026-10-31', '07:00'],
        ]) {
          const change = { proof, ovenCapacity, date, time },
            name = `${proof} ${ovenCapacity} at once, ${count} loaves, ${date}`;
          const tartine = plan('tartine', change),
            wheat = plan('whole-wheat', change);
          tartine.settings.count = count;
          wheat.settings.count = count;
          const t = schedule(tartine),
            w = schedule(wheat),
            mixed = t.findIndex((s) => s.id === 'autolyse');
          assert.ok(mixed > 0, name);
          const expected = t.map((s, n) =>
            n === mixed
              ? {
                  ...s,
                  // More than 2 loaves are mixed in bowls of up to 2 loaves each (Michael, November 22, 2026).
                  note:
                    count > 2
                      ? `Split this mix between ${Math.ceil(count / 2)} bowls, with an equal share of everything in each. ${NOTE}`
                      : NOTE,
                }
              : s,
          );
          assert.deepEqual(w, expected, name);
        }
});

test('planning back from the last loaf out reproduces the forward Whole Wheat schedule', () => {
  // The plan ends when Original Tartine's does, so planning back from 2:20 PM starts the leaven at 9:00 AM.
  assert.deepEqual(
    schedule(plan('whole-wheat', { anchor: 'done', date: '2026-10-22', time: '14:20' })),
    schedule(plan('whole-wheat')),
  );
  for (const proof of ['cold', 'warm'] as const)
    for (const ovenCapacity of [1, 2]) {
      const forward = schedule(plan('whole-wheat', { proof, ovenCapacity })),
        finish = local(forward.find((s) => s.id === 'done')!.at);
      const back = schedule(
        plan('whole-wheat', { proof, ovenCapacity, anchor: 'done', date: finish.slice(0, 10), time: finish.slice(11) }),
      );
      assert.deepEqual(back, forward, `${proof} ${ovenCapacity}`);
      assert.equal(local(back[0].at), '2026-10-21 09:00', `${proof} ${ovenCapacity}`);
    }
});

test('the autolyse note gives the cooler water and both flours, and nothing of the white loaf’s', () => {
  const step = schedule(plan('whole-wheat')).find((s) => s.id === 'autolyse')!;
  assert.equal(step.title, 'Start autolyse');
  assert.equal(step.minutes, 120);
  assert.equal(step.note, NOTE);
  assert.match(step.note, /75°F \/ 24°C/);
  assert.match(step.note, /whole-wheat and all-purpose flour/);
  assert.doesNotMatch(step.note, /80°F|27°C|white|leaven used/i);
});
