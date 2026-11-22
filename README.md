# Bread Planner

A browser-local sourdough planner at https://bread.assemblydigital.com, built with Astro, React, shadcn/Radix, TanStack Form and TanStack Table.

## Develop and verify

Use Node24 and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:browser
npm run format
```

`docs/BEHAVIOUR.md` describes what the app does. Two records hold it to that. `npm test` includes `tests/baseline`, which compares the code's output for 214 plans, 45 recipe calculations and 24 kinds of saved data with `tests/baseline/baseline.json`. It also renders `App.tsx` itself for every plan and checks the Schedule tab shows the same, so it runs in every Vercel build. `npm run test:browser` builds the site and compares 22 screens, each at phone and desktop width, and 16 actions, with the records in `tests/browser`, using Playwright's Chromium. It runs on this Mac only, not in the Vercel build. After a deliberate change, rewrite the records with `npm run baseline:update` or `npm run test:browser -- --update-snapshots`, and review the diff.

Astro statically builds the page shell, metadata and 404 page. The calculator is one React island because its recipe inputs, ingredient weights, schedule and checklists share live state. There is no server or database. `src/App.tsx` holds the page: loading and saving, the tabs, the recipe menu and the method guide. Each part of the screen has its own file in `src/components/`; `ScheduleTab.tsx` works out the live schedule and holds the bake-day actions. The rules themselves are in `src/lib/`. `src/domain/` is the rebuilt core that will replace `src/lib/`: the recipes as data, the formula, the House and Tartine timings, the schedule with each step's facts, the bake-day rules and quiet hours. The app does not use it yet; `tests/baseline/agree.test.ts` checks it shows exactly what the old core shows. `src/state/` is what the planner will save (version 6, under `bread-planner.v6`), how it upgrades a version 5 save without changing it, and every change the screen can make, as tested functions; the app switches to it in step 3b.

The code is formatted with Prettier (`npm run format`; `npm run format:check` reports any file that is not). Generated records, the vendored shadcn source, Markdown and the `.astro` pages are left as written.

## Recipes and persistence

Preuss House is the default. Six distinct editable recipes retain independent settings and checklists. The calculation engine includes separate leaven made/used/reserved, staged ingredients, all-loaf forward/backward scheduling, overnight proof, readiness cues and quiet-hours checks. Percentages support both sliders and exact number entry.

On bake day, an "Up next" card shows the next step with a countdown. Checking a step records when it was done, and later steps move to keep their planned spacing from it. Turns are the exception: they are recorded but move nothing, so bulk always runs its planned length from when it started.

Entering the dough temperature after mixing gives a bulk estimate: the planned bulk counts as 78°F dough, and time doubles for every 15°F cooler and halves for every 15°F warmer. It advises when to start checking; it does not change the planned steps.

Browser storage uses `bread-planner.v5`. Each browser starts with the default recipes and remembers edits locally. The first release starts fresh; no data transfer or account system is included.

The main hydration figure and slider show total water divided by total flour, including only the leaven used in the dough. Existing ingredient weights and stored v5 added-water percentages are preserved through a display/input conversion. Leaven composition follows its build, assuming equal flour and water in mature starter; an empty build assumes a 100% hydration leaven until specified.

## Deployment

Vercel project `bread-planner`, team `mpmba`, Node24. The build command runs tests and the checked Astro production build. The production branch is `main`. Cloudflare remains authoritative for `assemblydigital.com`; only the `bread` DNS record belongs to this project. Use Vercel's project-specific recommended CNAME, DNS only.

`HANDOFF.md` records current delivery state and verification. `docs/SITES_HISTORY.md` preserves the source calculator's decisions and prior acceptance evidence. The initial Astro migration derives from Sites commit `e3f364a8f2459c50c980ddb55970d191997f9dba`.

The configured shadcn styling and components are owned source. `src/styles/shadcn.css` is the unmodified Tailwind variant stylesheet from shadcn4.22.1, with its MIT license in `docs/licenses/`. The shadcn authoring CLI is not a runtime dependency. React integration7.0 and its compatible Vite React plugin6.1.1 are pinned together. Explicit cookie 2.0.2, matching what Astro 7.4.12 requires, ensures Astro's prerendered module resolves its required API.
