import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, FLOUR_NAMES, recipeById, defaultSettings, type Recipe } from './recipes.ts';
import { formula, type Weighed } from './formula.ts';
import { schedule, type PlanInput, type Step } from './schedule.ts';
import { dateString } from './text.ts';

/**
 * Tartine Whole Wheat, from Tartine Bread, page 114: the Basic Country Bread made with 700 g whole wheat and 300 g
 * all-purpose flour and 800 g water at about 75°F. The book rests it 40 to 60 minutes with the leaven in; since
 * decision 19 the flour and water autolyse for 2 hours on their own as the leaven finishes, the leaven goes in with the
 * salt, and the loaves proof 18½ hours in the fridge. Plans start the leaven at 9:00 AM on October 21, 2026; every time
 * is built and read in the local zone, so these tests hold in any time zone. Tartine Country Bread (Original Tartine)
 * is checked against its plan as it was before this recipe was added, on the book's times, which Whole Wheat's plan
 * is measured from; since decision 21 its own fridge is 18 hours.
 */

const NOTE =
  'Mix the whole-wheat and all-purpose flour with the initial water, about 75°F / 24°C, by hand until no dry flour is left. Cover and rest while the leaven finishes, so the bran softens before the leaven goes in.';
const MIX =
  'Work in the leaven, salt and reserved water. Keep mixing if the dough separates; it should come together again.';
const FRIDGE = 'Cover the baskets and refrigerate for about 18½ hours.';
/** Minutes: the book's 30-minute rest is gone, and the fridge is 18½ hours rather than 12. */
const SOONER = 30,
  LONGER = 1110 - 720;

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

/** Original Tartine's steps up to the final shape, the same for either proof and oven capacity. */
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
/** Original Tartine's plan as it was before Tartine Whole Wheat, on the book's times, for each proof and oven capacity. */
const TARTINE_PLANS: { name: string; change: Partial<PlanInput>; rows: Row[] }[] = [
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
/** Original Tartine's notes and readiness cues with both loaves baked together, as they were. */
const REPEAT = 'Repeat the four-sided stretch and fold, with wet hands.';
const TARTINE_NOTES: Record<string, string> = {
  leaven:
    'Mix 15 g (about 1 tbsp) of mature starter with 200 g water, then add 100 g white-bread flour and 100 g whole-wheat flour. Cover at room temperature. You use 200 g in the dough and keep 215 g.',
  autolyse:
    'Disperse the leaven used in the initial water, about 80°F / 27°C. Add white and whole-wheat flour; mix until no dry flour remains. Cover and rest; the book gives 25 to 40 minutes.',
  mix: 'Work in the salt and reserved water. Keep mixing if the dough separates; it should come together again.',
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
 * Tartine Whole Wheat's plan from Original Tartine's: the autolyse is the leaven's last 2 hours; the leaven, salt and
 * water go in as it is ready, 30 minutes sooner than the book's salt; every step up to the fridge or warm proof comes
 * 30 minutes sooner; and with a cold proof, the 18½-hour fridge puts every later step 6 hours later.
 */
function wholeWheatRows(tartine: Row[]): Row[] {
  const i = tartine.findIndex(([id]) => id === 'autolyse'),
    f = tartine.findIndex(([id]) => id === 'fridge');
  return tartine.map(([id, at, minutes, title], n): Row =>
    n < i
      ? [id, at, minutes, title]
      : n === i
        ? [id, later(at, -120), 120, 'Start autolyse']
        : id === 'mix'
          ? [id, later(at, -SOONER), minutes, 'Add leaven, salt and final water']
          : id === 'fridge'
            ? [id, later(at, -SOONER), 1110, title]
            : [id, later(at, f >= 0 && n > f ? LONGER - SOONER : -SOONER), minutes, title],
  );
}

test('Tartine Whole Wheat is on the menu after Olive and Sesame, made the Tartine way', () => {
  assert.deepEqual(
    RECIPES.map((r) => [r.id, r.name, r.method]),
    [
      ['house', 'Preuss Country Bread', 'house'],
      ['tartine', 'Tartine Country Bread', 'tartine'],
      ['olive', 'Olive Bread', 'house'],
      ['sesame', 'Sesame Bread', 'house'],
      ['whole-wheat', 'Tartine Whole Wheat', 'tartine'],
      ['country-rye', 'Tartine Country Rye', 'tartine'],
      ['emmer', 'Tartine Emmer/Einkorn', 'tartine'],
      ['oat-porridge', 'Tartine Oat Porridge', 'tartine'],
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
    loafFlour: 500,
    hydration: 80,
    leaven: 20,
    salt: 2,
    // 50 g of the 800 g water is held back for the salt, as for the Basic Country Bread.
    held: 5,
    flours: { wheat: 70, ap: 30 },
    build: { starter: 15, flour: 100, wheat: 100, water: 200 },
    autolyse: 120,
  });
  assert.deepEqual(r.defaults.build, recipe('tartine').defaults.build, 'the leaven is built as for Original Tartine');
  assert.deepEqual([r.autolyse, r.coldProof, r.initialMix], [{ note: NOTE }, 1110, undefined]);
  const tartine = recipe('tartine');
  assert.deepEqual(
    [tartine.autolyse, tartine.coldProof, tartine.initialMix],
    [undefined, 1080, undefined],
    'Tartine Country Bread keeps the book’s initial mix, with an 18-hour fridge since decision 21',
  );
  // The description says what to plan for (decision 28): an evening start, and what to do if the dough runs lively.
  assert.match(r.description, /^Start the leaven in the evening\. With the cold proof, it bakes two mornings later\./);
  assert.match(r.description, /lower the leaven toward 15%/);
  // The removed White & Whole Wheat had the id `white-wheat`; it stays gone and is not this recipe.
  assert.equal(recipeById('white-wheat'), undefined);
});

test('the formula is the book’s table: 700 g whole wheat, 300 g all-purpose, 800 g water, 200 g leaven and 20 g salt', () => {
  const input = plan('whole-wheat'),
    r = formula(input.recipe, input.settings);
  assert.ok(r);
  assert.deepEqual([input.settings.count, input.settings.loafFlour], [2, 500]);
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
  // The leaven goes in with the salt, after the autolyse (decision 19).
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

/**
 * Tartine Country Bread's plan from the book's: since decision 21 the loaves proof 18 hours in the fridge rather than
 * 12, so with a cold proof every later step is 6 hours later. Nothing else moves.
 */
function countryRows(book: Row[]): Row[] {
  const f = book.findIndex(([id]) => id === 'fridge');
  return book.map(([id, at, minutes, title], n): Row =>
    f < 0 || n < f ? [id, at, minutes, title] : n === f ? [id, at, 1080, title] : [id, later(at, 360), minutes, title],
  );
}

test('Tartine Country Bread keeps exactly the schedule, notes and cues it had, but for its 18-hour fridge, for either proof and oven capacity', () => {
  for (const { name, change, rows: book } of TARTINE_PLANS) {
    const steps = schedule(plan('tartine', change));
    assert.deepEqual(rows(steps), countryRows(book), name);
    if (change.ovenCapacity === 2) {
      assert.deepEqual(
        notes(steps),
        {
          ...pick(steps, TARTINE_NOTES),
          ...(change.proof === 'cold' && { fridge: 'Cover the baskets and refrigerate for about 18 hours.' }),
        },
        name,
      );
      assert.deepEqual(readiness(steps), pick(steps, TARTINE_READINESS), name);
    }
  }
});

test('Tartine Whole Wheat follows Original Tartine, with a 2-hour autolyse before the leaven goes in and an 18½-hour fridge', () => {
  for (const { name, change, rows: tartine } of TARTINE_PLANS) {
    const steps = schedule(plan('whole-wheat', change)),
      expected = wholeWheatRows(tartine);
    assert.deepEqual(rows(steps), expected, name);
    const at = (id: string) => +steps.find((s) => s.id === id)!.at;
    assert.equal((at('mix') - at('autolyse')) / 60000, 120, `${name}: the autolyse ends as the leaven goes in`);
    assert.equal((at('mix') - at('leaven')) / 60000, 720, `${name}: the leaven goes in when it is ready`);
    if (change.ovenCapacity === 2) {
      assert.deepEqual(
        notes(steps),
        { ...pick(steps, TARTINE_NOTES), autolyse: NOTE, mix: MIX, ...(change.proof === 'cold' && { fridge: FRIDGE }) },
        name,
      );
      assert.deepEqual(readiness(steps), pick(steps, TARTINE_READINESS), name);
    }
  }
  // Spelled out: the autolyse from 7:00 PM, the leaven in at 9:00 PM, and the loaves out at 8:50 PM the next day, or
  // at 4:50 AM with a warm proof.
  const cold = schedule(plan('whole-wheat'));
  assert.deepEqual(
    rows(cold).filter(([id]) => ['autolyse', 'mix', 'fridge', 'done'].includes(id)),
    [
      ['autolyse', '2026-10-21 19:00', 120, 'Start autolyse'],
      ['mix', '2026-10-21 21:00', 0, 'Add leaven, salt and final water'],
      ['fridge', '2026-10-22 00:40', 1110, 'Refrigerated final proof'],
      ['done', '2026-10-22 20:50', 15, 'All loaves out of the oven'],
    ],
  );
  assert.deepEqual(cold.find((s) => s.id === 'mix')!.additions, [
    { id: 'mix:leaven', name: 'Leaven', grams: 200 },
    { id: 'mix:salt', name: 'Salt', grams: 20 },
    { id: 'mix:water', name: 'Water', grams: 50 },
  ]);
  assert.equal(
    local(schedule(plan('whole-wheat', { proof: 'warm' })).find((s) => s.id === 'done')!.at),
    '2026-10-22 04:50',
  );
});

test('every Whole Wheat step is the book’s Tartine plan’s, moved as decision 19 says, whatever the count, oven or proof', () => {
  // The book's times: Tartine Country Bread as it was before decision 21 gave it an 18-hour fridge.
  const book: Recipe = { ...recipe('tartine'), coldProof: undefined };
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
          const tartine = { ...plan('tartine', change), recipe: book },
            wheat = plan('whole-wheat', change);
          tartine.settings.count = count;
          wheat.settings.count = count;
          const t = schedule(tartine),
            w = schedule(wheat),
            mixed = t.findIndex((s) => s.id === 'autolyse');
          assert.ok(mixed > 0, name);
          // Elapsed minutes, so a clock change between them doesn't matter.
          const move = (s: Step, minutes: number) => new Date(+s.at + minutes * 60000),
            fridge = t.findIndex((s) => s.id === 'fridge'),
            bowls = Math.ceil(count / 2);
          const expected = t.map((s, n): Step => {
            if (n < mixed) return s;
            if (n === mixed)
              return {
                ...s,
                at: move(s, -120),
                minutes: 120,
                title: 'Start autolyse',
                // More than 2 loaves are mixed in bowls of up to 2 loaves each (Michael, November 22, 2026).
                note:
                  count > 2
                    ? `Split this mix between ${bowls} bowls, with an equal share of everything in each. ${NOTE}`
                    : NOTE,
              };
            if (s.id === 'mix')
              return {
                ...s,
                at: move(s, -SOONER),
                title: 'Add leaven, salt and final water',
                note:
                  count > 2
                    ? MIX.replace(
                        'Work in the leaven, salt and reserved water.',
                        'Work the leaven, salt and reserved water into each bowl.',
                      )
                    : MIX,
              };
            if (s.id === 'fridge')
              return {
                ...s,
                at: move(s, -SOONER),
                minutes: 1110,
                note: s.note.replace('10 to 12 hours', 'about 18½ hours'),
              };
            return { ...s, at: move(s, fridge >= 0 && n > fridge ? LONGER - SOONER : -SOONER) };
          });
          // The leaven moves into the final mix, ahead of the salt and water.
          const wheatMix = w.find((s) => s.id === 'mix')!,
            expectedMix = expected.find((s) => s.id === 'mix')!;
          assert.deepEqual(
            wheatMix.additions!.filter((a) => !a.id.endsWith(':leaven')),
            expectedMix.additions,
            name,
          );
          assert.equal(wheatMix.additions!.filter((a) => a.id.endsWith(':leaven')).length, count > 2 ? bowls : 1, name);
          assert.deepEqual(
            w.map((s) => (s.id === 'mix' ? { ...s, additions: undefined } : s)),
            expected.map((s) => (s.id === 'mix' ? { ...s, additions: undefined } : s)),
            name,
          );
        }
});

test('planning back from the last loaf out reproduces the forward Whole Wheat schedule', () => {
  // The plan ends 6 hours later than the book's Tartine plan, as Tartine Country Bread's now does, so planning back
  // from 8:50 PM starts the leaven at 9:00 AM.
  assert.deepEqual(
    schedule(plan('whole-wheat', { anchor: 'done', date: '2026-10-22', time: '20:50' })),
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

test('the autolyse note gives the cooler water and both flours, keeps the leaven out, and nothing of the white loaf’s', () => {
  const step = schedule(plan('whole-wheat')).find((s) => s.id === 'autolyse')!;
  assert.equal(step.title, 'Start autolyse');
  assert.equal(step.minutes, 120);
  assert.equal(step.note, NOTE);
  assert.match(step.note, /75°F \/ 24°C/);
  assert.match(step.note, /whole-wheat and all-purpose flour/);
  assert.doesNotMatch(step.note, /80°F|27°C|white|leaven used|disperse|40 to 60/i);
});
