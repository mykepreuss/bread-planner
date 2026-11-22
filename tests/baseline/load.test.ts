import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPES, recipeById } from '../../src/domain/recipes.ts';
import { formula } from '../../src/domain/formula.ts';
import { schedule } from '../../src/domain/schedule.ts';
import { inTempRange } from '../../src/domain/bakeday.ts';
import { fromV5, fromV6, serialize } from '../../src/state/load.ts';
import { planOf, type PlannerState } from '../../src/state/schema.ts';
import { decode } from './format.ts';
import { local, useBaselineTimeZone, LOADED_AT } from './observe.ts';
import type { SavedPlan } from '../browser/saved-plans.ts';

/**
 * Loading never fails and always gives a usable planner, whatever a save holds. In step 3a these random corruptions of
 * real saves proved the new loader loads every version 5 save exactly as the old one did. Step 3c deleted the old
 * loader, so they now check what any loaded planner must be, from a damaged version 5 or version 6 save alike. The
 * exact results for the recorded kinds of saved data are pinned by baseline.json (`restores`).
 */
useBaselineTimeZone();
const now = local(LOADED_AT);
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/,
  TIME = /^(\d{2}):(\d{2})$/;
/** A real calendar date, checked through the Date object rather than the loader's own month table. */
function realDate(s: string) {
  const m = DATE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(+m[1], +m[2] - 1, +m[3]);
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
const realTime = (s: string) => {
  const m = TIME.exec(s);
  return !!m && +m[1] <= 23 && +m[2] <= 59;
};
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Every way a loaded planner could be unusable, as messages; none for a valid one. */
function problems(s: PlannerState): string[] {
  const out: string[] = [],
    check = (ok: boolean, what: string) => {
      if (!ok) out.push(what);
    };
  const ids = RECIPES.map((r) => r.id);
  check(s.order.length > 0 && s.order.every((id) => ids.includes(id)), `order ${JSON.stringify(s.order)}`);
  check(new Set(s.order).size === s.order.length, 'order repeats a recipe');
  check(s.order.includes(s.recipe), `recipe ${s.recipe} not on the menu`);
  check(realDate(s.date) && realTime(s.time), `when ${s.date} ${s.time}`);
  check(realDate(s.created.date) && realTime(s.created.time), `created ${JSON.stringify(s.created)}`);
  check(s.anchor === 'leaven' || s.anchor === 'done', `anchor ${s.anchor}`);
  check(s.proof === 'cold' || s.proof === 'warm', `proof ${s.proof}`);
  check(s.ovenCapacity === 1 || s.ovenCapacity === 2, `ovenCapacity ${s.ovenCapacity}`);
  check(finite(s.reheat) && s.reheat >= 0, `reheat ${s.reheat}`);
  check(s.tempUnit === 'F' || s.tempUnit === 'C', `tempUnit ${s.tempUnit}`);
  check(JSON.stringify(Object.keys(s.recipes).sort()) === JSON.stringify([...ids].sort()), 'recipes');
  for (const recipe of RECIPES) {
    const r = s.recipes[recipe.id];
    if (!r) continue;
    const q = r.settings,
      at = recipe.id;
    check(Number.isInteger(q.count) && q.count >= 1, `${at} count ${q.count}`);
    check(finite(q.weight) && q.weight >= 1, `${at} weight ${q.weight}`);
    for (const k of ['hydration', 'leaven', 'salt'] as const) check(finite(q[k]) && q[k] >= 0, `${at} ${k} ${q[k]}`);
    check(finite(q.reserve) && q.reserve >= 0 && q.reserve <= 100, `${at} reserve ${q.reserve}`);
    check(JSON.stringify(Object.keys(q.flours)) === JSON.stringify(recipe.flours), `${at} flours`);
    for (const v of [...Object.values(q.flours), ...Object.values(q.build)])
      check(finite(v) && v >= 0, `${at} flour or build ${v}`);
    const b = r.bake;
    check(
      b.done.every((id) => typeof id === 'string'),
      `${at} done`,
    );
    check(
      Object.entries(b.doneAt).every(([id, t]) => b.done.includes(id) && finite(t)),
      `${at} doneAt`,
    );
    check(b.doughTemp === null || (finite(b.doughTemp) && inTempRange(b.doughTemp, 'F')), `${at} doughTemp`);
    check(
      b.bulkTemps.every((x, i) => finite(x.at) && inTempRange(x.f, 'F') && (i === 0 || b.bulkTemps[i - 1].at < x.at)),
      `${at} readings out of order or range`,
    );
  }
  if (out.length) return out;
  const selected = recipeById(s.recipe)!;
  // Every plan loaded here has steps, all at real times, unless its recipe has no flour, which the screen shows as
  // such. Two kinds of plan could still have none, though no save here holds one: a time skipped by daylight saving, which the
  // screen itself allows, and a year before 1000 (see the proposal in HANDOFF.md, step 4).
  const steps = schedule(planOf(s)),
    flourless = Object.values(s.recipes[s.recipe].settings.flours).every((v) => v === 0);
  check(steps.length > 0 || flourless, 'a plan with flour but no steps');
  check(
    steps.every((step) => Number.isFinite(+step.at)),
    'a step with an invalid time',
  );
  // Must not throw; a recipe with no flour has no formula, which the Ingredients tab shows as such.
  formula(selected, s.recipes[s.recipe].settings);
  return out;
}
/** A loaded planner must be valid, and come back the same from its own version 6 save. */
function verdict(s: PlannerState) {
  const p = problems(s);
  if (p.length) return p.join('; ');
  const again = fromV6(JSON.parse(serialize(s)), now);
  return JSON.stringify(again) === JSON.stringify(s) ? null : 'changes when saved and reloaded';
}

const plans = JSON.parse(readFileSync(new URL('../browser/saved-plans.json', import.meta.url), 'utf8')) as SavedPlan[];
const baseline = decode(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));

test('every recorded save and saved plan loads into a valid planner that survives its own save', () => {
  const inputs: [string, unknown][] = [
    ...plans.map((p): [string, unknown] => [p.name, p.saved]),
    ...baseline.restores.map((c): [string, unknown] => [c.name, c.input]),
  ];
  assert.equal(inputs.length, 21 + 24);
  const bad = inputs.flatMap(([name, saved]) => {
    const d = verdict(fromV5(JSON.parse(JSON.stringify(saved ?? null)), now));
    return d ? [`${name}: ${d}`] : [];
  });
  assert.deepEqual(bad, []);
});

/** Deterministic pseudo-random numbers (mulberry32). */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('3,000 random corruptions of real saves load into a valid planner, as version 5 and as version 6', () => {
  const r = random(5),
    pick = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const bases = [...plans.map((p) => p.saved), ...baseline.restores.map((c) => c.input)].filter(
    (s): s is { version: 5; plan: Record<string, unknown> } =>
      !!s &&
      typeof s === 'object' &&
      (s as { version?: unknown }).version === 5 &&
      typeof (s as { plan?: unknown }).plan === 'object' &&
      !!(s as { plan?: unknown }).plan,
  );
  const junk = [
    undefined,
    null,
    'x',
    '',
    -1,
    0,
    0.5,
    1,
    1.5,
    2,
    3,
    49,
    50,
    78,
    100,
    100.5,
    1e9,
    [],
    {},
    true,
    '2026-11-22',
    '2026-2-1',
    '09:00',
    '9:00',
    '25:00',
    'done',
    'warm',
    'C',
    'house',
    'tartine',
    'bogus',
    'constructor',
    ['house', 'house', 'four-flour', 7],
    [{ at: 1795400000000, f: 80 }, { at: 1795400000000, f: 84 }, null, { at: 'x', f: 80 }],
    ['leaven', 'mix', 3, 'turn9'],
    { leaven: 1795400000000, mix: 'soon', turn1: 1795401000000 },
  ];
  const recipes = ['house', 'tartine', 'white-wheat', 'red-rye', 'five-flour', 'four-flour'];
  const shared = [
    'recipe',
    'order',
    'date',
    'time',
    'anchor',
    'proof',
    'ovenCapacity',
    'reheat',
    'tempUnit',
    'recipes',
  ];
  const scalars = ['count', 'weight', 'hydration', 'leaven', 'salt', 'reserve'],
    flours = ['anita', 'red', 'wheat', 'rye', 'white', 'ap', 'fife'],
    builds = ['starter', 'flour', 'wheat', 'water'],
    bakeKeys = ['done', 'doneAt', 'doughTemp', 'bulkTemps'];
  const v5Paths: (() => string[])[] = [
    () => [pick([...shared, 'legacy'])],
    () => ['legacy', pick(['date', 'time', 'cells'])],
    () => ['recipes', pick(recipes)],
    () => ['recipes', pick(recipes), pick(['params', ...bakeKeys])],
    () => ['recipes', pick(recipes), 'params', pick([...scalars, ...flours.map((k) => `flour_${k}`)])],
    () => ['recipes', pick(recipes), 'params', pick(['buildSeed', 'buildBread', 'buildWheat', 'buildWater'])],
  ];
  const v6Paths: (() => string[])[] = [
    () => [pick([...shared, 'created'])],
    () => ['created', pick(['date', 'time'])],
    () => ['recipes', pick(recipes), pick(['settings', 'bake'])],
    () => ['recipes', pick(recipes), 'bake', pick(bakeKeys)],
    () => ['recipes', pick(recipes), 'settings', pick([...scalars, 'flours', 'build'])],
    () => ['recipes', pick(recipes), 'settings', pick(['flours', 'build']), pick([...flours, ...builds])],
  ];
  const corrupt = (plan: Record<string, unknown>, paths: (() => string[])[]) => {
    for (let m = 1 + Math.floor(r() * 4); m > 0; m--) {
      const path = pick(paths)();
      let target: Record<string, unknown> = plan;
      for (const key of path.slice(0, -1)) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        target = target[key] as Record<string, unknown>;
      }
      const value = pick(junk);
      if (value === undefined) delete target[path.at(-1)!];
      else target[path.at(-1)!] = structuredClone(value);
    }
  };
  const bad: string[] = [];
  for (let k = 0; k < 3000; k++) {
    const five = structuredClone(pick(bases)) as { plan: Record<string, unknown> };
    // The same save upgraded and written as version 6, so the version 6 corruption starts from a real save too.
    const six = JSON.parse(serialize(fromV5(five, now))) as { plan: Record<string, unknown> };
    corrupt(five.plan, v5Paths);
    corrupt(six.plan, v6Paths);
    for (const [version, saved, load] of [
      [5, five, fromV5],
      [6, six, (s: unknown, t: number) => fromV6(s, t)!],
    ] as const) {
      const input = JSON.parse(JSON.stringify(saved));
      let d: string | null;
      try {
        d = verdict(load(input, now));
      } catch (e) {
        d = `threw ${(e as Error).message}`;
      }
      if (d) bad.push(`version ${version} ${JSON.stringify(input).slice(0, 300)}…\n  ${d}`);
    }
  }
  assert.equal(bad.length, 0, `${bad.length} saves load badly:\n${bad.slice(0, 5).join('\n')}`);
});
