import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule } from '../domain/schedule.ts';
import { freshState, planOf } from '../state/schema.ts';
import * as act from '../state/actions.ts';
import { scheduleView } from './schedule.ts';

const NOW = new Date(2026, 10, 21, 15, 20).getTime();

test('the checked count leaves out checks for steps no longer on the schedule, but the bake still counts as underway', () => {
  // Three loaves one at a time, with a later batch's steps checked; then one loaf, so those steps are gone.
  let s = act.setOvenCapacity(act.setSetting(freshState(NOW), 'count', 3), 1);
  const three = schedule(planOf(s)).map((step) => step.id);
  s = act.setSetting(s, 'count', 1);
  const one = new Set(schedule(planOf(s)).map((step) => step.id)),
    gone = three.filter((id) => !one.has(id));
  assert.ok(gone.length > 0, 'a later batch has steps of its own');
  for (const id of ['leaven', ...gone]) s = act.setChecked(s, id, true, NOW);
  const v = scheduleView(s, NOW, String);
  assert.equal(v.bake.done.length, gone.length + 1);
  assert.equal(v.completed, 1);
  assert.equal(v.allDone, false);
  // Underway goes by what is checked, listed or not, as before the rebuild.
  s = act.setChecked(s, 'leaven', false, NOW);
  const after = scheduleView(s, NOW, String);
  assert.deepEqual([after.completed, after.underway], [0, true]);
});
