import test from 'node:test';
import assert from 'node:assert/strict';
import { quarters, addInLine, addInLines, addInNote, type AddIns } from './addins.ts';
import { recipeById, defaultSettings, type Recipe } from './recipes.ts';
import { schedule } from './schedule.ts';
import { freshState, planOf } from '../state/schema.ts';

const NOW = new Date(2026, 10, 21, 15, 20).getTime();
/** A made-up Tartine variation, so the shared support is tested apart from any real recipe. */
const extras: AddIns = {
  title: 'Add the extras',
  note: 'Stir together {list}. Work it into the dough.',
  items: [
    { amount: 3, unit: ['cup', 'cups'], what: 'chopped olives' },
    { amount: 2, unit: ['cup', 'cups'], what: 'toasted walnuts', optional: true },
    { amount: 2, unit: ['teaspoon', 'teaspoons'], what: 'dried herbs' },
    { before: 'Grated zest of', amount: 1, unit: ['lemon', 'lemons'] },
  ],
};
const variation: Recipe = { ...recipeById('tartine')!, id: 'variation', name: 'A variation', addIns: extras };

test('amounts are written to the nearest quarter, as a cook writes them, and never as nothing', () => {
  assert.deepEqual([0, 0.1, 0.25, 0.5, 0.74, 1, 1.13, 1.5, 2.25, 3, 4.5, 6.75].map(quarters), [
    '¼',
    '¼',
    '¼',
    '½',
    '¾',
    '1',
    '1¼',
    '1½',
    '2¼',
    '3',
    '4½',
    '6¾',
  ]);
});

test('an add-in reads as the book lists it, singular up to one and plural above', () => {
  const [olives, nuts, herbs, zest] = extras.items;
  assert.equal(addInLine(olives, 1), '3 cups chopped olives');
  assert.equal(addInLine(nuts, 1), '2 cups toasted walnuts (optional)');
  assert.equal(addInLine(herbs, 0.5), '1 teaspoon dried herbs');
  assert.equal(addInLine(zest, 1), 'Grated zest of 1 lemon');
  assert.equal(addInLine(zest, 1.5), 'Grated zest of 1½ lemons');
  assert.equal(addInLine(olives, 0.25), '¾ cup chopped olives');
});

test('add-ins scale with the dough: count times flour per loaf against the book batch', () => {
  const book = { count: 2, loafFlour: 500 };
  assert.deepEqual(addInLines(extras, book, book), [
    '3 cups chopped olives',
    '2 cups toasted walnuts (optional)',
    '2 teaspoons dried herbs',
    'Grated zest of 1 lemon',
  ]);
  assert.deepEqual(addInLines(extras, { count: 3, loafFlour: 500 }, book).slice(0, 1), ['4½ cups chopped olives']);
  assert.deepEqual(addInLines(extras, { count: 1, loafFlour: 1000 }, book).slice(0, 1), ['3 cups chopped olives']);
  assert.deepEqual(addInLines(extras, { count: 1, loafFlour: 500 }, book).slice(3), ['Grated zest of ½ lemon']);
  assert.equal(
    addInNote(extras, addInLines(extras, book, book)),
    'Stir together 3 cups chopped olives; 2 cups toasted walnuts (optional); 2 teaspoons dried herbs; grated zest of 1 lemon. Work it into the dough.',
  );
});

test('a Tartine recipe with add-ins gets a step right after Turn 1, at the same time, and nothing else changes', () => {
  const input = {
    recipe: variation,
    settings: defaultSettings(variation),
    date: '2026-10-21',
    time: '09:00',
    anchor: 'leaven' as const,
    proof: 'cold' as const,
    ovenCapacity: 2,
    reheat: 30,
  };
  const withAddIns = schedule(input),
    plain = schedule({ ...input, recipe: recipeById('tartine')! });
  const ids = withAddIns.map((s) => s.id);
  assert.deepEqual(ids.slice(ids.indexOf('turn1'), ids.indexOf('turn1') + 3), ['turn1', 'addins', 'turn2']);
  const step = withAddIns.find((s) => s.id === 'addins')!,
    turn1 = withAddIns.find((s) => s.id === 'turn1')!;
  assert.equal(+step.at, +turn1.at);
  assert.deepEqual(
    [step.kind, step.title, step.phase, step.handsOn, step.movesPlan, step.bulk, step.turn],
    ['addin', 'Add the extras', 'room', true, false, true, 0],
  );
  assert.match(step.note, /^Stir together 3 cups chopped olives; .*grated zest of 1 lemon\. Work it into the dough\.$/);
  assert.deepEqual(
    withAddIns.filter((s) => s.id !== 'addins').map((s) => [s.id, +s.at]),
    plain.map((s) => [s.id, +s.at]),
    'every other step keeps its time',
  );
  assert.ok(!plain.some((s) => s.kind === 'addin'), 'Original Tartine has no add-in step');
});

test('the add-in step scales with the batch', () => {
  const scaled = schedule({
    ...planOf(freshState(NOW)),
    recipe: variation,
    settings: { ...defaultSettings(variation), count: 4 },
  });
  assert.match(
    scaled.find((s) => s.id === 'addins')!.note,
    /^Stir together 6 cups chopped olives; 4 cups toasted walnuts/,
  );
});
