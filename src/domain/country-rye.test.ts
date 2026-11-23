import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, recipeById, defaultSettings, type Recipe } from './recipes.ts';
import { formula, type Weighed } from './formula.ts';
import { schedule, type PlanInput } from './schedule.ts';

/**
 * Tartine Country Rye, from Tartine Bread, page 118: the Basic Country Bread made with 170 g medium-fine whole-rye flour
 * and 830 g white bread flour, and 800 g water at about 75°F. Added at Michael's request on November 22, 2026. The book
 * rests it 40 to 60 minutes after the initial mix; since decision 13 it has the 2-hour autolyse alongside the leaven
 * that every Tartine recipe has. Plans start the leaven at 9:00 AM on October 21, 2026, in the local zone.
 */

const NOTE =
  'Mix the rye and white-bread flour with the initial water, about 75°F / 24°C, by hand until no dry flour is left. Cover and rest until the leaven is ready.';

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

test('Tartine Country Rye is last on the menu, made the Tartine way with rye and white-bread flour', () => {
  assert.deepEqual(
    RECIPES.map((r) => r.id),
    ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye'],
  );
  const r = recipe('country-rye');
  assert.deepEqual(
    [r.name, r.method, r.flours, r.late, r.buildFlour, r.addIns],
    ['Tartine Country Rye', 'tartine', ['rye', 'white'], [], 'white', undefined],
  );
  assert.equal(r.autolyse, NOTE);
  assert.deepEqual(defaultSettings(r), {
    count: 2,
    weight: 1010,
    hydration: 80,
    leaven: 20,
    salt: 2,
    reserve: (50 / 800) * 100,
    flours: { rye: 17, white: 83 },
    build: { starter: 15, flour: 100, wheat: 100, water: 200 },
  });
});

test('its weights are the book’s table: 170 g rye, 830 g bread flour, 800 g water, 200 g leaven and 20 g salt', () => {
  const f = formula(recipe('country-rye'), defaultSettings(recipe('country-rye')))!;
  stage(
    f.initial,
    [
      ['Rye flour', 170],
      ['White-bread flour', 830],
      ['Water', 750],
    ],
    'autolyse',
  );
  stage(
    f.final,
    [
      ['Leaven used', 200],
      ['Salt', 20],
      ['Water', 50],
    ],
    'leaven, salt and remaining water',
  );
  near(f.total, 2020, 'dough');
  near(f.made, 415, 'leaven made');
  near(f.reserve, 215, 'leaven kept');
});

test('its schedule is Tartine Whole Wheat’s, with its own autolyse note', () => {
  for (const proof of ['cold', 'warm'] as const)
    for (const anchor of ['leaven', 'done'] as const) {
      const change = anchor === 'done' ? { anchor, date: '2026-10-22', time: '14:20' } : { anchor };
      const rye = schedule(plan('country-rye', { proof, ...change })),
        wheat = schedule(plan('whole-wheat', { proof, ...change }));
      assert.deepEqual(
        rye.map((s) => [s.id, s.title, +s.at, s.minutes]),
        wheat.map((s) => [s.id, s.title, +s.at, s.minutes]),
        `${proof} ${anchor}`,
      );
      const autolyse = rye.find((s) => s.id === 'autolyse')!;
      assert.equal(autolyse.note, NOTE);
      assert.equal(+rye.find((s) => s.id === 'mix')!.at - +autolyse.at, 120 * 60000, 'a 2-hour autolyse');
      assert.equal(+rye.find((s) => s.id === 'mix')!.at, +rye.find((s) => s.id === 'leaven')!.at + 720 * 60000);
    }
});
