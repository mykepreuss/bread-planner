import { formula, type Formula } from './formula.ts';
import { HOUSE, TARTINE, COOLING } from './methods.ts';
import { FLOUR_NAMES, inSentence, type Recipe, type Settings } from './recipes.ts';
import { dateString } from './text.ts';

/** What a step is. Saved checklists use its id, which this file keeps exactly as before. */
export type Kind =
  | 'feed'
  | 'leaven'
  | 'autolyse'
  | 'mix'
  | 'bulk'
  | 'turn'
  | 'preshape'
  | 'bench'
  | 'shape'
  | 'basket'
  | 'fridge'
  | 'proof'
  | 'warmup'
  | 'preheat'
  | 'reheat'
  | 'covered'
  | 'uncovered'
  | 'out'
  | 'cooled';
/** The temperature a step happens at. The page colours steps by it: neutral at room temperature, Fridge for the cold proof, Crust for the oven. */
export type Phase = 'room' | 'cold' | 'oven';

/**
 * A step and the facts about it:
 * - `handsOn`: someone has to do something then, so it counts for quiet hours; `activeMinutes` is how long that work
 *   lasts, for mixing and shaping that can run past the cutoff.
 * - `movesPlan`: checking it late or early moves the steps after it. The starter feed, the autolyse and the turns
 *   record their time but move nothing.
 * - `bulk`: the start of bulk or a turn. Bulk never ends before the latest of them that is checked.
 * - `turn`: the turn's number, from 1, or 0.
 */
export type Step = {
  id: string;
  kind: Kind;
  title: string;
  at: Date;
  minutes: number;
  note: string;
  readiness?: string;
  phase: Phase;
  handsOn: boolean;
  activeMinutes: number;
  movesPlan: boolean;
  bulk: boolean;
  turn: number;
};

const FACTS: Record<Kind, Pick<Step, 'phase' | 'handsOn' | 'movesPlan' | 'bulk'> & { active?: boolean }> = {
  feed: { phase: 'room', handsOn: true, movesPlan: false, bulk: false },
  leaven: { phase: 'room', handsOn: true, movesPlan: true, bulk: false },
  autolyse: { phase: 'room', handsOn: true, movesPlan: false, bulk: false },
  mix: { phase: 'room', handsOn: true, movesPlan: true, bulk: false, active: true },
  bulk: { phase: 'room', handsOn: false, movesPlan: true, bulk: true },
  turn: { phase: 'room', handsOn: true, movesPlan: false, bulk: true },
  preshape: { phase: 'room', handsOn: true, movesPlan: true, bulk: false, active: true },
  bench: { phase: 'room', handsOn: true, movesPlan: true, bulk: false },
  shape: { phase: 'room', handsOn: true, movesPlan: true, bulk: false, active: true },
  basket: { phase: 'room', handsOn: true, movesPlan: true, bulk: false },
  fridge: { phase: 'cold', handsOn: true, movesPlan: true, bulk: false },
  proof: { phase: 'room', handsOn: true, movesPlan: true, bulk: false },
  warmup: { phase: 'room', handsOn: true, movesPlan: true, bulk: false },
  preheat: { phase: 'oven', handsOn: true, movesPlan: true, bulk: false },
  reheat: { phase: 'oven', handsOn: true, movesPlan: true, bulk: false },
  covered: { phase: 'oven', handsOn: true, movesPlan: true, bulk: false },
  uncovered: { phase: 'oven', handsOn: true, movesPlan: true, bulk: false },
  out: { phase: 'oven', handsOn: true, movesPlan: true, bulk: false },
  cooled: { phase: 'room', handsOn: false, movesPlan: true, bulk: false },
};

/** A step on the plan before it has a date: minutes from the leaven start. */
type Row = Omit<Step, 'at'> & { offset: number };
function row(
  id: string,
  kind: Kind,
  title: string,
  offset: number,
  minutes: number,
  note: string,
  readiness?: string,
): Row {
  const { active, ...facts } = FACTS[kind];
  const turn = kind === 'turn' ? Number(id.slice(4)) : 0;
  return { id, kind, title, offset, minutes, note, readiness, ...facts, activeMinutes: active ? minutes : 0, turn };
}

export type PlanInput = {
  recipe: Recipe;
  settings: Settings;
  date: string;
  time: string;
  anchor: 'leaven' | 'done';
  proof: 'cold' | 'warm';
  ovenCapacity: number;
  reheat: number;
};

const LEAVEN_CUE =
  'Use when aerated and puffy, and a spoonful floats in room-temperature water. If it sinks, allow more fermentation before mixing.';
const gram = (n: number) => `${Math.round(n * 10) / 10} g`;
const listed = (rows: [string, number][]) =>
  rows.map(([name, n]) => `${inSentence(name)} (${Math.round(n * 10) / 10} g)`).join(', ');

/** The leaven step's note: the scaled build, and what is kept or still needed. */
function leavenNote(recipe: Recipe, r: Formula) {
  const [starter, flour, wheat, water] = r.madeParts,
    buildFlour = inSentence(FLOUR_NAMES[recipe.buildFlour]);
  const keep =
    r.reserve > 0
      ? ` You use ${gram(r.used)} in the dough and keep ${gram(r.reserve)}.`
      : r.shortfall > 0
        ? ` This makes ${gram(r.shortfall)} less than the ${gram(r.used)} the dough needs; increase the build.`
        : ` All ${gram(r.used)} goes into the dough.`;
  return recipe.method === 'tartine'
    ? `Mix ${gram(starter)} (about 1 tbsp) of mature starter with ${gram(water)} water, then add ${gram(flour)} ${buildFlour} and ${gram(wheat)} whole-wheat flour. Cover at room temperature.${keep}`
    : `Mix ${gram(starter)} mature starter, ${gram(flour)} ${buildFlour}, ${gram(wheat)} whole-wheat flour and ${gram(water)} water. Keep it separate from the autolyse and cover.${keep}`;
}

/** House turns: the first three are vigorous double rounds that build gluten early; the rest are a single round. */
function houseTurnNote(n: number) {
  return n === 1
    ? 'With wet hands, stretch and fold all four sides vigorously, then go around a second time. These early turns build the gluten structure.'
    : n <= 3
      ? 'Vigorously again: stretch and fold all four sides twice, with wet hands.'
      : n === 4
        ? 'From here, one round: stretch and fold all four sides once, with wet hands.'
        : 'Stretch and fold all four sides once, with wet hands.';
}

/**
 * The plan for one bake, from the feed or leaven to the last loaf cooled, at local dates and times. Empty when the
 * recipe has no flour, the loaf count or oven capacity is not a whole number of 1 or more, the loaves need more than
 * 1,000 batches, or the date and time are not a real local time.
 */
export function schedule(input: PlanInput): Step[] {
  const { recipe, settings } = input,
    r = formula(recipe, settings);
  if (!r) return [];
  const tartine = recipe.method === 'tartine',
    rows: Row[] = [];
  const push = (...args: Parameters<typeof row>) => rows.push(row(...args));
  // With one batch every loaf bakes together, so the bake steps drop batch numbers.
  const count = settings.count,
    capacity = input.ovenCapacity,
    batches = Math.ceil(count / capacity),
    single = batches === 1;
  const loaves = count === 1 ? 'the loaf' : count === 2 ? 'both loaves' : `all ${count} loaves`;
  const later = single ? '' : ' Keep later batches chilled until their own warm-up.';
  let firstBake: number, preheat: number, covered: number, uncovered: number, warmup: number;
  if (tartine) {
    const t = TARTINE;
    push('leaven', 'leaven', 'Make leaven', 0, t.leaven, leavenNote(recipe, r), LEAVEN_CUE);
    let at = t.leaven;
    push(
      'autolyse',
      'autolyse',
      'Mix dough and rest',
      at,
      t.rest,
      'Disperse the leaven used in the initial water, about 80°F / 27°C. Add white and whole-wheat flour; mix until no dry flour remains. Cover for 25 to 40 minutes.',
    );
    at += t.rest;
    push(
      'mix',
      'mix',
      'Add salt and final water',
      at,
      0,
      'Work in the salt and reserved water. Keep mixing if the dough separates; it should come together again.',
    );
    push(
      'rest',
      'bulk',
      'Begin warm bulk fermentation',
      at,
      Math.min(t.turnEvery, t.bulk),
      'Cover and keep at 75°F to 80°F / 24°C to 27°C.',
    );
    for (let elapsed = t.turnEvery, n = 1; elapsed < t.bulk; elapsed += t.turnEvery, n++)
      push(
        `turn${n}`,
        'turn',
        `Turn ${n}`,
        at + elapsed,
        Math.min(t.turnEvery, t.bulk - elapsed),
        n === 1
          ? 'Wet your hand. Stretch one quadrant over the dough; rotate and repeat to fold all four sides.'
          : 'Repeat the four-sided stretch and fold, with wet hands.',
      );
    at += t.bulk;
    push(
      'shape',
      'preshape',
      'Divide and preshape',
      at,
      t.preshape,
      'Dust the top, divide equally and turn flour-side down. Shape taut rounds with the dusting flour on the outside.',
      'Look for a billowy dough and 20% to 30% volume increase. The book allows up to one more hour with folds if needed; wait until the dough is ready before moving on.',
    );
    at += t.preshape;
    push(
      'bench1',
      'bench',
      'Bench rest and prepare baskets',
      at,
      t.bench,
      'Cover the rounds for 30 minutes. Line proofing baskets or bowls with towels and generously dust with rice flour.',
    );
    at += t.bench;
    push(
      'fold',
      'shape',
      'Final shape',
      at,
      t.shape,
      'Turn flour-side down. Stretch and fold the bottom, sides and top over the center; roll seam-side down into a taut round. Place seam-side up in a prepared basket.',
    );
    at += t.shape;
    if (input.proof === 'cold') {
      push(
        'fridge',
        'fridge',
        'Refrigerated final proof',
        at,
        t.cold,
        `Cover the baskets and refrigerate for 10 to 12 hours.${later}`,
      );
      at += t.cold;
      warmup = t.warmup;
      push(
        'warmup',
        'warmup',
        single ? `Warm ${loaves} to room temperature` : 'Warm batch 1 to room temperature',
        at,
        warmup,
        single
          ? `Remove ${count === 1 ? 'the loaf' : 'the loaves'} from the refrigerator.`
          : 'Remove only the loaves in the first batch.',
        'Bring the dough back to room temperature before baking; use its condition, rather than the clock alone.',
      );
      at += warmup;
    } else {
      warmup = 0;
      push(
        'proof',
        'proof',
        'Warm final proof',
        at,
        t.warm,
        'Cover and keep at 75°F to 80°F / 24°C to 27°C for 3 to 4 hours.',
      );
      at += t.warm;
    }
    firstBake = at;
    preheat = t.preheat;
    covered = t.covered;
    uncovered = t.uncovered;
  } else {
    const h = HOUSE;
    push(
      'feed',
      'feed',
      'Feed starter',
      -h.feed,
      h.feed,
      'Keep an established starter on its regular feeding routine.',
    );
    push('leaven', 'leaven', 'Start leaven', 0, h.leaven, leavenNote(recipe, r), LEAVEN_CUE);
    push(
      'autolyse',
      'autolyse',
      'Start autolyse',
      h.leaven - h.autolyse,
      h.autolyse,
      `Mix ${listed(r.initial)}. Cover. Keep the remaining ingredients for the final mix.`,
    );
    let at = h.leaven;
    push(
      'mix',
      'mix',
      'Mix final dough',
      at,
      h.mix,
      `Add ${listed(r.final)} after the autolyse. Mix until incorporated.`,
    );
    at += h.mix;
    push(
      'rest',
      'bulk',
      'Start bulk fermentation',
      at,
      h.turnEvery,
      'Keep covered in a warm place, about 75°F to 80°F / 24°C to 27°C.',
    );
    at += h.turnEvery;
    for (let n = 1; n <= h.turns; n++) {
      push(`turn${n}`, 'turn', `Turn ${n}`, at, h.turnEvery, houseTurnNote(n));
      at += h.turnEvery;
    }
    push(
      'shape',
      'preshape',
      'Cut and preshape',
      at,
      h.preshape,
      'Turn the dough out of its container onto your work surface. Cut it into equal pieces and shape each into a taut round.',
      'Look for a billowy dough and 20% to 30% volume increase.',
    );
    at += h.preshape;
    push(
      'bench1',
      'bench',
      'Bench rest',
      at,
      h.bench,
      'Cover the rounds. Prepare towel-lined baskets dusted with rice flour.',
    );
    at += h.bench;
    push(
      'fold',
      'shape',
      'Final shape',
      at,
      h.shape,
      'Fold the edges toward the center and roll into a taut round. Place it seam-side up in a prepared basket.',
    );
    at += h.shape;
    push('basket', 'basket', 'Basket rest', at, h.basket, 'Leave the baskets covered at room temperature.');
    at += h.basket;
    push(
      'fridge',
      'fridge',
      'Overnight cold proof',
      at,
      h.fridge,
      `Cover the shaped loaves in their baskets and refrigerate overnight.${later}`,
    );
    at += h.fridge;
    preheat = h.preheat;
    firstBake = at + preheat;
    warmup = preheat;
    covered = h.covered;
    uncovered = h.uncovered;
    push(
      'warmup',
      'warmup',
      single ? `Take ${loaves} out of the fridge` : 'Take batch 1 out of fridge',
      at,
      warmup,
      `Allow ${single ? (count === 1 ? 'the loaf' : 'the loaves') : 'the first batch'} to warm while the oven and pots heat.`,
    );
  }
  const method = tartine ? TARTINE : HOUSE;
  push(
    'preheat',
    'preheat',
    'Preheat oven and Dutch oven',
    firstBake - preheat,
    preheat,
    `Place the lidded Dutch oven or pots in the oven and heat to ${method.preheatTo}. Use one suitable pot per loaf baked at once.`,
  );
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    !Number.isFinite(batches) ||
    batches > 1000
  )
    return [];
  let finish = firstBake;
  for (let i = 0; i < batches; i++) {
    const n = i + 1,
      start = firstBake + i * (covered + uncovered + input.reheat),
      last = i === batches - 1;
    const firstLoaf = i * capacity + 1,
      lastLoaf = Math.min(count, (i + 1) * capacity),
      label = firstLoaf === lastLoaf ? `loaf ${firstLoaf}` : `loaves ${firstLoaf} to ${lastLoaf}`;
    if (i > 0) {
      push(
        `reheat-${n}`,
        'reheat',
        `Reheat for batch ${n}`,
        start - input.reheat,
        input.reheat,
        `Clean the pot, replace its lid and return the oven to ${method.preheatTo}. Load the next batch once the pot and oven are hot.`,
      );
      if (!tartine || input.proof === 'cold')
        push(
          `warmup-${n}`,
          'warmup',
          `Warm batch ${n} (${label})`,
          start - warmup,
          warmup,
          'Remove only this batch from the refrigerator. Later loaves have a longer cold proof.',
          'Bring the dough back to room temperature before its own bake.',
        );
    }
    push(
      i ? `covered-${n}` : 'covered',
      'covered',
      single ? (count === 1 ? 'Bake covered' : `Bake covered (${loaves})`) : `Batch ${n}: bake covered (${label})`,
      start,
      covered,
      `Dust the loaf tops. Carefully turn seam-side down into the hot pot, score with a lame or razor, and cover. Reduce oven to ${method.bakeAt}.`,
    );
    push(
      i ? `uncovered-${n}` : 'uncovered',
      'uncovered',
      single ? 'Remove lid' : `Batch ${n}: remove lid`,
      start + covered,
      uncovered,
      `Remove lid carefully: hot steam can escape. Continue at ${method.bakeAt}.`,
      'Bake until the crust is a rich golden brown; extend the uncovered bake if needed.',
    );
    const out = start + covered + uncovered;
    finish = out;
    push(
      last ? 'done' : `out-${n}`,
      'out',
      last ? (count === 1 ? 'Loaf out of the oven' : 'All loaves out of the oven') : `Batch ${n} out of the oven`,
      out,
      COOLING,
      'Transfer to a wire rack. The base should sound hollow when tapped. Cool each loaf at least 15 minutes before slicing.',
    );
    push(
      last ? 'cooled' : `cooled-${n}`,
      'cooled',
      last
        ? single
          ? '15-minute cooling mark'
          : 'Last batch: 15-minute cooling mark'
        : `Batch ${n}: 15-minute cooling mark`,
      out + COOLING,
      0,
      last && single
        ? count === 1
          ? 'The loaf is ready to slice.'
          : 'The loaves are ready to slice.'
        : 'This batch is ready to slice.',
    );
  }
  const chosen = new Date(`${input.date}T${input.time}:00`);
  if (
    !Number.isFinite(chosen.getTime()) ||
    dateString(chosen) !== input.date ||
    `${String(chosen.getHours()).padStart(2, '0')}:${String(chosen.getMinutes()).padStart(2, '0')}` !== input.time
  )
    return [];
  const start = chosen.getTime() - (input.anchor === 'done' ? finish * 60000 : 0);
  const steps = rows
    .map(({ offset, ...step }): Step => ({ ...step, at: new Date(start + offset * 60000) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  // An overnight proof that falls within one day is named for what it is.
  if (!tartine && !coldProofWindow(steps)?.overnight) {
    const fridge = steps.find((s) => s.kind === 'fridge');
    if (fridge) fridge.title = 'Cold proof (daytime)';
  }
  return steps;
}

/** When the cold proof starts and ends, and whether it runs overnight (ends on a later date). */
export function coldProofWindow(steps: Step[]) {
  const fridge = steps.find((s) => s.kind === 'fridge');
  if (!fridge) return null;
  const end = new Date(fridge.at.getTime() + fridge.minutes * 60000);
  return { start: fridge.at, end, minutes: fridge.minutes, overnight: dateString(fridge.at) !== dateString(end) };
}
