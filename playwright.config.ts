import { defineConfig } from '@playwright/test';
import { pageSettings, widths } from './tests/browser/context.ts';

/**
 * The browser baseline: the planner's screens and main actions, recorded before the rebuild. `npm run test:browser`
 * builds the site, serves it and compares every screen with the record. After a deliberate change, rewrite the record
 * with `npm run test:browser -- --update-snapshots` and review the diff. It runs only on this Mac, not in the Vercel
 * build: screenshots depend on the platform's font rendering.
 */
export default defineConfig({
  testDir: 'tests/browser',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  // Each screen test renders both widths itself, so one text record covers both; screenshots are per width and platform.
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { pathTemplate: '{testDir}/__screenshots__/{arg}-{platform}{ext}' } },
  use: { ...pageSettings, viewport: widths.desktop },
  webServer: {
    command: 'npx astro build && npx astro preview --host 127.0.0.1 --port 4329 --ignore-lock',
    url: 'http://127.0.0.1:4329',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
