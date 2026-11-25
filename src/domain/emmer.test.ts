import test from 'node:test';
import assert from 'node:assert/strict';
import { FLOUR_NAMES, RECIPES, recipeById, defaultSettings, type Recipe } from './recipes.ts';
import { formula, type Weighed } from './formula.ts';
import { schedule, type PlanInput, type Step } from './schedule.ts';
import { quietHourActions } from './quiet.ts';
import { clockText } from './text.ts';

/**
 * Tartine Emmer/Einkorn, from Tartine Book No. 3, page 72: 400 g medium-strong wheat flour, 300 g whole-grain emmer or
 * einkorn flour, 300 g high-extraction wheat flour, 70 g wheat germ, 850 g water, 150 g leaven and 25 g salt, made by
 * the book's master method, which is Tartine Bread's Basic Country Bread. Added at Michael's request on November 23,
 * 2026 (decision 24). Plans start the leaven at 9:00 AM on October 21, 2026, in the local zone.
 */

const NOTE =
  'Disperse the leaven used in the initial water, about 80°F / 27°C. Add the flours and the wheat germ; mix until no dry flour remains. Cover and rest; the book gives 25 to 40 minutes.';
const BRAN = 'For a bran crust, roll the round in coarse bran before it goes into the basket, bran side down.';

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

test('Tartine Emmer/Einkorn is on the menu after Country Rye, made the Tartine way with three flours, wheat germ and an 18-hour fridge', () => {
  assert.deepEqual(
    RECIPES.map((r) => r.id),
    ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer', 'oat-porridge'],
  );
  const r = recipe('emmer');
  assert.deepEqual(
    [r.name, r.method, r.flours, r.late, r.buildFlour, r.addIns, r.autolyse],
    ['Tartine Emmer/Einkorn', 'tartine', ['white', 'emmer', 'highext'], [], 'white', undefined, undefined],
  );
  assert.deepEqual([FLOUR_NAMES.emmer, FLOUR_NAMES.highext], ['Emmer or einkorn flour', 'High-extraction wheat flour']);
  assert.deepEqual(r.initialMix, { note: NOTE });
  assert.deepEqual(r.extras, [{ name: 'Wheat germ', percent: 7 }]);
  assert.equal(r.finalShape, BRAN);
  assert.deepEqual([r.coldProof, r.maxAutolyse], [1080, 40], 'Tartine Country Bread’s fridge and rest');
  // The description names what to buy and when to start (decision 28).
  assert.match(r.description, /^You'll need emmer or einkorn flour, high-extraction wheat flour and wheat germ\./);
  assert.match(r.description, /bakes two mornings later/);
  assert.deepEqual(defaultSettings(r), {
    count: 2,
    loafFlour: 500,
    hydration: 85,
    leaven: 15,
    salt: 2.5,
    held: 5,
    flours: { white: 40, emmer: 30, highext: 30 },
    build: { starter: 15, flour: 100, wheat: 100, water: 200 },
    autolyse: 30,
  });
});

test('its weights are the book’s table: 400, 300 and 300 g of flour, 70 g wheat germ, 850 g water, 150 g leaven, 25 g salt', () => {
  const f = formula(recipe('emmer'), defaultSettings(recipe('emmer')))!;
  near(f.total, 2095, 'two loaves');
  near(f.flour, 1000, 'flour');
  near(f.water, 850, 'water');
  near(f.used, 150, 'leaven');
  near(f.salt, 25, 'salt');
  stage(f.extras, [['Wheat germ', 70]], 'extras');
  stage(
    f.initial,
    [
      ['Leaven used', 150],
      ['White-bread flour', 400],
      ['Emmer or einkorn flour', 300],
      ['High-extraction wheat flour', 300],
      ['Wheat germ', 70],
      ['Water', 800],
    ],
    'initial mix',
  );
  stage(
    f.final,
    [
      ['Salt', 25],
      ['Water', 50],
    ],
    'salt and final water',
  );
  // The wheat germ isn't flour, so the total hydration counts only the water in the dough and the leaven.
  near(f.totalHydration, (925 / 1075) * 100, 'total hydration');
  near(f.made, 415, 'leaven made');
  near(f.reserve, 265, 'leaven kept');
  // The wheat germ scales with the flour: three loaves of 400 g flour.
  const three = formula(recipe('emmer'), { ...defaultSettings(recipe('emmer')), count: 3, loafFlour: 400 })!;
  near(three.flour, 1200, 'flour for three loaves');
  near(three.extras[0][1], 84, 'wheat germ for three loaves');
  near(three.total, 1200 * 2.095, 'dough for three loaves');
  near(
    three.initial.concat(three.final).reduce((a, [, g]) => a + g, 0),
    three.total,
    'every gram is in a mixing stage',
  );
});

test('its schedule is Tartine Country Bread’s, step for step, with its own initial-mix note, the bran at the final shape and its salt', () => {
  const view = (s: Step[]) => s.map((x) => [x.id, x.title, +x.at, x.minutes, x.kind, x.readiness]);
  for (const proof of ['cold', 'warm'] as const)
    for (const ovenCapacity of [1, 2, 3])
      for (const anchor of ['leaven', 'done'] as const) {
        const change = { proof, ovenCapacity, anchor, ...(anchor === 'done' && { date: '2026-10-23', time: '08:00' }) },
          name = `${proof}, ${ovenCapacity} at once, from the ${anchor}`;
        const emmer = schedule(plan('emmer', change)),
          country = schedule(plan('tartine', change));
        assert.deepEqual(view(emmer), view(country), name);
        const notes = (s: Step[]) => Object.fromEntries(s.map((x) => [x.id, x.note]));
        assert.deepEqual(
          notes(emmer),
          {
            ...notes(country),
            // The same build, but 15% leaven rather than 20%.
            leaven: notes(country).leaven.replace(
              'You use 200 g in the dough and keep 215 g.',
              'You use 150 g in the dough and keep 265 g.',
            ),
            autolyse: NOTE,
            fold: `${notes(country).fold} ${BRAN}`,
          },
          name,
        );
        const added = emmer.find((x) => x.id === 'mix')!.additions!;
        assert.deepEqual(
          added.map((a) => [a.id, a.name]),
          [
            ['mix:salt', 'Salt'],
            ['mix:water', 'Water'],
          ],
          name,
        );
        near(added[0].grams, 25, `${name}: salt`);
        near(added[1].grams, 50, `${name}: water`);
      }
  // Other loaf counts give the same steps and times; their notes scale with the batch.
  for (const count of [1, 3, 5])
    for (const proof of ['cold', 'warm'] as const) {
      const e = plan('emmer', { proof }),
        c = plan('tartine', { proof });
      e.settings = { ...e.settings, count };
      c.settings = { ...c.settings, count };
      assert.deepEqual(view(schedule(e)), view(schedule(c)), `${count} loaves, ${proof}`);
    }
  const cold = schedule(plan('emmer'));
  assert.equal(cold.find((x) => x.id === 'fridge')!.note, 'Cover the baskets and refrigerate for about 18 hours.');
  assert.equal(clockText(cold.find((x) => x.id === 'done')!.at), '20:50');
});

test('a leaven from 9:00 to 10:30 PM keeps every step out of quiet hours with a cold proof, and from 7:00 PM with a warm one', () => {
  const free = (proof: 'cold' | 'warm') => {
    const times: string[] = [];
    for (let m = 0; m < 1440; m += 15) {
      const time = clockText(new Date(2026, 9, 21, 0, m));
      if (!quietHourActions(schedule(plan('emmer', { proof, time }))).length) times.push(time);
    }
    return times;
  };
  assert.deepEqual(free('cold'), ['21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30']);
  assert.equal(free('warm')[0], '19:00');
  assert.equal(free('warm').at(-1), '22:30');
  assert.equal(free('warm').length, 15, 'every quarter hour from 7:00 to 10:30 PM');
});
