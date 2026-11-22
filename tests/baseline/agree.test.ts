import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanner, definitions, buildFlourName, recipeSchedule } from '../../src/lib/recipes.ts';
import { RECIPES, FLOUR_NAMES } from '../../src/domain/recipes.ts';
import { difference } from './format.ts';
import {
  observePlan,
  observeFormula,
  planner,
  stamp,
  useBaselineTimeZone,
  type PlanInput,
  type FormulaInput,
} from './observe.ts';
import { oldCore, newCore, settingsOf } from './cores.ts';

/**
 * The old core (src/lib) and the new one (src/domain) side by side. Beyond the recorded cases, thousands of seeded
 * random plans, bake days and recipe settings must show exactly the same Schedule and Ingredients tabs through both.
 * Text and times must match exactly; numbers to one part in a billion.
 */
useBaselineTimeZone();
const recipes = RECIPES.map((r) => r.id);

test('the new recipes are the old ones: same order, names, flours and default settings, to the last bit', () => {
  const p = createPlanner();
  assert.deepEqual(recipes, p.order);
  for (const r of RECIPES) {
    const d = definitions[r.id];
    assert.equal(r.name, d.name, r.id);
    assert.equal(r.description, d.description, r.id);
    assert.equal(r.method === 'tartine', d.method === 'tartine', r.id);
    assert.deepEqual(r.flours, d.flours, r.id);
    assert.deepEqual(r.late, d.late, r.id);
    assert.equal(r.houseCompletion, d.houseCompletion === true, r.id);
    assert.equal(FLOUR_NAMES[r.buildFlour], buildFlourName(d), r.id);
    assert.equal(r.overnightProof, d.method === 'house', `${r.id}: the old House method names the proof overnight`);
    p.recipe = r.id;
    assert.deepStrictEqual(r.defaults, settingsOf(p), r.id);
  }
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
const r = random(20261122),
  chance = (p: number) => r() < p,
  int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1)),
  pick = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)],
  two = (n: number) => String(n).padStart(2, '0');

/** Settings a baker could save, now and then at an edge: no flour, an empty build, zero salt or leaven. */
function params(recipe: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (chance(0.5)) out.count = chance(0.03) ? pick([0, 1.5]) : int(1, 8);
  if (chance(0.4)) out.weight = int(150, 1600);
  if (chance(0.5)) out.hydration = 40 + r() * 60;
  if (chance(0.4)) out.leaven = chance(0.1) ? 0 : r() * 45;
  if (chance(0.3)) out.salt = chance(0.1) ? 0 : r() * 4;
  if (chance(0.3)) out.reserve = r() * 100;
  if (chance(0.4)) {
    const none = chance(0.05);
    for (const k of definitions[recipe].flours) out[`flour_${k}`] = none ? 0 : chance(0.2) ? 0 : r() * 100;
  }
  if (chance(0.4))
    for (const k of ['buildSeed', 'buildBread', 'buildWheat', 'buildWater'])
      out[k] = chance(0.15) ? 0 : r() * (k === 'buildWater' ? 300 : 150);
  return out;
}

/** A plan at a random point in its bake, as randomBakes in cases.ts does, over many more settings and dates. */
function randomPlan(): PlanInput {
  const recipe = pick(recipes);
  const day = chance(0.15)
    ? pick(['2026-03-07', '2026-03-08', '2026-10-31', '2026-11-01'])
    : `2026-${two(int(1, 12))}-${two(int(1, 28))}`;
  const time = chance(0.02) ? pick(['25:00', '9:00', '02:30']) : `${two(int(0, 23))}:${two(int(0, 11) * 5)}`;
  const base: PlanInput = {
    recipe,
    date: day,
    time,
    anchor: chance(0.25) ? 'done' : 'leaven',
    proof: chance(0.3) ? 'warm' : 'cold',
    ovenCapacity: chance(0.02) ? pick([0, 3]) : pick([1, 2]),
    reheat: pick([0, 10, 30, 45]),
    tempUnit: chance(0.2) ? 'C' : 'F',
    params: params(recipe),
    totalHydration: chance(0.1) ? 60 + r() * 40 : undefined,
    now: `${day} 12:00`,
  };
  const steps = recipeSchedule(planner(base));
  if (!steps.length) return { ...base, now: `${day} ${two(int(0, 23))}:${two(int(0, 59))}` };
  const upto = int(0, steps.length),
    done: string[] = [],
    doneAt: Record<string, string> = {};
  let drift = 0,
    last = +steps[0].at;
  for (const s of steps.slice(0, upto)) {
    const bulk = s.id === 'rest' || /^turn\d+$/.test(s.id);
    if (chance(bulk ? 0.2 : 0.05)) continue;
    drift += int(-25, 50);
    done.push(s.id);
    last = +s.at + drift * 60000;
    if (chance(0.9)) doneAt[s.id] = stamp(last).slice(0, 16);
  }
  // Turns past the plan, as cool dough adds and a baker may have checked.
  if (chance(0.05)) for (let n = 8; n <= int(8, 12); n++) done.push(`turn${n}`);
  const rest = steps.find((s) => s.id === 'rest'),
    now = last + int(-60, 240) * 60000;
  const doughTemp = chance(0.5) ? 50 + r() * 50 : null;
  const readings =
    doughTemp !== null && rest && chance(0.5)
      ? Array.from({ length: int(1, 3) }, () => ({
          at: stamp(+rest.at + int(-40, 400) * 60000).slice(0, 16),
          f: 50 + r() * 50,
        }))
      : [];
  // Readings are saved in time order, one per minute, as the app saves them.
  const bulkTemps = readings.sort((a, b) => a.at.localeCompare(b.at)).filter((x, i, l) => l[i + 1]?.at !== x.at);
  return { ...base, done, doneAt, doughTemp, bulkTemps, now: stamp(now).slice(0, 16) };
}

const json = (x: unknown) => JSON.parse(JSON.stringify(x ?? null));
function disagreements<I>(inputs: I[], observe: (input: I, core: typeof oldCore) => unknown) {
  return inputs.flatMap((input, k) => {
    const d = difference(json(observe(input, oldCore)), json(observe(input, newCore)), 'new core');
    return d ? [`case ${k + 1} ${JSON.stringify(input).slice(0, 200)}…\n  ${d}`] : [];
  });
}

test('4,000 random plans and bake days show the same Schedule tab through both cores', () => {
  const plans = Array.from({ length: 4000 }, randomPlan),
    shown = plans.filter((p) => recipeSchedule(planner(p)).length > 0).length;
  assert.ok(shown > 3600, `only ${shown} of the random plans have a schedule`);
  const differ = disagreements(plans, observePlan);
  assert.equal(differ.length, 0, `${differ.length} plans differ:\n${differ.slice(0, 5).join('\n')}`);
});

test('2,000 random recipe settings show the same Ingredients tab through both cores', () => {
  const formulas = Array.from({ length: 2000 }, (): FormulaInput => {
    const recipe = pick(recipes);
    return { recipe, params: params(recipe), totalHydration: chance(0.2) ? 50 + r() * 50 : undefined };
  });
  const differ = disagreements(formulas, observeFormula);
  assert.equal(differ.length, 0, `${differ.length} recipe settings differ:\n${differ.slice(0, 5).join('\n')}`);
});
