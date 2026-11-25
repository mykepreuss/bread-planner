import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, recipeById, defaultSettings, type Recipe, type Settings } from './recipes.ts';
import { formula } from './formula.ts';
import { addInLine, addInLines } from './addins.ts';
import { schedule, type PlanInput, type Step } from './schedule.ts';
import { liveSchedule, followDough, skippedSteps } from './bakeday.ts';
import { quietHourActions } from './quiet.ts';
import { freshState, planOf, type PlannerState } from '../state/schema.ts';
import * as act from '../state/actions.ts';
import { scheduleView, skipsOnCheck } from '../view/schedule.ts';

// Sesame, from Tartine Bread page 90, added at Michael's request on November 22, 2026, and the same day made a Preuss
// House variation (decision 16): Preuss House's dough and timing with toasted sesame seeds worked in after Turn 1, and
// a step to toast them first. Times here are built and read in the same local zone, so these tests hold in any zone.

const MINUTE = 60000,
  NOW = new Date(2026, 10, 21, 15, 20).getTime();
const TOAST_NOTE =
  'Heat the oven to 400°F / 204°C. Give the seeds 10 minutes on a rimmed baking sheet in a single layer, then stir them so the darker ones at the edges move to the middle. Return them for another 10 to 15 minutes, until thoroughly toasted, and let them cool for 20 minutes. They go into the dough at Turn 1.';
const SEEDS = 'unhulled sesame seeds, toasted and cooled';
/** The add-in step's note for this much seed. */
const addInNote = (amount: string) =>
  `Scatter over the dough ${amount} ${SEEDS}. Wet them with a splash of water, then work them in by hand, pinching the dough through your fingers and slicing through it with the side of your hand until the seeds are evenly spread. Bulk then carries on as planned.`;

function recipe(id: string): Recipe {
  const r = recipeById(id);
  assert.ok(r, `no recipe ${id}`);
  return r;
}
/** A plan at the recipe's defaults: leaven at 9:00 AM on 21 October 2026, cold proof, two loaves at once. */
function plan(id: string, change: Partial<PlanInput> = {}, settings: Partial<Settings> = {}): PlanInput {
  const r = recipe(id);
  return {
    recipe: r,
    settings: { ...defaultSettings(r), ...settings },
    date: '2026-10-21',
    time: '09:00',
    anchor: 'leaven',
    proof: 'cold',
    ovenCapacity: 2,
    reheat: 30,
    ...change,
  };
}
const find = (steps: Step[], id: string) => {
  const step = steps.find((s) => s.id === id);
  assert.ok(step, `no step ${id}`);
  return step;
};
const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const day = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('Sesame is on the menu right after Olive, with Preuss House’s method, flours, leaven build and defaults', () => {
  const ids = RECIPES.map((r) => r.id),
    sesame = recipe('sesame'),
    house = recipe('house');
  assert.equal(ids.indexOf('sesame'), ids.indexOf('olive') + 1);
  assert.equal(ids.indexOf('olive'), ids.indexOf('tartine') + 1);
  assert.equal(sesame.name, 'Sesame Bread');
  assert.deepEqual(
    [sesame.method, sesame.flours, sesame.late, sesame.buildFlour],
    [house.method, house.flours, house.late, house.buildFlour],
  );
  assert.deepEqual(sesame.defaults, house.defaults);
  // Copied, not shared: each recipe's defaults are its own.
  for (const [a, b] of [
    [sesame.defaults, house.defaults],
    [sesame.defaults.flours, house.defaults.flours],
    [sesame.defaults.build, house.defaults.build],
    [sesame.flours, house.flours],
  ] as const)
    assert.notEqual(a, b);
  assert.match(
    sesame.description,
    /^Preuss Country Bread with toasted sesame seeds worked in after Turn 1\. .*oven for the hour before/,
  );
  assert.ok(
    Object.isFrozen(sesame.addIns) && Object.isFrozen(sesame.addIns!.prep) && Object.isFrozen(sesame.addIns!.items[0]),
  );
  assert.equal(house.addIns, undefined, 'Preuss House has no add-ins');
  const s = act.selectRecipe(freshState(NOW), 'sesame');
  assert.equal(s.recipe, 'sesame', 'a fresh planner can choose it');
  assert.deepEqual(s.recipes.sesame.settings, house.defaults);
});

test('the sesame seeds read as one cup at the default batch, and scale with the loaf count and flour', () => {
  const sesame = recipe('sesame'),
    addIns = sesame.addIns!,
    book = sesame.defaults;
  assert.equal(addIns.items.length, 1);
  assert.equal(addInLine(addIns.items[0], 1), `1 cup ${SEEDS}`);
  const lines = (count: number, loafFlour: number) => addInLines(addIns, { count, loafFlour }, book);
  assert.deepEqual(lines(2, 500), [`1 cup ${SEEDS}`], 'the book batch, as Preuss House’s two loaves');
  assert.deepEqual(lines(1, 500), [`½ cup ${SEEDS}`]);
  assert.deepEqual(lines(3, 500), [`1½ cups ${SEEDS}`]);
  assert.deepEqual(lines(4, 500), [`2 cups ${SEEDS}`]);
  assert.deepEqual(lines(1, 1000), [`1 cup ${SEEDS}`], 'one loaf of twice the flour');
  assert.deepEqual(lines(2, 1000), [`2 cups ${SEEDS}`]);
  assert.deepEqual(lines(2, 250), [`½ cup ${SEEDS}`], 'half the flour');
});

test('its formula, the weights on the Ingredients tab, is Preuss House’s', () => {
  const sesame = recipe('sesame'),
    house = recipe('house');
  for (const change of [
    {},
    { count: 3 },
    { loafFlour: 400, hydration: 80 },
    { flours: { anita: 70, wheat: 20, rye: 10 } },
  ]) {
    const s = { ...defaultSettings(sesame), ...change };
    assert.ok(formula(sesame, s), JSON.stringify(change));
    assert.deepEqual(formula(sesame, s), formula(house, s), JSON.stringify(change));
  }
});

test('its schedule is Preuss House’s with the toast step an hour before Turn 1 and the add-in step at Turn 1', () => {
  const amounts: Record<number, string> = { 1: '½ cup', 2: '1 cup', 3: '1½ cups', 5: '2½ cups' };
  for (const proof of ['cold', 'warm'] as const)
    for (const [count, ovenCapacity] of [
      [2, 2],
      [1, 1],
      [2, 1],
      [3, 1],
      [3, 2],
      [5, 2],
    ])
      for (const anchor of ['leaven', 'done'] as const) {
        const label = `${proof} proof, ${count} loaves, ${ovenCapacity} at once, planned from ${anchor}`;
        const input = plan('sesame', { proof, ovenCapacity, anchor, date: '2026-10-22', time: '18:00' }, { count }),
          steps = schedule(input),
          house = schedule({ ...input, recipe: recipe('house') });
        assert.ok(house.length > 0, label);
        assert.deepEqual(
          steps.filter((s) => s.id !== 'toast' && s.id !== 'addins'),
          house,
          `${label}: every other step is Preuss House's, at the same time`,
        );
        assert.equal(steps.length, house.length + 2, label);
        const ids = steps.map((s) => s.id);
        assert.ok(
          steps.every((s, i) => i === 0 || +steps[i - 1].at <= +s.at),
          `${label}: in time order`,
        );
        const toast = find(steps, 'toast'),
          turn1 = find(steps, 'turn1'),
          addins = find(steps, 'addins');
        assert.equal(+turn1.at - +toast.at, 60 * MINUTE, `${label}: toast an hour before Turn 1`);
        assert.deepEqual(
          ids.slice(ids.indexOf('autolyse'), ids.indexOf('autolyse') + 3),
          ['autolyse', 'toast', 'mix'],
          `${label}: as the autolyse finishes, before the final mix`,
        );
        assert.deepEqual(
          ids.slice(ids.indexOf('turn1'), ids.indexOf('turn1') + 3),
          ['turn1', 'addins', 'turn2'],
          label,
        );
        assert.equal(+addins.at, +turn1.at, label);
        assert.deepEqual(
          [
            toast.kind,
            toast.title,
            toast.note,
            toast.readiness,
            toast.phase,
            toast.handsOn,
            toast.activeMinutes,
            toast.movesPlan,
            toast.bulk,
            toast.turn,
          ],
          ['prep', 'Toast the sesame seeds', TOAST_NOTE, undefined, 'oven', true, 0, false, false, 0],
          label,
        );
        assert.equal(toast.minutes, 15, `${label}: it lasts until the final mix`);
        assert.equal(+find(steps, 'mix').at - +toast.at, toast.minutes * MINUTE, label);
        assert.deepEqual(
          [
            addins.kind,
            addins.title,
            addins.note,
            addins.phase,
            addins.handsOn,
            addins.movesPlan,
            addins.bulk,
            addins.minutes,
          ],
          ['addin', 'Add the toasted sesame seeds', addInNote(amounts[count]), 'room', true, false, true, 0],
          label,
        );
      }
});

test('planning back from the finish puts every step, the toast step included, where planning forward does', () => {
  for (const proof of ['cold', 'warm'] as const)
    for (const ovenCapacity of [1, 2]) {
      const forward = schedule(plan('sesame', { proof, ovenCapacity }, { count: 3 })),
        done = find(forward, 'done').at;
      const back = schedule(
        plan('sesame', { proof, ovenCapacity, anchor: 'done', date: day(done), time: clock(done) }, { count: 3 }),
      );
      assert.deepEqual(back, forward, `${proof} ${ovenCapacity}`);
    }
  // A fresh planner switching to the finish and back keeps the toast step where it was.
  const s = act.selectRecipe(freshState(NOW), 'sesame'),
    toastAt = (x: PlannerState) => +find(schedule(planOf(x)), 'toast').at,
    finish = act.setAnchor(s, 'done');
  assert.equal(finish.anchor, 'done');
  assert.equal(toastAt(finish), toastAt(s));
  assert.equal(toastAt(act.setAnchor(finish, 'leaven')), toastAt(s));
});

test('the toast step keeps its hour across a daylight-saving change, and every note is a complete sentence', () => {
  // The clocks go back at 2:00 AM on November 1, 2026, between this leaven start and the toast step.
  const steps = schedule(plan('sesame', { date: '2026-10-31', time: '20:00' }));
  assert.equal(+find(steps, 'turn1').at - +find(steps, 'toast').at, 60 * MINUTE);
  // 4 hours 45 minutes of elapsed time after the leaven: 15 minutes before the final mix.
  assert.equal(+find(steps, 'toast').at - +find(steps, 'leaven').at, 285 * MINUTE);
  for (const proof of ['cold', 'warm'] as const)
    for (const step of schedule(plan('sesame', { proof })))
      assert.match(step.note, /[.!?]$/, `${proof} ${step.id}: ${step.note}`);
});

test('Original Tartine and Preuss House have no toast step, and add-ins without prep get none', () => {
  for (const id of ['house', 'tartine'])
    for (const proof of ['cold', 'warm'] as const)
      for (const count of [1, 2, 3]) {
        const steps = schedule(plan(id, { proof }, { count }));
        assert.ok(steps.length > 0);
        assert.ok(!steps.some((s) => s.id === 'toast' || s.kind === 'prep'), `${id} ${proof} ${count}`);
      }
  const sesame = recipe('sesame'),
    { prep, ...addIns } = sesame.addIns!;
  assert.ok(prep);
  const unprepared: Recipe = { ...sesame, id: 'unprepared', addIns },
    steps = schedule({ ...plan('sesame'), recipe: unprepared });
  assert.deepEqual(
    steps,
    schedule(plan('sesame')).filter((s) => s.id !== 'toast'),
    'the add-in step only, as before',
  );
});

test('prep starts as far ahead of the add-in step as it says, in time order, and lasts until the next step', () => {
  // A made-up variation whose prep takes three hours, so it starts during the leaven, before the autolyse.
  const sesame = recipe('sesame'),
    early: Recipe = {
      ...sesame,
      id: 'early',
      addIns: { ...sesame.addIns!, prep: { ...sesame.addIns!.prep!, minutesBefore: 180 } },
    };
  const steps = schedule({ ...plan('sesame'), recipe: early }),
    ids = steps.map((s) => s.id),
    toast = find(steps, 'toast');
  assert.deepEqual(ids.slice(0, 5), ['feed', 'leaven', 'toast', 'autolyse', 'mix']);
  assert.equal(+find(steps, 'turn1').at - +toast.at, 180 * MINUTE);
  assert.equal(toast.minutes, 45, 'until the autolyse starts');
});

test('on bake day the toast step is hands-on oven work that moves nothing, and can be skipped like any other step', () => {
  const planned = schedule(plan('sesame')),
    at = (steps: { id: string; at: Date }[], id: string) => +find(steps as Step[], id).at;
  // A late leaven moves the toast step with everything after it; a late toast moves nothing.
  const late = liveSchedule(planned, ['leaven'], { leaven: at(planned, 'leaven') + 40 * MINUTE });
  for (const id of ['toast', 'mix', 'turn1', 'addins'])
    assert.equal(at(late.steps, id), at(planned, id) + 40 * MINUTE, id);
  const toasted = liveSchedule(planned, ['leaven', 'autolyse', 'toast'], {
    leaven: at(planned, 'leaven'),
    autolyse: at(planned, 'autolyse'),
    toast: at(planned, 'toast') + 30 * MINUTE,
  });
  assert.equal(toasted.shift, 0);
  assert.deepEqual(
    toasted.steps.filter((s) => s.id !== 'toast').map((s) => +s.at),
    planned.filter((s) => s.id !== 'toast').map((s) => +s.at),
  );
  // Warm dough shortens bulk, but the toast step stays where it was planned.
  const warm = followDough(planned, [], {}, 93);
  assert.equal(at(warm.steps, 'toast'), at(planned, 'toast'));
  assert.ok(at(warm.steps, 'shape') < at(planned, 'shape'));
  // Left unchecked once the final mix is checked, it is skipped; checked late, it isn't.
  assert.deepEqual(skippedSteps(planned, ['feed', 'leaven', 'autolyse', 'mix'], planned), ['toast']);
  assert.deepEqual(skippedSteps(planned, ['feed', 'leaven', 'autolyse', 'mix', 'toast'], planned), []);
  assert.deepEqual(skippedSteps(planned, ['feed', 'leaven', 'autolyse', 'toast'], planned), []);
});

test('quiet hours list the toast step when it starts after 10:30 PM, until it is checked', () => {
  const quiet = (steps: Step[], done: string[] = []) => quietHourActions(steps, done).map((a) => a.step.id);
  // Leaven at 9:00 AM: the seeds go in the oven at 1:45 PM, as the autolyse finishes.
  const usual = schedule(plan('sesame'));
  assert.equal(clock(find(usual, 'toast').at), '13:45');
  assert.ok(!quiet(usual).includes('toast'));
  // Leaven at 5:45 PM: at 10:30 PM, not yet quiet; at 6:00 PM: at 10:45 PM.
  assert.ok(!quiet(schedule(plan('sesame', { time: '17:45' }))).includes('toast'));
  const later = schedule(plan('sesame', { time: '18:00' }));
  assert.equal(clock(find(later, 'toast').at), '22:45');
  const listed = quietHourActions(later).find((a) => a.step.id === 'toast');
  assert.deepEqual([listed?.continues], [false]);
  assert.ok(!quiet(later, ['toast']).includes('toast'));
});

test('Up next reaches the toast step and then the add-in step, which offers the dough temperature as a turn does', () => {
  let s = act.selectRecipe(freshState(NOW), 'sesame');
  const seen: [string, string, string | null][] = [];
  for (let i = 0; i < 10; i++) {
    const v = scheduleView(s, NOW, String);
    assert.ok(v.next, `step ${i}`);
    seen.push([v.next.id, v.next.phase, v.temperatureField]);
    s = act.setChecked(s, v.next.id, true, NOW);
  }
  assert.deepEqual(seen, [
    ['feed', 'room', null],
    ['leaven', 'room', null],
    ['autolyse', 'room', null],
    ['toast', 'oven', null],
    ['mix', 'room', null],
    ['rest', 'room', 'after mixing'],
    ['turn1', 'room', 'after mixing'],
    ['addins', 'room', 'after mixing'],
    ['turn2', 'room', 'after mixing'],
    ['turn3', 'room', 'after mixing'],
  ]);
  // With the dough temperature taken, the add-in card asks for a reading now, as Turn 1 and Turn 2 do.
  let measured = act.selectRecipe(freshState(NOW), 'sesame');
  for (const id of ['feed', 'leaven', 'autolyse', 'toast', 'mix', 'rest'])
    measured = act.setChecked(measured, id, true, NOW);
  measured = act.setDoughTemp(measured, 78);
  const fields: [string, string | null][] = [];
  for (let i = 0; i < 3; i++) {
    const v = scheduleView(measured, NOW, String);
    fields.push([v.next!.id, v.temperatureField]);
    measured = act.setChecked(measured, v.next!.id, true, NOW);
  }
  assert.deepEqual(fields, [
    ['turn1', 'now'],
    ['addins', 'now'],
    ['turn2', 'now'],
  ]);
  // The toast step is not part of bulk, so it counts towards asking before a big skip, as the final mix does: with the
  // starter feed, checking the final mix first would skip four steps, so it asks.
  const fresh = act.selectRecipe(freshState(NOW), 'sesame'),
    mix = skipsOnCheck(fresh, 'mix', NOW);
  assert.deepEqual([mix.skips.map((x) => x.id), mix.ask], [['feed', 'leaven', 'autolyse', 'toast'], true]);
  const bulkDue = +find(scheduleView(fresh, NOW, String).steps, 'rest').at;
  assert.deepEqual(
    skipsOnCheck(fresh, 'turn1', bulkDue).skips.map((x) => x.id),
    ['feed', 'leaven', 'autolyse', 'toast', 'mix', 'rest'],
  );
  assert.equal(skipsOnCheck(fresh, 'turn1', bulkDue).ask, true);
});
