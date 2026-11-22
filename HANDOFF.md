# Bread Planner

## Current state: released and verified

Public URL: https://bread.assemblydigital.com/
Private source: https://github.com/mykepreuss/bread-planner
Workspace: /Users/mp/Code/mp-hq/bread-planner
Production branch: main
Functional release source: 6496e9275ca79d3f4270e5f2ace315659292366c
Verified Vercel deployment: dpl_GdxF1qiADmTZQEXK64fmwoBT4Gcq (READY, production,29s build)
Project: prj_oaBadxUrg76MQyvwFsY68FvfuM8r (bread-planner)
Team: team_U2Fu7jNsQEgGylxpq9YR7M2f (mpmba)

This checkpoint is documentation following the functional release. Subsequent documentation-only Git deployments retain the same application behavior.

## Scope and decisions

User requested an Astro rebuild, Vercel release and Cloudflare setup for bread.assemblydigital.com. The app has never been used in production. User explicitly excluded any transfer/migration features; temporary backup/import controls and transfer page were removed. The release starts fresh with the established recipes and browser-local editing.

Astro7.4.1 statically builds the page shell, metadata and404 page. One React island retains shadcn/Radix, TanStack Form/Table and the existing calculator behavior. No backend, database, authentication or analytics were added. Preuss House remains the default, with six distinct editable recipes, exact staged quantities, leaven made/used/reserved, independent saved settings/checklists, multi-loaf forward/backward schedules, overnight proof, readiness cues, quiet-hour alerts and synchronized percentage sliders/exact inputs. Existing decisions and source math are archived in docs/SITES_HISTORY.md.

Vercel framework is Astro, Node24, install npm ci, build npm test && npm run build, output dist. Git integration is connected. Local .env.local and .vercel files are ignored and excluded from source uploads. The source repository is PRIVATE. Vercel's immutable/team/branch preview aliases retain their default authentication; the production domain is public.

## DNS and HTTPS

Cloudflare remains authoritative at norman.ns.cloudflare.com and arya.ns.cloudflare.com. Added only:

- CNAME bread.assemblydigital.com →5f91c9b5d5ea5e2b.vercel-dns-017.com
- DNS only, Auto TTL

Target came from Vercel's project-specific recommendation. Cloudflare dashboard row confirmed saved; authoritative server,1.1.1.1 and8.8.8.8 returned the exact CNAME. Vercel domains verify reports configured-correctly, attached and verified. HTTPS returns200 with successful TLS verification. Certificate CN is bread.assemblydigital.com, issued by Let's Encrypt YR2, valid through2027-01-18. Existing apex,www,mail,PostHog,Substack and other DNS records were not modified.

## Original Astro release acceptance evidence: MET

- Vercel production build ran60 tests:60 pass,0 fail. Astro check reported0 errors/0 warnings with seven pre-existing hints; checked production build succeeded on Node24.
- npm audit reports0 vulnerabilities. Initial peer/cookie resolution failures were fixed with compatible React integration7.0.0/Vite React plugin6.1.1/OXC0.145 and explicit cookie2.0.1. shadcn's unmodified standalone variant CSS is vendored with its MIT license; the authoring CLI is not installed in the app.
- Live House defaults:2000g,78%,2×1000g,oven capacity2; initial800/100/680g,final100/200/20/100g. Proof19:15→next07:45 and baking complete09:28 with09:00 leaven anchor.
- Live input/scheduling: hydration slider78→78.5 and count2→3 produced3000g and two oven batches. Count/hydration persisted on reload. All test values restored2/78.
- Final custom-domain check: all six dropdown options observed, Tartine1970g/75% and eight quiet-hour actions, House checklist persisted through reload and was then cleared. House selected in Schedule for handoff.
- No Saved bakes, backup, import or transfer controls remain. Temporary original-preview transfer route was removed with Sites source4973f06e9bfa99d38656c531033da7c76e7c5bbe, owner-private cleanup deploymentappgdep_6ad6feea3f5c8191937a4f3f7e623061 succeeded. Original private preview otherwise retained.
- Responsive:390px Recipe and Schedule document widths equal390; no horizontal overflow. Normal928px view checked; temporary viewport reset. Browser error/warning log empty.
- scripts/verify-deployment.mjs passes12 checks covering live Astro HTML/metadata/security headers, all10 linked/imported/font assets,404 and a deliberately missing-asset negative fixture. It records live asset hashes, not local/remote byte identity. Initial local-filename comparison was invalid because local and Vercel builds emitted different CSS filenames; verifier now follows the deployed asset graph.
- Vercel production runtime error scan returned0 records over the bounded30-minute query. This is a static app with no application functions. No monitoring/drains were added.

Ignored local receipts: artifacts/deployment.json, artifacts/live-verification.json, artifacts/astro-production.png and artifacts/astro-mobile.png.

## Commands and operational notes

Use Node24. npm ci; npm test; npm run build. Deployments from main run required checks through Vercel. Verify the public hostname with node scripts/verify-deployment.mjs https://bread.assemblydigital.com.

Vercel MCP returned a stale/incomplete project list and404 for the independently verified puppy-club project. The authenticated CLI64.5.0 was the documented fallback, with explicit scope mpmba and project IDs throughout. Cloudflare CDP attachment timed out twice; native Chrome controls accessed the already signed-in DNS dashboard. Never read/print auth files or upload local credentials. Preserve the current Cloudflare DNS-only record and unrelated zone records.

No remaining work in the requested release scope. Keep the existing design and recipe behavior unless the user requests another change.

## Subsequent read-only source review, October 19, 2026

User requested a complete re-review of the source workbook. See docs/SOURCE_REVIEW.md. Fresh signed-in browser export confirms one sheet, 60 numeric/time inputs and 59 formulas. Independently recomputed all formulas with zero cached-result mismatches; all 119 inputs/outputs matched retained legacy defaults. Current 60 tests passed. Main 80% inclusive versus 76.694915% added hydration is explained; all five source ingredient blocks are accounted for in the six app presets after authorized consolidation/completion. Current editing semantics intentionally use proportional scaling and separate made/used leaven rather than preserving every original control.

Found and live-reproduced a real app defect: default Red Spring & Rye displays Make 0 g more leaven because a floating-point residual of about 5.68e-14 g is treated as a shortfall (recipes.ts:80-81, App.tsx:105 and LeavenBalance). Also found stale instructions describing duration adjustments after the editor was intentionally removed. Proposed fixes are recorded, not implemented. No sheet cells, application code or deployment changed; only review documentation and ignored evidence were added. Browser returned to Preuss House / Schedule with original quantities, date/time and checklist unchanged. Review documents remain local and uncommitted.

## Released and live verified: total hydration, October 20, 2026

Authorized: make total hydration including used leaven the primary recipe/schedule metric and slider, preserve all recipe quantities and saved recipes, verify existing fixes, then deploy. The working tree initially contained the user's zero-gram-warning, loaf wording and edited-recipe-listing fixes; preserved without reverting. Another process committed and then reset the repository, including partial hydration work. Source changes remained intact. User confirmed the overlapping session is paused; resumed from f66e280 with all tested source changes intact.

Total-hydration input/display conversion retains v5 added-water storage and original weights. Build composition includes equal-flour/water mature starter and only the portion used, with a labelled 100% leaven-hydration fallback for an empty build. Default House and Red Spring & Rye display80%; White & Whole Wheat and both blends81.8%; Tartine77.3%. The existing zero-shortfall fix is covered by tests; stale timing-control wording was still present and is now corrected. No timing editor was restored.

Local verification MET:67 tests passed in America/Vancouver. All default stages, edited saved parameters and checklist round trips remain intact. New tests cover conversion both directions,80→80.5→80, fixed dough mass/schedule, partial build use, wetter/drier/empty builds and genuine shortfalls. Astro check/build passed0 errors/0 warnings with seven existing hints. git diff --check passed. Vercel MCP again returned404 for the correct project; authenticated CLI confirmed MP/mpmba project prj_oaBadxUrg76MQyvwFsY68FvfuM8r, Astro/Node24 and tests-plus-build configuration. Git deployment and live browser verification remain.

Release complete: GitHub main6496e9275ca79d3f4270e5f2ace315659292366c triggered Vercel production dpl_GdxF1qiADmTZQEXK64fmwoBT4Gcq. READY and custom-domain alias confirmed through the provider API. Remote build ran67 tests,67 pass,0 fail, then Astro check/build with0 errors/0 warnings. Build completed in29s. No DNS or project configuration changed. Receipt: deployment/hydration.json.

Live acceptance MET: existing saved House bake opened at80% total hydration,2000g,2×1000g with original800/100/680g initial and100/200/20/100g final stages. Date/time,capacity2,09:28 finish and empty checklist retained. Slider ArrowRight changed80→80.5 and updated weights at fixed2000g; exact80.25 entry synchronized the thumb and persisted through reload. Restored80 and observed all seven original weights. Red Spring & Rye displays80%, preserves758/83/652g plus103/312/22/72g, and has no false shortfall alert in either the result or expanded312/312/0g balance. White & Whole Wheat displays81.818% in the exact field with its original800/200/750g and200/20/50g stages. Stale leaven timing-control text replaced by readiness/estimate wording; no editor reintroduced.

Responsive/browser verification MET:390px Recipe document width390, desktop927px document width927, no browser errors/warnings. Viewport override reset. All test values restored; Preuss House / Recipe selected for handoff. Evidence: artifacts/total-hydration-live.png, artifacts/total-hydration-mobile.png, artifacts/hydration-deployment.json, artifacts/hydration-production-build.log. Static live verifier passed12 checks,10 assets and the missing-asset negative fixture. This checkpoint follows functional verification; subsequent documentation-only deployments retain the same application code. No remaining work in the authorized scope.

## Bake-day view and live schedule, November 15, 2026: released and verified live

Built on branch `bake-day-view`, which was stacked on `interface-copy-cleanup`. Authorized in session: build the bake-day view first, then merge #7 and #8.

- An "Up next" card at the top of Schedule shows the next unchecked step, a countdown that refreshes every 30 seconds and when the page is shown again, the step's note and readiness cue, and a Done button. It is hidden when the plan has ended or every step is checked.
- Checking a step records the time, rounded to the minute, in `recipes.<id>.doneAt`. The schedule then follows the dough: every later unchecked step keeps its planned spacing from the most recent timed check. Checking the starter feed or the autolyse never moves the plan. Checked steps show an editable "Done at" time for corrections, including across midnight. Clearing the checklist clears the times.
- "Add steps to calendar" in the plan card downloads an .ics file with one event per remaining step at its live time, each with an alert at the start.
- Storage stays `bread-planner.v5`. `doneAt` is optional on restore, and entries that aren't finite numbers or don't belong to a checked step are dropped. Recipe quantities and planned durations are unchanged. The Preuss bulk length and turn count were deliberately left alone.
- Logic: `src/lib/bakeday.ts`, tests in `src/lib/bakeday.test.ts`.

Evidence: `TZ=America/Vancouver npm test` passed 83 of 83. `npm run build` passed with 0 errors, 0 warnings and 4 hints, all pre-existing unused imports in `recipes.test.ts`. `git diff --check` passed. Browser at 375px: with the leaven planned for 2:47 PM and checked at 3:48 PM, autolyse moved 3:17 → 4:18 PM, mix 7:47 → 8:48 PM, and the card showed "Running 1h 1m behind plan". Correcting "Done at" to 14:47 removed the shift, and the correction persisted through a reload. The calendar button generated `preuss-house-2026-11-15.ics` with 21 events and 21 alerts (23 steps less the 2 checked). Document width was 375 at mobile and 1280 at desktop, and the console logged no errors. Test values were restored to Nov 13, 09:00 with an empty checklist.

Release: PR #7 (copy cleanup: the preshape step gets 10 minutes and starts by turning out the dough, and shaped loaves go straight into baskets) merged as `d8ccaec`. Vercel production completed, and the live verifier passed 12 checks with the new preshape wording in the live bundle. PR #8 (bake-day view) merged as `b1fca0f`, with both Vercel checks passing before the merge. Vercel production completed, and `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 12 checks, 10 assets and the missing-asset negative fixture. The live site at 375px had the calendar button and the new sidebar note, a document width of 375 and no console errors. A plan dated tomorrow showed "Up next · in 5h 53m · Feed starter · 10:00 PM" with the Done button. The pane's saved plan was then restored to Nov 8, 09:00, with no steps checked.

Not verified: importing the .ics file into iOS or Google Calendar on a real device, and the countdown on a phone that has been asleep. The `bake-day-view` and `interface-copy-cleanup` branches remain on GitHub.

## Temperature-aware bulk estimate, November 15, 2026: released and verified live

Built on branch `bulk-temperature-estimate`, from `main` at a457a3b. Michael chose the model in session: the planned bulk counts as dough at 78°F / 26°C, and bulk time doubles for every 15°F / 8°C cooler and halves for every 15°F warmer (The Sourdough Journey's rule; the blog alternative of 10°F was declined). The estimate is advice only. Planned steps, bulk length and the seven Preuss turns are unchanged, because the turn count is still an open question after the overproofed bake.

- A "Dough temperature after mixing" field, in °F or °C, appears in the Up next card while the next step is part of bulk (start of bulk, a turn or preshape), and on the "Start bulk fermentation" step in the timeline. The estimate counts from when bulk actually started. It gives the estimated length, the ready time, how far that is from the planned preshape, and a "start checking from" time 30 minutes earlier. Warm dough advice says to skip the remaining turns if the dough is ready. Cool dough advice says to keep folding every 30 minutes.
- The bulk start and turns left unchecked once a later step is checked are marked Skipped. They no longer block Up next, quiet-hour warnings or the calendar export. Clearing the checklist also clears the temperature.
- The same reference applies to Tartine's 3-hour bulk.
- Storage stays `bread-planner.v5`: `recipes.<id>.doughTemp` (°F, 50 to 100, else null) and `tempUnit` ('F' or 'C', default 'F').

Evidence: `TZ=America/Vancouver npm test` passed 91 of 91, including the 82°F estimate of 3h 19m, the 72°F estimate of 5h 17m, the exact doubling and halving at ±15°F, Tartine, °C conversion, skipped steps, and saved-state round trips. `npm run build` passed with 0 errors, 0 warnings and 4 pre-existing hints, and `git diff --check` passed. In the browser at 375px, with bulk starting at 5:19 PM and 82°F entered, the card said ready around 8:38 PM, 41 min before the planned preshape, start checking from 8:08 PM. The planned preshape stayed at 9:19 PM. Switching to °C showed 27.8. Checking preshape early marked the bulk start and all seven turns Skipped and moved Up next to Bench rest. Temperature, unit and skipped state persisted through a reload. Document width was 375 and there were no console errors. The browser test found, and this fix covers, a card stuck on "Start bulk fermentation" when preshape was checked without it. Test values were restored to Nov 13, 09:00, no checks, no temperature, °F.

Release: PR #9 merged as `c0e165d`, with both Vercel checks passing before the merge. Vercel production completed, and `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 12 checks and 10 assets. The live app bundle contains the dough temperature field, the bulk advice and the Skipped badge. The live page was not exercised in a browser for this release.

Not verified: the estimate against a real bake. Whether 78°F and 15°F match the Preuss dough needs Michael's next bake log.

## Turn wording, design review and new identity, November 15, 2026: released and verified live

Released in this order, each with both Vercel checks passing before merge, a completed production deploy, and a passing `node scripts/verify-deployment.mjs https://bread.assemblydigital.com`:

- **PR #10, `3cee59e`: turn wording.** House-method recipes (House, White & Whole Wheat, Red Spring & Rye, Five-Flour and Four-Flour) say turns 1–3 are vigorous, going around all four sides twice to build gluten early. Turns 4–7 are a single round. This is how Michael does them. Tartine keeps the book's wording. Timing is unchanged.
- **PR #11, `6075696`: alignment and design review.** The recipe description lines up with the recipe menu text. Timeline notices are spaced from the first day. "Up next" is hidden on an ended plan. The Recipe tab is renamed **Ingredients**, so it no longer shares a name with the recipe menu. The repeated recipe-name heading and the "Ready to weigh" label are removed. The oven note reads "Count one pot per loaf."
- **PR #12, `25234ac`: new identity, approved by Michael in session.** This supersedes the earlier instruction to keep the existing design.
  - The cream and terracotta palette and Geist are replaced by flour-grey surfaces (Rye flour `#ecebe6` page, Rice flour `#fafaf7` cards), Cast iron `#22221f` type and buttons, and Bran `#625d54` muted text.
  - Colour means temperature. The overnight cold proof is Fridge `#2c5a78` in its time, title, checkbox, rail and sidebar summary. Preheat through the last loaf out is Crust `#6f3a1c`. Everything else is neutral, apart from the amber quiet-hours warning. The phase comes from `stepPhase()` in `src/lib/bakeday.ts`.
  - The typeface is Atkinson Hyperlegible Next (`@fontsource-variable/atkinson-hyperlegible-next`, OFL), which draws zero with a slash. Tabular figures were measured equal width.
  - Every text pairing meets WCAG AA (lowest 4.99:1). Input borders were raised from 1.86:1 to 3.47:1.

Evidence: 93 of 93 tests and a build with 0 errors and 0 warnings before each PR. Browser checks covered 1200px and 375px. The live site has the new font, background, Schedule and Ingredients tabs, one cold and four oven steps, a document width of 375 and no console errors. The verifier now reports 9 checks and 7 assets, down from 12 and 10. The whole difference is the font: Geist shipped five font files (Cyrillic, Cyrillic extended, Latin, Latin extended and Vietnamese) and Atkinson ships two (Latin and Latin extended).

Not verified: the Up next card with a cold or oven step up next on a real bake, and the font on a physical phone. Proposal, not done: `npm audit` reports a moderate vulnerability in Astro ≤ 7.4.6, and the app pins 7.4.1. This predates these changes.

## Turns keep bulk length, November 16, 2026: released and verified live

PR #13 merged as `1c5185b`, with both Vercel checks passing before the merge. Vercel production completed, and `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed. The live bundle contains the new `movesPlan` rule.

Michael's decision: checking a turn must not move the schedule, because cumulative drift from late or early taps lengthens or shortens bulk and risks over- or under-proofing. Turns now join the starter feed and the autolyse as steps that record their time but move nothing. Later turns stay on their 30-minute marks from bulk start, and preshape stays at bulk start plus the planned bulk. Starting bulk late still moves the turns and preshape together. Leaven, mix, start of bulk, preshape, shaping, the cold proof and the oven steps still move the plan.

Evidence: 96 of 96 tests pass. Three new tests cover late and early turns, bulk staying 240 minutes after a late start whatever the turns do, and Tartine. They fail against the previous code. The build had 0 errors and 0 warnings. In the browser at 375px, with bulk starting at 8:58 AM, turn 1 checked 30 minutes early and then corrected to 22 minutes late changed only turn 1's own time. The 12:58 PM preshape and everything after it were unchanged. Test values were restored.

Not verified: a bake stepped through on the live site.

## Astro security upgrade, November 16, 2026: released and verified live

PR #14 merged as `7bedc0d`. It supersedes the Astro 7.4.1 and explicit cookie 2.0.1 pins recorded in the original release sections above. It also resolves the "Proposal, not done" audit item in the identity section.

- `astro` 7.4.1 → 7.4.12 and `cookie` 2.0.1 → 2.0.2. Astro 7.4.12 requires `cookie ^2.0.2`, so the explicit pin moved with it and a single deduplicated copy remains. The React integration 7.0.0 and the `@vitejs/plugin-react` 6.1.1 override are unchanged.
- The upgrade clears GHSA-mh32-jxcr-mh9f (XSS via dynamic tag names) and GHSA-r3h5-4585-7x3w (`@astrojs/node` image endpoint). Reading the code, neither looked reachable in this static site; that was not tested.
- All lockfile changes are within Astro's own dependency tree. Of the 48 additions, most are per-platform bundler binaries. One nested pre-release, `@emnapi/core` 2.0.0-beta.2, sits under the optional `wasm32-wasi` binding and is not installed on macOS or Vercel.

Evidence: locally on Node 26, `npm ci` was clean, `npm audit` found 0 vulnerabilities, 96 of 96 tests passed, and the build had 0 errors and 0 warnings with the same output file set. The dev server hydrated with no errors, and a loaf-count edit recalculated and was restored. The Vercel PR build on Node 24 passed. Production deploy completed, and the verifier passed with 9 checks and 7 assets, unchanged. The live app hydrated 23 steps with the Atkinson font and no console errors. `npm audit` on `main` after `npm ci` found 0 vulnerabilities.

## Calendar export removed, November 21, 2026: released and verified live

Release: PR #15 merged as `1a858fb`, with both Vercel checks passing before the merge. Vercel production completed, and `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets. The live bundle has no calendar export code, and the live page showed all 23 steps with no calendar button and no console errors.

Michael's decision: remove the "Add steps to calendar" feature. This supersedes the calendar button described in the bake-day view section above. The button, its sidebar note, the `.ics` generator `scheduleCalendar`, its test and its styles are gone. Nothing else in the schedule or bake-day view changed.

## Done at takes a date, November 21, 2026: released and verified live

Release: PR #16 merged as `c3d02ab`. After PR #15 merged, `main` was merged into its branch and the import and HANDOFF conflicts were resolved by keeping both sides; 95 of 95 tests passed on the result, and both Vercel checks passed on `a7b6112` before the merge. Production completed, the verifier passed 9 checks and 7 assets, and the live bundle contains the date field and its styles.

Michael's request: a checked step's "Done at" should let you change the day as well as the time. It now has a date field beside the time field, and the record is set to exactly the date and time shown. This supersedes the nearest-day rule from the bake-day view, where a time-only edit picked whichever of yesterday, today or tomorrow was closest. An incomplete or impossible entry, such as a cleared date, is ignored and the field keeps the recorded value. "Done at" is now plain text above the two fields, so it is no longer struck through with the step title.

Evidence: 96 of 96 tests pass. The nearest-day test was replaced by one covering a date move, a past-midnight correction, a year end and five invalid entries. The build had 0 errors, 0 warnings and the 4 existing hints. In the dev server at 375px, moving the leaven from Nov 21 to Nov 20 moved the record and the autolyse back a day. Setting 23:50 kept Nov 20, and a cleared date was ignored. The label sits above the two fields at 375px and 861px, with a document width of 375 at phone size. The local plan was restored to the leaven done at 3:22 PM on Nov 21.

Not verified: the native date picker on a real phone, and the date field on the live site (no step was checked in the browser's saved plan there).

## Loaf count on the Schedule tab, November 21, 2026: released and verified live

Release: PR #17 merged as `5a001e3`, together with the Schedule review fixes below, with both Vercel checks passing before the merge. Verified live after all three merges, with production at `1bc99cb`: `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets, and the live page had no console errors. The live page showed "Your batch" with the loaf field.

Michael's request: be able to make 3, 4, 6 or 8 loaves instead of the default 2. The loaf count already had no upper limit, but it was only editable on the Ingredients tab. The Schedule tab's only loaf control was "Loaves baked at once", which is capped at 2 on purpose (one pot per loaf). The batch card on the Schedule tab now has the same "Number of loaves" field, under its "N loaves at W g each" summary. Both tabs edit the same saved setting. Inactive tabs are unmounted, so the shared `field-count` id appears once on the page.

Evidence: 95 of 95 tests pass, and the build had 0 errors, 0 warnings and the 4 existing hints. No logic changed, so no test was added. In the dev server, typing 3, 4, 6 and 8 into the Schedule field updated the summary, total dough, batch count and finish time: 3 and 4 loaves gave 2 batches finishing at 5:08 PM, 6 gave 3 batches at 6:21 PM, and 8 gave 4 batches at 7:34 PM with 41 steps. The Ingredients tab then showed 8 and 8,000 g, and 8 survived a reload. At 375px the field fits the card with a document width of 375. The local plan was restored to 2 loaves.

Not verified: changing the loaf count on the live site.

## Schedule review fixes, November 21, 2026: released and verified live

Release: part of PR #17 (`5a001e3`). The live bundle has "Bake schedule", "Your batch" and the step-gap labels, and none of "Count one pot per loaf", "supplied recipe", "Your bake, step by step" or "The default is 12 hours". The live page showed "Day 1" to "Day 3" and the gap labels.

Michael asked for all five findings from a design and content review of the Schedule tab. They sit on the same branch as the loaf-count field above.

1. **Gap between steps.** The right-hand duration column read as how long a step takes ("Start bulk fermentation · 30 min", while bulk runs about 4 hours). It was the step's modelled length, not always the time to the next step: the warm-up and preheat both start at once and each showed 1h. The column is gone. `stepGaps` in `bakeday.ts` computes the minutes from each step's live start to the next one's, shown as a small label on the rail between them (phase-coloured in the cold and oven stretches, hidden in print). Steps that start together, and the last step, show none.
2. **Copy for the baker, not the source sheet.** Removed "The default is 12 hours 30 minutes…", "The supplied recipe gives…" and the starter guide's "The supplied recipe prepares…". "Keep later batches chilled until their own warm-up" appears only with more than one batch. The cooling mark now says "The loaves are ready to slice." (or "This batch…") instead of citing the source. The existing rule that every step has guidance is kept.
3. **Your batch card.** Titled "Your batch", as on the Ingredients tab, with the loaf field and "per loaf", "total dough" and "total hydration" below it. It uses the same card surface as "Oven and proof".
4. **Steps first once underway.** At 850px and below, once any step is checked (and the plan has not ended), the batch and oven cards move below the step list. Up next, the plan card and the readiness note stay above it. Unchecking everything restores the original order.
5. **Wording.** "Your bake, step by step." became "Bake schedule", which also labels the section. Days read "Day 1 Saturday, Nov 21" instead of "01".
6. **Oven card.** Michael removed the "Count one pot per loaf." description under "Oven and proof"; it did not make sense there.

Evidence: 97 of 97 tests pass. New tests cover the step gaps (bulk start 30 min, parallel warm-up 0, preheat 60, last step 0) and the copy rules (no "supplied recipe" or "default is" in any recipe's step notes, and the later-batches sentence only with several batches). The build had 0 errors, 0 warnings and the 4 existing hints. In the dev server with a fresh plan at 1280px, the gap labels matched those values and the colours followed the phases. At 375px, checking the first step moved the first timeline step from 2,400px to 1,835px from the top and the batch card from 1,326px to 6,620px. At 768px the reorder held, unchecking restored it, the document width matched the viewport, and the console had no errors. The local plan was restored.

Not verified: a real phone.

## Dough temperature moves bulk, November 21, 2026: released and verified live

Release: PR #18 merged as `b4e5b88`. It was stacked on PR #17; once #17 merged, its base was changed to `main`, where its diff showed only this work, and both Vercel checks passed on `168e9f9` before the merge. Verified live after all three merges, with production at `1bc99cb`: `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets, and the live page had no console errors. The live bundle contains "Dough temperature now", "Ready: preshape now", "Check the dough before this turn" and "Bulk took". In the in-app browser, the live site's saved plan was an old November 8 test plan, with nothing checked, holding an 82°F reading, probably from the November 15 release check. The new code correctly moved that plan (6 turns, preshape 41 minutes early); "Plan the next bake", Clear checklist or a date change clears it. That saved data was left as it was.

Built on branch `temperature-moves-bulk`, stacked on `loaf-count-on-schedule` (PR #17). This supersedes the November 15 decision that the dough temperature is advice only. Michael chose this design in session, including these two choices:

- Cool dough keeps folding: when the estimate runs past the planned turns, a turn is added every 30 minutes until then.
- Everything after preshape shifts by the same amount, bake included, as a late check-off does.

How it works (`followDough` in `bakeday.ts`):

- **Bulk as progress.** Bulk is progress toward the planned length at 78°F, with the existing doubling-per-15°F rule. The after-mixing reading applies from bulk start, and later readings (`bulkTemps`, saved per recipe with when each was taken) apply from their own time. A new reading re-times only what is left.
- **Preshape follows the dough.** Preshape moves to the estimated end of bulk, and every later step keeps its spacing. Preshape never lands before a turn that was already checked. Once preshape or a later step is checked, the temperature moves nothing.
- **Turns fit the estimate.** Turns stay on 30-minute marks from bulk start, and none comes within 15 minutes of preshape. Warm dough loses turns, cool dough gains them, and checked turns always stay. At 78°F nothing moves, for House or Tartine.
- **Up next.** During bulk, once there is an after-mixing reading, the card has "Dough temperature now" with an Update button. From 30 minutes before the estimated end, a turn's card leads with "Check the dough before this turn" and a "Ready: preshape now" button that checks preshape.
- **Advice.** The note says how far the plan moved and how many turns it now has. When the dough is off plan by 15 minutes or more, it also names the steady temperature that would preshape at the original time, if that is between 68°F and 86°F.
- **Timeline.** Under "Start bulk fermentation", the after-mixing field stays, and later readings are listed with their times and a remove button. Clearing the checklist clears all readings. The "Running … behind plan" message still reflects check-offs only.

Evidence: 104 of 104 tests pass. New tests cover: no reading leaves the schedule untouched; 84°F gives a 3h 2m bulk with turns 1 to 5 and later steps 58 minutes early; 72°F adds turns 8 to 10 and moves later steps 1h 17m; a second reading at 2h re-times only the rest (78°F then 84°F gives 3h 31m); a checked turn holds preshape; a checked preshape ends the estimate's effect; the hold temperature; Tartine; and saving the readings. The build had 0 errors, 0 warnings and the 4 existing hints.

In the dev server, with a bake set 2h 35m into bulk at 84°F and turns 1 to 4 checked: preshape moved to 4:42 PM, turns 6 and 7 dropped, and turn 5's card led with the dough check. A 72°F reading entered through the form at 4:16 PM moved preshape to 5:01 PM and brought turn 6 back. Removing that reading restored 4:42 PM. "Ready: preshape now" checked preshape at 4:16 PM, marked turns 5 to 7 skipped, and moved the rest of the plan. The 375px layout fit, with no console errors. The local plan was restored.

Not verified: the temperature controls on a real phone, and a real bake.

Review fixes, same day (Michael asked for the four blocking findings from a code review):

- **Bulk over.** Once preshape is checked, the timeline shows the turns that were due before preshape was actually done, plus every checked turn. Turns added for cool dough and checked no longer vanish, and turns dropped for warm dough no longer come back as Skipped after preshape. Checked extra turns also stay if the temperature is cleared. Without a temperature, behaviour is unchanged.
- **Same-minute readings.** A reading in the same minute as an earlier one replaces it (`withReading`), so a corrected typo counts once. Duplicates already saved load as the later one.
- **Reading window.** A reading counts from this bake's final mix on. One taken before bulk started, or in its first minute, applies from bulk start, where it used to be ignored while still listed. Readings from before the final mix are ignored.
- **New bake.** The dough temperatures are cleared by "Plan the next bake", and by changing the plan's date or time while nothing is checked, so a value typed while planning no longer shifts a later bake.

Evidence: 107 of 107 tests pass, with new tests for each fix. The build had 0 errors, 0 warnings and the 4 existing hints. In the dev server: entering 84 then 82 in the same minute listed and saved one 82°F reading with no console errors. With turns 1 to 10 checked at 72°F, checking preshape kept all ten turns (16 of 26 steps checked). With nothing checked, a planning-time 84°F moved preshape to 2:08 PM, and changing the date cleared it, emptied the field and put preshape back at 3:06 PM. The local plan was restored.

The five remaining review findings were then fixed too, at Michael's request:

- **Turn cap.** Cool dough gets at most two extra turns (one more hour of folds, as the Tartine cue allows), then rests covered until it is ready, and the note says so. At 72°F the plan has 9 turns, not 10. Checked turns past the cap still stay, and after a late preshape the skipped turns stop at the cap.
- **Bulk summary.** Once preshape is checked, the bulk note says how long bulk took against the estimate ("Bulk took 3h 20m. The estimate was 3h 2m.") instead of still advising.
- **Code comment.** The NowCard comment is back above NowCard.
- **Sidebar element.** The schedule sidebar is a `div`, not an `<aside>`. It holds the main planning controls rather than side content, and a plain `div` loses nothing when it is rearranged on phones.
- **Up next.** The card no longer shows the step's own length next to its time ("Start bulk fermentation · 30 min"). "Then: … · time" already shows when the next step is.

Evidence: 109 of 109 tests pass, with new tests for the cap (76°F adds one turn, 72°F and 55°F stop at 9, checked turns past the cap stay) and the bulk summary. The build had 0 errors, 0 warnings and the 4 existing hints. In the dev server at 55°F, 45 minutes into bulk, the plan showed 9 turns and the capped note, suggesting 81°F to get back on plan. The Up next card showed only "4:44 PM". Checking preshape replaced the note with "Bulk took 45 min. The estimate was 11h 35m." At 375px the sidebar `div` still moved the setup cards below the steps (first step at 1,957px, batch card at 6,183px) with a document width of 375. The console had no errors, and the local plan was restored.

Cleanup pass, same day (`/simplify`: reuse, simplification, efficiency and altitude reviews). Behaviour is unchanged; 110 of 110 tests pass, and the bake-day controls were rechecked in the dev server.

- `liveSchedule` is back to its `main` form. `followDough` moves preshape and the later steps itself, and returns `checkFrom` so the page no longer recomputes the 30-minute check window.
- One `turnNumber` helper replaces five copies of the turn-id test. Saved readings are cleaned up by `withReading`, the same function the form uses, with one `BulkReading` type and the existing `tempLimits` range (`inTempRange`).
- In `App.tsx`: one `setProfile` writer, one `clearTemps` (also used by Clear checklist), one date and time handler, and a shared `TempRow` for both temperature forms. `bulkAdvice` builds one sentence for earlier and later; `holdTemperature` always targets the original preshape. The unused `latestF` is gone.
- A new test pins the 30-minute turn grid that `followDough` relies on.

Proposals, not done: build the two date formatters in `model.ts` once instead of on every call (about 1–2 ms per render, every 30-second tick); generate turns from a bulk length in `model.ts` if a duration editor ever returns; `planNext` never clears the checklist, so a fully checked plan cannot be moved forward (existing before this branch).

## Preuss House uses Anita's all-purpose flour, November 21, 2026: released and verified live

Release: PR #19 merged as `1bc99cb`, last of the three. After PRs #17 and #18 merged, `main` was merged into its branch, and the conflicts in the `App.tsx` imports, the `Profile` type, the tests and HANDOFF were resolved by keeping both sides. 111 of 111 tests passed and the build was clean on the result, and both Vercel checks passed on `018d79e` before the merge. Verified live after all three merges, with production at `1bc99cb`: `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets, and the live page had no console errors. The live recipe description reads "Anita's all-purpose flour with whole wheat and rye.", and the live bundle contains "Anita's all-purpose flour".

Michael's decision: Preuss House uses Anita's all-purpose flour instead of red spring flour. This covers the dough (800 g in the autolyse at the defaults) and the leaven build (71 g per 1,000 g added flour). Quantities, hydration and timing are unchanged. Anita's is a new flour of its own (`anita`), so the generic "All-purpose flour" in the Five-Flour and Four-Flour recipes is untouched, as is every other recipe that uses red spring.

- A saved House blend keeps its parts: a saved `flour_red` value becomes `flour_anita` on load.
- The "Red Spring & Rye Variation" (`manual-rye`) used to be hidden because it matched House exactly. It is now hidden unless its legacy sheet cells were edited, so the dropdown still lists the same six recipes.
- Flour names in step text keep proper nouns capitalized. This also changes Five-Flour's "red fife flour" to "Red Fife flour".

Evidence: 96 of 96 tests pass. The House name, leaven and dedup tests were updated, and a new test covers the saved-blend carry-over. The build had 0 errors, 0 warnings and the 4 existing hints. In the dev server, the saved local plan loaded with 80/10/10 Anita's, whole-wheat and rye parts, its checked leaven intact, and Anita's in the leaven step, autolyse step, flour table, weighing lists and leaven build, with no "red spring" left on the House page. A fresh plan listed the same six recipes. The console had no errors.

Not verified: a saved plan carrying over on Michael's phone. Once a browser has loaded this version, an older version of the app would reset the House blend to its defaults (80/10/10) because it does not know `flour_anita`.

## Rebuild step 0: today's behaviour recorded, November 21, 2026: released and verified live

Michael asked for a review of the whole codebase and then approved step 0 of the five-step rebuild plan: record what the app does before changing how it is built. Branch `rebuild-baseline`, from `main` at `34699a7`. No file under `src/` changed.

Release: Michael asked to merge PR #20, which merged as `5eea38c` with both Vercel checks passing on `9422b25`. Production completed, and `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets, unchanged.

- `docs/BEHAVIOUR.md`: the behaviour, written from the code and checked against the records, with five decisions for Michael at the end.
- `tests/baseline`: `npm test`, and so every Vercel build, now runs two more checks.
  - `baseline.test.ts` compares the code's output with `baseline.json`: 214 plans (the schedule matrix, 36 bake-day scenarios and 80 seeded random bakes), 45 recipe calculations, 24 kinds of saved data and 53 helper results, in America/Vancouver.
  - `app.test.ts` renders the real `App.tsx` on the server, through vite, for every plan. Each plan is saved in browser storage as the app saves it, with the clock frozen, and the check confirms the Schedule tab shows what the record says. Four recorded plans are invalid entries that loading corrects, so they can't be shown and are listed in the test.
  - `npm run baseline:update` rewrites the record and leaves it untouched when nothing but the source line would change.
- `tests/browser`: `npm run test:browser` builds the site and compares 22 screens, all with the clock frozen.
  - Each screen test opens the page at 375 px and 1280 px and checks that both widths give the same accessibility and layout snapshots. It then compares them with the record, along with first-screen screenshots at both widths; five screens also get whole-page screenshots.
  - It also compares 16 actions, with reloads.
  - `@playwright/test` 1.63.0 is a new dev dependency, matching the other mp-hq projects, and uses the Chromium already cached here. Its packages have no install scripts, so Vercel's `npm ci` downloads no browser. The browser tests stay in the Vercel upload because `astro check` type-checks `tests/baseline/update.ts`, which imports from them.
- Not carried into the rebuild, because no saved data on this site can reach them: the hidden `manual-rye` recipe, upgrades from saved versions 1 to 4, and the spreadsheet cells inside each save. Every App.tsx revision in this repository saves version 5.
- Astro 7 runs `astro preview` in the background when it detects an AI agent. The Playwright server command passes `--ignore-lock` to keep it in the foreground.

Review fixes (the code review of PR #20 at extra-high effort found seven test and documentation issues; all fixed):
- The Tartine method-guide record was really House's: the test opened two saved plans in one tab, and the second never loaded. Each recipe now has its own test, which also asserts the House paragraph is present or absent.
- `npm test` checked only a copy of App.tsx's screen rules; `app.test.ts` now renders App.tsx itself. Writing it also showed the copy got one rule wrong: the timeline lists steps day by day, so a step moved onto another day shows under that day. The spec now says so.
- Saved-data cases are loaded at a fixed moment (Jan 1, 2030, noon), so a plan without a valid date no longer depends on when the test runs.
- `recordedFrom` names the last commit that changed `src/` (`1bc99cb`, the same `src/` as `34699a7`), flagged if `src/` has uncommitted changes.
- The record writer no longer treats `$` in a step as a replacement pattern.
- The two widths are compared in one test before anything is written, so re-recording can no longer hide a phone-only difference.
- Random bakes now save their readings in time order, one per minute, as the app does. Eight inputs changed and no output did.

Evidence (this session, at the commit after `e5f2fe0` on `rebuild-baseline`):
- `git diff --stat HEAD -- src` is empty.
- `npm test` passed 120 of 120 with the host zone and with the Vancouver rule: the 111 existing tests, 4 checks of the rule, the 4 baseline sections and the App.tsx check. `npm run build` had 0 errors, 0 warnings and the 4 existing hints.
- A simulated Vercel upload (the committed files minus `.vercelignore`) passed `npm test` and the build.
- The browser record passed 38 of 38 twice. `npm run baseline:update` leaves both JSON files byte for byte as they are.
- Deliberate one-line breaks, each reverted:
  - A shorter dough-check window and a reworded bench-rest note both failed the baseline. The note change failed only the baseline; the 111 existing tests passed.
  - A changed plan-ended rule in App.tsx and a renamed Up next class both now fail `npm test`, through the App.tsx check.
  - A paler skipped step and a disabled phone reorder failed the whole-page screenshots.
  - A phone-only difference makes `--update-snapshots` fail with "phone and desktop show the same content", and no record file is written.
- The `verifier` agent checked the first version independently. Its findings (a Vercel build break, three wrong spec claims, and gaps in the browser record) were fixed before the PR.

Vercel: the preview builds of `e5f2fe0`, `3ba69b5` and `d9b456f` failed. Vercel's Linux build (Node 24.22.3) cannot apply America/Vancouver at all: the record tests stopped with "The baseline needs the America/Vancouver time zone" whether the zone was set while running or when Node started. The 111 existing tests passed, in UTC. The simulated upload above ran on macOS, where the zone works, so it could not show this.
- The fix: `tests/baseline/vancouver.ts` follows Vancouver's rule in force since 2007 (UTC−8, and UTC−7 from 2:00 AM on the second Sunday in March to 2:00 AM on the first Sunday in November). It reads wall-clock times with the host's own parser, so invalid times behave as before. The record tests use it only where the host cannot apply the zone.
- `vancouver.test.ts` compares it with the real zone wherever the host has it: over 300,000 readings at 15-minute steps through 2026, early 2027 and early 2030; every wall-clock time, including the skipped and repeated hours; invalid times; and day changes. It is skipped on Vercel.
- `BASELINE_ZONE=rule npm test` runs here what Vercel runs, with the host left in UTC underneath: 120 of 120 pass, as with the host zone.

Vercel's build of `9422b25` then passed: 120 tests, 116 passed and 4 skipped (the comparisons with the real zone).

Not verified: the browser records on any machine but this Mac (the screenshots are Mac-specific).

Decisions for Michael are listed at the end of `docs/BEHAVIOUR.md`, including one defect found here: 38°C is accepted, then lost on reload.

## Rebuild step 1: readable screen code, November 21, 2026: committed, pull request open

Michael asked to start step 1 after merging step 0: make the screen code readable without changing what it does. Branch `rebuild-readable-screen`, from `main` at `5eea38c`, in two commits.

- **Format every file.** Prettier 3.9.10 is now a dev dependency: the version `@astrojs/check` already installed, so no second copy. It uses single quotes and 120-character lines, with `npm run format` and `npm run format:check`. Left as written: generated records, the vendored shadcn components and stylesheet, Markdown and the two `.astro` pages. `npm run format:check` is not part of the Vercel build (a proposal, not done).
- **Split App.tsx.** It went from 231 lines (one of 2,484 characters) to 78. It keeps loading and saving, the form, the tabs, the recipe menu and the method guide. Each part of the screen now has its own file in `src/components/`:
  - `ScheduleTab` (the live schedule and bake-day actions, moved from App unchanged), `NowCard`, `QuietWarning`, `PlanCard`, `BatchCard`, `OvenCard`, `Timeline` (with each step row) and `DoughTemperature` (both temperature forms);
  - `IngredientsTab` (was `RecipeFormula`), `FlourTable`, `NumberField`, `Panel` and `MethodGuide`;
  - `calculator.ts` (loading and the shared form), `text.ts` and `useNow.ts`.
  - The code moved by line range, not by retyping. Every line of the old App.tsx is in the new files, except regrouped imports, declarations that gained `export`, renamed props and handlers, and text Prettier re-wrapped at the new indentation.
  - The Schedule tab's state now lives inside `ScheduleTab`, which mounts only while that tab is open. Inactive tabs were already unmounted, so nothing visible changes.

Evidence (this session, on `rebuild-readable-screen`):
- `npm test` passed 120 of 120 with the host zone and with `BASELINE_ZONE=rule`. That includes the check that renders App.tsx for every recorded plan, so the split shows the same Schedule tab as the record. `npm run build` had 0 errors, 0 warnings and the 4 existing hints.
- The browser record passed 38 of 38 after formatting, and after the split it passed 3 full runs plus 152 of 152 with `--repeat-each=4`. No record file changed.
- One screenshot (`recipe-five-flour-ingredients`) failed once, in the first browser run after the split. Its accessibility and layout snapshots had matched, and it then passed 155 times in a row. It was not reproduced, so the cause is unknown.

- The `verifier` agent checked step 1 independently and found no behaviour change.
  - The `src/lib` files compile to byte-identical minified output before and after formatting.
  - Every declaration of the old App.tsx matches its new copy.
  - 120 of 120 tests passed, and the browser record passed 38, 38 and 114 of 114.
  - A deliberate regression in `Timeline.tsx` failed `npm test`, and a class typo in `OvenCard.tsx` failed 25 browser tests.
  - It found the docs said a pull request was open before one existed, and three cosmetic slips; all are fixed.
- Vercel's preview build of `58ea3bb` succeeded.

Not verified: a real phone.

