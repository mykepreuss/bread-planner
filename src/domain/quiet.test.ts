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

test('no start keeps a cold-proofed Tartine bake out of quiet hours; the quietest leaves only the leaven, as near the plan as it can', () => {
  for (let m = 0; m < 1440; m += 15) {
    const time = clockText(new Date(2026, 9, 21, 0, m));
    assert.ok(quietHourActions(schedule(plan('tartine', undefined, { time }))).length >= 1, time);
  }
  // A 12-hour leaven, about 4 hours of dough work and a 12-hour fridge: the latest start with one action builds the
  // leaven at 6:45 AM, so the loaves go into the fridge at 10:25 PM.
  const best = quietestStart(plan('tartine'), EARLY)!;
  assert.deepEqual([local(best.at), best.actions], ['2026-10-21 06:45', 1]);
  const steps = schedule(plan('tartine', undefined, { time: '06:45' }));
  assert.deepEqual(
    quietHourActions(steps).map((a) => a.step.id),
    ['leaven'],
  );
  assert.equal(clockText(steps.find((x) => x.id === 'fridge')!.at), '22:25');
});

test('with a warm proof a Tartine bake can avoid quiet hours: the nearest such start, not before `from`, and the later of two as near', () => {
  const warm = plan('tartine', undefined, { proof: 'warm' });
  // From a 9:00 AM leaven, the nearest is 10:30 PM the evening before: quiet hours start after 10:30 PM.
  const best = quietestStart(warm, EARLY)!;
  assert.deepEqual([local(best.at), best.actions], ['2026-10-20 22:30', 0]);
  assert.deepEqual(quietHourActions(schedule({ ...warm, date: '2026-10-20', time: '22:30' })), []);
  // Once that evening has passed, it is that day's 9:00 PM, the earliest whose autolyse starts at 7:00 AM.
  const later = quietestStart(warm, new Date(2026, 9, 20, 23, 0).getTime())!;
  assert.deepEqual([local(later.at), later.actions], ['2026-10-21 21:00', 0]);
  assert.equal(clockText(schedule({ ...warm, time: '21:00' }).find((x) => x.id === 'autolyse')!.at), '07:00');
  // From 9:45 AM, 10:30 PM the evening before and 9:00 PM that evening are as near: the later wins.
  assert.equal(local(quietestStart({ ...warm, time: '09:45' }, EARLY)!.at), '2026-10-21 21:00');
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
