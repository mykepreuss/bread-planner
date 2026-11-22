import {defineConfig} from '@playwright/test';

/**
 * The browser baseline: the planner's screens and main actions, recorded before the rebuild. `npm run test:browser`
 * builds the site, serves it and compares every screen with the record. After a deliberate change, rewrite the record
 * with `npm run test:browser -- --update-snapshots` and review the diff. It runs only on this Mac, not in the Vercel
 * build: screenshots depend on the platform's font rendering.
 */
export default defineConfig({
  testDir:'tests/browser',
  fullyParallel:true,
  forbidOnly:true,
  retries:0,
  reporter:[['list']],
  // Text records are shared by both widths, which must show the same content; screenshots are per width and platform.
  snapshotPathTemplate:'{testDir}/__snapshots__/{arg}{ext}',
  expect:{toHaveScreenshot:{pathTemplate:'{testDir}/__screenshots__/{arg}-{projectName}-{platform}{ext}'}},
  use:{baseURL:'http://127.0.0.1:4329',timezoneId:'America/Vancouver',locale:'en-US',colorScheme:'light',deviceScaleFactor:1},
  projects:[
    {name:'phone',use:{viewport:{width:375,height:812}}},
    {name:'desktop',use:{viewport:{width:1280,height:900}}},
  ],
  webServer:{command:'npx astro build && npx astro preview --host 127.0.0.1 --port 4329 --ignore-lock',url:'http://127.0.0.1:4329',reuseExistingServer:false,timeout:120000},
});
