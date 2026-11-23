import { formula, type Formula, type Weighed } from './formula.ts';
import { HOUSE, TARTINE, COOLING } from './methods.ts';
import { FLOUR_NAMES, inSentence, type Recipe, type Settings } from './recipes.ts';
import { addInLines, addInNote } from './addins.ts';
import { dateString } from './text.ts';

/** What a step is. Saved checklists use its id, which this file keeps exactly as before. */
export type Kind =
  | 'feed'
  | 'leaven'
  | 'autolyse'
  | 'mix'
  | 'bulk'
  | 'turn'
  | 'prep'
  | 'addin'
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
  | 'out';
/** The temperature a step happens at. The page colours steps by it: neutral at room temperature, Fridge for the cold proof, Crust for the oven. */
export type Phase = 'room' | 'cold' | 'oven';

/**
 * Something that goes into the dough at a mixing step, ticked off on its own so none is left out. A saved bake keeps
 * the `id`: `mix:salt` with one mixing bowl, and `mix:1:salt`, `mix:2:salt` and so on with several, each with its
 * `bowl` number.
 */
export type Addition = { id: string; name: string; grams: number; bowl?: number };

/**
 * A step and the facts about it:
 * - `handsOn`: someone has to do something then, so it counts for quiet hours; `activeMinutes` is how long that work
 *   lasts, for mixing and shaping that can run past the cutoff.
 * - `movesPlan`: checking it late or early moves the steps after it. The starter feed, the autolyse, the turns, and
 *   the add-ins and their prep record their time but move nothing.
 * - `bulk`: the start of bulk, a turn, or working in a Tartine recipe's add-ins. Bulk never ends before the latest of
 *   them that is checked.
 * - `turn`: the turn's number, from 1, or 0.
 * - `additions`: what a mixing step adds to the dough, each with its own tick-off.
 */
export type Step = {
  id: string;
  kind: Kind;
  title: string;
  at: Date;
  minutes: number;
  note: string;
  readiness?: string;
  additions?: Addition[];
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
  prep: { phase: 'oven', handsOn: true, movesPlan: false, bulk: false },
  addin: { phase: 'room', handsOn: true, movesPlan: false, bulk: true },
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
  additions: Addition[] = [],
): Row {
  const { active, ...facts } = FACTS[kind];
  const turn = kind === 'turn' ? Number(id.slice(4)) : 0;
  return {
    id,
    kind,
    title,
    offset,
    minutes,
    note,
    readiness,
    ...(additions.length > 0 && { additions }),
    ...facts,
    activeMinutes: active ? minutes : 0,
    turn,
  };
}

/**
 * A mixing stage's ingredients as tick-offs for the step `step`. Added at Michael's request on November 22, 2026,
 * after a bake went into the oven without its salt: the step's note listed everything in one sentence. An ingredient
 * the recipe has none of is left out, and the dough's share of the leaven reads "Leaven".
 */
function additionsFor(step: string, stage: Weighed[], bowls: number): Addition[] {
  const one = stage
    .filter(([, grams]) => grams > 0)
    .map(([label, grams]) => ({
      key: (label === 'Leaven used' ? 'Leaven' : label).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: label === 'Leaven used' ? 'Leaven' : label,
      grams: grams / bowls,
    }));
  if (bowls === 1) return one.map(({ key, name, grams }) => ({ id: `${step}:${key}`, name, grams }));
  return Array.from({ length: bowls }, (_, i) =>
    one.map(({ key, name, grams }) => ({ id: `${step}:${i + 1}:${key}`, name, grams, bowl: i + 1 })),
  ).flat();
}

/**
 * How many bowls the dough is mixed in: enough that none holds more than `perMix` loaves, with every bowl the same
 * size. Michael's request on November 22, 2026: a doubled batch is mixed in two bowls and a tripled one in three,
 * then everything goes into one container for bulk. An odd loaf count splits equally too; Michael only bakes an odd
 * number when one loaf's worth becomes pizza dough, and then enters the dough he mixes.
 */
export function mixingBowls(count: number, perMix: number) {
  return Number.isInteger(perMix) && perMix >= 1 && Number.isFinite(count) && count > 0
    ? Math.max(1, Math.ceil(count / perMix))
    : 1;
}
/** A stage's weights for one of `bowls` equal bowls. */
const perBowl = (stage: Weighed[], bowls: number): Weighed[] => stage.map(([name, g]) => [name, g / bowls]);
/** "both bowls" or "all 3 bowls". */
const allBowls = (bowls: number) => (bowls === 2 ? 'both bowls' : `all ${bowls} bowls`);

export type PlanInput = {
  recipe: Recipe;
  settings: Settings;
  date: string;
  time: string;
  anchor: 'leaven' | 'done';
  proof: 'cold' | 'warm';
  ovenCapacity: number;
  /** The most loaves mixed in one bowl, 2 when not given; see `mixingBowls`. */
  mixCapacity?: number;
  reheat: number;
};

const LEAVEN_CUE =
  'Use when aerated and puffy, and a spoonful floats in room-temperature water. If it sinks, allow more fermentation before mixing.';
/** The Basic Country Bread's initial mix, for a Tartine recipe without its own `initialMix`. */
const TARTINE_MIX = {
  note: 'Disperse the leaven used in the initial water, about 80°F / 27°C. Add white and whole-wheat flour; mix until no dry flour remains. Cover and rest; the book gives 25 to 40 minutes.',
};
const gram = (n: number) => `${Math.round(n * 10) / 10} g`;

/**
 * How long a Tartine recipe's loaves stay in the fridge, as its step and the oven card say: the book's "10 to 12 hours",
 * or the recipe's own, such as "about 18½ hours".
 */
export function coldProofText(recipe: Recipe) {
  if (recipe.coldProof === undefined) return '10 to 12 hours';
  const hours = recipe.coldProof / 60,
    whole = Math.floor(hours);
  return `about ${hours - whole === 0.5 ? `${whole}½` : Math.round(hours * 10) / 10} hours`;
}
const listed = (rows: [string, number][]) =>
  rows.map(([name, n]) => `${inSentence(name)} (${Math.round(n * 10) / 10} g)`).join(', ');

/** The leaven step's note: the scaled build, and what is kept or still needed. */
function leavenNote(recipe: Recipe, r: Formula, bowls: number) {
  const [starter, flour, wheat, water] = r.madeParts,
    buildFlour = inSentence(FLOUR_NAMES[recipe.buildFlour]);
  const keep =
    r.reserve > 0
      ? ` You use ${gram(r.used)} in the dough and keep ${gram(r.reserve)}.`
      : r.shortfall > 0
        ? ` This makes ${gram(r.shortfall)} less than the ${gram(r.used)} the dough needs; increase the build.`
        : ` All ${gram(r.used)} goes into the dough.`;
  const split = bowls > 1 && r.used > 0 ? ` Each of the ${bowls} bowls gets ${gram(r.used / bowls)}.` : '';
  return recipe.method === 'tartine'
    ? `Mix ${gram(starter)} (about 1 tbsp) of mature starter with ${gram(water)} water, then add ${gram(flour)} ${buildFlour} and ${gram(wheat)} whole-wheat flour. Cover at room temperature.${keep}${split}`
    : `Mix ${gram(starter)} mature starter, ${gram(flour)} ${buildFlour}, ${gram(wheat)} whole-wheat flour and ${gram(water)} water. Keep it separate from the autolyse and cover.${keep}${split}`;
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
 * The plan for one bake, from the feed or leaven to the last loaf out of the oven, at local dates and times. Empty when the
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
  // Mixed in several bowls, the dough comes together in one container at the start of bulk.
  const bowls = mixingBowls(count, input.mixCapacity ?? 2),
    combine = bowls > 1 ? `Combine ${allBowls(bowls)} in one container. ` : '';
  // Add-ins go in right after the first turn, as the book works them in, with any prep finished by then. The prep lasts
  // until the next step starts: that turn and every step before it are already on the plan, so the next one is among
  // them.
  const addInsAfter = (turnAt: number) => {
    if (!recipe.addIns) return;
    const { prep } = recipe.addIns;
    if (prep) {
      const start = turnAt - prep.minutesBefore,
        next = Math.min(...rows.map((r) => r.offset).filter((offset) => offset > start));
      push('toast', 'prep', prep.title, start, next - start, prep.note);
    }
    push(
      'addins',
      'addin',
      recipe.addIns.title,
      turnAt,
      0,
      addInNote(recipe.addIns, addInLines(recipe.addIns, settings, recipe.defaults)),
    );
  };
  let firstBake: number, preheat: number, covered: number, uncovered: number, warmup: number;
  if (tartine) {
    const t = TARTINE,
      initial = recipe.initialMix ?? TARTINE_MIX,
      own = recipe.autolyse,
      rest = settings.autolyse,
      split = (note: string) =>
        bowls > 1 ? `Split this mix between ${bowls} bowls, with an equal share of everything in each. ${note}` : note;
    push('leaven', 'leaven', 'Make leaven', 0, t.leaven, leavenNote(recipe, r, bowls), LEAVEN_CUE);
    let at = t.leaven;
    // A recipe with its own autolyse rests the flour and water until the leaven is ready, then adds the leaven with the
    // salt (decision 16). The book's method mixes the leaven in first and rests before the salt.
    if (own) push('autolyse', 'autolyse', 'Start autolyse', at - rest, rest, split(own.note));
    else {
      push('autolyse', 'autolyse', 'Mix dough and rest', at, rest, split(initial.note));
      at += rest;
    }
    const added = own ? 'leaven, salt and reserved water' : 'salt and reserved water';
    push(
      'mix',
      'mix',
      own ? 'Add leaven, salt and final water' : 'Add salt and final water',
      at,
      0,
      bowls > 1
        ? `Work the ${added} into each bowl. Keep mixing if the dough separates; it should come together again.`
        : `Work in the ${added}. Keep mixing if the dough separates; it should come together again.`,
      undefined,
      additionsFor('mix', r.final, bowls),
    );
    push(
      'rest',
      'bulk',
      'Begin warm bulk fermentation',
      at,
      Math.min(t.turnEvery, t.bulk),
      `${combine}Cover and keep at 75°F to 80°F / 24°C to 27°C.`,
    );
    for (let elapsed = t.turnEvery, n = 1; elapsed < t.bulk; elapsed += t.turnEvery, n++) {
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
      if (n === 1) addInsAfter(at + elapsed);
    }
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
      // A recipe can add to the book's shaping, as Emmer/Einkorn's bran coat does (decision 24).
      [
        'Turn flour-side down. Stretch and fold the bottom, sides and top over the center; roll seam-side down into a taut round. Place seam-side up in a prepared basket.',
        recipe.finalShape,
      ]
        .filter(Boolean)
        .join(' '),
    );
    at += t.shape;
    if (input.proof === 'cold') {
      const cold = recipe.coldProof ?? t.cold;
      push(
        'fridge',
        'fridge',
        'Refrigerated final proof',
        at,
        cold,
        `Cover the baskets and refrigerate for ${coldProofText(recipe)}.${later}`,
      );
      at += cold;
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
    push('leaven', 'leaven', 'Start leaven', 0, h.leaven, leavenNote(recipe, r, bowls), LEAVEN_CUE);
    push(
      'autolyse',
      'autolyse',
      'Start autolyse',
      h.leaven - settings.autolyse,
      settings.autolyse,
      bowls > 1
        ? `In each of ${bowls} bowls, mix ${listed(perBowl(r.initial, bowls))}. Cover. Keep the remaining ingredients for the final mix.`
        : `Mix ${listed(r.initial)}. Cover. Keep the remaining ingredients for the final mix.`,
    );
    let at = h.leaven;
    const added = additionsFor('mix', r.final, bowls);
    push(
      'mix',
      'mix',
      'Mix final dough',
      at,
      h.mix,
      // The tick-offs under the note name each ingredient and its weight.
      !added.length
        ? 'Mix until incorporated.'
        : bowls > 1
          ? 'Add these to each bowl after the autolyse. Mix until incorporated.'
          : 'Add these after the autolyse. Mix until incorporated.',
      undefined,
      added,
    );
    at += h.mix;
    push(
      'rest',
      'bulk',
      'Start bulk fermentation',
      at,
      h.turnEvery,
      `${combine}Keep covered in a warm place, about 75°F to 80°F / 24°C to 27°C.`,
    );
    at += h.turnEvery;
    for (let n = 1; n <= h.turns; n++) {
      push(`turn${n}`, 'turn', `Turn ${n}`, at, h.turnEvery, houseTurnNote(n));
      if (n === 1) addInsAfter(at);
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
