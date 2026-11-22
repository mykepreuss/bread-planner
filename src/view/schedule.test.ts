import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule } from '../domain/schedule.ts';
import { freshState, planOf } from '../state/schema.ts';
import * as act from '../state/actions.ts';
import { scheduleView, skipsOnCheck } from './schedule.ts';

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

test('Preheat checked before the fridge step it starts with leaves Up next on the fridge step', () => {
  let s = freshState(NOW);
  const ids = schedule(planOf(s)).map((step) => step.id);
  for (const id of ids.slice(0, ids.indexOf('warmup'))) s = act.setChecked(s, id, true, NOW);
  s = act.setChecked(s, 'preheat', true, NOW);
  const v = scheduleView(s, NOW, String);
  assert.deepEqual([v.skipped, v.next?.id, v.then?.id], [[], 'warmup', 'covered']);
  s = act.setChecked(s, 'covered', true, NOW);
  assert.deepEqual(scheduleView(s, NOW, String).skipped, ['warmup']);
});

test('Basket rest checked late, after Preheat, still leaves Up next on the fridge step', () => {
  let s = freshState(NOW);
  const ids = schedule(planOf(s)).map((step) => step.id);
  for (const id of ids.slice(0, ids.indexOf('warmup')).filter((id) => id !== 'basket'))
    s = act.setChecked(s, id, true, NOW);
  s = act.setChecked(act.setChecked(s, 'preheat', true, NOW), 'basket', true, NOW);
  const v = scheduleView(s, NOW, String);
  assert.deepEqual([v.skipped, v.next?.id], [[], 'warmup']);
});

test('in Tartine, warm bulk checked before the salt step it starts with leaves Up next on the salt step', () => {
  let s = act.selectRecipe(freshState(NOW), 'tartine');
  for (const id of ['leaven', 'autolyse', 'rest']) s = act.setChecked(s, id, true, NOW);
  const v = scheduleView(s, NOW, String);
  assert.deepEqual([v.skipped, v.next?.id], [[], 'mix']);
});

test('an extra turn for cool dough, due at the planned preshape time, is skipped once preshape is done', () => {
  let s = act.setDoughTemp(freshState(NOW), 65);
  for (const id of ['feed', 'leaven', 'autolyse', 'mix', 'rest']) s = act.setChecked(s, id, true, NOW);
  s = act.setChecked(s, 'shape', true, NOW + 270 * 60000);
  const v = scheduleView(s, NOW + 270 * 60000, String),
    planned = schedule(planOf(s));
  const turn8 = v.steps.find((step) => step.id === 'turn8');
  assert.ok(turn8, 'bulk ran long enough to keep an eighth turn');
  assert.equal(turn8.planned.getTime(), planned.find((step) => step.id === 'shape')!.at.getTime());
  assert.deepEqual(v.skipped, ['turn1', 'turn2', 'turn3', 'turn4', 'turn5', 'turn6', 'turn7', 'turn8']);
  assert.equal(v.next?.id, 'bench1');
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

test('checking a step that would skip more than three earlier steps, besides bulk and its turns, asks first', () => {
  const fresh = freshState(NOW),
    ids = (r: { skips: { id: string }[] }) => r.skips.map((s) => s.id);
  // The mis-tap: the last step on a fresh plan would pass over the whole bake.
  const last = skipsOnCheck(fresh, 'cooled', NOW);
  assert.equal(last.ask, true);
  assert.equal(last.skips.length, 22);
  assert.equal(ids(last)[0], 'feed');
  // Michael's example: the feed is skipped, without asking, once the leaven is checked; Turn 3 then skips nothing new.
  assert.deepEqual(
    [ids(skipsOnCheck(fresh, 'leaven', NOW)), skipsOnCheck(fresh, 'leaven', NOW).ask],
    [['feed'], false],
  );
  let s = fresh;
  for (const id of ['leaven', 'autolyse', 'mix', 'rest', 'turn1', 'turn2']) s = act.setChecked(s, id, true, NOW);
  assert.deepEqual(skipsOnCheck(s, 'turn3', NOW), { skips: [], ask: false });
  // Dough ready early: preshape passes the last three turns without asking, however many turns there are.
  let early = fresh;
  for (const id of ['feed', 'leaven', 'autolyse', 'mix', 'rest', 'turn1']) early = act.setChecked(early, id, true, NOW);
  const shape = skipsOnCheck(early, 'shape', NOW);
  assert.deepEqual([ids(shape), shape.ask], [['turn2', 'turn3', 'turn4', 'turn5', 'turn6', 'turn7'], false]);
  // Three steps besides bulk don't ask; four do. Steps already skipped don't count again.
  assert.deepEqual(
    [ids(skipsOnCheck(fresh, 'mix', NOW)), skipsOnCheck(fresh, 'mix', NOW).ask],
    [['feed', 'leaven', 'autolyse'], false],
  );
  assert.deepEqual(
    [ids(skipsOnCheck(fresh, 'turn1', NOW)), skipsOnCheck(fresh, 'turn1', NOW).ask],
    [['feed', 'leaven', 'autolyse', 'mix', 'rest'], true],
  );
  const mixed = act.setChecked(fresh, 'mix', true, NOW);
  assert.deepEqual([ids(skipsOnCheck(mixed, 'turn1', NOW)), skipsOnCheck(mixed, 'turn1', NOW).ask], [['rest'], false]);
  // A step already checked, or one the checked step starts with, skips nothing new.
  assert.deepEqual(skipsOnCheck(mixed, 'mix', NOW), { skips: [], ask: false });
  let fridge = fresh;
  for (const id of schedule(planOf(fresh))
    .map((step) => step.id)
    .slice(0, 17))
    fridge = act.setChecked(fridge, id, true, NOW);
  assert.deepEqual(skipsOnCheck(fridge, 'preheat', NOW), { skips: [], ask: false });
});

test('before the start of bulk is due, the start of bulk and the turns count towards asking', () => {
  const fresh = freshState(NOW),
    ids = (r: { skips: { id: string }[] }) => r.skips.map((s) => s.id);
  // The evening before: a tap on preshape would skip twelve steps, seven of them turns, and asks.
  const shape = skipsOnCheck(fresh, 'shape', NOW);
  assert.deepEqual([shape.skips.length, shape.ask], [12, true]);
  // The feed checked: Turn 1 would skip the leaven, the autolyse, the mix and the start of bulk.
  const fed = act.setChecked(fresh, 'feed', true, NOW);
  const early = skipsOnCheck(fed, 'turn1', NOW);
  assert.deepEqual([ids(early), early.ask], [['leaven', 'autolyse', 'mix', 'rest'], true]);
  // From its planned start, 2:15 PM on bake day, the start of bulk and the turns don't count.
  const during = new Date(2026, 10, 22, 14, 30).getTime(),
    later = skipsOnCheck(fed, 'turn1', during);
  assert.deepEqual([ids(later), later.ask], [['leaven', 'autolyse', 'mix', 'rest'], false]);
  assert.equal(skipsOnCheck(fed, 'shape', during).ask, false);
  assert.equal(
    skipsOnCheck(fed, 'shape', new Date(2026, 10, 22, 14, 14).getTime()).ask,
    true,
    'a minute before, it asks',
  );
});
