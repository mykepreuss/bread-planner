import test from 'node:test';
import assert from 'node:assert/strict';
import { recipeById, defaultSettings } from './recipes.ts';
import { schedule, type PlanInput, type Step } from './schedule.ts';
import {
  liveSchedule,
  followDough,
  holdTemperature,
  withReading,
  bulkDoneText,
  retime,
  stepGaps,
  stampNow,
  skippedSteps,
  bulkEstimate,
  bulkAdvice,
  toF,
  fromF,
  inTempRange,
  BULK_REFERENCE_F,
} from './bakeday.ts';
import { clockText, untilText, shiftText } from './text.ts';

// Times here are built and read in the same local zone, so these tests hold in any time zone.
const local = (y: number, m: number, d: number, h: number, min: number, s = 0) =>
  new Date(y, m - 1, d, h, min, s).getTime();
/** A recipe's plan at its default settings: leaven at 9:00 AM on 21 October 2026, cold proof, two loaves at once. */
function plan(id = 'house', change: Partial<Omit<PlanInput, 'recipe'>> = {}): Step[] {
  const recipe = recipeById(id)!;
  return schedule({
    recipe,
    settings: defaultSettings(recipe),
    date: '2026-10-21',
    time: '09:00',
    anchor: 'leaven',
    proof: 'cold',
    ovenCapacity: 2,
    reheat: 30,
    ...change,
  });
}
const minutes = (n: number) => n * 60000;
const at = (steps: { id: string; at: Date }[], id: string) => +steps.find((s) => s.id === id)!.at;
const turnSteps = <T extends { id: string }>(steps: T[]) => steps.filter((s) => /^turn/.test(s.id));

test('with nothing checked, the live schedule is the plan', () => {
  const planned = plan(),
    { steps, shift } = liveSchedule(planned, []);
  assert.equal(shift, 0);
  assert.deepEqual(
    steps.map((s) => +s.at),
    planned.map((s) => +s.at),
  );
  assert.ok(steps.every((s) => +s.planned === +s.at && !s.actual));
});

test('a late check moves every later step by the same amount and leaves earlier steps alone', () => {
  const planned = plan(),
    leaven = at(planned, 'leaven');
  const { steps, shift } = liveSchedule(planned, ['leaven'], { leaven: leaven + minutes(40) });
  assert.equal(shift, 40);
  assert.equal(at(steps, 'feed'), at(planned, 'feed'));
  for (const id of ['autolyse', 'mix', 'turn3', 'fridge', 'covered', 'done'])
    assert.equal(at(steps, id), at(planned, id) + minutes(40), id);
  assert.equal(+steps.find((s) => s.id === 'leaven')!.actual!, leaven + minutes(40));
});

test('the latest plan-moving step sets the shift, so catching up early pulls the rest back', () => {
  const planned = plan();
  const { steps, shift } = liveSchedule(planned, ['leaven', 'mix', 'rest'], {
    leaven: at(planned, 'leaven') + minutes(40),
    mix: at(planned, 'mix') + minutes(25),
    rest: at(planned, 'rest') + minutes(10),
  });
  assert.equal(shift, 10);
  assert.equal(at(steps, 'turn2'), at(planned, 'turn2') + minutes(10));
  const early = liveSchedule(planned, ['mix'], { mix: at(planned, 'mix') - minutes(15) });
  assert.equal(early.shift, -15);
  assert.equal(at(early.steps, 'fridge'), at(planned, 'fridge') - minutes(15));
});

test('checking the starter feed or autolyse at any time does not move the bake', () => {
  const planned = plan();
  const { steps, shift } = liveSchedule(planned, ['feed', 'autolyse'], {
    feed: at(planned, 'feed') + minutes(600),
    autolyse: at(planned, 'autolyse') + minutes(45),
  });
  assert.equal(shift, 0);
  assert.equal(at(steps, 'mix'), at(planned, 'mix'));
  assert.equal(at(steps, 'autolyse'), at(planned, 'autolyse') + minutes(45));
});

test('a step checked without a recorded time keeps following the plan', () => {
  const planned = plan(),
    { steps, shift } = liveSchedule(planned, ['leaven', 'mix']);
  assert.equal(shift, 0);
  assert.deepEqual(
    steps.map((s) => +s.at),
    planned.map((s) => +s.at),
  );
});

test('check-off times round to the minute', () => {
  assert.equal(stampNow(local(2026, 10, 21, 9, 0, 29)), local(2026, 10, 21, 9, 0));
  assert.equal(stampNow(local(2026, 10, 21, 9, 0, 31)), local(2026, 10, 21, 9, 1));
});

test('a recorded check-off takes the date and time from its fields', () => {
  assert.equal(retime('2026-10-21', '23:35'), local(2026, 10, 21, 23, 35));
  assert.equal(
    retime('2026-10-22', '00:05'),
    local(2026, 10, 22, 0, 5),
    'a correction past midnight uses the date given',
  );
  assert.equal(
    retime('2026-10-20', '15:22'),
    local(2026, 10, 20, 15, 22),
    'the day can move back without touching the time',
  );
  assert.equal(retime('2026-12-31', '09:00'), local(2026, 12, 31, 9, 0));
  for (const [date, time] of [
    ['2026-10-21', ''],
    ['2026-10-21', '7pm'],
    ['', '09:00'],
    ['2026-02-30', '09:00'],
    ['2026-10-21', '24:00'],
  ])
    assert.equal(retime(date, time), null, `${date} ${time}`);
  assert.equal(clockText(new Date(local(2026, 10, 21, 7, 5))), '07:05');
});

test('the countdown says how long until a step or since it was due, and the shift says how far the plan has moved', () => {
  assert.equal(untilText(minutes(22)), 'in 22 min');
  assert.equal(untilText(minutes(185)), 'in 3h 5m');
  assert.equal(untilText(minutes(0.2)), 'due now');
  assert.equal(untilText(-minutes(12)), 'due 12 min ago');
  assert.equal(shiftText(0), '');
  assert.equal(shiftText(20), 'Running 20 min behind plan. Later steps have moved to match.');
  assert.equal(shiftText(-75), 'Running 1h 15m ahead of plan. Later steps have moved to match.');
});

test('at the 78°F reference, the bulk estimate is the planned 4 hours, from start of bulk to preshape', () => {
  const { steps } = liveSchedule(plan(), []),
    e = bulkEstimate(steps, BULK_REFERENCE_F)!;
  assert.equal(e.planned, 240);
  assert.equal(e.minutes, 240);
  assert.equal(e.difference, 0);
  assert.equal(+e.readyAt, at(steps, 'shape'));
  assert.equal(+e.checkFrom, at(steps, 'shape') - minutes(30));
  assert.match(
    bulkAdvice(e, clockText),
    /^Bulk should take about 4h, ready around 18:15\. That is close to the plan\. Start checking the dough from 17:45\.$/,
  );
});

test('bulk time halves for every 15°F warmer and doubles for every 15°F cooler', () => {
  const { steps } = liveSchedule(plan(), []);
  assert.equal(bulkEstimate(steps, 93)!.minutes, 120);
  assert.equal(bulkEstimate(steps, 63)!.minutes, 480);
  assert.equal(bulkEstimate(steps, 82)!.minutes, 199);
  assert.equal(bulkEstimate(steps, 72)!.minutes, 317);
  assert.equal(bulkEstimate(steps, null), null);
  assert.equal(bulkEstimate(steps, Number.NaN), null);
});

test('the advice says how the plan moved, how many turns it now has, and what temperature would get back on plan', () => {
  const planned = plan(),
    rest = at(planned, 'rest'),
    temp = (f: number) => `${Math.round(f)}°F`;
  const advise = (f: number) => {
    const r = followDough(planned, [], {}, f);
    return bulkAdvice(r.estimate!, clockText, { turns: r.turns, hold: holdTemperature(r.estimate!, rest), temp });
  };
  assert.equal(
    advise(82),
    'Bulk should take about 3h 19m, ready around 17:34. That is 41 min before the original preshape, so preshape and every later step have moved earlier. The plan now has 6 turns instead of 7. Start checking the dough from 17:04. To preshape at 18:15 as first planned, keep the dough near 78°F.',
  );
  assert.equal(
    advise(72),
    'Bulk should take about 5h 17m, ready around 19:32. That is 1h 17m after the original preshape, so preshape and every later step have moved later. Keep folding every 30 minutes for up to one more hour, then leave the dough covered until it is ready. The plan now has 9 turns instead of 7. Start checking the dough from 19:02. To preshape at 18:15 as first planned, keep the dough near 78°F.',
  );
  assert.equal(
    advise(79),
    'Bulk should take about 3h 49m, ready around 18:04. That is close to the plan. Start checking the dough from 17:34.',
  );
});

test('the estimate runs from when bulk actually started, and preshape follows it', () => {
  const planned = plan(),
    rest = at(planned, 'rest');
  const { steps, estimate } = followDough(planned, ['rest'], { rest: rest + minutes(20) }, 82);
  assert.equal(+estimate!.readyAt, rest + minutes(20) + minutes(199));
  assert.equal(at(steps, 'shape'), rest + minutes(20) + minutes(199));
});

test('without a dough temperature, the schedule is exactly the live schedule', () => {
  const planned = plan(),
    rest = at(planned, 'rest');
  for (const [done, doneAt] of [
    [[], {}],
    [['rest'], { rest: rest + minutes(20) }],
  ] as [string[], Record<string, number>][]) {
    const followed = followDough(planned, done, doneAt, null),
      live = liveSchedule(planned, done, doneAt);
    assert.deepEqual(followed.steps, live.steps);
    assert.equal(followed.shift, live.shift);
    assert.equal(followed.estimate, null);
  }
});

test('warm dough brings preshape and every later step forward, and drops the turns that no longer fit', () => {
  const planned = plan(),
    rest = at(planned, 'rest'),
    { steps, estimate, turns, shift } = followDough(planned, [], {}, 84);
  assert.equal(estimate!.minutes, 182);
  assert.equal(at(steps, 'shape'), rest + minutes(182));
  assert.deepEqual(
    turnSteps(steps).map((s) => [s.id, +s.at - rest]),
    [1, 2, 3, 4, 5].map((n) => [`turn${n}`, minutes(30 * n)]),
  );
  assert.deepEqual(turns, { planned: 7, now: 5, capped: false });
  assert.equal(shift, 0, 'the check-off shift is reported apart from the temperature');
  for (const id of ['fold', 'fridge', 'preheat', 'done'])
    assert.equal(at(steps, id), at(planned, id) - minutes(58), id);
});

test('cool dough moves preshape later and adds a turn every 30 minutes, for up to one more hour', () => {
  const planned = plan(),
    rest = at(planned, 'rest');
  const slight = followDough(planned, [], {}, 76),
    t8 = turnSteps(slight.steps);
  assert.deepEqual(
    t8.map((s) => [s.id, +s.at - rest]),
    Array.from({ length: 8 }, (_, i) => [`turn${i + 1}`, minutes(30 * (i + 1))]),
    '76°F: one extra turn fits before the 4h 23m end',
  );
  assert.equal(t8[7].title, 'Turn 8');
  assert.equal(t8[7].note, t8[6].note);
  assert.deepEqual(slight.turns, { planned: 7, now: 8, capped: false });
  const { steps, turns } = followDough(planned, [], {}, 72),
    t = turnSteps(steps);
  assert.deepEqual(
    t.map((s) => s.id),
    Array.from({ length: 9 }, (_, i) => `turn${i + 1}`),
    '72°F: two extra turns, then the dough rests',
  );
  assert.deepEqual(turns, { planned: 7, now: 9, capped: true });
  assert.equal(at(steps, 'shape'), rest + minutes(317));
  assert.equal(at(steps, 'done'), at(planned, 'done') + minutes(77));
  assert.equal(
    steps.findIndex((s) => s.id === 'turn9') + 1,
    steps.findIndex((s) => s.id === 'shape'),
    'added turns come just before preshape',
  );
});

test('very cool dough still gets at most two extra turns, but a checked turn past the cap stays', () => {
  const planned = plan(),
    rest = at(planned, 'rest'),
    cold = followDough(planned, [], {}, 55);
  assert.ok(cold.estimate!.minutes > 600);
  assert.equal(turnSteps(cold.steps).length, 9);
  assert.equal(cold.turns!.capped, true);
  const turnIds = Array.from({ length: 12 }, (_, i) => `turn${i + 1}`),
    doneAt = Object.fromEntries([['rest', rest], ...turnIds.map((id, i) => [id, rest + minutes(30 * (i + 1))])]);
  assert.equal(turnSteps(followDough(planned, ['rest', ...turnIds], doneAt, 55).steps).length, 12);
  const over = turnSteps(followDough(planned, ['rest', 'shape'], { rest, shape: rest + minutes(600) }, 55).steps);
  assert.equal(over.length, 9, 'after a late preshape, skipped turns stop at the cap too');
});

test('once preshape is done, the note says how long bulk took against the estimate', () => {
  const planned = plan(),
    rest = at(planned, 'rest');
  const r = followDough(planned, ['rest', 'shape'], { rest, shape: rest + minutes(200) }, 84);
  assert.equal(r.bulkMinutes, 200);
  assert.equal(bulkDoneText(r.bulkMinutes!, r.estimate), 'Bulk took 3h 20m. The estimate was 3h 2m.');
  assert.equal(followDough(planned, ['rest'], { rest }, 84).bulkMinutes, null, 'not while bulk is running');
  assert.equal(bulkDoneText(240), 'Bulk took 4h.');
});

test('a later reading re-times only what is left of bulk', () => {
  const planned = plan(),
    rest = at(planned, 'rest');
  assert.equal(
    followDough(planned, ['rest'], { rest }, 78, [{ at: rest + minutes(120), f: 84 }]).estimate!.minutes,
    211,
    '2h at 78°F, then the last half at 84°F',
  );
  assert.equal(
    followDough(planned, [], {}, 82, [{ at: rest + minutes(60), f: 82 }]).estimate!.minutes,
    199,
    'the same temperature again changes nothing',
  );
  assert.equal(
    followDough(planned, [], {}, 78, [{ at: rest - minutes(30), f: 93 }]).estimate!.minutes,
    240,
    'a reading from before the final mix belongs to another bake',
  );
  assert.equal(
    followDough(planned, ['rest'], { rest }, 78, [{ at: rest, f: 84 }]).estimate!.minutes,
    182,
    'a reading in the minute bulk started counts',
  );
  assert.equal(
    followDough(planned, [], {}, 78, [{ at: rest - minutes(10), f: 84 }]).estimate!.minutes,
    182,
    'one between the final mix and bulk start applies from the start',
  );
});

test('preshape never comes before a turn that was already checked, and checked turns stay', () => {
  const planned = plan(),
    rest = at(planned, 'rest'),
    done = ['rest', 'turn1', 'turn2', 'turn3', 'turn4', 'turn5', 'turn6'];
  const { steps } = followDough(
    planned,
    done,
    Object.fromEntries(done.map((id, i) => [id, rest + minutes(30 * i)])),
    93,
  );
  assert.equal(at(steps, 'shape'), rest + minutes(180), '93°F says 2h, but turn 6 was done at 3h');
  assert.ok(steps.some((s) => s.id === 'turn6'));
  assert.ok(!steps.some((s) => s.id === 'turn7'));
});

test('once preshape is checked, the dough temperature moves no times, and only turns due before it are shown', () => {
  const planned = plan(),
    rest = at(planned, 'rest'),
    done = ['rest', 'shape'],
    doneAt = { rest, shape: rest + minutes(200) };
  const followed = followDough(planned, done, doneAt, 72).steps,
    live = liveSchedule(planned, done, doneAt).steps;
  for (const s of followed) assert.equal(+s.at, at(live, s.id), s.id);
  assert.deepEqual(
    turnSteps(followed).map((s) => s.id),
    ['turn1', 'turn2', 'turn3', 'turn4', 'turn5', 'turn6'],
    'turn 7 was due after preshape',
  );
  assert.equal(followDough(planned, done, doneAt, 72).turns, null);
});

test('turns added for cool dough and then checked stay after preshape is checked', () => {
  const planned = plan(),
    rest = at(planned, 'rest'),
    turnIds = Array.from({ length: 10 }, (_, i) => `turn${i + 1}`);
  const done = ['rest', ...turnIds],
    doneAt: Record<string, number> = {
      rest,
      ...Object.fromEntries(turnIds.map((id, i) => [id, rest + minutes(30 * (i + 1))])),
    };
  const before = followDough(planned, done, doneAt, 72).steps;
  assert.ok(before.some((s) => s.id === 'turn10'));
  const after = followDough(planned, [...done, 'shape'], { ...doneAt, shape: rest + minutes(317) }, 72).steps;
  assert.deepEqual(
    turnSteps(after).map((s) => s.id),
    turnIds,
    'turns 8 to 10 stay checked in the timeline',
  );
  assert.deepEqual(
    turnSteps(followDough(planned, done, doneAt, null).steps).map((s) => s.id),
    turnIds,
    'and stay if the temperature is cleared',
  );
});

test('turns dropped for warm dough do not come back once preshape is checked early', () => {
  const planned = plan(),
    rest = at(planned, 'rest'),
    done = ['rest', 'turn1', 'turn2', 'turn3', 'turn4', 'shape'];
  const doneAt = {
    ...Object.fromEntries(done.slice(0, 5).map((id, i) => [id, rest + minutes(30 * i)])),
    shape: rest + minutes(156),
  };
  const turns = turnSteps(followDough(planned, done, doneAt, 84).steps).map((s) => s.id);
  assert.deepEqual(
    turns,
    ['turn1', 'turn2', 'turn3', 'turn4', 'turn5'],
    'turn 5 was due before preshape, so it shows as skipped; 6 and 7 do not',
  );
});

test('a reading in the same minute as an earlier one replaces it', () => {
  const a = { at: minutes(100), f: 84 },
    b = { at: minutes(130), f: 80 };
  assert.deepEqual(withReading([b], a), [a, b], 'readings stay in time order');
  assert.deepEqual(
    withReading([a, b], { at: minutes(100), f: 82 }),
    [{ at: minutes(100), f: 82 }, b],
    'a corrected typo counts once',
  );
});

test('the temperature to get back on plan counts the fermentation already done', () => {
  const planned = plan(),
    rest = at(planned, 'rest'),
    e = followDough(planned, [], {}, 84).estimate!;
  assert.ok(
    Math.abs(holdTemperature(e, rest)! - 78) < 1e-9,
    'from the start, the reference temperature finishes on time',
  );
  const expected = 78 + 15 * Math.log2((240 - 60 * 2 ** (6 / 15)) / 180);
  assert.ok(
    Math.abs(holdTemperature(e, rest + minutes(60))! - expected) < 1e-9,
    'after an hour at 84°F, a cooler spot',
  );
  assert.equal(holdTemperature(e, +e.plannedEnd + minutes(1)), null);
});

test('planned turns sit every 30 minutes from the start of bulk, the grid followDough fits turns to', () => {
  for (const recipe of ['house', 'tartine']) {
    const planned = plan(recipe),
      rest = at(planned, 'rest');
    turnSteps(planned).forEach((s, i) => assert.equal(+s.at - rest, minutes(30 * (i + 1)), `${recipe} ${s.id}`));
  }
});

test('Tartine estimates its 3-hour warm bulk the same way, and its turns and preshape follow', () => {
  const planned = plan('tartine'),
    { steps } = liveSchedule(planned, []);
  assert.equal(bulkEstimate(steps, 78)!.planned, 180);
  assert.equal(bulkEstimate(steps, 93)!.minutes, 90);
  const rest = at(planned, 'rest'),
    warm = followDough(planned, [], {}, 93);
  assert.deepEqual(
    turnSteps(warm.steps).map((s) => +s.at - rest),
    [minutes(30), minutes(60)],
  );
  assert.equal(at(warm.steps, 'shape'), rest + minutes(90));
  assert.deepEqual(
    followDough(planned, [], {}, 78).steps,
    liveSchedule(planned, []).steps,
    'at the reference, nothing moves',
  );
});

test('°C converts through °F and back', () => {
  assert.equal(toF(25, 'C'), 77);
  assert.equal(toF(80, 'F'), 80);
  assert.ok(Math.abs(fromF(77, 'C') - 25) < 1e-9);
});

test('a dough temperature is kept from 50°F to 100°F, so 140°F is out of range', () => {
  for (const f of [81.5, 80, 83.5, 50, 100]) assert.equal(inTempRange(f, 'F'), true, `${f}°F`);
  assert.equal(inTempRange(140, 'F'), false);
});

test('any step left unchecked before a later checked step counts as skipped', () => {
  // Michael's rule since November 22, 2026. Before it only the start of bulk and the turns could be skipped, so an
  // unchecked starter feed held Up next back however far the bake had gone.
  const steps = plan();
  const turns = ['turn1', 'turn2', 'turn3', 'turn4', 'turn5', 'turn6', 'turn7'];
  assert.deepEqual(skippedSteps(steps, []), []);
  assert.deepEqual(
    skippedSteps(steps, ['leaven', 'autolyse', 'mix', 'rest', 'turn1', 'turn2', 'turn3']),
    ['feed'],
    'an unchecked starter feed is passed over once later steps are checked',
  );
  assert.deepEqual(skippedSteps(steps, ['leaven', 'rest', 'turn1', 'turn2', 'turn3', 'turn4', 'shape']), [
    'feed',
    'autolyse',
    'mix',
    'turn5',
    'turn6',
    'turn7',
  ]);
  assert.deepEqual(
    skippedSteps(steps, ['mix', 'shape']),
    ['feed', 'leaven', 'autolyse', 'rest', ...turns],
    'jumping to preshape passes everything before it',
  );
  assert.deepEqual(skippedSteps(steps, ['mix']), ['feed', 'leaven', 'autolyse']);
  assert.deepEqual(
    skippedSteps(steps, ['fridge']),
    ['feed', 'leaven', 'autolyse', 'mix', 'rest', ...turns, 'shape', 'bench1', 'fold', 'basket'],
    'every step before the latest checked one',
  );
  assert.deepEqual(skippedSteps(steps, ['turn1', 'turn2']), ['feed', 'leaven', 'autolyse', 'mix', 'rest']);
  assert.deepEqual(skippedSteps(steps, ['feed']), [], 'nothing after the latest checked step is skipped');
  assert.deepEqual(skippedSteps(steps, ['feed', 'turn9']), [], 'a check for a step not on the schedule passes nothing');
});

test('each step is coloured by its temperature: only the cold proof is cold, and preheat through the last loaf out is oven', () => {
  const house = recipeById('house')!;
  const phases = Object.fromEntries(
    plan('house', { settings: { ...defaultSettings(house), count: 4 }, ovenCapacity: 2 }).map((s) => [s.id, s.phase]),
  );
  assert.deepEqual(
    Object.keys(phases).filter((id) => phases[id] === 'cold'),
    ['fridge'],
  );
  assert.deepEqual(
    Object.keys(phases)
      .filter((id) => phases[id] === 'oven')
      .sort(),
    ['covered', 'covered-2', 'done', 'out-1', 'preheat', 'reheat-2', 'uncovered', 'uncovered-2'].sort(),
  );
  for (const id of [
    'feed',
    'leaven',
    'autolyse',
    'mix',
    'rest',
    'turn1',
    'shape',
    'bench1',
    'fold',
    'basket',
    'warmup',
    'warmup-2',
    'cooled',
  ])
    assert.equal(phases[id], 'room', id);
  assert.equal(
    plan('tartine', { proof: 'warm' }).find((s) => s.id === 'proof')?.phase,
    'room',
    'a warm proof is room temperature',
  );
});

test('a late or early turn moves nothing: later turns stay on their marks and bulk keeps its planned length', () => {
  const planned = plan(),
    bulk = at(planned, 'shape') - at(planned, 'rest');
  assert.equal(bulk, minutes(240));
  const late = liveSchedule(planned, ['rest', 'turn1', 'turn2', 'turn3'], {
    rest: at(planned, 'rest'),
    turn1: at(planned, 'turn1') + minutes(5),
    turn2: at(planned, 'turn2') + minutes(10),
    turn3: at(planned, 'turn3') + minutes(18),
  });
  assert.equal(late.shift, 0, 'no "running behind" from turns');
  for (const id of ['turn4', 'turn5', 'turn6', 'turn7', 'shape', 'fridge', 'covered', 'done'])
    assert.equal(at(late.steps, id), at(planned, id), id);
  assert.equal(at(late.steps, 'turn3'), at(planned, 'turn3') + minutes(18), 'a checked turn keeps its recorded time');
  const early = liveSchedule(planned, ['rest', 'turn1', 'turn2'], {
    rest: at(planned, 'rest'),
    turn1: at(planned, 'turn1') - minutes(8),
    turn2: at(planned, 'turn2') - minutes(12),
  });
  assert.equal(early.shift, 0);
  assert.equal(at(early.steps, 'turn3'), at(planned, 'turn3'));
  assert.equal(at(early.steps, 'shape'), at(planned, 'shape'));
});

test('starting bulk late moves the turns and preshape together, so bulk length is unchanged whatever the turns do', () => {
  const planned = plan(),
    rest = at(planned, 'rest');
  for (const lateTurns of [0, 7, 25]) {
    const done = ['rest', 'turn1', 'turn2'],
      times = {
        rest: rest + minutes(20),
        turn1: at(planned, 'turn1') + minutes(20 + lateTurns),
        turn2: at(planned, 'turn2') + minutes(20 + lateTurns),
      };
    const { steps, shift } = liveSchedule(planned, done, times);
    assert.equal(shift, 20);
    assert.equal(at(steps, 'turn3'), at(planned, 'turn3') + minutes(20));
    assert.equal(at(steps, 'shape') - at(steps, 'rest'), minutes(240), `bulk with turns ${lateTurns} min late`);
  }
});

test('a late Tartine turn moves nothing either: the next turn and preshape stay on plan', () => {
  const planned = plan('tartine');
  const { steps, shift } = liveSchedule(planned, ['rest', 'turn1'], {
    rest: at(planned, 'rest'),
    turn1: at(planned, 'turn1') + minutes(15),
  });
  assert.equal(shift, 0);
  assert.equal(at(steps, 'turn2'), at(planned, 'turn2'));
  assert.equal(at(steps, 'shape'), at(planned, 'shape'));
});

test("the gap shown between steps is the time to the next step, not the step's own length", () => {
  const steps = plan(),
    gaps = stepGaps(steps),
    gap = (id: string) => gaps.get(id);
  assert.equal(gap('rest'), 30, 'bulk starts, and turn 1 is 30 minutes later; bulk itself runs about 4 hours');
  assert.equal(gap('feed'), 660);
  const warm = steps.findIndex((s) => s.id === 'warmup');
  assert.equal(+steps[warm + 1].at, +steps[warm].at, 'warm-up and preheat start together');
  assert.equal(gap('warmup'), 0, 'steps that start together show no gap');
  assert.equal(gap('preheat'), 60);
  assert.equal(gap(steps.at(-1)!.id), 0);
  for (const [id, n] of gaps) assert.ok(n >= 0, id);
});
