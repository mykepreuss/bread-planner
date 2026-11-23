import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, recipeById, defaultSettings, type Recipe } from './recipes.ts';
import { formula, type Weighed } from './formula.ts';
import { schedule, type PlanInput } from './schedule.ts';

/**
 * Tartine Country Rye, from Tartine Bread, page 118: the Basic Country Bread made with 170 g medium-fine whole-rye flour
 * and 830 g white bread flour, 800 g water at about 75°F, and a 40- to 60-minute rest after the initial mix. Added at
 * Michael's request on November 22, 2026. Plans start the leaven at 9:00 AM on October 21, 2026, in the local zone.
 */

const NOTE =
  'Stir the leaven used into the initial water, about 75°F / 24°C, until it disperses. Add the rye and white-bread flour and mix by hand until no dry flour is left. Cover and rest; the book gives 40 to 60 minutes.';

const near = (a: number, b: number, message: string) => assert.ok(Math.abs(a - b) < 1e-9, `${message}: ${a} != ${b}`);
function recipe(id: string): Recipe {
  const r = recipeById(id);
  assert.ok(r, `no recipe ${id}`);
  return r;
}
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
function stage(rows: Weighed[], expected: [string, number][], message: string) {
  assert.deepEqual(
    rows.map(([name]) => name),
    expected.map(([name]) => name),
    message,
  );
  rows.forEach(([name, g], i) => near(g, expected[i][1], `${message} ${name}`));
}

test('Tartine Country Rye is on the menu after Whole Wheat, made the Tartine way with rye and white-bread flour', () => {
  assert.deepEqual(
    RECIPES.map((r) => r.id),
    ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer', 'oat-porridge'],
  );
  const r = recipe('country-rye');
  assert.deepEqual(
    [r.name, r.method, r.flours, r.late, r.buildFlour, r.addIns],
    ['Tartine Country Rye', 'tartine', ['rye', 'white'], [], 'white', undefined],
  );
  assert.deepEqual(r.initialMix, { note: NOTE });
  assert.deepEqual(
    [r.coldProof, r.autolyse],
    [1050, undefined],
    'a 17½-hour fridge, and the book’s rest, not an autolyse',
  );
  assert.match(r.description, /17½ hours in the fridge/);
  assert.deepEqual(defaultSettings(r), {
    count: 2,
    weight: 1010,
    hydration: 80,
    leaven: 20,
    salt: 2,
    reserve: (50 / 800) * 100,
    flours: { rye: 17, white: 83 },
    build: { starter: 15, flour: 100, wheat: 100, water: 200 },
    autolyse: 50,
  });
});

test('its weights are the book’s table: 170 g rye, 830 g bread flour, 800 g water, 200 g leaven and 20 g salt', () => {
  const f = formula(recipe('country-rye'), defaultSettings(recipe('country-rye')))!;
  stage(
    f.initial,
    [
      ['Leaven used', 200],
      ['Rye flour', 170],
      ['White-bread flour', 830],
      ['Water', 750],
    ],
    'initial mix',
  );
  stage(
    f.final,
    [
      ['Salt', 20],
      ['Water', 50],
    ],
    'salt and remaining water',
  );
  near(f.total, 2020, 'dough');
  near(f.made, 415, 'leaven made');
  near(f.reserve, 215, 'leaven kept');
});

test('its schedule is Tartine Country Bread’s with a 50-minute rest and a 17½-hour fridge: steps after the mix 20 minutes later, and after the fridge 10 minutes sooner', () => {
  // Tartine Whole Wheat had the 50-minute rest too until decision 19 gave it an autolyse; decision 20 gave Country Rye
  // its 17½-hour fridge, and decision 21 gave Tartine Country Bread an 18-hour one.
  for (const proof of ['cold', 'warm'] as const)
    for (const anchor of ['leaven', 'done'] as const) {
      const change =
        anchor === 'done' ? { anchor, date: '2026-10-22', time: proof === 'cold' ? '20:40' : '05:40' } : { anchor };
      const rye = schedule(plan('country-rye', { proof, ...change }));
      const tartine = schedule(
        plan('tartine', {
          proof,
          ...(anchor === 'done'
            ? { anchor, date: '2026-10-22', time: proof === 'cold' ? '20:50' : '05:20' }
            : { anchor }),
        }),
      );
      const mixed = tartine.findIndex((s) => s.id === 'autolyse'),
        fridge = tartine.findIndex((s) => s.id === 'fridge');
      const later = (n: number) => (n <= mixed ? 0 : fridge >= 0 && n > fridge ? 20 - 30 : 20);
      assert.deepEqual(
        rye.map((s) => [s.id, s.title, +s.at, s.minutes]),
        tartine.map((s, n) => [
          s.id,
          s.title,
          +s.at + later(n) * 60000,
          n === mixed ? 50 : s.id === 'fridge' ? 1050 : s.minutes,
        ]),
        `${proof} ${anchor}`,
      );
      if (proof === 'cold')
        assert.equal(
          rye.find((s) => s.id === 'fridge')!.note,
          'Cover the baskets and refrigerate for about 17½ hours.',
        );
      const mix = rye.find((s) => s.id === 'autolyse')!;
      assert.equal(mix.note, NOTE);
      assert.equal(+rye.find((s) => s.id === 'mix')!.at - +mix.at, 50 * 60000, 'a 50-minute rest');
      assert.equal(rye.find((s) => s.id === 'leaven')!.at.getHours(), 9, `${proof} ${anchor}: the leaven at 9:00 AM`);
    }
});
