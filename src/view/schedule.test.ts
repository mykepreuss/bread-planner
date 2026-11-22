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

test('Up next passes over an unchecked starter feed once the bake is through turn 3, and the feed can still be checked', () => {
  let s = freshState(NOW);
  for (const id of ['leaven', 'autolyse', 'mix', 'rest', 'turn1', 'turn2', 'turn3'])
    s = act.setChecked(s, id, true, NOW);
  const v = scheduleView(s, NOW, String);
  assert.deepEqual(v.skipped, ['feed']);
  assert.deepEqual([v.next?.id, v.then?.id], ['turn4', 'turn5']);
  assert.ok(!v.remaining.some((step) => step.id === 'feed'));
  s = act.setChecked(s, 'feed', true, NOW);
  const checked = scheduleView(s, NOW, String);
  assert.deepEqual([checked.skipped, checked.next?.id, checked.completed], [[], 'turn4', 8]);
});

test('with the feed and the autolyse both forgotten, checking the feed late leaves the autolyse skipped and Up next on turn 4', () => {
  let s = freshState(NOW);
  for (const id of ['leaven', 'mix', 'rest', 'turn1', 'turn2', 'turn3']) s = act.setChecked(s, id, true, NOW);
  assert.deepEqual(scheduleView(s, NOW, String).skipped, ['feed', 'autolyse']);
  s = act.setChecked(s, 'feed', true, NOW);
  const v = scheduleView(s, NOW, String);
  assert.deepEqual([v.skipped, v.next?.id], [['autolyse'], 'turn4']);
});

test('a plan whose last loaf is out has ended once every step but a forgotten starter feed is checked', () => {
  let s = freshState(NOW);
  const ids = schedule(planOf(s)).map((step) => step.id);
  for (const id of ids.slice(1)) s = act.setChecked(s, id, true, NOW);
  const later = NOW + 3 * 24 * 60 * 60000,
    v = scheduleView(s, later, String);
  assert.equal(ids[0], 'feed');
  assert.deepEqual([v.skipped, v.next, v.allDone, v.stale], [['feed'], undefined, true, true]);
});
