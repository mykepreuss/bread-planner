/**
 * Add-ins: things worked into a dough after the first turn, such as olives or toasted seeds, from the book's variations
 * on its Basic Country Bread. Added at Michael's request on November 22, 2026; since decision 16 they go into Preuss
 * House's dough. Amounts are kept in the
 * book's own measures (cups, teaspoons, lemons): weighing olives or seeds by the cup would be a guess.
 */

/**
 * One add-in, as the book lists it for the recipe's default batch: `before` the amount, the amount with its unit, and
 * `what` after it, as in "3 cups pitted olives, coarsely chopped" or "Grated zest of 1 lemon".
 */
export type MeasuredAddIn = {
  before?: string;
  amount: number;
  unit: [one: string, many: string];
  what?: string;
  optional?: boolean;
};
/**
 * An add-in the book weighs, as a baker's percentage of the flour, such as Oat Porridge's 50% cooked porridge (decision
 * 27): it reads "500 g cooked oat porridge, cooled", counts in the dough's weight, and is ticked off by `name` at the
 * add-in step.
 */
export type WeighedAddIn = { name: string; percent: number; what: string; optional?: boolean };
export type AddIn = MeasuredAddIn | WeighedAddIn;
export const isWeighed = (item: AddIn): item is WeighedAddIn => 'percent' in item;

/**
 * Cooking the add-ins need before they go in, such as toasting seeds or cooking porridge: a step with id `toast` (kept
 * for every recipe, as Sesame's saved checklists use it) and kind `prep` that starts `minutesBefore` minutes (more than
 * 0) ahead of the add-in step, so they are ready and cool by then. Added for Sesame on November 22, 2026. In the note,
 * `{g:25}` becomes the grams of 25% of the dough's flour, so Oat Porridge's oats and water scale with the batch.
 */
export type Prep = { title: string; note: string; minutesBefore: number };

/**
 * A recipe's add-ins and the step that works them in, right after Turn `afterTurn` (Turn 1 when not given), with any
 * `prep` they need first. `note` is the step's note; `{list}` in it becomes the scaled amounts.
 */
export type AddIns = { title: string; note: string; items: AddIn[]; afterTurn?: number; prep?: Prep };

const FRACTIONS: Record<number, string> = { 0: '', 1: '¼', 2: '½', 3: '¾' };

/** An amount to the nearest quarter, as a cook writes it: ¼, 1½, 3. Never less than ¼. */
export function quarters(n: number) {
  const q = Math.max(1, Math.round(n * 4)),
    whole = Math.floor(q / 4);
  return `${whole || ''}${FRACTIONS[q % 4]}`;
}

const grams = (n: number) => `${Math.round(n * 10) / 10} g`;

/** One add-in's line at `scale` times the book's batch, or for a weighed one, for `flour` grams of flour. */
export function addInLine(item: AddIn, scale: number, flour = 0) {
  if (isWeighed(item)) {
    const line = `${grams((flour * item.percent) / 100)} ${item.what}`;
    return item.optional ? `${line} (optional)` : line;
  }
  const n = item.amount * scale,
    amount = quarters(n),
    unit = Math.max(1, Math.round(n * 4)) <= 4 ? item.unit[0] : item.unit[1];
  const line = [item.before, `${amount} ${unit}`, item.what].filter(Boolean).join(' ');
  return item.optional ? `${line} (optional)` : line;
}

/**
 * Every add-in's line, scaled by the dough's weight against the book's batch: twice the dough, twice the olives. A
 * weighed add-in is its share of the dough's `flour`.
 */
export function addInLines(
  addIns: AddIns,
  dough: { count: number; weight: number },
  book: { count: number; weight: number },
  flour = 0,
) {
  const scale = (dough.count * dough.weight) / (book.count * book.weight);
  return addIns.items.map((item) => addInLine(item, scale, flour));
}

/** The prep step's note, with each `{g:percent}` as the grams of that share of the dough's `flour`. */
export function prepNote(prep: Prep, flour: number) {
  return prep.note.replace(/\{g:(\d+(?:\.\d+)?)\}/g, (_, percent: string) => grams((flour * Number(percent)) / 100));
}

/** The add-in step's note, with its list filled in. */
export function addInNote(addIns: AddIns, lines: string[]) {
  const first = (line: string) => line.charAt(0).toLowerCase() + line.slice(1);
  return addIns.note.replace('{list}', lines.map(first).join('; '));
}
