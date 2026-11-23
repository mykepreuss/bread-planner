import test from 'node:test';
import assert from 'node:assert/strict';
import { recipeById, defaultSettings, type Settings } from './recipes.ts';
import { schedule, coldProofWindow, type PlanInput, type Step } from './schedule.ts';
import { dateString } from './text.ts';

// Times here are built and read in the same local zone, so these tests hold in any time zone.

/**
 * A plan for a recipe at its default settings, with the leaven started at 9:00 AM on October 21, 2026, and one loaf
 * baked at a time, changed as given. These tests used Red Spring & Rye until it was removed; it scheduled as House does.
 */
function plan(id: string, change: Partial<PlanInput> = {}, settings: Partial<Settings> = {}): PlanInput {
  const recipe = recipeById(id)!;
  return {
    recipe,
    settings: { ...defaultSettings(recipe), ...settings },
    date: '2026-10-21',
    time: '09:00',
    anchor: 'leaven',
    proof: 'cold',
    ovenCapacity: 1,
    reheat: 30,
    ...change,
  };
}
const find = (s: Step[], id: string) => s.find((x) => x.id === id)!;
/** A local date and time as `YYYY-MM-DD HH:MM`. */
const local = (date: Date) =>
  `${dateString(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const timeOf = (s: Step[]) => (id: string) => local(find(s, id).at);

test('with both loaves in the oven together, every step keeps its original time but the autolyse (decision 15)', () => {
  const actual = Object.fromEntries(
    schedule(plan('house', { ovenCapacity: 2 }))
      .filter((s) => s.id !== 'warmup')
      .map((s) => [s.id, local(s.at)]),
  );
  assert.deepEqual(actual, {
    feed: '2026-10-20 22:00',
    leaven: '2026-10-21 09:00',
    autolyse: '2026-10-21 12:30',
    mix: '2026-10-21 14:00',
    rest: '2026-10-21 14:15',
    turn1: '2026-10-21 14:45',
    turn2: '2026-10-21 15:15',
    turn3: '2026-10-21 15:45',
    turn4: '2026-10-21 16:15',
    turn5: '2026-10-21 16:45',
    turn6: '2026-10-21 17:15',
    turn7: '2026-10-21 17:45',
    shape: '2026-10-21 18:15',
    bench1: '2026-10-21 18:25',
    fold: '2026-10-21 18:55',
    basket: '2026-10-21 19:00',
    fridge: '2026-10-21 19:20',
    preheat: '2026-10-22 07:50',
    covered: '2026-10-22 08:50',
    uncovered: '2026-10-22 09:10',
    done: '2026-10-22 09:33',
  });
});

test('shaped loaves go straight into baskets and the fridge follows the 20-minute basket rest', () => {
  for (const id of ['house']) {
    const s = schedule(plan(id)),
      ids = s.map((x) => x.id);
    assert.ok(!ids.includes('bench2'), id);
    assert.equal(ids[ids.indexOf('fold') + 1], 'basket', id);
    assert.equal(find(s, 'basket').minutes, 20, id);
    assert.equal(local(find(s, 'fridge').at), '2026-10-21 19:20', id);
  }
});

test('planning back from the last loaf out reproduces the identical forward schedule', () => {
  const a = schedule(plan('house'));
  const b = schedule(plan('house', { anchor: 'done', date: '2026-10-22', time: '10:46' }));
  assert.deepEqual(a, b);
});

test('an impossible date or time, or no room in the oven, gives no schedule', () => {
  assert.deepEqual(schedule(plan('house', { date: '2026-02-31' })), []);
  assert.deepEqual(schedule(plan('house', { time: '25:00' })), []);
  assert.deepEqual(schedule(plan('house', { ovenCapacity: 0 })), []);
});

test('elapsed durations survive daylight-saving changes', () => {
  // In America/Vancouver the clocks go back at 2:00 AM on November 1, 2026, between the feed and the leaven.
  const s = schedule(plan('house', { date: '2026-11-01' }));
  assert.equal((+find(s, 'leaven').at - +find(s, 'feed').at) / 60000, 660);
  // A cold proof that starts the evening before that change still lasts 12 h 30 min.
  const w = coldProofWindow(schedule(plan('house', { date: '2026-10-31' })))!;
  assert.equal(w.minutes, 750);
  assert.equal((+w.end - +w.start) / 60000, 750);
  // On every day of 2026, each step is as far from the leaven start as on a day with no clock change. In a zone with
  // daylight saving, some of these plans cross a change, so this checks both changes; in a zone without, none can.
  const gaps = (steps: Step[]) => steps.map((x) => [x.id, (+x.at - +find(steps, 'leaven').at) / 60000]);
  let crossed = 0;
  for (const id of ['house', 'tartine']) {
    const usual = gaps(schedule(plan(id, { date: '2026-01-15' })));
    for (const day = new Date(2026, 0, 1); day.getFullYear() === 2026; day.setDate(day.getDate() + 1)) {
      const steps = schedule(plan(id, { date: dateString(day) }));
      assert.deepEqual(gaps(steps), usual, `${id} ${dateString(day)}`);
      if (steps[0].at.getTimezoneOffset() !== steps.at(-1)!.at.getTimezoneOffset()) crossed++;
    }
  }
  const daylightSaving = new Date(2026, 0, 1).getTimezoneOffset() !== new Date(2026, 6, 1).getTimezoneOffset();
  assert.equal(crossed > 0, daylightSaving, `${crossed} plans cross a clock change`);
});

test('one loaf at a time bakes two serial batches', () => {
  const s = schedule(plan('house')),
    at = timeOf(s);
  assert.equal(s.filter((x) => x.kind === 'covered').length, 2);
  assert.equal(at('out-1'), '2026-10-22 09:33');
  assert.equal(at('reheat-2'), '2026-10-22 09:33');
  assert.equal(at('covered-2'), '2026-10-22 10:03');
  assert.equal(at('done'), '2026-10-22 10:46');
});

test('one batch drops batch numbers, while serial batches keep them', () => {
  const titles = (s: Step[], ids: string[]) => ids.map((id) => find(s, id).title);
  for (const id of ['house']) {
    assert.deepEqual(
      titles(schedule(plan(id, { ovenCapacity: 2 })), ['warmup', 'covered', 'uncovered', 'done']),
      ['Take both loaves out of the fridge', 'Bake covered (both loaves)', 'Remove lid', 'All loaves out of the oven'],
      id,
    );
    assert.deepEqual(
      titles(schedule(plan(id)), ['warmup', 'covered', 'uncovered']),
      ['Take batch 1 out of fridge', 'Batch 1: bake covered (loaf 1)', 'Batch 1: remove lid'],
      id,
    );
  }
  const one = schedule(plan('house', {}, { count: 1 }));
  assert.deepEqual(titles(one, ['warmup', 'covered', 'done']), [
    'Take the loaf out of the fridge',
    'Bake covered',
    'Loaf out of the oven',
  ]);
  assert.ok(!one.some((x) => x.id.startsWith('reheat-')));
  const together = schedule(plan('tartine', { ovenCapacity: 2 }));
  assert.equal(find(together, 'warmup').title, 'Warm both loaves to room temperature');
  assert.equal(find(together, 'warmup').note, 'Remove the loaves from the refrigerator.');
  assert.equal(find(schedule(plan('tartine')), 'warmup').note, 'Remove only the loaves in the first batch.');
});

test('every schedule note ends as a complete sentence', () => {
  for (const id of ['house', 'tartine'])
    for (const ovenCapacity of [1, 2])
      for (const step of schedule(plan(id, { ovenCapacity })))
        assert.match(step.note, /[.!?]$/, `${id} ${step.id}: ${step.note}`);
});

test('parallel capacity and a partial final batch cover every loaf once', () => {
  const s = schedule(plan('house', { ovenCapacity: 2 }, { count: 3 })),
    covered = s.filter((x) => x.id.startsWith('covered'));
  assert.equal(covered.length, 2);
  assert.match(covered[0].title, /loaves 1 to 2/);
  assert.match(covered[1].title, /loaf 3/);
  const all = schedule(plan('house', { ovenCapacity: 3 }, { count: 3 }));
  assert.ok(!all.some((x) => x.kind === 'reheat'), 'one batch');
  assert.equal(all.filter((x) => x.id.startsWith('covered')).length, 1);
});

test('Tartine cold: a short rest with the leaven in, five folds before dividing, 18 hours in the fridge, and the first and last bakes on time', () => {
  const s = schedule(plan('tartine')),
    at = timeOf(s);
  assert.equal(at('autolyse'), '2026-10-21 21:00');
  assert.equal(at('mix'), '2026-10-21 21:30');
  assert.equal(at('shape'), '2026-10-22 00:30');
  assert.equal(at('fridge'), '2026-10-22 01:10');
  // 18 hours rather than the book's 10 to 12 (decision 21).
  assert.equal(find(s, 'fridge').minutes, 1080);
  assert.match(find(s, 'fridge').note, /^Cover the baskets and refrigerate for about 18 hours\./);
  assert.equal(s.filter((x) => /^turn\d+$/.test(x.id)).length, 5);
  assert.ok(+find(s, 'turn5').at < +find(s, 'shape').at);
  assert.equal(at('preheat'), '2026-10-22 19:40');
  assert.equal(at('covered'), '2026-10-22 20:10');
  assert.equal(at('out-1'), '2026-10-22 20:50');
  assert.equal(at('done'), '2026-10-22 22:00');
  assert.match(find(s, 'autolyse').note, /leaven used/);
  assert.match(find(s, 'preheat').note, /500°F/);
  assert.match(find(s, 'covered').note, /450°F/);
});

test('Tartine warm proof leaves out the fridge and warm-up, and the preheat overlaps the proof', () => {
  const s = schedule(plan('tartine', { proof: 'warm' })),
    at = timeOf(s);
  assert.ok(!s.some((x) => x.id === 'fridge' || x.id.startsWith('warmup')));
  assert.equal(at('preheat'), '2026-10-22 04:10');
  assert.equal(at('covered'), '2026-10-22 04:40');
  assert.equal(at('done'), '2026-10-22 06:30');
});

test('planning back is from the last batch, for every method, proof and oven capacity', () => {
  for (const id of ['house', 'tartine'])
    for (const proof of ['warm', 'cold'] as const)
      for (const ovenCapacity of [1, 2, 3]) {
        const p = plan(id, { proof, ovenCapacity }, { count: 3 }),
          a = schedule(p),
          finish = local(find(a, 'done').at);
        const b = schedule({ ...p, anchor: 'done', date: finish.slice(0, 10), time: finish.slice(11) });
        assert.deepEqual(a, b, `${id} ${proof} ${ovenCapacity}`);
      }
});

test('instructions include readiness, pot preheating, scoring, steam, and batch reheating', () => {
  for (const id of ['house', 'tartine']) {
    const text = schedule(plan(id))
      .map((x) => `${x.note} ${x.readiness}`)
      .join(' ');
    for (const required of ['floats', '20% to 30%', 'Dutch oven', 'score', 'steam', 'Clean the pot', 'wire rack'])
      assert.ok(text.includes(required), `${id}: ${required}`);
  }
});

test('House autolyse is the leaven’s last 90 minutes, and the cold proof runs from evening to the next morning', () => {
  const s = schedule(plan('house')),
    at = timeOf(s),
    w = coldProofWindow(s)!;
  assert.equal(at('leaven'), '2026-10-21 09:00');
  // Decision 15: 90 minutes, ending as the leaven is ready; it was 4 hours 30 minutes from 9:30 AM.
  assert.equal(at('autolyse'), '2026-10-21 12:30');
  assert.equal(find(s, 'autolyse').minutes, 90);
  assert.equal(at('mix'), '2026-10-21 14:00');
  assert.equal(local(w.start), '2026-10-21 19:20');
  assert.equal(local(w.end), '2026-10-22 07:50');
  assert.equal(w.minutes, 750);
  assert.equal(w.overnight, true);
  assert.equal(at('covered'), '2026-10-22 08:50');
  assert.equal(at('done'), '2026-10-22 10:46');
  // The autolyse is the flours and the first water only, as the record shows; the rest waits for the final mix.
  assert.equal(
    find(s, 'autolyse').note,
    "Mix Anita's all-purpose flour (800 g), whole-wheat flour (100 g), water (680 g). Cover. Keep the remaining ingredients for the final mix.",
  );
});

test('each recipe sets its own autolyse length, by default as before (decision 22)', () => {
  const lengths = Object.fromEntries(
    ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer', 'oat-porridge'].map((id) => [
      id,
      [defaultSettings(recipeById(id)!).autolyse, find(schedule(plan(id)), 'autolyse').minutes],
    ]),
  );
  assert.deepEqual(lengths, {
    house: [90, 90],
    tartine: [30, 30],
    olive: [90, 90],
    sesame: [90, 90],
    'whole-wheat': [120, 120],
    'country-rye': [50, 50],
    emmer: [30, 30],
    'oat-porridge': [30, 30],
  });
});

test('an autolyse ends as the leaven is ready, so a longer or shorter one moves only its own start (decision 22)', () => {
  for (const [id, minutes, start] of [
    ['house', 270, '2026-10-21 09:30'],
    ['house', 0, '2026-10-21 14:00'],
    ['olive', 60, '2026-10-21 13:00'],
    ['whole-wheat', 60, '2026-10-21 20:00'],
    ['whole-wheat', 720, '2026-10-21 09:00'],
  ] as const) {
    const before = schedule(plan(id)),
      after = schedule(plan(id, {}, { autolyse: minutes }));
    assert.equal(local(find(after, 'autolyse').at), start, `${id} at ${minutes} minutes starts then`);
    assert.equal(find(after, 'autolyse').minutes, minutes);
    const others = (s: Step[]) => s.filter((x) => x.id !== 'autolyse' && x.id !== 'toast').map((x) => [x.id, +x.at]);
    assert.deepEqual(others(after), others(before), `${id} at ${minutes} minutes moves nothing else`);
  }
});

test('with the leaven in the initial mix, a longer rest moves every step after it (decision 22)', () => {
  for (const id of ['tartine', 'country-rye', 'emmer', 'oat-porridge']) {
    const before = schedule(plan(id)),
      d = defaultSettings(recipeById(id)!).autolyse,
      after = schedule(plan(id, {}, { autolyse: d + 40 }));
    // Oat Porridge's porridge is timed from Turn 2, so it moves too; a rest beyond the 40 minutes allowed, as here, puts
    // it after the initial mix.
    assert.deepEqual(after.map((x) => x.id).sort(), before.map((x) => x.id).sort());
    after.forEach((x) => {
      const moved = (+x.at - +before.find((y) => y.id === x.id)!.at) / 60000;
      assert.equal(moved, x.id === 'leaven' || x.id === 'autolyse' ? 0 : 40, `${id}: ${x.id}`);
    });
    assert.equal(find(after, 'autolyse').minutes, d + 40);
  }
});

test('House proof counts elapsed minutes across midnight, and a daytime proof is named for it', () => {
  const s = schedule(plan('house', { time: '21:00' })),
    w = coldProofWindow(s)!;
  assert.equal(w.overnight, false);
  assert.equal(find(s, 'fridge').title, 'Cold proof (daytime)');
  assert.equal((+w.end - +w.start) / 60000, 750);
});

test('two loaves bake together and finish after one bake cycle', () => {
  const s = schedule(plan('house', { ovenCapacity: 2 }));
  assert.equal(s.filter((x) => x.id.startsWith('covered')).length, 1);
  assert.match(find(s, 'covered').title, /both loaves/);
  assert.equal(local(find(s, 'done').at), '2026-10-22 09:33');
  assert.ok(!s.some((x) => x.id.startsWith('reheat-')));
});

test('preshaping takes 10 minutes and starts by turning the dough out', () => {
  for (const id of ['house']) {
    const step = find(schedule(plan(id)), 'shape');
    assert.equal(step.minutes, 10, id);
    assert.match(step.note, /^Turn the dough out of its container onto your work surface\./, id);
  }
});

test('a year before 1000 gives a schedule, with its dates written in four digits', () => {
  for (const date of ['0202-11-22', '0999-12-31', '1000-01-01']) {
    const steps = schedule(plan('house', { date }));
    assert.ok(steps.length > 0, `${date} has steps`);
    assert.equal(dateString(steps.find((s) => s.id === 'leaven')!.at), date);
  }
  assert.equal(dateString(new Date(2026, 10, 22)), '2026-11-22');
});

test('no plan has a cooling mark: each batch ends when it comes out of the oven (Michael, November 22, 2026)', () => {
  for (const id of ['house', 'tartine'])
    for (const proof of ['cold', 'warm'] as const)
      for (const [count, ovenCapacity] of [
        [1, 1],
        [2, 2],
        [3, 1],
        [5, 2],
      ]) {
        const s = schedule(plan(id, { proof, ovenCapacity }, { count })),
          label = `${id} ${proof} ${count} loaves, ${ovenCapacity} at once`;
        assert.ok(s.length > 0, label);
        assert.ok(!s.some((x) => x.id.startsWith('cooled') || /cooling mark/.test(x.title)), label);
        assert.equal(s.at(-1)!.id, 'done', `${label}: the last loaf out is the last step`);
        assert.match(s.at(-1)!.note, /Cool each loaf at least 15 minutes before slicing\./, label);
      }
});

test('the House final mix lists rye flour, leaven, salt and water as separate tick-offs, with the weights out of its note (Michael, November 22, 2026)', () => {
  const steps = schedule(plan('house')),
    mix = find(steps, 'mix');
  assert.deepEqual(mix.additions, [
    { id: 'mix:rye-flour', name: 'Rye flour', grams: 100 },
    { id: 'mix:leaven', name: 'Leaven', grams: 200 },
    { id: 'mix:salt', name: 'Salt', grams: 20 },
    { id: 'mix:water', name: 'Water', grams: 100 },
  ]);
  assert.equal(mix.note, 'Add these after the autolyse. Mix until incorporated.');
  // No other step has tick-offs: the leaven build and the autolyse keep their sentence.
  assert.deepEqual(
    steps.filter((s) => s.additions).map((s) => s.id),
    ['mix'],
  );
  // Three loaves in one bowl weigh half as much again, to the gram.
  const three = find(schedule(plan('house', { mixCapacity: 3 }, { count: 3 })), 'mix').additions!;
  assert.deepEqual(
    three.map((a) => [a.id, Math.round(a.grams * 1e6) / 1e6]),
    [
      ['mix:rye-flour', 150],
      ['mix:leaven', 300],
      ['mix:salt', 30],
      ['mix:water', 150],
    ],
  );
});

test('an ingredient the recipe has none of gets no tick-off, and a final mix with nothing to add says only to mix', () => {
  const house = recipeById('house')!,
    noRye = find(schedule(plan('house', {}, { flours: { ...house.defaults.flours, rye: 0 } })), 'mix');
  assert.deepEqual(
    noRye.additions!.map((a) => a.id),
    ['mix:leaven', 'mix:salt', 'mix:water'],
  );
  const noSalt = find(schedule(plan('house', {}, { salt: 0, reserve: 0 })), 'mix');
  assert.deepEqual(
    noSalt.additions!.map((a) => a.id),
    ['mix:rye-flour', 'mix:leaven'],
  );
  const nothing = find(
    schedule(plan('house', {}, { salt: 0, reserve: 0, leaven: 0, flours: { ...house.defaults.flours, rye: 0 } })),
    'mix',
  );
  assert.equal(nothing.additions, undefined);
  assert.equal(nothing.note, 'Mix until incorporated.');
});

test("Tartine's second addition lists its salt and water as tick-offs, and the leaven first after Whole Wheat's autolyse", () => {
  // Emmer/Einkorn's 25 g of salt is checked in emmer.test.ts.
  for (const id of ['tartine', 'whole-wheat', 'country-rye']) {
    const steps = schedule(plan(id)),
      mix = find(steps, 'mix'),
      leaven = id === 'whole-wheat';
    assert.deepEqual(mix.additions, [
      ...(leaven ? [{ id: 'mix:leaven', name: 'Leaven', grams: 200 }] : []),
      { id: 'mix:salt', name: 'Salt', grams: 20 },
      { id: 'mix:water', name: 'Water', grams: 50 },
    ]);
    assert.equal(
      mix.note,
      `Work in the ${leaven ? 'leaven, ' : ''}salt and reserved water. Keep mixing if the dough separates; it should come together again.`,
    );
    assert.equal(mix.title, leaven ? 'Add leaven, salt and final water' : 'Add salt and final water');
    assert.deepEqual(
      steps.filter((s) => s.additions).map((s) => s.id),
      ['mix'],
    );
  }
});

test('a doubled batch is mixed in 2 bowls and a tripled one in 3, each with its own weights and tick-offs, then combined for bulk (Michael, November 22, 2026)', () => {
  const four = schedule(plan('house', {}, { count: 4 })),
    step = (id: string) => find(four, id);
  // The autolyse lists one bowl's weights: the default batch's, since 4 loaves at 2 per mix is two default batches.
  assert.equal(
    step('autolyse').note,
    "In each of 2 bowls, mix Anita's all-purpose flour (800 g), whole-wheat flour (100 g), water (680 g). Cover. Keep the remaining ingredients for the final mix.",
  );
  assert.equal(step('mix').note, 'Add these to each bowl after the autolyse. Mix until incorporated.');
  assert.deepEqual(
    step('mix').additions!.map((a) => `${a.bowl} ${a.id} ${a.name} ${Math.round(a.grams * 1e6) / 1e6}`),
    [
      '1 mix:1:rye-flour Rye flour 100',
      '1 mix:1:leaven Leaven 200',
      '1 mix:1:salt Salt 20',
      '1 mix:1:water Water 100',
      '2 mix:2:rye-flour Rye flour 100',
      '2 mix:2:leaven Leaven 200',
      '2 mix:2:salt Salt 20',
      '2 mix:2:water Water 100',
    ],
  );
  assert.equal(
    step('rest').note,
    'Combine both bowls in one container. Keep covered in a warm place, about 75°F to 80°F / 24°C to 27°C.',
  );
  assert.match(step('leaven').note, / Each of the 2 bowls gets 200 g\.$/);
  // Six loaves make three bowls, each the default batch again.
  const six = schedule(plan('house', {}, { count: 6 }));
  assert.match(find(six, 'autolyse').note, /^In each of 3 bowls, mix Anita's all-purpose flour \(800 g\)/);
  assert.equal(new Set(find(six, 'mix').additions!.map((a) => a.bowl)).size, 3);
  assert.match(find(six, 'rest').note, /^Combine all 3 bowls in one container\. /);
  // Mixing in bowls changes no step's time, and nothing after the start of bulk.
  const oneBowl = schedule(plan('house', { mixCapacity: 4 }, { count: 4 }));
  assert.deepEqual(
    four.map((s) => [s.id, +s.at, s.minutes]),
    oneBowl.map((s) => [s.id, +s.at, s.minutes]),
  );
  const after = (steps: Step[]) => steps.slice(steps.findIndex((s) => s.id === 'turn1'));
  assert.deepEqual(after(four), after(oneBowl));
});

test('the loaves split equally between bowls, and a bowl that holds them all is one mix as before', () => {
  // Three loaves at 2 per mix: two equal bowls of 1.5 loaves.
  const three = find(schedule(plan('house', {}, { count: 3 })), 'mix').additions!;
  assert.deepEqual(
    three.filter((a) => a.name === 'Salt').map((a) => [a.id, Math.round(a.grams * 1e6) / 1e6]),
    [
      ['mix:1:salt', 15],
      ['mix:2:salt', 15],
    ],
  );
  // Two loaves, or any count up to the bowl's size, keep the single list and wording.
  for (const [count, mixCapacity] of [
    [1, 2],
    [2, 2],
    [4, 4],
    [5, 8],
  ]) {
    const steps = schedule(plan('house', { mixCapacity }, { count }));
    assert.ok(
      find(steps, 'mix').additions!.every((a) => a.bowl === undefined && /^mix:[a-z-]+$/.test(a.id)),
      `${count} at ${mixCapacity}`,
    );
    assert.match(find(steps, 'autolyse').note, /^Mix /);
    assert.match(find(steps, 'rest').note, /^Keep covered/);
  }
  // A plan that doesn't say mixes 2 loaves per bowl.
  assert.equal(find(schedule(plan('house', {}, { count: 4 })), 'mix').additions!.length, 8);
});

test('Tartine recipes split the initial mix and the salt step between bowls, and combine them for bulk', () => {
  for (const id of ['tartine', 'whole-wheat', 'country-rye', 'emmer', 'oat-porridge']) {
    const steps = schedule(plan(id, {}, { count: 4 }));
    assert.match(
      find(steps, 'autolyse').note,
      /^Split this mix between 2 bowls, with an equal share of everything in each\. /,
      id,
    );
    const leaven = id === 'whole-wheat';
    assert.equal(
      find(steps, 'mix').note,
      `Work the ${leaven ? 'leaven, ' : ''}salt and reserved water into each bowl. Keep mixing if the dough separates; it should come together again.`,
    );
    assert.deepEqual(
      find(steps, 'mix').additions!.map((a) => a.id),
      leaven
        ? ['mix:1:leaven', 'mix:1:salt', 'mix:1:water', 'mix:2:leaven', 'mix:2:salt', 'mix:2:water']
        : ['mix:1:salt', 'mix:1:water', 'mix:2:salt', 'mix:2:water'],
    );
    assert.match(find(steps, 'rest').note, /^Combine both bowls in one container\. Cover and keep/);
  }
});
