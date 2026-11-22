import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, recipeById, type Settings } from './recipes.ts';
import { schedule, type PlanInput, type Step } from './schedule.ts';
import { quietHourActions } from './quiet.ts';

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
  tartine = schedule(plan('tartine')),
  threeBatches = schedule(
    plan('house', (s) => {
      s.count = 6;
    }),
  );

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

test('quiet hours ignore passive overnight intervals and cooling, but flag their required handling', () => {
  assert.deepEqual(
    quietHourActions([
      at(tartine, 'leaven', 720, '21:00'),
      at(house, 'fridge', 750, '19:15'),
      at(house, 'rest', 30, '23:00'),
      at(house, 'cooled', 0, '23:00'),
      at(threeBatches, 'cooled-2', 0, '02:00'),
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
  assert.ok(!ids.some((id) => id.startsWith('cooled')));
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
