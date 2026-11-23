import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, recipeById, type Settings } from './recipes.ts';
import { schedule, type PlanInput, type Step } from './schedule.ts';
import { quietHourActions, quietestStart } from './quiet.ts';
import { clockText, dateString } from './text.ts';

// Ported from src/lib/recipes.test.ts. Quiet hours are local wall-clock rules, so every time here is built and read
// in the local zone, and these tests hold in any time zone.

/** A plan with the recipe's default settings, two loaves baked at once and a 30-minute reheat, as a new planner has. */
function plan(id: string, change: (s: Settings) => void = () => {}, input: Partial<PlanInput> = {}): PlanInput {
  const recipe = recipeById(id);
  assert.ok(recipe, `no recipe ${id}`);
  const settings = defaultSettings(recipe);
  change(settings);
  return {
    recipe,
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

const house = schedule(plan('house')),
  tartine = schedule(plan('tartine'));

/**
 * A step as the planner makes it, moved to a local clock time on 21 October 2026, so the test sees the new core's own
 * facts about which steps are hands-on. `minutes` is the length the old test gave the step, checked here.
 */
function at(steps: Step[], id: string, minutes: number, time: string): Step {
  const step = steps.find((s) => s.id === id);
  assert.ok(step, `no step ${id}`);
  assert.equal(step.minutes, minutes, `${id} lasts ${minutes} minutes`);
  const [h, m] = time.split(':').map(Number);
  return { ...step, at: new Date(2026, 9, 21, h, m) };
}

test('quiet hours catch required actions after 10:30 PM, across midnight and before 7 AM', () => {
  const feed = (time: string) => at(house, 'feed', 660, time);
  for (const time of ['22:31', '23:59', '00:00', '02:00', '06:59'])
    assert.equal(quietHourActions([feed(time)]).length, 1, time);
  for (const time of ['07:00', '09:00', '22:00', '22:30']) assert.equal(quietHourActions([feed(time)]).length, 0, time);
});

test('quiet hours ignore passive overnight intervals, but flag their required handling', () => {
  assert.deepEqual(
    quietHourActions([
      at(tartine, 'leaven', 720, '21:00'),
      at(house, 'fridge', 750, '19:15'),
      at(house, 'rest', 30, '23:00'),
    ]),
    [],
  );
  assert.deepEqual(
    quietHourActions([at(house, 'fridge', 750, '23:00'), at(house, 'bench1', 30, '01:00')]).map((x) => x.step.id),
    ['fridge', 'bench1'],
  );
});

test('continuous mixing and shaping that run past the cutoff are flagged, not unattended bake time', () => {
  const found = quietHourActions([
    at(house, 'mix', 15, '22:20'),
    at(tartine, 'shape', 5, '22:28'),
    at(house, 'fold', 5, '22:30'),
    at(house, 'covered', 20, '22:20'),
    at(house, 'mix', 15, '22:15'),
  ]);
  assert.deepEqual(
    found.map((x) => x.step.id),
    ['mix', 'shape', 'fold'],
  );
  assert.ok(found.every((x) => x.continues));
});

test('quiet hours include subsequent oven batches and exclude completed actions', () => {
  const s = schedule(
      plan(
        'house',
        (q) => {
          q.count = 4;
        },
        { anchor: 'done', time: '00:30' },
      ),
    ),
    conflicts = quietHourActions(s),
    ids = conflicts.map((x) => x.step.id);
  assert.ok(ids.includes('reheat-2'));
  assert.ok(ids.includes('covered-2'));
  assert.ok(ids.includes('uncovered-2'));
  assert.ok(ids.includes('done'));
  assert.deepEqual(quietHourActions(s, ids), []);
  assert.deepEqual(quietHourActions([]), []);
});

test('default House schedule has no quiet-hour work; a late start and book schedule do', () => {
  assert.deepEqual(quietHourActions(schedule(plan('house'))), []);
  assert.ok(
    quietHourActions(schedule(plan('house', undefined, { time: '17:00' }))).some((x) => x.step.id === 'fridge'),
  );
  assert.ok(quietHourActions(schedule(plan('tartine'))).some((x) => x.step.id === 'fold'));
});

/** Long before every plan here, so no start is ruled out as past. */
const EARLY = new Date(2026, 9, 1).getTime();
const local = (d: Date) => `${dateString(d)} ${clockText(d)}`;

/**
 * Tartine Country Bread on the book's 10- to 12-hour fridge, as it was until decision 21: no recipe proofs this way
 * now, but it shows how the quietest start is chosen when every start leaves some night work.
 */
const book = (input: Partial<PlanInput> = {}) =>
  plan('tartine', undefined, { recipe: { ...recipeById('tartine')!, coldProof: undefined }, ...input });

test('on the book’s 12-hour fridge no start keeps a cold-proofed Tartine bake out of quiet hours; the quietest leaves only the leaven, as near the plan as it can', () => {
  for (let m = 0; m < 1440; m += 15) {
    const time = clockText(new Date(2026, 9, 21, 0, m));
    assert.ok(quietHourActions(schedule(book({ time }))).length >= 1, time);
  }
  // A 12-hour leaven, about 4 hours of dough work and a 12-hour fridge: the latest start with one action builds the
  // leaven at 6:15 AM, so the loaves go into the fridge at 10:25 PM.
  const best = quietestStart(book(), EARLY)!;
  assert.deepEqual([local(best.at), best.actions], ['2026-10-21 06:15', 1]);
  const steps = schedule(book({ time: '06:15' }));
  assert.deepEqual(
    quietHourActions(steps).map((a) => a.step.id),
    ['leaven'],
  );
  assert.equal(clockText(steps.find((x) => x.id === 'fridge')!.at), '22:25');
  // From an 8:00 PM leaven, a 3:00 AM start is nearer and also leaves one action, but 4 hours into quiet hours; the
  // leaven at 6:15 AM is 45 minutes early.
  const evening = quietestStart(book({ time: '20:00' }), EARLY)!;
  assert.deepEqual([local(evening.at), evening.actions], ['2026-10-22 06:15', 1]);
  assert.equal(quietHourActions(schedule(book({ date: '2026-10-22', time: '03:00' }))).length, 1);
});

test('Tartine Country Bread, with its 18-hour fridge, avoids quiet hours from a 9:00 to 10:30 PM leaven with a cold proof, and from 7:00 PM with a warm one', () => {
  const free = (proof: 'cold' | 'warm') => {
    const times: string[] = [];
    for (let m = 0; m < 1440; m += 15) {
      const time = clockText(new Date(2026, 9, 21, 0, m));
      if (!quietHourActions(schedule(plan('tartine', undefined, { proof, time }))).length) times.push(time);
    }
    return times;
  };
  // Before 9:00 PM the loaves would come out of the fridge before 7:00 AM; after 10:30 PM the leaven is in quiet hours.
  assert.deepEqual(free('cold'), ['21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30']);
  assert.deepEqual(free('warm')[0], '19:00');
  assert.deepEqual(free('warm').at(-1), '22:30');
  // From a 9:00 AM leaven, the nearest is 10:30 PM the evening before.
  const best = quietestStart(plan('tartine'), EARLY)!;
  assert.deepEqual([local(best.at), best.actions], ['2026-10-20 22:30', 0]);
});

test('Tartine Country Rye, with its 17½-hour fridge, avoids quiet hours from a 9:00 to 10:30 PM leaven with a cold proof, and from 7:00 PM with a warm one', () => {
  const free = (proof: 'cold' | 'warm') => {
    const times: string[] = [];
    for (let m = 0; m < 1440; m += 15) {
      const time = clockText(new Date(2026, 9, 21, 0, m));
      if (!quietHourActions(schedule(plan('country-rye', undefined, { proof, time }))).length) times.push(time);
    }
    return times;
  };
  // Before 9:00 PM the loaves would come out of the fridge before 7:00 AM; after 10:30 PM the leaven is in quiet hours.
  assert.deepEqual(free('cold'), ['21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30']);
  assert.deepEqual(free('warm')[0], '19:00');
  assert.deepEqual(free('warm').at(-1), '22:30');
  const best = quietestStart(plan('country-rye'), EARLY)!;
  assert.deepEqual([local(best.at), best.actions], ['2026-10-20 22:30', 0]);
});

test('Tartine Whole Wheat, with its autolyse and 18½-hour fridge, avoids quiet hours from a 9:00 to 10:30 PM leaven, either proof', () => {
  for (const proof of ['cold', 'warm'] as const) {
    const free: string[] = [];
    for (let m = 0; m < 1440; m += 15) {
      const time = clockText(new Date(2026, 9, 21, 0, m));
      if (!quietHourActions(schedule(plan('whole-wheat', undefined, { proof, time }))).length) free.push(time);
    }
    // Before 9:00 PM the autolyse would start before 7:00 AM; after 10:30 PM the leaven itself is in quiet hours.
    assert.deepEqual(free, ['21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30'], proof);
  }
  // From a 9:00 AM leaven, the nearest is 10:30 PM the evening before.
  const best = quietestStart(plan('whole-wheat'), EARLY)!;
  assert.deepEqual([local(best.at), best.actions], ['2026-10-20 22:30', 0]);
});

test('with a warm proof a Tartine bake can avoid quiet hours: the nearest such start, not before `from`, and the later of two as near', () => {
  const warm = plan('tartine', undefined, { proof: 'warm' });
  // Night-free leaven starts run from 7:00 PM, when the initial mix falls at 7:00 AM, to 10:30 PM: quiet hours start
  // after 10:30 PM. From a 9:00 AM leaven, 7:00 PM that day is nearer than 10:30 PM the evening before.
  const best = quietestStart(warm, EARLY)!;
  assert.deepEqual([local(best.at), best.actions], ['2026-10-21 19:00', 0]);
  const evening = schedule({ ...warm, time: '19:00' });
  assert.deepEqual(quietHourActions(evening), []);
  assert.equal(clockText(evening.find((x) => x.id === 'autolyse')!.at), '07:00');
  // From an 8:30 AM leaven, 10:30 PM the evening before is the nearer.
  assert.equal(local(quietestStart({ ...warm, time: '08:30' }, EARLY)!.at), '2026-10-20 22:30');
  // From 8:45 AM, 10:30 PM the evening before and 7:00 PM that day are as near: the later wins.
  assert.equal(local(quietestStart({ ...warm, time: '08:45' }, EARLY)!.at), '2026-10-21 19:00');
  // Nothing before `from`: at 7:20 PM, the next quarter hour.
  const late = quietestStart(warm, new Date(2026, 9, 21, 19, 20).getTime())!;
  assert.deepEqual([local(late.at), late.actions], ['2026-10-21 19:30', 0]);
});

test('a House plan with night work finds the nearest start without any, by the leaven, however it is planned', () => {
  assert.deepEqual(quietestStart(plan('house'), EARLY), { at: new Date(2026, 9, 21, 9, 0), actions: 0 });
  const early = plan('house', undefined, { time: '05:00' });
  assert.ok(quietHourActions(schedule(early)).length > 0);
  const best = quietestStart(early, EARLY)!;
  assert.deepEqual([local(best.at), best.actions], ['2026-10-21 08:15', 0]);
  // The same plan made from its last loaf out searches from the same leaven start.
  const done = schedule(early).find((x) => x.id === 'done')!.at;
  assert.deepEqual(
    quietestStart({ ...early, anchor: 'done', date: dateString(done), time: clockText(done) }, EARLY),
    best,
  );
  // No start whose first step is already past: at 10:00 PM, 8:15 AM tomorrow would put the starter feed 45 minutes ago,
  // so it is 9:00 AM, whose feed is now.
  const tonight = quietestStart(
    plan('house', undefined, { date: '2026-10-22', time: '05:00' }),
    new Date(2026, 9, 21, 22, 0).getTime(),
  )!;
  assert.deepEqual([local(tonight.at), tonight.actions], ['2026-10-22 09:00', 0]);
  assert.equal(
    local(schedule(plan('house', undefined, { date: '2026-10-22', time: '09:00' }))[0].at),
    '2026-10-21 22:00',
  );
  assert.deepEqual(
    quietestStart(plan('house', undefined, { date: '2026-10-22', time: '05:00' }), EARLY)!.at,
    new Date(2026, 9, 22, 8, 15),
    'without the clock, 8:15 AM',
  );
  // No flour, no plan, no start.
  assert.equal(
    quietestStart(
      plan('house', (q) => {
        q.flours = {};
      }),
      EARLY,
    ),
    null,
  );
});
