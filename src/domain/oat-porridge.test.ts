import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, recipeById, defaultSettings, type Recipe } from './recipes.ts';
import { formula, type Weighed } from './formula.ts';
import { addInLines } from './addins.ts';
import { schedule, type PlanInput, type Step } from './schedule.ts';
import { quietHourActions } from './quiet.ts';
import { clockText } from './text.ts';

/**
 * Tartine Oat Porridge, from Tartine Book No. 3, page 178: 500 g high-extraction wheat flour, 500 g medium-strong wheat
 * flour, 70 g wheat germ, 750 g water, 150 g leaven and 25 g salt, made by the book's master method (Tartine Bread's
 * Basic Country Bread, decision 24), with 500 g of cooked, cooled oat porridge and, if wanted, 200 g toasted almonds
 * and 50 g almond oil worked in after the first two series of turns, about an hour into bulk. The porridge is page 168's:
 * 2 parts water to 1 part rolled oats, cooked until creamy, about 15 minutes, and spread thin to cool. Added at
 * Michael's request on November 23, 2026 (decision 27). Plans start the leaven at 9:00 AM on October 21, 2026, in the
 * local zone.
 */

const NOTE =
  'Disperse the leaven used in the initial water, about 80°F / 27°C. Add the flours and the wheat germ; mix until no dry flour remains. Cover and rest; the book gives 25 to 40 minutes.';
const OATS =
  'For an oat crust, roll the round in rolled oats pulsed coarse in a food processor before it goes into the basket, oat side down.';
const ADD_NOTE =
  'Add the cooled porridge and, if you are using them, the almonds and almond oil. Work them in gently by hand, folding and pinching, until they are evenly spread through the dough. Then carry on with bulk as planned.';
/** The porridge step's note for this much oats, water and almonds. */
const cookNote = (oats: string, water: string, almonds: string) =>
  `In a saucepan over medium heat, stir ${oats} rolled oats into ${water} water. Cook, stirring now and then, until the oats soften and turn creamy, about 15 minutes, and season with a pinch of salt. Spread the porridge thinly on a baking sheet to cool to room temperature; it goes into the dough after Turn 2. If you are adding almonds, toast ${almonds} until fragrant and chop them coarsely. Porridge made up to a week ahead and kept covered in the fridge works too: take it out now to warm up.`;

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
const find = (steps: Step[], id: string) => {
  const step = steps.find((s) => s.id === id);
  assert.ok(step, `no step ${id}`);
  return step;
};

test('Tartine Oat Porridge is last on the menu, made the Tartine way with two flours, wheat germ, porridge and an 18-hour fridge', () => {
  assert.deepEqual(
    RECIPES.map((r) => r.id),
    ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer', 'oat-porridge'],
  );
  const r = recipe('oat-porridge');
  assert.deepEqual(
    [r.name, r.method, r.flours, r.late, r.buildFlour, r.autolyse],
    ['Tartine Oat Porridge', 'tartine', ['highext', 'white'], [], 'white', undefined],
  );
  assert.deepEqual(r.initialMix, { note: NOTE });
  assert.deepEqual(r.extras, [{ name: 'Wheat germ', percent: 7 }]);
  assert.equal(r.finalShape, OATS);
  assert.deepEqual([r.coldProof, r.maxAutolyse], [1080, 40], 'Tartine Country Bread’s fridge and rest');
  assert.equal(r.addIns?.title, 'Add the oat porridge');
  assert.equal(r.addIns?.afterTurn, 2, 'after the first two series of turns');
  assert.deepEqual(
    [r.addIns?.prep?.title, r.addIns?.prep?.minutesBefore],
    ['Cook the oat porridge', 120],
    'cooked two hours before it goes in',
  );
  assert.match(r.description, /Tartine Book No\. 3/);
  assert.match(r.description, /18 hours in the fridge/);
  assert.match(r.description, /almonds/);
  assert.deepEqual(defaultSettings(r), {
    count: 2,
    // The book's two loaves of 2,745 g, porridge, almonds and oil included.
    weight: 1372.5,
    hydration: 75,
    leaven: 15,
    salt: 2.5,
    reserve: (50 / 750) * 100,
    flours: { highext: 50, white: 50 },
    build: { starter: 15, flour: 100, wheat: 100, water: 200 },
    autolyse: 30,
  });
});

test('its weights are the book’s table: 500 and 500 g of flour, 70 g wheat germ, 750 g water, 150 g leaven, 25 g salt, 500 g porridge, 200 g almonds, 50 g oil', () => {
  const r = recipe('oat-porridge'),
    f = formula(r, defaultSettings(r))!;
  near(f.total, 2745, 'two loaves');
  near(f.flour, 1000, 'flour');
  near(f.water, 750, 'water');
  near(f.used, 150, 'leaven');
  near(f.salt, 25, 'salt');
  stage(f.extras, [['Wheat germ', 70]], 'extras');
  stage(
    f.addIns,
    [
      ['Oat porridge', 500],
      ['Almonds', 200],
      ['Almond oil', 50],
    ],
    'add-ins',
  );
  stage(
    f.initial,
    [
      ['Leaven used', 150],
      ['High-extraction wheat flour', 500],
      ['White-bread flour', 500],
      ['Wheat germ', 70],
      ['Water', 700],
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
  // The porridge's water is not counted: the book's 75% is the dough's before the porridge goes in.
  near(f.totalHydration, (825 / 1075) * 100, 'total hydration');
  near(f.made, 415, 'leaven made');
  near(f.reserve, 265, 'leaven kept');
  // Everything scales with the flour: three loaves of 1,000 g.
  const three = formula(r, { ...defaultSettings(r), count: 3, weight: 1000 })!;
  near(three.flour, 3000 / 2.745, 'flour for three loaves');
  near(three.addIns[0][1], three.flour / 2, 'porridge for three loaves');
  near(
    [...three.initial, ...three.final, ...three.addIns].reduce((a, [, g]) => a + g, 0),
    3000,
    'every gram is in a mixing stage or the add-ins',
  );
  // Recipes whose add-ins are in cups keep them out of the dough's weight.
  assert.deepEqual(formula(recipe('olive'), defaultSettings(recipe('olive')))!.addIns, []);
});

test('the add-ins read in grams, scaled to the batch', () => {
  const r = recipe('oat-porridge'),
    lines = (count: number) => {
      const s = { ...defaultSettings(r), count };
      return addInLines(r.addIns!, s, r.defaults, formula(r, s)!.flour);
    };
  assert.deepEqual(lines(2), [
    '500 g cooked oat porridge, cooled',
    '200 g almonds, toasted and coarsely chopped (optional)',
    '50 g almond oil (optional)',
  ]);
  assert.deepEqual(lines(1), [
    '250 g cooked oat porridge, cooled',
    '100 g almonds, toasted and coarsely chopped (optional)',
    '25 g almond oil (optional)',
  ]);
});

test('its schedule is Tartine Country Bread’s, with the porridge cooked two hours before Turn 2 and worked in after it', () => {
  const view = (s: Step[]) =>
    s.filter((x) => x.id !== 'toast' && x.id !== 'addins').map((x) => [x.id, x.title, +x.at, x.minutes, x.kind]);
  for (const proof of ['cold', 'warm'] as const)
    for (const ovenCapacity of [1, 2, 3])
      for (const anchor of ['leaven', 'done'] as const) {
        const change = { proof, ovenCapacity, anchor, ...(anchor === 'done' && { date: '2026-10-23', time: '08:00' }) },
          name = `${proof}, ${ovenCapacity} at once, from the ${anchor}`;
        const oat = schedule(plan('oat-porridge', change)),
          country = schedule(plan('tartine', change));
        assert.deepEqual(view(oat), view(country), name);
        const notes = (s: Step[]) => Object.fromEntries(s.map((x) => [x.id, x.note]));
        const { toast, addins, ...rest } = notes(oat);
        assert.deepEqual(
          rest,
          {
            ...notes(country),
            leaven: notes(country).leaven.replace(
              'You use 200 g in the dough and keep 215 g.',
              'You use 150 g in the dough and keep 265 g.',
            ),
            autolyse: NOTE,
            fold: `${notes(country).fold} ${OATS}`,
          },
          name,
        );
        assert.equal(toast, cookNote('250 g', '500 g', '200 g almonds'), name);
        assert.equal(addins, ADD_NOTE, name);
        // The porridge step comes right before the initial mix, and the add-ins right after Turn 2.
        const ids = oat.map((x) => x.id);
        assert.equal(ids[ids.indexOf('autolyse') - 1], 'toast', name);
        assert.equal(ids[ids.indexOf('turn2') + 1], 'addins', name);
        const turn2 = find(oat, 'turn2'),
          cook = find(oat, 'toast'),
          add = find(oat, 'addins');
        assert.equal(+add.at, +turn2.at, name);
        assert.equal(+turn2.at - +cook.at, 120 * 60000, name);
        assert.equal(cook.minutes, 30, `${name}: until the initial mix`);
        assert.deepEqual(
          [cook.kind, cook.handsOn, cook.movesPlan, add.kind, add.minutes, add.bulk, add.movesPlan],
          ['prep', true, false, 'addin', 0, true, false],
          name,
        );
        assert.deepEqual(
          add.additions!.map((a) => [a.id, a.name, Math.round(a.grams * 1e9) / 1e9]),
          [
            ['addins:oat-porridge', 'Oat porridge', 500],
            ['addins:almonds', 'Almonds', 200],
            ['addins:almond-oil', 'Almond oil', 50],
          ],
          name,
        );
      }
  const cold = schedule(plan('oat-porridge'));
  assert.deepEqual(
    [clockText(find(cold, 'toast').at), clockText(find(cold, 'autolyse').at), clockText(find(cold, 'addins').at)],
    ['20:30', '21:00', '22:30'],
  );
  assert.equal(find(cold, 'fridge').note, 'Cover the baskets and refrigerate for about 18 hours.');
  assert.equal(clockText(find(cold, 'done').at), '20:50');
  // One loaf: half the porridge, and half the oats and water to cook it.
  const one = plan('oat-porridge');
  one.settings = { ...one.settings, count: 1 };
  const steps = schedule(one);
  assert.equal(find(steps, 'toast').note, cookNote('125 g', '250 g', '100 g almonds'));
  assert.deepEqual(
    find(steps, 'addins').additions!.map((a) => Math.round(a.grams)),
    [250, 100, 25],
  );
});

test('a leaven from 9:00 to 10:30 PM keeps every step out of quiet hours with a cold proof, and from 7:30 PM with a warm one', () => {
  const free = (proof: 'cold' | 'warm') => {
    const times: string[] = [];
    for (let m = 0; m < 1440; m += 15) {
      const time = clockText(new Date(2026, 9, 21, 0, m));
      if (!quietHourActions(schedule(plan('oat-porridge', { proof, time }))).length) times.push(time);
    }
    return times;
  };
  assert.deepEqual(free('cold'), ['21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30']);
  // A 7:00 PM leaven would have the porridge on the stove at 6:30 AM.
  assert.equal(free('warm')[0], '19:30');
  assert.equal(free('warm').at(-1), '22:30');
  assert.equal(free('warm').length, 13, 'every quarter hour from 7:30 to 10:30 PM');
});
