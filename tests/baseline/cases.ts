/**
 * The inputs the baseline records. `update.ts` runs them through the current code once and stores inputs and outputs
 * together in baseline.json; the test reads its inputs from there, so this file only matters when the record is
 * deliberately rewritten.
 *
 * Not covered, because no saved data on the live site can reach them: the hidden "Red Spring & Rye Variation"
 * (`manual-rye`) and saved data from versions 1 to 4. Every version of the app on this site saved version 5 until
 * step 3b of the rebuild.
 *
 * On November 22, 2026 Michael removed four recipes (White & Whole Wheat, Red Spring & Rye, Five-Flour and Four-Flour
 * Sourdough). Their cases left the record and every other case stayed as it was; see `randomBakes`. The same day he
 * added Tartine Olive, Sesame, Whole Wheat and Country Rye, whose cases were added after the others.
 */
import { readFileSync } from 'node:fs';
import { schedule } from '../../src/domain/schedule.ts';
import { planOf } from '../../src/state/schema.ts';
import { decode } from './format.ts';
import { plannerState, stamp, local, type PlanInput, type FormulaInput, type HelperCall } from './observe.ts';

export const RECIPES = ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye'];
const DAY = '2026-11-22',
  BEFORE = '2026-11-21 15:20';
const minutes = (t: string, n: number) => stamp(local(t) + n * 60000).slice(0, 16);

/** The plan's step times, to place check-offs on them. */
export function plannedTimes(i: PlanInput) {
  return new Map(schedule(planOf(plannerState(i))).map((s) => [s.id, stamp(s.at).slice(0, 16)]));
}
/** Checks every step up to and including `last` at its planned time, with `late` minutes added to the named steps. */
export function upTo(i: PlanInput, last: string, late: Record<string, number> = {}): PlanInput {
  const times = plannedTimes(i),
    done: string[] = [],
    doneAt: Record<string, string> = {};
  for (const [id, t] of times) {
    done.push(id);
    doneAt[id] = late[id] ? minutes(t, late[id]) : t;
    if (id === last) break;
  }
  if (!times.has(last)) throw new Error(`No step ${last}`);
  return { ...i, done, doneAt };
}

function schedules(): [string, PlanInput][] {
  const out: [string, PlanInput][] = [],
    plan = (recipe: string, more: Partial<PlanInput> = {}): PlanInput => ({
      recipe,
      date: DAY,
      time: '09:00',
      now: BEFORE,
      ...more,
    });
  for (const recipe of RECIPES)
    for (const count of [1, 2, 3])
      for (const ovenCapacity of [1, 2]) {
        out.push([
          `${recipe}, ${count} loaves, ${ovenCapacity} at once`,
          plan(recipe, { params: { count }, ovenCapacity }),
        ]);
        if (recipe === 'tartine')
          out.push([
            `tartine warm proof, ${count} loaves, ${ovenCapacity} at once`,
            plan(recipe, { params: { count }, ovenCapacity, proof: 'warm' }),
          ]);
      }
  for (const recipe of ['house', 'tartine'])
    for (const count of [4, 5, 8])
      for (const ovenCapacity of [1, 2])
        out.push([
          `${recipe}, ${count} loaves, ${ovenCapacity} at once`,
          plan(recipe, { params: { count }, ovenCapacity }),
        ]);
  for (const recipe of RECIPES)
    for (const [count, ovenCapacity] of [
      [2, 2],
      [3, 1],
    ]) {
      out.push([
        `${recipe} planned back from the finish, ${count} loaves, ${ovenCapacity} at once`,
        plan(recipe, { anchor: 'done', date: '2026-11-23', time: '18:00', params: { count }, ovenCapacity }),
      ]);
      if (recipe === 'tartine')
        out.push([
          `tartine warm proof planned back from the finish, ${count} loaves, ${ovenCapacity} at once`,
          plan(recipe, {
            anchor: 'done',
            date: '2026-11-23',
            time: '18:00',
            proof: 'warm',
            params: { count },
            ovenCapacity,
          }),
        ]);
    }
  for (const [recipe, time, proof] of [
    ['house', '05:00'],
    ['house', '17:00'],
    ['house', '21:00'],
    ['house', '23:45'],
    ['tartine', '20:00'],
    ['tartine', '06:00', 'warm'],
  ] as [string, string, ('cold' | 'warm')?][])
    out.push([`${recipe}${proof ? ' warm proof' : ''} starting at ${time}`, plan(recipe, { time, proof })]);
  out.push(['house across the end of daylight saving', plan('house', { date: '2026-10-31' })]);
  out.push([
    'tartine overnight across the end of daylight saving',
    plan('tartine', { date: '2026-10-31', time: '20:00' }),
  ]);
  out.push(['house starting in the repeated hour on Nov 1', plan('house', { date: '2026-11-01', time: '01:30' })]);
  out.push([
    'house finishing on the morning daylight saving ends',
    plan('house', { anchor: 'done', date: '2026-11-01', time: '08:00' }),
  ]);
  out.push([
    'house cold proof across the start of daylight saving',
    plan('house', { date: '2026-03-07', time: '21:00' }),
  ]);
  out.push([
    'tartine overnight across the start of daylight saving',
    plan('tartine', { date: '2026-03-07', time: '20:00' }),
  ]);
  out.push(['house at a time skipped by daylight saving', plan('house', { date: '2026-03-08', time: '02:30' })]);
  out.push(['an impossible date', plan('house', { date: '2026-02-31' })]);
  out.push(['an impossible time', plan('house', { time: '25:00' })]);
  out.push(['a time without a leading zero', plan('house', { time: '9:00' })]);
  out.push(['a fractional loaf count', plan('house', { params: { count: 1.5 } })]);
  out.push(['zero loaves', plan('house', { params: { count: 0 } })]);
  out.push(['zero loaves baked at once', plan('house', { ovenCapacity: 0 })]);
  out.push(['no flour in the blend', plan('house', { params: { flour_anita: 0, flour_wheat: 0, flour_rye: 0 } })]);
  out.push(['no time to reheat between batches', plan('house', { params: { count: 5 }, reheat: 0 })]);
  out.push(['45 minutes to reheat between batches', plan('house', { params: { count: 5 }, reheat: 45 })]);
  out.push([
    'tartine one at a time with 45 minutes to reheat',
    plan('tartine', { params: { count: 3 }, ovenCapacity: 1, reheat: 45 }),
  ]);
  out.push([
    'house with an empty leaven build',
    plan('house', { params: { buildSeed: 0, buildBread: 0, buildWheat: 0, buildWater: 0 } }),
  ]);
  out.push(['house at 85% total hydration', plan('house', { totalHydration: 85 })]);
  return out;
}

function bakeDays(): [string, PlanInput][] {
  const house = (more: Partial<PlanInput> = {}): PlanInput => ({
    recipe: 'house',
    date: DAY,
    time: '09:00',
    now: BEFORE,
    ...more,
  });
  const tartine = (more: Partial<PlanInput> = {}): PlanInput => ({
    recipe: 'tartine',
    date: DAY,
    time: '09:00',
    now: BEFORE,
    ...more,
  });
  const marks = (start: string, n: number) =>
    Object.fromEntries([
      ['rest', start],
      ...Array.from({ length: n }, (_, i) => [`turn${i + 1}`, minutes(start, 30 * (i + 1))]),
    ]);
  const turns = (n: number) => Array.from({ length: n }, (_, i) => `turn${i + 1}`);
  return [
    ['up next is the starter feed the evening before', house({ now: '2026-11-21 20:00' })],
    [
      'a late starter feed and autolyse move nothing',
      house({
        done: ['feed', 'autolyse'],
        doneAt: { feed: '2026-11-21 23:10', autolyse: '2026-11-22 10:15' },
        now: '2026-11-22 10:20',
      }),
    ],
    [
      'a late leaven moves everything after it',
      house({
        done: ['feed', 'leaven'],
        doneAt: { feed: '2026-11-21 22:00', leaven: '2026-11-22 09:40' },
        now: '2026-11-22 10:00',
      }),
    ],
    [
      'the latest step that moves the plan sets the shift',
      house({
        done: ['leaven', 'autolyse', 'mix', 'rest'],
        doneAt: {
          leaven: '2026-11-22 09:40',
          autolyse: '2026-11-22 10:10',
          mix: '2026-11-22 14:25',
          rest: '2026-11-22 14:25',
        },
        now: '2026-11-22 14:40',
      }),
    ],
    [
      'an early final mix pulls the plan forward',
      house({
        done: ['feed', 'leaven', 'autolyse', 'mix'],
        doneAt: {
          feed: '2026-11-21 22:00',
          leaven: '2026-11-22 09:00',
          autolyse: '2026-11-22 09:30',
          mix: '2026-11-22 13:45',
        },
        now: '2026-11-22 13:50',
      }),
    ],
    [
      'late turns move nothing',
      { ...upTo(house(), 'turn3', { turn1: 5, turn2: 10, turn3: 18 }), now: '2026-11-22 16:10' },
    ],
    ['the dough check opens 30 minutes before preshape', { ...upTo(house(), 'turn6'), now: '2026-11-22 17:50' }],
    ['82°F after mixing, before bulk starts', { ...upTo(house(), 'mix'), doughTemp: 82, now: '2026-11-22 14:10' }],
    ['72°F dough gains two turns, then rests', { ...upTo(house(), 'rest'), doughTemp: 72, now: '2026-11-22 15:00' }],
    ['76°F dough gains one turn', { ...upTo(house(), 'rest'), doughTemp: 76, now: '2026-11-22 15:00' }],
    ['55°F dough stops at nine turns', { ...upTo(house(), 'rest'), doughTemp: 55, now: '2026-11-22 15:00' }],
    [
      '93°F dough waits for a turn already checked',
      house({
        done: ['rest', ...turns(6)],
        doneAt: marks('2026-11-22 14:15', 6),
        doughTemp: 93,
        now: '2026-11-22 17:20',
      }),
    ],
    [
      'a later reading re-times only the rest of bulk',
      {
        ...upTo(house(), 'rest'),
        doughTemp: 78,
        bulkTemps: [{ at: '2026-11-22 16:15', f: 84 }],
        now: '2026-11-22 16:20',
      },
    ],
    [
      'readings from before the final mix are ignored',
      {
        ...upTo(house(), 'rest'),
        doughTemp: 78,
        bulkTemps: [
          { at: '2026-11-22 13:45', f: 93 },
          { at: '2026-11-22 14:05', f: 84 },
        ],
        now: '2026-11-22 14:30',
      },
    ],
    [
      'preshape checked: how long bulk took',
      house({
        done: ['rest', 'shape'],
        doneAt: { rest: '2026-11-22 14:15', shape: '2026-11-22 17:35' },
        doughTemp: 84,
        now: '2026-11-22 17:40',
      }),
    ],
    [
      'preshape checked early with warm dough',
      house({
        done: ['rest', ...turns(4), 'shape'],
        doneAt: { ...marks('2026-11-22 14:15', 4), shape: '2026-11-22 16:51' },
        doughTemp: 84,
        now: '2026-11-22 17:00',
      }),
    ],
    [
      'extra turns for cool dough stay once checked, through preshape',
      house({
        done: ['rest', ...turns(10), 'shape'],
        doneAt: { ...marks('2026-11-22 14:15', 10), shape: '2026-11-22 19:32' },
        doughTemp: 72,
        now: '2026-11-22 19:40',
      }),
    ],
    [
      'clearing the temperature keeps checked extra turns',
      house({ done: ['rest', ...turns(10)], doneAt: marks('2026-11-22 14:15', 10), now: '2026-11-22 19:20' }),
    ],
    [
      '55°F dough with a late preshape',
      house({
        done: ['rest', 'shape'],
        doneAt: { rest: '2026-11-22 14:15', shape: '2026-11-23 00:15' },
        doughTemp: 55,
        now: '2026-11-23 00:20',
      }),
    ],
    [
      'checked turns past the cap stay',
      house({
        done: ['rest', ...turns(12)],
        doneAt: marks('2026-11-22 14:15', 12),
        doughTemp: 55,
        now: '2026-11-22 20:20',
      }),
    ],
    ['checks without times follow the plan', house({ done: ['leaven', 'mix'], now: '2026-11-22 14:30' })],
    [
      '°C readings and the temperature to get back on plan',
      {
        ...upTo(house(), 'rest'),
        tempUnit: 'C',
        doughTemp: 84,
        bulkTemps: [{ at: '2026-11-22 15:15', f: 80 }],
        now: '2026-11-22 15:20',
      },
    ],
    ['close to plan', { ...upTo(house(), 'rest'), doughTemp: 79, now: '2026-11-22 14:30' }],
    [
      'no steady temperature in range gets back on plan',
      { ...upTo(house(), 'rest'), doughTemp: 60, now: '2026-11-22 17:30' },
    ],
    [
      'a late fridge moves the oven; Up next is the warm-up',
      { ...upTo(house(), 'fridge', { fridge: 30 }), now: '2026-11-23 07:00' },
    ],
    [
      'four loaves one at a time: a late first bake moves later batches',
      {
        ...upTo(house({ params: { count: 4 }, ovenCapacity: 1 }), 'covered', { covered: 15 }),
        now: '2026-11-23 09:10',
      },
    ],
    [
      'five loaves, two at a time, into the second batch',
      { ...upTo(house({ params: { count: 5 } }), 'reheat-2', { covered: 10 }), now: '2026-11-23 09:55' },
    ],
    ['every step checked: the bake is complete', { ...upTo(house(), 'done'), now: '2026-11-23 12:00' }],
    ['a plan that ended with nothing checked', house({ date: '2026-11-13' })],
    ['a plan that ended part way: Up next is overdue', { ...upTo(house({ date: '2026-11-13' }), 'leaven') }],
    [
      'jumping from the final mix to preshape skips bulk',
      house({
        done: ['leaven', 'mix', 'shape'],
        doneAt: { leaven: '2026-11-22 09:00', mix: '2026-11-22 14:00', shape: '2026-11-22 18:15' },
        now: '2026-11-22 18:20',
      }),
    ],
    [
      'house planned back from the finish, with a late leaven',
      house({
        anchor: 'done',
        date: '2026-11-23',
        time: '09:33',
        done: ['leaven'],
        doneAt: { leaven: '2026-11-22 09:40' },
        now: '2026-11-22 09:45',
      }),
    ],
    [
      'tartine: a late turn moves nothing, warm dough shortens bulk',
      { ...upTo(tartine(), 'turn1', { turn1: 15 }), doughTemp: 93, now: '2026-11-22 22:20' },
    ],
    [
      'tartine planned back from the finish, with a late leaven',
      tartine({
        anchor: 'done',
        date: '2026-11-23',
        time: '18:00',
        done: ['leaven'],
        doneAt: { leaven: '2026-11-22 06:50' },
        now: '2026-11-22 07:00',
      }),
    ],
    [
      'tartine warm proof, one loaf, into the bake',
      {
        ...upTo(tartine({ proof: 'warm', params: { count: 1 }, ovenCapacity: 1 }), 'covered'),
        now: '2026-11-23 06:00',
      },
    ],
    [
      'olive with its add-in step up next, after Turn 1',
      { ...upTo(tartine({ recipe: 'olive' }), 'turn1'), now: '2026-11-22 14:50' },
    ],
    [
      'sesame with its toast step up next, as the autolyse finishes',
      { ...upTo(tartine({ recipe: 'sesame' }), 'autolyse'), now: '2026-11-22 13:50' },
    ],
    // The final mix's tick-offs, added November 22, 2026.
    [
      'the final mix is up next with everything ticked but the salt',
      {
        ...upTo(house(), 'autolyse'),
        added: ['mix:rye-flour', 'mix:leaven', 'mix:water'],
        now: '2026-11-22 14:02',
      },
    ],
    [
      'the final mix was checked with the salt still not ticked',
      {
        ...upTo(house(), 'mix'),
        added: ['mix:rye-flour', 'mix:leaven', 'mix:water'],
        now: '2026-11-22 14:20',
      },
    ],
    [
      'tartine: the salt ticked and the water not, at the second addition',
      { ...upTo(tartine(), 'autolyse'), added: ['mix:salt'], now: '2026-11-22 21:31' },
    ],
    // Mixing in bowls, added November 22, 2026.
    [
      'four loaves in two bowls, the final mix up next, bowl 2 still missing its salt',
      {
        ...upTo(house({ params: { count: 4 } }), 'autolyse'),
        added: ['mix:1:rye-flour', 'mix:1:leaven', 'mix:1:salt', 'mix:1:water', 'mix:2:rye-flour', 'mix:2:leaven'],
        now: '2026-11-22 14:02',
      },
    ],
    ['six loaves in three bowls, planned', house({ params: { count: 6 } })],
    ['four loaves mixed in one bowl of four', house({ params: { count: 4 }, mixCapacity: 4 })],
    ['tartine, four loaves in two bowls, planned', tartine({ params: { count: 4 } })],
  ];
}

/**
 * Bakes at random points: steps checked late or early, some skipped or without a time, and dough temperatures and
 * readings. They were drawn from all six recipes with a seeded generator; once four recipes were removed, drawing again
 * would change every later bake, so they are kept exactly as baseline.json stores them, less the removed recipes'
 * bakes. The generator is in git history before November 22, 2026.
 */
function randomBakes(): [string, PlanInput][] {
  const recorded = decode(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
  return recorded.plans
    .filter(({ name, input }) => name.startsWith('random bake ') && RECIPES.includes(input.recipe))
    .map(({ name, input }) => [name, input]);
}

function formulas(): [string, FormulaInput][] {
  const out: [string, FormulaInput][] = [];
  for (const recipe of RECIPES) {
    out.push([`${recipe} as it comes`, { recipe }]);
    out.push([`${recipe}, 3 loaves of 850 g`, { recipe, params: { count: 3, weight: 850 } }]);
    out.push([`${recipe} at 85% total hydration`, { recipe, totalHydration: 85 }]);
    out.push([`${recipe} at 70% total hydration`, { recipe, totalHydration: 70 }]);
  }
  const house: [string, Record<string, number>][] = [
    ['no leaven', { leaven: 0 }],
    ['35% leaven', { leaven: 35 }],
    ['no salt', { salt: 0 }],
    ['2.6% salt', { salt: 2.6 }],
    ['no water held back', { reserve: 0 }],
    ['all water held back', { reserve: 100 }],
    ['no rye', { flour_rye: 0 }],
    ["60 parts Anita's", { flour_anita: 60 }],
    ['no flour', { flour_anita: 0, flour_wheat: 0, flour_rye: 0 }],
    ['an empty leaven build', { buildSeed: 0, buildBread: 0, buildWheat: 0, buildWater: 0 }],
    ['a wetter leaven build', { buildWater: 200 }],
    ['no starter in the build', { buildSeed: 0 }],
    ['a build of starter and flour only', { buildWater: 0, buildWheat: 0, buildBread: 100 }],
    ['one 1 g loaf', { count: 1, weight: 1 }],
    ['twelve loaves', { count: 12 }],
  ];
  for (const [name, params] of house) out.push([`house with ${name}`, { recipe: 'house', params }]);
  out.push([
    'house with no leaven at 90% total hydration',
    { recipe: 'house', params: { leaven: 0 }, totalHydration: 90 },
  ]);
  out.push(['tartine with 30% leaven', { recipe: 'tartine', params: { leaven: 30 } }]);
  out.push([
    'tartine with an empty leaven build',
    { recipe: 'tartine', params: { buildSeed: 0, buildBread: 0, buildWheat: 0, buildWater: 0 } },
  ]);
  return out;
}

/**
 * Saved browser data: version 5 saves as the live site wrote them until step 3b, and some damaged or foreign ones.
 * The code that built them was deleted in step 3c, so they are kept exactly as baseline.json stores them. Step 0
 * built them in this file; see git history before step 3c. `observeRestore` loads each at a fixed moment, `LOADED_AT`.
 */
function restores(): [string, unknown][] {
  const recorded = decode(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
  return recorded.restores.map(({ name, input }) => [name, input]);
}

function helpers(): HelperCall[] {
  return [
    ...[
      ['2026-10-21', '23:35'],
      ['2026-10-22', '00:05'],
      ['2026-12-31', '09:00'],
      ['2026-03-08', '02:30'],
      ['2026-11-01', '01:30'],
      ['2026-10-21', ''],
      ['2026-10-21', '7pm'],
      ['', '09:00'],
      ['2026-02-30', '09:00'],
      ['2026-10-21', '24:00'],
      ['2026-10-21', '23:60'],
    ].map((args) => ({ fn: 'retime', args })),
    ...[0, 0.2, 0.5, 22, 185, -12, -600, 24 * 60 * 60].map((m) => ({ fn: 'untilText', args: [m * 60000] })),
    ...[0, 20, -75, 1440].map((m) => ({ fn: 'shiftText', args: [m] })),
    ...[0, 0.5, 1, 59, 60, 61, 90.25, 240, 750, 1440].map((m) => ({ fn: 'durationText', args: [m] })),
    ...[29, 30, 31, 89].map((s) => ({ fn: 'stampNow', args: ['2026-11-21 09:00', s] })),
    { fn: 'withReading', args: [[{ at: '2026-11-22 15:10', f: 80 }], { at: '2026-11-22 14:40', f: 84 }] },
    {
      fn: 'withReading',
      args: [
        [
          { at: '2026-11-22 14:40', f: 84 },
          { at: '2026-11-22 15:10', f: 80 },
        ],
        { at: '2026-11-22 14:40', f: 82 },
      ],
    },
    ...[
      [25, 'C'],
      [80, 'F'],
      [-40, 'C'],
    ].map((args) => ({ fn: 'toF', args })),
    ...[
      [77, 'C'],
      [80, 'F'],
      [212, 'C'],
    ].map((args) => ({ fn: 'fromF', args })),
    ...[
      [50, 'F'],
      [49.9, 'F'],
      [100, 'F'],
      [100.1, 'F'],
      [10, 'C'],
      [37.7, 'C'],
      [38, 'C'],
      [38.5, 'C'],
    ].map((args) => ({ fn: 'inTempRange', args })),
  ];
}

export function cases() {
  return {
    plans: [...schedules(), ...bakeDays(), ...randomBakes()].map(([name, input]) => ({ name, input })),
    formulas: formulas().map(([name, input]) => ({ name, input })),
    restores: restores().map(([name, input]) => ({ name, input })),
    helpers: helpers().map((input) => ({ name: `${input.fn}(${JSON.stringify(input.args).slice(1, -1)})`, input })),
  };
}
