import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPlanner, restorePlanner, type Planner } from '../../src/lib/recipes.ts';
import { recipeById } from '../../src/domain/recipes.ts';
import { schedule } from '../../src/domain/schedule.ts';
import { fromV5 } from '../../src/state/load.ts';
import { planOf, type PlannerState } from '../../src/state/schema.ts';
import { decode, difference } from './format.ts';
import { atMoment, local, stamp, useBaselineTimeZone, LOADED_AT } from './observe.ts';
import type { SavedPlan } from '../browser/saved-plans.ts';

/**
 * The new loader (src/state) against the old one (src/lib restorePlanner) on version 5 saves: the recorded cases,
 * the saved plans the browser tests open, and thousands of random corruptions of real saves. Both must give every
 * recipe the same settings, checklist, times and readings, and the same shared settings. The new planner does not
 * carry the hidden `manual-rye` recipe (docs/BEHAVIOUR.md), so it is left out of the comparison.
 */
useBaselineTimeZone();
const now = local(LOADED_AT);
const RETIRED = 'manual-rye';

/** A loaded planner in the record's terms: version 5 parameter names, local times. */
function fromOld(p: Planner) {
  return {
    recipe: p.recipe,
    order: p.order.filter((id) => id !== RETIRED),
    date: p.date,
    time: p.time,
    anchor: p.anchor,
    proof: p.proof,
    ovenCapacity: p.ovenCapacity,
    reheat: p.reheat,
    tempUnit: p.tempUnit,
    created: { date: p.legacy.date, time: p.legacy.time },
    recipes: Object.fromEntries(
      Object.entries(p.recipes)
        .filter(([id]) => id !== RETIRED)
        .map(([id, r]) => [
          id,
          {
            params: r.params,
            done: r.done,
            doneAt: Object.fromEntries(Object.entries(r.doneAt).map(([k, t]) => [k, stamp(t)])),
            doughTemp: r.doughTemp,
            bulkTemps: r.bulkTemps.map((b) => ({ at: stamp(b.at), f: b.f })),
          },
        ]),
    ),
  };
}
function fromNew(s: PlannerState) {
  return {
    recipe: s.recipe,
    order: s.order,
    date: s.date,
    time: s.time,
    anchor: s.anchor,
    proof: s.proof,
    ovenCapacity: s.ovenCapacity,
    reheat: s.reheat,
    tempUnit: s.tempUnit,
    created: s.created,
    recipes: Object.fromEntries(
      Object.entries(s.recipes).map(([id, { settings: q, bake }]) => [
        id,
        {
          params: {
            count: q.count,
            weight: q.weight,
            hydration: q.hydration,
            leaven: q.leaven,
            salt: q.salt,
            reserve: q.reserve,
            ...Object.fromEntries(recipeById(id)!.flours.map((k) => [`flour_${k}`, q.flours[k]])),
            buildSeed: q.build.starter,
            buildBread: q.build.flour,
            buildWheat: q.build.wheat,
            buildWater: q.build.water,
          },
          done: bake.done,
          doneAt: Object.fromEntries(Object.entries(bake.doneAt).map(([k, t]) => [k, stamp(t)])),
          doughTemp: bake.doughTemp,
          bulkTemps: bake.bulkTemps.map((b) => ({ at: stamp(b.at), f: b.f })),
        },
      ]),
    ),
  };
}
/** The old app caught a failed load and started fresh, so this does too. */
const oldLoad = (saved: unknown) =>
  atMoment(now, () => {
    try {
      return restorePlanner(saved);
    } catch {
      return createPlanner();
    }
  });
const json = (x: unknown) => JSON.parse(JSON.stringify(x ?? null));
const compare = (saved: unknown) =>
  difference(json(fromOld(oldLoad(saved))), json(fromNew(fromV5(saved, now))), 'loaded');

test('the recorded saved data loads as the record says, with the selected plan at the same times', () => {
  const baseline = decode(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
  const changed = baseline.restores.flatMap(({ name, input, output }) => {
    const state = fromV5(input, now),
      expected = json(output) as { recipes: Record<string, unknown> };
    delete expected.recipes[RETIRED];
    // The record has no creation date; the other two tests compare it with the old loader's.
    const shown = {
      ...fromNew(state),
      created: undefined,
      schedule: schedule(planOf(state)).map((s) => `${s.id} ${stamp(s.at)}`),
    };
    const d = difference(expected, json(shown), 'loaded');
    return d ? [`${name}: ${d}`] : [];
  });
  assert.equal(changed.length, 0, changed.join('\n'));
});

test('every saved plan the browser tests open loads the same through the old and new loaders', () => {
  const plans = JSON.parse(
    readFileSync(new URL('../browser/saved-plans.json', import.meta.url), 'utf8'),
  ) as SavedPlan[];
  assert.equal(plans.length, 21);
  const differ = plans.flatMap((p) => {
    const d = compare(p.saved);
    return d ? [`${p.name}: ${d}`] : [];
  });
  assert.equal(differ.length, 0, differ.join('\n'));
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

test('3,000 random corruptions of real saves load the same through the old and new loaders', () => {
  const r = random(5),
    pick = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const plans = JSON.parse(
    readFileSync(new URL('../browser/saved-plans.json', import.meta.url), 'utf8'),
  ) as SavedPlan[];
  const baseline = decode(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
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
    ['house', 'house', 'four-flour', 7],
    [{ at: 1795400000000, f: 80 }, { at: 1795400000000, f: 84 }, null, { at: 'x', f: 80 }],
    ['leaven', 'mix', 3, 'turn9'],
    { leaven: 1795400000000, mix: 'soon', turn1: 1795401000000 },
  ];
  const recipes = ['house', 'tartine', 'white-wheat', 'red-rye', 'five-flour', 'four-flour'];
  const paramKeys = [
    'count',
    'weight',
    'hydration',
    'leaven',
    'salt',
    'reserve',
    'flour_anita',
    'flour_red',
    'flour_wheat',
    'flour_rye',
    'flour_white',
    'flour_ap',
    'flour_fife',
    'buildSeed',
    'buildBread',
    'buildWheat',
    'buildWater',
  ];
  const paths: (() => string[])[] = [
    () => [
      pick([
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
        'legacy',
      ]),
    ],
    () => ['legacy', pick(['date', 'time', 'cells'])],
    () => ['recipes', pick(recipes)],
    () => ['recipes', pick(recipes), pick(['params', 'done', 'doneAt', 'doughTemp', 'bulkTemps'])],
    () => ['recipes', pick(recipes), 'params', pick(paramKeys)],
    () => ['recipes', pick(recipes), 'params', pick(paramKeys)],
  ];
  const differ: string[] = [];
  for (let k = 0; k < 3000; k++) {
    const saved = structuredClone(pick(bases)) as { plan: Record<string, unknown> };
    for (let m = 1 + Math.floor(r() * 4); m > 0; m--) {
      const path = pick(paths)();
      let target: Record<string, unknown> = saved.plan;
      for (const key of path.slice(0, -1)) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        target = target[key] as Record<string, unknown>;
      }
      const value = pick(junk);
      if (value === undefined) delete target[path.at(-1)!];
      else target[path.at(-1)!] = structuredClone(value);
    }
    const input = json(saved),
      d = compare(input);
    if (d) differ.push(`${JSON.stringify(input).slice(0, 300)}…\n  ${d}`);
  }
  assert.equal(differ.length, 0, `${differ.length} saves load differently:\n${differ.slice(0, 5).join('\n')}`);
});
