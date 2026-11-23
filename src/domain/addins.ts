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
export type AddIn = {
  before?: string;
  amount: number;
  unit: [one: string, many: string];
  what?: string;
  optional?: boolean;
};

/**
 * Oven work the add-ins need before they go in, such as toasting seeds: a step with id `toast` and kind `prep` that
 * starts `minutesBefore` minutes (more than 0) ahead of the add-in step, so they are ready and cool by then. Added for
 * Sesame on November 22, 2026.
 */
export type Prep = { title: string; note: string; minutesBefore: number };

/**
 * A recipe's add-ins and the step that works them in, right after Turn 1, with any `prep` they need first. `note` is
 * the step's note; `{list}` in it becomes the scaled amounts.
 */
export type AddIns = { title: string; note: string; items: AddIn[]; prep?: Prep };

const FRACTIONS: Record<number, string> = { 0: '', 1: '¼', 2: '½', 3: '¾' };

/** An amount to the nearest quarter, as a cook writes it: ¼, 1½, 3. Never less than ¼. */
export function quarters(n: number) {
  const q = Math.max(1, Math.round(n * 4)),
    whole = Math.floor(q / 4);
  return `${whole || ''}${FRACTIONS[q % 4]}`;
}

/** One add-in's line at `scale` times the book's batch. */
export function addInLine(item: AddIn, scale: number) {
  const n = item.amount * scale,
    amount = quarters(n),
    unit = Math.max(1, Math.round(n * 4)) <= 4 ? item.unit[0] : item.unit[1];
  const line = [item.before, `${amount} ${unit}`, item.what].filter(Boolean).join(' ');
  return item.optional ? `${line} (optional)` : line;
}

/** Every add-in's line, scaled by the dough's weight against the book's batch: twice the dough, twice the olives. */
export function addInLines(
  addIns: AddIns,
  dough: { count: number; weight: number },
  book: { count: number; weight: number },
) {
  const scale = (dough.count * dough.weight) / (book.count * book.weight);
  return addIns.items.map((item) => addInLine(item, scale));
}

/** The add-in step's note, with its list filled in. */
export function addInNote(addIns: AddIns, lines: string[]) {
  const first = (line: string) => line.charAt(0).toLowerCase() + line.slice(1);
  return addIns.note.replace('{list}', lines.map(first).join('; '));
}
