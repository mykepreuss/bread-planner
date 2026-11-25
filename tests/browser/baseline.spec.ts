import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { SavedPlan } from './saved-plans.ts';
import { pageSettings, widths } from './context.ts';

/**
 * Screens: each saved plan opened at a frozen moment and recorded three ways, at phone and desktop width:
 * - an accessibility snapshot: every label, value and piece of text, in page order;
 * - a layout snapshot: every element's tag, classes and data attributes, which is what the stylesheet hangs on;
 * - a screenshot of the first screen, and for five screens of the whole page, so styling below the first screen is
 *   recorded too (including the phone layout that moves the steps up once a bake is underway).
 * Each screen test renders both widths and checks they give the same two snapshots before comparing one with the
 * record. Flows: the main actions, recorded as accessibility snapshots at desktop width, with a reload where the
 * result must persist.
 */
const plans = new Map(
  (JSON.parse(readFileSync(new URL('./saved-plans.json', import.meta.url), 'utf8')) as SavedPlan[]).map((p) => [
    p.name,
    p,
  ]),
);
const KEY = 'bread-planner.v5';

/** Collects a page's console errors and warnings, and uncaught errors. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  return problems;
}
/** Every flow fails on a console error or warning. Screen tests open their own pages and check them the same way. */
const test = base.extend<{ consoleProblems: string[] }>({
  consoleProblems: [
    async ({ page }, use) => {
      const problems = watch(page);
      await use(problems);
      expect(problems, 'console errors or warnings').toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Opens the planner on a saved plan with the clock frozen. The save is written once per tab, so a reload shows what the
 * app saved itself; for the same reason, call it once per page.
 */
async function open(page: Page, name: string) {
  const plan = plans.get(name);
  if (!plan) throw new Error(`No saved plan ${name}`);
  await page.clock.setFixedTime(plan.now);
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('seeded')) return;
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      sessionStorage.setItem('seeded', '1');
    },
    [KEY, plan.saved === null ? null : JSON.stringify(plan.saved)] as const,
  );
  await page.goto('/');
  await ready(page);
}
async function ready(page: Page) {
  await expect(page.getByRole('tab', { name: 'Schedule' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
const aria = (page: Page) => page.locator('body').ariaSnapshot();
/** Tag, kept id, classes and data attributes of every element, indented by depth. Ids React generates are left out: they change when components move. */
const layout = (page: Page) =>
  page.locator('body').evaluate((body) => {
    const lines: string[] = [],
      generated = /^radix-|«|_r_|^:r/;
    const walk = (el: Element, depth: number) => {
      const tag = el.tagName.toLowerCase(),
        parts = [...el.attributes].flatMap((a) =>
          a.name === 'class'
            ? [`.${a.value.trim().split(/\s+/).join('.')}`]
            : a.name.startsWith('data-') || a.name === 'type' || (a.name === 'id' && !generated.test(a.value))
              ? [`[${a.name}${a.value ? `=${a.value}` : ''}]`]
              : [],
        );
      lines.push(`${'  '.repeat(depth)}${tag}${parts.join('')}`);
      if (tag !== 'svg') for (const child of el.children) walk(child, depth + 1);
    };
    for (const child of body.children) walk(child, 0);
    return lines.join('\n') + '\n';
  });
const upNext = (page: Page) => page.getByRole('region', { name: 'Up next' });
async function choose(page: Page, combobox: string, option: string, within = page.locator('body')) {
  await within.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function expectSameAfterReload(page: Page) {
  const before = await aria(page);
  await page.reload();
  await ready(page);
  expect(await aria(page), 'the same screen after a reload').toBe(before);
}
async function openIngredients(page: Page) {
  await page.getByRole('tab', { name: 'Ingredients' }).click();
  for (const section of ['Leaven, salt & water split', 'Leaven build', 'Recipe defaults']) {
    await page.getByRole('button', { name: section }).click();
    // Let the section finish opening: where the next click scrolls the page must not depend on how fast this machine is.
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  }
}

const RECIPES = ['house', 'tartine', 'olive', 'sesame', 'whole-wheat', 'country-rye', 'emmer', 'oat-porridge'];
/** Screens recorded as a whole page too, at these widths. Kept to a few: whole pages are large. */
const wholePage: Record<string, string[]> = {
  'mid-bulk': ['phone', 'desktop'],
  'cold-proof-next': ['phone'],
  'quiet-batches': ['phone'],
  complete: ['phone'],
  'recipe-house-ingredients': ['phone'],
};
const screens: { id: string; plan: string; ingredients?: boolean }[] = [
  ...[
    'fresh',
    'mid-bulk',
    'dough-check',
    'cold-proof-next',
    'ended',
    'complete',
    'quiet-batches',
    'tartine-warm',
    'daytime-proof',
  ].map((plan) => ({ id: plan, plan })),
  ...RECIPES.flatMap((r) => [
    { id: `recipe-${r}-schedule`, plan: `recipe-${r}` },
    { id: `recipe-${r}-ingredients`, plan: `recipe-${r}`, ingredients: true },
  ]),
  { id: 'leaven-short-ingredients', plan: 'leaven-short', ingredients: true },
];

for (const screen of screens)
  test(`screen: ${screen.id}`, async ({ browser }) => {
    // Both widths are open and compared with each other before anything is compared with, or written to, the record.
    const opened = await Promise.all(
      Object.entries(widths).map(async ([width, viewport]) => {
        const context = await browser.newContext({ ...pageSettings, viewport }),
          page = await context.newPage(),
          problems = watch(page);
        await open(page, screen.plan);
        if (screen.ingredients) await openIngredients(page);
        return { width, viewport, context, page, problems, aria: await aria(page), layout: await layout(page) };
      }),
    );
    try {
      const [phone, desktop] = opened;
      expect(phone.aria, 'phone and desktop show the same content').toBe(desktop.aria);
      expect(phone.layout, 'phone and desktop have the same markup').toBe(desktop.layout);
      for (const { width, viewport, page, problems } of opened) {
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          `no sideways scrolling at ${width} width`,
        ).toBe(viewport.width);
        expect(problems, `console errors or warnings at ${width} width`).toEqual([]);
      }
      expect(desktop.aria).toMatchSnapshot(`${screen.id}.aria.yml`);
      expect(desktop.layout).toMatchSnapshot(`${screen.id}.layout.txt`);
      for (const { width, page } of opened) {
        await expect(page).toHaveScreenshot(`${screen.id}-${width}.png`);
        if (wholePage[screen.id]?.includes(width))
          await expect(page).toHaveScreenshot(`${screen.id}-whole-page-${width}.png`, { fullPage: true });
      }
    } finally {
      await Promise.all(opened.map((o) => o.context.close()));
    }
  });

test.describe('flows', () => {
  test('Done on an overdue leaven moves the plan, and the check survives a reload', async ({ page }) => {
    await open(page, 'leaven-late');
    await upNext(page).getByRole('button', { name: 'Done' }).click();
    await expect(upNext(page)).toContainText('Running 40 min behind plan');
    expect(await aria(page)).toMatchSnapshot('flow-done.aria.yml');
    await expectSameAfterReload(page);
    // The planner saves version 6 and leaves the version 5 save as it was, for a rollback (docs/BEHAVIOUR.md).
    const [five, six] = await page.evaluate(() => [
      localStorage.getItem('bread-planner.v5'),
      localStorage.getItem('bread-planner.v6'),
    ]);
    expect(five, 'the version 5 save is untouched').toBe(JSON.stringify(plans.get('leaven-late')!.saved));
    expect(JSON.parse(six ?? 'null')?.plan.recipes.house.bake.done, 'the check is saved as version 6').toContain(
      'leaven',
    );
  });

  test('The dough temperature after mixing re-times bulk, and °C shows the same reading', async ({ page }) => {
    await open(page, 'mixed');
    await upNext(page).getByLabel('Dough temperature after mixing').fill('84');
    await expect(upNext(page)).toContainText('Bulk should take about 3h 2m');
    expect(await aria(page)).toMatchSnapshot('flow-after-mixing-84F.aria.yml');
    await choose(page, 'Temperature unit', '°C', upNext(page));
    await expect(upNext(page).getByLabel('Dough temperature after mixing')).toHaveValue('28.9');
    expect(await aria(page)).toMatchSnapshot('flow-after-mixing-celsius.aria.yml');
    await expectSameAfterReload(page);
  });

  test('A later reading is listed and re-times what is left; removing it restores the plan', async ({ page }) => {
    await open(page, 'turn-one-78');
    const before = await aria(page);
    await upNext(page).getByLabel('Dough temperature now').fill('86');
    await upNext(page).getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('list', { name: 'Later dough temperatures' })).toContainText('86°F at 3:20 PM');
    expect(await aria(page)).toMatchSnapshot('flow-reading-added.aria.yml');
    await expectSameAfterReload(page);
    await page.getByRole('button', { name: 'Remove the 86°F reading from 3:20 PM' }).click();
    expect(await aria(page), 'removing the reading restores the screen').toBe(before);
  });

  test('Ready: preshape now checks preshape and marks the remaining turns skipped', async ({ page }) => {
    await open(page, 'dough-check');
    await upNext(page).getByRole('button', { name: 'Ready: preshape now' }).click();
    await expect(page.getByText('Skipped').first()).toBeVisible();
    expect(await aria(page)).toMatchSnapshot('flow-ready-preshape.aria.yml');
    await expectSameAfterReload(page);
  });

  test('Done at corrections move the plan, across days too', async ({ page }) => {
    await open(page, 'leaven-done-late');
    await expect(upNext(page)).toContainText('Running 40 min behind plan');
    await page.getByLabel('Time Start leaven was done').fill('09:00');
    await expect(upNext(page)).not.toContainText('behind plan');
    expect(await aria(page)).toMatchSnapshot('flow-done-at-time.aria.yml');
    await page.getByLabel('Date Start leaven was done').fill('2026-11-20');
    await expect(upNext(page)).toContainText('Running 24h ahead of plan');
    expect(await aria(page)).toMatchSnapshot('flow-done-at-date.aria.yml');
    await expectSameAfterReload(page);
  });

  test('Every date and time field resets its native look, so it fits its place on a phone', async ({ page }) => {
    // iPhone Safari sizes a native date or time field by its own picker, and lets it spill out of its place, unless the
    // field's appearance is reset. This browser can't draw that control, so the test checks the reset on every field,
    // as well as where each Done at pair sits.
    await page.setViewportSize(widths.phone);
    await open(page, 'mid-bulk');
    await expect(page.locator('.done-at')).toHaveCount(6);
    const fields = await page.locator('input[type="date"], input[type="time"]').all();
    expect(fields).toHaveLength(14);
    for (const field of fields) {
      const name = (await field.getAttribute('aria-label')) ?? (await field.getAttribute('id'));
      expect(await field.evaluate((el) => getComputedStyle(el).appearance), `${name}: appearance`).toBe('none');
    }
    for (const pair of await page.locator('.done-at').all()) {
      const [date, time] = await pair
        .locator('input')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
      expect(date.right, 'the date ends before the time starts').toBeLessThanOrEqual(time.left);
      expect(time.right, 'the time ends inside the screen').toBeLessThanOrEqual(widths.phone.width);
    }
  });

  test('Up next moves past an unchecked Feed starter to Turn 4 once Turn 3 is checked', async ({ page }) => {
    await open(page, 'fresh');
    for (const title of [
      'Start leaven',
      'Start autolyse',
      'Mix final dough',
      'Start bulk fermentation',
      'Turn 1',
      'Turn 2',
      'Turn 3',
    ])
      await page.getByRole('checkbox', { name: `Complete ${title}` }).click();
    await expect(page.getByText('7 of 22 steps checked')).toBeVisible();
    await expect(upNext(page).getByRole('heading', { level: 2 })).toHaveText('Turn 4');
    const feed = page.locator('.timeline-step', { has: page.getByRole('checkbox', { name: 'Complete Feed starter' }) });
    await expect(feed.getByText('Skipped', { exact: true })).toBeVisible();
    await expectSameAfterReload(page);
    // Checked late, the feed is no longer skipped, and Up next stays on Turn 4.
    await page.getByRole('checkbox', { name: 'Complete Feed starter' }).click();
    await expect(feed.getByText('Skipped', { exact: true })).toHaveCount(0);
    await expect(upNext(page).getByRole('heading', { level: 2 })).toHaveText('Turn 4');
  });

  test('Preheat checked before the fridge step it starts with leaves Up next on the fridge step', async ({ page }) => {
    await open(page, 'fresh');
    const boxes = page.getByRole('checkbox', { name: /^Complete / });
    const names = await boxes.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
    const fridge = names.indexOf('Complete Take both loaves out of the fridge');
    expect(names[fridge + 1]).toBe('Complete Preheat oven and Dutch oven');
    for (const name of names.slice(0, fridge)) await page.getByRole('checkbox', { name, exact: true }).click();
    await page.getByRole('checkbox', { name: 'Complete Preheat oven and Dutch oven' }).click();
    await expect(page.getByText(`${fridge + 1} of 22 steps checked`)).toBeVisible();
    await expect(upNext(page).getByRole('heading', { level: 2 })).toHaveText('Take both loaves out of the fridge');
    await expect(page.getByText('Skipped', { exact: true })).toHaveCount(0);
    await expectSameAfterReload(page);
  });

  test('Checking the last step on a fresh plan asks before skipping the whole bake', async ({ page }) => {
    // The last step is the last loaf out, since the cooling mark was removed on November 22, 2026.
    await open(page, 'fresh');
    const last = page.getByRole('checkbox', { name: 'Complete All loaves out of the oven' }),
      dialog = page.getByRole('alertdialog');
    await last.click();
    await expect(dialog.getByRole('heading')).toHaveText('Skip 21 earlier steps?');
    await expect(dialog).toContainText('Checking "All loaves out of the oven" marks 21 earlier steps as Skipped.');
    await dialog.getByRole('button', { name: "Don't check it" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(last, 'focus goes back to the check box').toBeFocused();
    await expect(page.getByText('0 of 22 steps checked')).toBeVisible();
    await expect(last).not.toBeChecked();
    await expect(upNext(page).getByRole('heading', { level: 2 })).toHaveText('Feed starter');
    await last.click();
    await dialog.getByRole('button', { name: 'Check and skip' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(last).toBeFocused();
    await expect(page.getByText('1 of 22 steps checked')).toBeVisible();
    await expect(page.getByText('Skipped', { exact: true })).toHaveCount(21);
    await expect(page.getByText('All batches done. Enjoy your bread.')).toBeVisible();
    await expectSameAfterReload(page);
  });

  test('A check that asks is recorded at the tap, so it skips what the question counted', async ({ page }) => {
    // Cool dough at 60°F, preshape tapped at 5:45 PM on bake day and confirmed a minute later, when Turn 7 has come due.
    await page.clock.setFixedTime(new Date('2026-11-22T17:45:00-08:00'));
    await page.addInitScript(
      (save) => {
        if (sessionStorage.getItem('seeded')) return;
        localStorage.clear();
        localStorage.setItem('bread-planner.v6', save);
        sessionStorage.setItem('seeded', '1');
      },
      JSON.stringify({
        version: 6,
        plan: { date: '2026-11-22', time: '09:00', recipes: { house: { bake: { doughTemp: 60 } } } },
      }),
    );
    await page.goto('/');
    await ready(page);
    await page.getByRole('checkbox', { name: 'Complete Cut and preshape' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('heading')).toHaveText('Skip 11 earlier steps?');
    await page.clock.setFixedTime(new Date('2026-11-22T17:46:00-08:00'));
    await dialog.getByRole('button', { name: 'Check and skip' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Skipped', { exact: true })).toHaveCount(11);
  });

  test("A check that asks counts at the tap, not at the screen's last refresh", async ({ page }) => {
    // The screen was drawn at 5:45:20 PM and is tapped at 5:45:50, which rounds to 5:46, when Turn 7 has come due.
    await page.clock.setFixedTime(new Date('2026-11-22T17:45:20-08:00'));
    await page.addInitScript(
      (save) => {
        if (sessionStorage.getItem('seeded')) return;
        localStorage.clear();
        localStorage.setItem('bread-planner.v6', save);
        sessionStorage.setItem('seeded', '1');
      },
      JSON.stringify({
        version: 6,
        plan: { date: '2026-11-22', time: '09:00', recipes: { house: { bake: { doughTemp: 60 } } } },
      }),
    );
    await page.goto('/');
    await ready(page);
    await page.clock.setFixedTime(new Date('2026-11-22T17:45:50-08:00'));
    await page.getByRole('checkbox', { name: 'Complete Cut and preshape' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('heading')).toHaveText('Skip 12 earlier steps?');
    await dialog.getByRole('button', { name: 'Check and skip' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Skipped', { exact: true })).toHaveCount(12);
  });

  test('Olive lists its add-ins scaled to the loaves, and the list fits a phone', async ({ page }) => {
    await page.setViewportSize(widths.phone);
    await open(page, 'recipe-olive');
    await page.getByRole('tab', { name: 'Ingredients' }).click();
    const addIns = page.locator('.work-card', { hasText: '03 / Add-ins' }).getByRole('listitem');
    await expect(page.getByText('Basket and dusting flour'), 'no dusting flour card').toHaveCount(0);
    await expect(addIns).toHaveText([
      '3 cups pitted olives, coarsely chopped',
      '2 cups toasted walnuts or hazelnuts, coarsely chopped (optional)',
      '2 teaspoons dried herbes de Provence',
      'Grated zest of 1 lemon',
    ]);
    const loaves = page.getByLabel('Number of loaves');
    await loaves.fill('3');
    await loaves.blur();
    await expect(addIns).toHaveText([
      '4½ cups pitted olives, coarsely chopped',
      '3 cups toasted walnuts or hazelnuts, coarsely chopped (optional)',
      '3 teaspoons dried herbes de Provence',
      'Grated zest of 1½ lemons',
    ]);
    await loaves.fill('1');
    await loaves.blur();
    await expect(addIns.first()).toHaveText('1½ cups pitted olives, coarsely chopped');
    // Every line wraps inside the screen.
    for (const item of await addIns.all()) {
      const box = (await item.boundingBox())!;
      expect(box.x + box.width, (await item.textContent()) ?? '').toBeLessThanOrEqual(widths.phone.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(widths.phone.width);
  });

  test('The final mix lists each addition with its own tick-off; a tick is saved, outlasts the step and clears with the checklist', async ({
    page,
  }) => {
    await open(page, 'leaven-done-late');
    // The autolyse is up next; once it is done, the final mix is.
    await upNext(page).getByRole('button', { name: 'Done' }).click();
    await expect(upNext(page).getByRole('heading')).toHaveText('Mix final dough');
    const inCard = upNext(page).getByRole('list', { name: 'Add to the dough' }),
      inTimeline = page
        .locator('.timeline-step', { has: page.locator('#step-mix') })
        .getByRole('list', { name: 'Add to the dough' });
    await expect(inCard.getByRole('checkbox')).toHaveCount(4);
    await expect(upNext(page)).toContainText('Add these after the autolyse. Mix until incorporated.');
    // A tick on the box or on its name, in the card, shows in the timeline's list too.
    await inCard.getByRole('checkbox', { name: 'Salt 20 g' }).check();
    await inCard.getByText('Rye flour').click();
    await expect(inTimeline.getByRole('checkbox', { name: 'Salt 20 g' })).toBeChecked();
    await expect(inTimeline.getByRole('checkbox', { name: 'Rye flour 100 g' })).toBeChecked();
    await expect(inTimeline.getByRole('checkbox', { name: 'Leaven 200 g' })).not.toBeChecked();
    await expect(inTimeline.getByRole('checkbox', { name: 'Water 100 g' })).not.toBeChecked();
    expect(await aria(page)).toMatchSnapshot('flow-final-mix-ticks.aria.yml');
    await expectSameAfterReload(page);
    // Checking the step neither ticks nor unticks anything: what was not ticked still shows on the step.
    await upNext(page).getByRole('button', { name: 'Done' }).click();
    await expect(upNext(page).getByRole('heading')).toHaveText('Start bulk fermentation');
    await expect(inTimeline.getByRole('checkbox', { name: 'Salt 20 g' })).toBeChecked();
    await expect(inTimeline.getByRole('checkbox', { name: 'Leaven 200 g' })).not.toBeChecked();
    // And it can still be ticked from there, with the step's name left struck through and the tick-off's not.
    await inTimeline.getByRole('checkbox', { name: 'Leaven 200 g' }).check();
    const saved = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('bread-planner.v6')!).plan.recipes.house.bake.added);
    expect(await saved(), 'the ticks are saved with the bake').toEqual(['mix:salt', 'mix:rye-flour', 'mix:leaven']);
    expect(
      await page.evaluate(() =>
        ['label[for="step-mix"]', 'label[for="timeline-add-mix-water"]'].map(
          (label) => getComputedStyle(document.querySelector(label)!).textDecorationLine,
        ),
      ),
    ).toEqual(['line-through', 'none']);
    expect(await aria(page)).toMatchSnapshot('flow-final-mix-done.aria.yml');
    await page.getByRole('button', { name: 'Clear checklist' }).click();
    await expect(inTimeline.getByRole('checkbox', { checked: true })).toHaveCount(0);
    expect(await saved(), 'Clear checklist clears the ticks').toEqual([]);
  });

  test('Doubling the loaves mixes in two bowls, each with its own weights and tick-offs; Loaves per mix is saved', async ({
    page,
  }) => {
    await open(page, 'leaven-done-late');
    await upNext(page).getByRole('button', { name: 'Done' }).click();
    await page.getByLabel('Number of loaves').fill('4');
    await expect(page.getByText('2 bowls', { exact: true })).toBeVisible();
    const bowl = (n: number) => upNext(page).getByRole('list', { name: `Add to bowl ${n}` });
    for (const n of [1, 2])
      for (const name of ['Rye flour 100 g', 'Leaven 200 g', 'Salt 20 g', 'Water 100 g'])
        await expect(bowl(n).getByRole('checkbox', { name })).toBeVisible();
    await expect(upNext(page)).toContainText('Add these to each bowl after the autolyse.');
    await expect(page.locator('.timeline-step', { has: page.locator('#step-rest') })).toContainText(
      'Combine both bowls in one container.',
    );
    // Bowl 2's salt is its own tick.
    await bowl(2).getByRole('checkbox', { name: 'Salt 20 g' }).check();
    await expect(bowl(1).getByRole('checkbox', { name: 'Salt 20 g' })).not.toBeChecked();
    expect(await aria(page)).toMatchSnapshot('flow-two-bowls.aria.yml');
    await expectSameAfterReload(page);
    // A bowl that holds all four loaves mixes once, with the whole batch's weights.
    await page.getByLabel('Loaves per mix').fill('4');
    await expect(page.getByText('1 bowl', { exact: true })).toBeVisible();
    // Back to 2 per mix: the Ingredients tab lists one bowl's weights, not the whole batch's.
    await page.getByRole('tab', { name: 'Ingredients' }).click();
    await expect(page.getByText('Weights for each of 2 bowls.', { exact: false })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await page.getByLabel('Loaves per mix').fill('2');
    await page.getByRole('tab', { name: 'Ingredients' }).click();
    const autolyse = page.locator('.weights').first(),
      finalMix = page.locator('.weights').nth(1);
    await expect(page.getByText('Weights for each of 2 bowls.', { exact: false })).toHaveCount(2);
    await expect(autolyse).toContainText("Anita's all-purpose flour800 g");
    await expect(autolyse).toContainText('Water680 g');
    await expect(finalMix).toContainText('Salt20 g');
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await page.getByLabel('Loaves per mix').fill('4');
    await expect(
      upNext(page).getByRole('list', { name: 'Add to the dough' }).getByRole('checkbox', { name: 'Salt 40 g' }),
    ).toBeVisible();
    await page.reload();
    await ready(page);
    await expect(page.getByLabel('Loaves per mix')).toHaveValue('4');
    await page.getByRole('tab', { name: 'Ingredients' }).click();
    await expect(page.getByText('Weights for each of')).toHaveCount(0);
  });

  test('Clear checklist clears the checks and the dough temperatures', async ({ page }) => {
    await open(page, 'mid-bulk');
    await page.getByRole('button', { name: 'Clear checklist' }).click();
    await expect(page.getByText(/^0 of \d+ steps checked$/)).toBeVisible();
    await expect(page.locator('#timeline-dough-temp')).toHaveValue('');
    expect(await aria(page)).toMatchSnapshot('flow-clear-checklist.aria.yml');
    await expectSameAfterReload(page);
  });

  test('A plan that ended with nothing checked opens on the suggested start', async ({ page }) => {
    // Decision 26: its start has passed, so the plan looks forward. At 3:20 PM, a starter feed at 9:15 PM and the
    // leaven at 8:15 AM tomorrow leave no night work (decision 25).
    await open(page, 'ended');
    await expect(page.getByRole('button', { name: 'Plan the next bake' })).toHaveCount(0);
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-22');
    await expect(page.locator('#plan-time')).toHaveValue('08:15');
    await expect(upNext(page).getByText('Suggested start', { exact: true })).toBeVisible();
    expect(await aria(page)).toMatchSnapshot('flow-plan-next-bake.aria.yml');
    await expectSameAfterReload(page);
  });

  test('Plan the next bake on a fully checked plan starts a fresh checklist at the suggested start', async ({
    page,
  }) => {
    // Decision 1: the checklist clears, so a finished bake's next one looks just like an ended plan's next one.
    await open(page, 'complete');
    await page.getByRole('button', { name: 'Plan the next bake' }).click();
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-22');
    await expect(page.getByText('0 of 22 steps checked')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan the next bake' })).toHaveCount(0);
    expect(await aria(page)).toMatchSnapshot('flow-plan-next-bake.aria.yml');
    await expectSameAfterReload(page);
  });

  test('Use suggested start goes back to the suggestion from a chosen start still ahead', async ({ page }) => {
    // Decision 26: Preuss Country Bread chosen for a 9:00 AM leaven tomorrow; the suggestion is 45 minutes earlier.
    await open(page, 'recipe-house');
    const use = page.getByRole('button', { name: 'Use suggested start' });
    await expect(page.getByText('Feed starter · 9:15 PM', { exact: true })).toBeVisible();
    await use.click();
    await expect(page.locator('#plan-time')).toHaveValue('08:15');
    await expect(upNext(page).getByText('Suggested start', { exact: true })).toBeVisible();
    await expect(use).toHaveCount(0);
    await expectSameAfterReload(page);
    // Chosen at another time, it offers the suggestion again; chosen at the suggested time, there is nothing to go back
    // to.
    const time = page.locator('#plan-time');
    await time.fill('08:00');
    await expect(use).toBeVisible();
    await time.fill('08:15');
    await time.blur();
    await expect(page.getByText('Suggested. Change the date or time to choose your own.')).toHaveCount(0);
    await expect(use).toHaveCount(0);
  });

  test('A date typed key by key keeps the plan as typed, though part of it is in the past', async ({ page }) => {
    // Decision 26: while the field has focus the chosen start is held, so the year 2 on the way to 2026 doesn't give way to
    // the suggestion.
    await open(page, 'recipe-house');
    const date = page.locator('#plan-date');
    // The field reads year, month, day, with the year at its left edge.
    await date.click({ position: { x: 16, y: 20 } });
    await page.keyboard.type('2026');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('1125');
    await page.locator('#plan-time').click();
    await expect(date).toHaveValue('2026-11-25');
    await expect(page.locator('#plan-time')).toHaveValue('09:00');
    await page.locator('#plan-time').blur();
    await expect(date).toHaveValue('2026-11-25');
    await expect(page.getByText('Suggested. Change the date or time to choose your own.')).toHaveCount(0);
  });

  test('A chosen start that passes with nothing checked gives way to the suggestion', async ({ page }) => {
    // Decision 26: the same plan opened at 10:20 PM, after its 10:00 PM starter feed, looks forward instead.
    const plan = plans.get('recipe-house')!;
    await page.clock.setFixedTime(new Date('2026-11-21T22:20:00-08:00'));
    await page.addInitScript((value) => localStorage.setItem('bread-planner.v5', value), JSON.stringify(plan.saved));
    await page.goto('/');
    await ready(page);
    await expect(upNext(page).getByRole('heading', { level: 2 })).toHaveText('Feed starter');
    await expect(upNext(page).getByText('Suggested start', { exact: true })).toBeVisible();
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-22');
    await expect(page.locator('#plan-time')).not.toHaveValue('09:00');
  });

  test('A new date before anything is checked clears a planning temperature', async ({ page }) => {
    await open(page, 'planned-temp');
    await expect(page.locator('#timeline-dough-temp')).toHaveValue('84');
    await page.locator('#plan-date').fill('2026-11-23');
    await expect(page.locator('#timeline-dough-temp')).toHaveValue('');
    expect(await aria(page)).toMatchSnapshot('flow-new-date.aria.yml');
    await expectSameAfterReload(page);
  });

  test('Planning around the finish keeps every step time, a suggested start included', async ({ page }) => {
    // A new planner shows the suggested start, the leaven at 8:15 AM tomorrow, so the last loaf is out at 8:48 AM.
    await open(page, 'fresh');
    const timeline = page.getByRole('region', { name: 'Bake schedule' }),
      before = await timeline.ariaSnapshot();
    await choose(page, 'Plan around', 'All loaves out of the oven');
    await expect(page.getByLabel('Last batch date')).toHaveValue('2026-11-23');
    await expect(page.getByLabel('Time', { exact: true })).toHaveValue('08:48');
    await expect(page.getByText('Suggested. Change the date or time to choose your own.')).toBeVisible();
    expect(await timeline.ariaSnapshot(), 'the same steps at the same times').toBe(before);
    expect(await aria(page)).toMatchSnapshot('flow-plan-around-finish.aria.yml');
    await expectSameAfterReload(page);
  });

  test('A new planner suggests a start until one is chosen, by a new time or by a check (decision 25)', async ({
    page,
  }) => {
    await open(page, 'fresh');
    const suggestedNow = upNext(page).getByText('Suggested start', { exact: true }),
      suggestedPlan = page.getByText('Suggested. Change the date or time to choose your own.');
    await expect(upNext(page).getByRole('heading', { level: 2 })).toHaveText('Feed starter');
    await expect(upNext(page).locator('time')).toHaveText('9:15 PM');
    await expect(suggestedNow).toBeVisible();
    await expect(suggestedPlan).toBeVisible();
    await expect(page.getByRole('region', { name: 'Quiet hours warning' })).toHaveCount(0);
    // A new time keeps the suggested date, and is kept through a reload.
    await page.locator('#plan-time').fill('07:00');
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-22');
    await expect(suggestedNow).toHaveCount(0);
    await expect(suggestedPlan).toHaveCount(0);
    await expectSameAfterReload(page);
    await expect(page.locator('#plan-time')).toHaveValue('07:00');
  });

  test('Done on a suggested start keeps that start', async ({ page }) => {
    await open(page, 'fresh');
    await upNext(page).getByRole('button', { name: 'Done' }).click();
    await expect(upNext(page).getByRole('heading', { level: 2 })).toHaveText('Start leaven');
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-22');
    await expect(page.locator('#plan-time')).toHaveValue('08:15');
    await expect(page.getByText('Suggested. Change the date or time to choose your own.')).toHaveCount(0);
    await expectSameAfterReload(page);
  });

  test('Ingredient edits recalculate the weights, invalid entries are refused, and defaults restore', async ({
    page,
  }) => {
    await open(page, 'fresh');
    await openIngredients(page);
    const hydration = page.getByLabel('Total hydration', { exact: true });
    await hydration.fill('82');
    await hydration.blur();
    // The flour stays and the water is whole grams, so the dough grows (decision 30).
    await expect(page.getByText('Makes 1,011 g of dough per loaf.')).toBeVisible();
    await expect(page.getByText('800 g in this batch · 80%')).toBeVisible();
    expect(await aria(page)).toMatchSnapshot('flow-hydration-82.aria.yml');
    await page.getByRole('slider', { name: 'Adjust total hydration' }).press('ArrowRight');
    await expect(hydration).toHaveValue('83');
    const loaves = page.getByLabel('Number of loaves');
    await loaves.fill('0');
    await expect(page.getByText('Use a whole number ≥ 1')).toBeVisible();
    await loaves.blur();
    await expect(loaves).toHaveValue('2');
    expect(await aria(page)).toMatchSnapshot('flow-hydration-83.aria.yml');
    // The open tab and sections are not saved: a reload always opens the Schedule tab with every section closed.
    const before = await aria(page);
    await page.reload();
    await ready(page);
    await openIngredients(page);
    expect(await aria(page), 'the same edits after a reload').toBe(before);
    await page.getByRole('button', { name: 'Restore recipe defaults' }).click();
    await page.getByRole('button', { name: 'Restore defaults' }).click();
    await expect(hydration).toHaveValue('80');
    // Read the page once the dialog has closed: the record used to catch it mid-close, which made this flow flaky.
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    expect(await aria(page)).toMatchSnapshot('flow-restore-defaults.aria.yml');
  });

  test('Each recipe keeps its own autolyse length: an autolyse moves only its start, a Tartine rest moves what follows', async ({
    page,
  }) => {
    // A start chosen for 9:00 AM tomorrow, so the times are the ones a new planner had before decision 25.
    await open(page, 'recipe-house');
    const at = (id: string) => page.locator('.timeline-step', { has: page.locator(`#step-${id}`) }).locator('time');
    const field = (name: string) => page.getByLabel(name, { exact: true });
    await expect(field('Autolyse')).toHaveValue('90');
    await expect(page.getByText('It ends as the leaven is ready, so only its start moves.')).toBeVisible();
    await expect(at('autolyse')).toHaveText('12:30 PM');
    await field('Autolyse').fill('60');
    await expect(at('autolyse')).toHaveText('1:00 PM');
    await expect(at('mix')).toHaveText('2:00 PM');
    await expect(at('done')).toHaveText('9:33 AM');
    // Outside 15 minutes to the guides' 2 hours is refused, and the plan keeps the last valid length (decision 23).
    for (const refused of ['121', '14']) {
      await field('Autolyse').fill(refused);
      await expect(page.getByText('Use a whole number from 15 to 120')).toBeVisible();
      await expect(at('autolyse')).toHaveText('1:00 PM');
    }
    await field('Autolyse').fill('60');
    // Tartine mixes the leaven in first, so its rest moves the salt and everything after it.
    await choose(page, 'Recipe', 'Tartine Country Bread');
    await expect(field('Autolyse')).toHaveValue('30');
    await expect(
      page.getByText('The leaven is already in, so every later step moves with the autolyse.'),
    ).toBeVisible();
    await expect(at('mix')).toHaveText('9:30 PM');
    // The book gives 25 to 40 minutes, so 40 is the longest.
    await field('Autolyse').fill('41');
    await expect(page.getByText('Use a whole number from 15 to 40')).toBeVisible();
    await expect(at('mix')).toHaveText('9:30 PM');
    await field('Autolyse').fill('40');
    await expect(at('mix')).toHaveText('9:40 PM');
    await expect(at('turn1')).toHaveText('10:10 PM');
    expect(await aria(page)).toMatchSnapshot('flow-autolyse-length.aria.yml');
    await expectSameAfterReload(page);
    // Preuss Country Bread kept its own length.
    await choose(page, 'Recipe', 'Preuss Country Bread');
    await expect(field('Autolyse')).toHaveValue('60');
  });

  test('Loaf count and oven capacity on the Schedule tab set the batches', async ({ page }) => {
    // A start chosen for 9:00 AM tomorrow, so the times are the ones a new planner had before decision 25.
    await open(page, 'recipe-house');
    await page.getByLabel('Number of loaves').fill('3');
    await expect(page.getByText('2 batches')).toBeVisible();
    await choose(page, 'Loaves baked at once', '1 loaf');
    await expect(page.getByLabel('Reheat between batches')).toBeVisible();
    expect(await aria(page)).toMatchSnapshot('flow-loaves-and-oven.aria.yml');
    await expectSameAfterReload(page);
  });

  test('The recipe menu offers Preuss Country Bread, Tartine Country Bread, Olive Bread, Sesame Bread and three more Tartine recipes', async ({
    page,
  }) => {
    await open(page, 'fresh');
    await page.getByRole('combobox', { name: 'Recipe' }).click();
    await expect(page.getByRole('option')).toHaveText([
      'Preuss Country Bread',
      'Tartine Country Bread',
      'Olive Bread',
      'Sesame Bread',
      'Tartine Whole Wheat',
      'Tartine Country Rye',
      'Tartine Emmer/Einkorn',
      'Tartine Oat Porridge',
    ]);
  });

  test('Each recipe keeps its own checklist', async ({ page }) => {
    // A start chosen for 9:00 AM tomorrow, so the times are the ones a new planner had before decision 25.
    await open(page, 'recipe-house');
    await page.getByRole('checkbox', { name: 'Complete Feed starter' }).click();
    await expect(page.getByText('1 of 22 steps checked')).toBeVisible();
    await choose(page, 'Recipe', 'Tartine Country Bread');
    await expect(page.getByText(/^0 of \d+ steps checked$/)).toBeVisible();
    await choose(page, 'Recipe', 'Preuss Country Bread');
    await expect(page.getByText('1 of 22 steps checked')).toBeVisible();
    expect(await aria(page)).toMatchSnapshot('flow-recipe-checklists.aria.yml');
    await expectSameAfterReload(page);
  });

  // One test per recipe: `open` writes its save once per page.
  for (const [name, houseParagraph] of [
    ['house', true],
    ['tartine', false],
  ] as const)
    test(`The method guide for ${name}, ${houseParagraph ? 'with' : 'without'} the House-method paragraph`, async ({
      page,
    }) => {
      await open(page, `recipe-${name}`);
      await expect(page.getByRole('combobox', { name: 'Recipe' })).toHaveText(
        name === 'house' ? 'Preuss Country Bread' : 'Tartine Country Bread',
      );
      const guide = page.locator('.method-guide');
      for (const section of [
        'Mature starter and readiness guide',
        'Establishing a starter from scratch',
        'Shaping, basket preparation and baking',
      ])
        await guide.getByRole('button', { name: section }).click();
      const paragraph = guide.getByText('This recipe uses a separate flour-and-water autolyse');
      if (houseParagraph) await expect(paragraph).toBeVisible();
      else await expect(paragraph).toHaveCount(0);
      expect(await guide.ariaSnapshot()).toMatchSnapshot(`flow-method-guide-${name}.aria.yml`);
    });

  test('The quiet-hours warning lists the affected steps', async ({ page }) => {
    await open(page, 'quiet-batches');
    await page.getByRole('button', { name: 'View affected steps' }).click();
    expect(await page.getByRole('region', { name: 'Quiet hours warning' }).ariaSnapshot()).toMatchSnapshot(
      'flow-quiet-hours.aria.yml',
    );
  });

  test('The quiet-hours warning suggests the quietest start and, for Tartine, the other proof when it has less; each button moves the plan', async ({
    page,
  }) => {
    // Tartine Country Bread as it comes: a cold proof from a 9:00 AM leaven on November 22. With its 18-hour fridge
    // (decision 21), a leaven at 10:30 PM tonight keeps every step out of quiet hours.
    await open(page, 'recipe-tartine');
    const warning = page.getByRole('region', { name: 'Quiet hours warning' });
    expect(await warning.ariaSnapshot()).toMatchSnapshot('flow-quiet-fix.aria.yml');
    await warning.getByRole('button', { name: 'Start at 10:30 PM' }).click();
    await expect(warning).toHaveCount(0);
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-21');
    await expect(page.locator('#plan-time')).toHaveValue('22:30');
    // Eight loaves baked one at a time with a warm proof: the quietest warm start leaves two actions, and a cold proof
    // none, so both are offered.
    await page.getByLabel('Number of loaves').fill('8');
    await choose(page, 'Loaves baked at once', '1 loaf');
    await choose(page, 'Final proof', 'Warm, 3 to 4 hours');
    await warning.getByRole('button', { name: 'Start at 6:00 PM' }).click();
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-21');
    await expect(page.locator('#plan-time')).toHaveValue('18:00');
    await expect(warning.getByRole('heading', { level: 2 })).toHaveText('2 actions need you during quiet hours');
    await expect(warning.getByRole('button', { name: 'Start at 6:00 PM' })).toHaveCount(0);
    await warning.getByRole('button', { name: 'Use a cold proof at 9:00 PM' }).click();
    await expect(warning).toHaveCount(0);
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-21');
    await expect(page.locator('#plan-time')).toHaveValue('21:00');
    await expect(page.getByRole('combobox', { name: 'Final proof' })).toContainText('Refrigerated');
    await expectSameAfterReload(page);
  });

  // Checks added in step 3b, for controls whose wiring no recorded flow exercised. They assert values, not snapshots.
  test('The plan time moves the schedule and leaves the date', async ({ page }) => {
    await open(page, 'fresh');
    await page.locator('#plan-time').fill('10:30');
    await expect(page.locator('#plan-date')).toHaveValue('2026-11-22');
    const leaven = page
      .getByRole('region', { name: 'Bake schedule' })
      .locator('.timeline-step')
      .filter({ has: page.getByRole('checkbox', { name: 'Complete Start leaven' }) });
    await expect(leaven.locator('time').first()).toHaveText('10:30 AM');
    await expectSameAfterReload(page);
  });

  test('Each leaven build field sets its own part of the build, and Restore defaults resets only the selected recipe', async ({
    page,
  }) => {
    await open(page, 'fresh');
    await openIngredients(page);
    const build = page.getByRole('region', { name: 'Leaven build' }),
      made = (part: string) => build.locator(`dt:text-is("${part}") + dd`);
    for (const [field, grams] of [
      ['Mature starter', '30'],
      ["Anita's all-purpose flour", '100'],
      ['Whole-wheat flour', '50'],
      ['Water', '150'],
    ])
      await build.getByRole('spinbutton', { name: field, exact: true }).fill(grams);
    await expect(made('Mature starter')).toHaveText('30 g');
    await expect(made("Anita's all-purpose flour")).toHaveText('100 g');
    await expect(made('Whole-wheat flour')).toHaveText('50 g');
    await expect(made('Water')).toHaveText('150 g');
    await choose(page, 'Recipe', 'Tartine Country Bread');
    const flour = page.getByLabel('Flour per loaf'),
      tartineFlour = await flour.inputValue();
    await flour.fill('450');
    await page.getByRole('button', { name: 'Restore recipe defaults' }).click();
    await page.getByRole('button', { name: 'Restore defaults' }).click();
    await expect(flour).toHaveValue(tartineFlour);
    await choose(page, 'Recipe', 'Preuss Country Bread');
    await expect(build.getByRole('spinbutton', { name: 'Water', exact: true })).toHaveValue('150');
  });

  test('The reheat time between batches is saved as typed', async ({ page }) => {
    await open(page, 'fresh');
    await page.getByLabel('Number of loaves').fill('3');
    await choose(page, 'Loaves baked at once', '1 loaf');
    const reheat = page.getByLabel('Reheat between batches'),
      total = page.getByText(/^\d+h \d+m total/);
    const before = await total.textContent();
    await reheat.fill('45');
    await expect(total).not.toHaveText(before!);
    await expectSameAfterReload(page);
    await expect(reheat).toHaveValue('45');
  });

  test('A later reading of 37.7°C, the top of the °C range, can be added', async ({ page }) => {
    await open(page, 'turn-one-78');
    await choose(page, 'Temperature unit', '°C', upNext(page));
    const now = upNext(page).getByLabel('Dough temperature now'),
      update = upNext(page).getByRole('button', { name: 'Update' });
    await now.click();
    // Past the range, the planner itself refuses it, since the browser's own check is off.
    await now.fill('38');
    await expect(upNext(page).getByText('Use 10 to 37.7°C')).toBeVisible();
    await expect(update).toBeDisabled();
    await now.press('Enter');
    await expect(page.getByRole('list', { name: 'Later dough temperatures' })).toHaveCount(0);
    await now.fill('37.7');
    await update.click();
    await expect(page.getByRole('list', { name: 'Later dough temperatures' })).toContainText('37.7°C at 3:20 PM');
    await expectSameAfterReload(page);
  });

  test('A saved 100°F shows as 37.8°C without an error', async ({ page }) => {
    await open(page, 'mixed');
    const field = upNext(page).getByLabel('Dough temperature after mixing');
    await field.fill('100');
    await field.blur();
    await choose(page, 'Temperature unit', '°C', upNext(page));
    await expect(field).toHaveValue('37.8');
    await expect(page.getByText('Use 10 to 37.7°C')).toHaveCount(0);
    await page.reload();
    await ready(page);
    const after = upNext(page).getByLabel('Dough temperature after mixing');
    await expect(after).toHaveValue('37.8');
    await expect(page.getByText('Use 10 to 37.7°C')).toHaveCount(0);
    // Typing a value past the range is still flagged.
    await after.click();
    await after.fill('37.9');
    await expect(upNext(page).getByText('Use 10 to 37.7°C')).toBeVisible();
  });

  test('Total hydration refuses less than the leaven brings, and its slider stops there', async ({ page }) => {
    await open(page, 'fresh');
    await openIngredients(page);
    const hydration = page.getByLabel('Total hydration', { exact: true }),
      slider = page.getByRole('slider', { name: 'Adjust total hydration' });
    // House's leaven brings 9.1% at the defaults, so the field takes 10 or more.
    await hydration.fill('9');
    await expect(page.getByText('Use a whole number ≥ 10')).toBeVisible();
    await hydration.blur();
    await expect(hydration).toHaveValue('80');
    // With 300% leaven it brings 60%, above the slider's usual 50, so the slider starts at 60.
    await page.getByLabel('Leaven / added flour', { exact: true }).fill('300');
    await expect(slider).toHaveAttribute('aria-valuemin', '60');
    await slider.press('Home');
    await expect(hydration).toHaveValue('60');
  });

  test('The planner opens fresh when storage cannot be read, and keeps working when it cannot be written', async ({
    page,
  }) => {
    await page.clock.setFixedTime(plans.get('fresh')!.now);
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new DOMException('Storage is blocked', 'SecurityError');
      };
      Storage.prototype.setItem = () => {
        throw new DOMException('Storage is full', 'QuotaExceededError');
      };
    });
    await page.goto('/');
    await ready(page);
    await expect(page.getByText('0 of 22 steps checked')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Complete Feed starter' }).click();
    await expect(page.getByText('1 of 22 steps checked')).toBeVisible();
  });
});
