import test from 'node:test';
import assert from 'node:assert/strict';
import { recipeById, defaultSettings, type Settings } from './recipes.ts';
import { formula, type Formula, type Weighed } from './formula.ts';
import { round } from './text.ts';

/** A recipe's formula at its defaults, changed as given. */
function weigh(id: string, change: (s: Settings) => void = () => {}): Formula | null {
  const recipe = recipeById(id)!,
    s = defaultSettings(recipe);
  change(s);
  return formula(recipe, s);
}
/**
 * Equal up to floating-point noise. The old core rounded these to whole grams; the new one keeps exact shares, so a
 * weight of 944 g can come out as 943.9999999999999.
 */
function near(actual: number, expected: number, message = '') {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message} ${actual} is not ${expected}`.trim());
}
function nearAll(actual: number[], expected: number[], message = '') {
  assert.equal(actual.length, expected.length, `${message} length`);
  actual.forEach((n, i) => near(n, expected[i], `${message} [${i}]`));
}
/** A mixing stage, by name and weight in order. */
function stage(actual: Weighed[], expected: Weighed[], message = '') {
  assert.deepEqual(
    actual.map(([name]) => name),
    expected.map(([name]) => name),
    message,
  );
  nearAll(
    actual.map(([, n]) => n),
    expected.map(([, n]) => n),
    message,
  );
}
const grams = (r: Formula, key: string) => r.flours.find((f) => f.key === key)!.grams;

test('Red Spring & Rye is the spreadsheet main calculator: 944 g flour, 724 g water, 22 g salt and all of a 312 g build', () => {
  const r = weigh('red-rye')!;
  // The dough with the leaven's flour and water counted, the starter half each: 946 g red spring and rye, 154 g whole
  // wheat, 880 g water and 22 g salt.
  near(grams(r, 'red') + grams(r, 'rye') + r.madeParts[1] + r.madeParts[0] / 2, 946);
  near(grams(r, 'wheat') + r.madeParts[2], 154);
  near(r.totalFlour, 946 + 154);
  near(r.totalWater, 880);
  near(r.salt, 22);
  // The leaven build, all of it used.
  nearAll(r.madeParts, [28, 71, 71, 142]);
  near(r.made, 312);
  near(r.used, 312);
  // The dough without the leaven: 861 g red spring and rye, 83 g whole wheat, 724 g water, 22 g salt, 312 g leaven.
  near(grams(r, 'red') + grams(r, 'rye'), 861);
  near(grams(r, 'wheat'), 83);
  near(r.water, 724);
  near(r.flour + r.water + r.salt + r.used, 2002);
  stage(r.initial, [
    ['Red spring flour', 758],
    ['Whole-wheat flour', 83],
    ['Water', 652],
  ]);
  stage(r.final, [
    ['Rye flour', 103],
    ['Leaven used', 312],
    ['Salt', 22],
    ['Water', 72],
  ]);
  near(r.total, 2002);
  near(r.flour, 944);
  // The water is the autolyse's and the final mix's together.
  near(r.initial.at(-1)![1] + r.final.at(-1)![1], 724);
});

test('White & Whole Wheat and the two blends keep their flour, water and dough weights', () => {
  const white = weigh('white-wheat')!;
  assert.deepEqual([white.flour, white.water, white.total, white.hydration], [1000, 800, 2020, 80]);
  const five = weigh('five-flour')!;
  assert.deepEqual([five.flour, five.water, five.hydration], [1000, 800, 80]);
  const four = weigh('four-flour')!;
  assert.deepEqual([four.flour, four.water, four.hydration], [1500, 1200, 80]);
});

test('every Red Spring & Rye setting changes the computed weights', () => {
  const weights = (r: Formula | null) => [r?.flours.map((f) => f.grams), r?.initial, r?.final, r?.madeParts];
  const before = weights(weigh('red-rye'));
  const changes: [string, (s: Settings) => void][] = [
    ['loaf weight', (s) => (s.weight += 200)],
    ['loaf count', (s) => (s.count += 5)],
    ['red spring flour', (s) => (s.flours.red = (s.flours.red ?? 0) + 5)],
    ['whole wheat', (s) => (s.flours.wheat = (s.flours.wheat ?? 0) + 5)],
    ['rye', (s) => (s.flours.rye = (s.flours.rye ?? 0) + 5)],
    ['hydration', (s) => (s.hydration += 5)],
    ['salt', (s) => (s.salt += 5)],
    ['leaven used', (s) => (s.leaven += 5)],
    ['water held back', (s) => (s.reserve += 5)],
    ['build starter', (s) => (s.build.starter += 5)],
    ['build flour', (s) => (s.build.flour += 5)],
    ['build whole wheat', (s) => (s.build.wheat += 5)],
    ['build water', (s) => (s.build.water += 5)],
  ];
  for (const [name, change] of changes) assert.notDeepEqual(weights(weigh('red-rye', change)), before, name);
});

test('a recipe with no flour has no weights, so no hydration', () => {
  assert.equal(
    weigh('white-wheat', (s) => (s.flours = { white: 0, wheat: 0 })),
    null,
  );
  assert.equal(
    weigh('red-rye', (s) => {
      s.flours = { red: 0, wheat: 0, rye: 0 };
      s.hydration = 0;
      s.salt = 0;
    }),
    null,
  );
});

test('uses spreadsheet rounding, including negative half values', () => {
  assert.equal(round(-1.5), -2);
  assert.equal(round(1.5), 2);
  assert.equal(round(1.25, 1), 1.3);
  assert.equal(round(2000 / 182, 1), 11);
});

test('Original Tartine matches the book: its dough quantities, leaven build and hydration', () => {
  const r = weigh('tartine')!;
  assert.equal(grams(r, 'white'), 900);
  assert.equal(grams(r, 'wheat'), 100);
  stage(r.initial, [
    ['Leaven used', 200],
    ['White-bread flour', 900],
    ['Whole-wheat flour', 100],
    ['Water', 700],
  ]);
  stage(r.final, [
    ['Salt', 20],
    ['Water', 50],
  ]);
  assert.equal(r.salt, 20);
  assert.equal(r.used, 200);
  assert.equal(r.total, 1970);
  assert.deepEqual(r.madeParts, [15, 100, 100, 200]);
  assert.equal(r.made, 415);
  assert.equal(r.reserve, 215);
  assert.equal(r.shortfall, 0);
  assert.equal(r.hydration, 75);
  assert.ok(Math.abs(r.totalHydration - 77.272727) < 0.00001);
});

test('Tartine scales its yield exactly, without rounding, and keeps the reserved leaven out of the dough', () => {
  const r = weigh('tartine', (s) => (s.count = 3))!;
  near(r.total, 2955);
  near(grams(r, 'white'), 1350);
  near(grams(r, 'wheat'), 150);
  near(r.used, 300);
  near(r.made, 622.5);
  near(r.reserve, 322.5);
  const heavier = weigh('tartine', (s) => {
    s.count = 2;
    s.weight = 1000;
  })!;
  assert.equal(heavier.total, 2000);
});

test('an empty Tartine build is short by all the leaven used, never a negative reserve', () => {
  const r = weigh('tartine', (s) => (s.build = { starter: 0, flour: 0, wheat: 0, water: 0 }))!;
  assert.equal(r.made, 0);
  assert.equal(r.reserve, 0);
  assert.equal(r.shortfall, 200);
});

test('a bigger Tartine build changes what is made and kept, not the leaven in the dough', () => {
  // The book's build at 150%, with 20 g of starter.
  const r = weigh('tartine', (s) => (s.build = { starter: 20, flour: 150, wheat: 150, water: 300 }))!;
  assert.equal(r.made, 620);
  assert.equal(r.used, 200);
  assert.equal(r.reserve, 420);
  assert.equal(r.total, 1970);
});

test('Preuss House exactly matches the supplied stages and totals', () => {
  const r = weigh('house')!;
  stage(r.initial, [
    ["Anita's all-purpose flour", 800],
    ['Whole-wheat flour', 100],
    ['Water', 680],
  ]);
  stage(r.final, [
    ['Rye flour', 100],
    ['Leaven used', 200],
    ['Salt', 20],
    ['Water', 100],
  ]);
  assert.equal(r.total, 2000);
  assert.equal(r.flour, 1000);
  assert.equal(r.water, 780);
  assert.equal(r.hydration, 78);
  assert.deepEqual(r.madeParts, [28, 71, 71, 142]);
  assert.equal(r.made, 312);
  assert.equal(r.used, 200);
  assert.equal(r.reserve, 112);
});

test('House yield scales exactly', () => {
  const r = weigh('house', (s) => {
    s.count = 3;
    s.weight = 750;
  })!;
  assert.equal(r.total, 2250);
  stage(r.initial, [
    ["Anita's all-purpose flour", 900],
    ['Whole-wheat flour', 112.5],
    ['Water', 765],
  ]);
  stage(r.final, [
    ['Rye flour', 112.5],
    ['Leaven used', 225],
    ['Salt', 22.5],
    ['Water', 112.5],
  ]);
  near(r.made, 351);
  near(r.reserve, 126);
});

test('House leaven made and used stay separate, including shortfalls', () => {
  const a = weigh('house', (s) => (s.build.water = 200))!;
  assert.equal(a.made, 370);
  assert.equal(a.used, 200);
  assert.equal(a.reserve, 170);
  assert.equal(a.total, 2000);
  const b = weigh('house', (s) => (s.build = { starter: 0, flour: 0, wheat: 0, water: 0 }))!;
  assert.equal(b.made, 0);
  assert.equal(b.reserve, 0);
  assert.equal(b.shortfall, 200);
  assert.equal(b.used, 200);
});
