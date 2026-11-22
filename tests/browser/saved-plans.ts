/**
 * The saved plans the browser baseline opens. Each is a version 5 save as the live site writes it, with the moment the
 * page's clock is frozen at. `npm run baseline:update` writes them to saved-plans.json, which the browser tests read;
 * step 3 of the rebuild also loads them to check that old saves still open to the same screens.
 */
import { planner, local, type PlanInput } from '../baseline/observe.ts';
import { upTo } from '../baseline/cases.ts';

export type SavedPlan = { name: string; about: string; now: string; saved: unknown };
const TODAY = '2026-11-21',
  TOMORROW = '2026-11-22';

/** A save as App.tsx writes it. The plan's creation date is fixed so the file is the same on every update. */
function save(i: PlanInput) {
  const p = planner(i);
  p.legacy.date = i.date;
  return { version: 5, plan: p };
}
const iso = (t: string) => new Date(local(t)).toISOString();

export function savedPlans(): SavedPlan[] {
  const house = (more: Partial<PlanInput> = {}): PlanInput => ({
    recipe: 'house',
    date: TODAY,
    time: '09:00',
    now: `${TODAY} 15:20`,
    ...more,
  });
  const plans: [string, string, PlanInput | null, string][] = [
    ['fresh', 'No saved data: the default plan for tomorrow.', null, `${TODAY} 15:20`],
    [
      'mid-bulk',
      'House bake day, 82°F after mixing, turn 1 done, running 5 minutes behind.',
      { ...upTo(house(), 'turn1', { mix: 5, rest: 5, turn1: 5 }), doughTemp: 82 },
      `${TODAY} 15:20`,
    ],
    [
      'dough-check',
      'Warm dough in °C with a later reading; the turn card leads with checking the dough.',
      { ...upTo(house(), 'turn4'), tempUnit: 'C', doughTemp: 84, bulkTemps: [{ at: `${TODAY} 15:30`, f: 85 }] },
      `${TODAY} 16:50`,
    ],
    [
      'cold-proof-next',
      'Everything up to the basket rest done, preshape 10 minutes late; the cold proof is up next.',
      { ...upTo(house(), 'basket', { shape: 10, bench1: 10, fold: 10, basket: 10 }), doughTemp: 80 },
      `${TODAY} 19:35`,
    ],
    ['ended', 'A plan from last week with nothing checked.', house({ date: '2026-11-13' }), `${TODAY} 15:20`],
    [
      'complete',
      "Yesterday's bake with every step checked.",
      upTo(house({ date: '2026-11-20' }), 'cooled'),
      `${TODAY} 15:20`,
    ],
    [
      'quiet-batches',
      'Five loaves, two at a time, all out by 8:00 AM: three batches and quiet-hour work.',
      house({ anchor: 'done', date: TOMORROW, time: '08:00', params: { count: 5 } }),
      `${TODAY} 15:20`,
    ],
    [
      'tartine-warm',
      'Original Tartine, one loaf, warm proof.',
      {
        recipe: 'tartine',
        date: TOMORROW,
        time: '09:00',
        proof: 'warm',
        ovenCapacity: 1,
        params: { count: 1 },
        now: '',
      },
      `${TODAY} 15:20`,
    ],
    [
      'daytime-proof',
      'House starting at 9:00 PM, so the cold proof falls within one day.',
      house({ date: TOMORROW, time: '21:00' }),
      `${TODAY} 15:20`,
    ],
    ...['house', 'tartine', 'white-wheat', 'red-rye', 'five-flour', 'four-flour'].map(
      (recipe): [string, string, PlanInput, string] => [
        `recipe-${recipe}`,
        `The ${recipe} recipe as it comes.`,
        { recipe, date: TOMORROW, time: '09:00', now: '' },
        `${TODAY} 15:20`,
      ],
    ),
    [
      'leaven-short',
      'House with an empty leaven build.',
      house({ date: TOMORROW, params: { buildSeed: 0, buildBread: 0, buildWheat: 0, buildWater: 0 } }),
      `${TODAY} 15:20`,
    ],
    [
      'leaven-late',
      'House bake day, the leaven up next and 40 minutes overdue.',
      house({ done: ['feed'], doneAt: { feed: '2026-11-20 22:00' } }),
      `${TODAY} 09:40`,
    ],
    [
      'leaven-done-late',
      'House bake day, the leaven checked 40 minutes late.',
      house({ done: ['feed', 'leaven'], doneAt: { feed: '2026-11-20 22:00', leaven: `${TODAY} 09:40` } }),
      `${TODAY} 09:45`,
    ],
    ['mixed', 'House bake day, the final mix done; bulk is up next.', upTo(house(), 'mix'), `${TODAY} 14:20`],
    [
      'turn-one-78',
      'House bake day at 78°F, turn 1 done.',
      { ...upTo(house(), 'turn1'), doughTemp: 78 },
      `${TODAY} 15:20`,
    ],
    [
      'planned-temp',
      "Tomorrow's plan with a dough temperature typed in while planning.",
      house({ date: TOMORROW, doughTemp: 84 }),
      `${TODAY} 15:20`,
    ],
  ];
  return plans.map(([name, about, input, now]) => ({ name, about, now: iso(now), saved: input && save(input) }));
}
