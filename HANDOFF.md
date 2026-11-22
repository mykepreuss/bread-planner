# Bread Planner

## Current state: released and verified

Public URL: https://bread.assemblydigital.com/
Private source: https://github.com/mykepreuss/bread-planner
Workspace: /Users/mp/Code/mp-hq/bread-planner
Production branch: main
Project: prj_oaBadxUrg76MQyvwFsY68FvfuM8r (bread-planner)
Team: team_U2Fu7jNsQEgGylxpq9YR7M2f (mpmba)

Each dated release section below ends with its delivery state, newest last. The last one marked "verified live" is what production runs. When this header was last edited, that was Up next moving past unchecked steps: `main` at `2bd709e9131ce946cd3c56dde565aee43484a182`, production deployment `dpl_BnWDPJYE6SGaDTB1v5D6YBYG4Mjx` (READY). Michael is the planner's only user.

## Scope and decisions

User requested an Astro rebuild, Vercel release and Cloudflare setup for bread.assemblydigital.com. The app has never been used in production. User explicitly excluded any transfer/migration features; temporary backup/import controls and transfer page were removed. The release starts fresh with the established recipes and browser-local editing.

Astro7.4.1 statically builds the page shell, metadata and404 page. One React island retains shadcn/Radix and the existing calculator behavior (TanStack Form and Table were removed in rebuild step 3b). No backend, database, authentication or analytics were added. Preuss House remains the default, with six distinct editable recipes, exact staged quantities, leaven made/used/reserved, independent saved settings/checklists, multi-loaf forward/backward schedules, overnight proof, readiness cues, quiet-hour alerts and synchronized percentage sliders/exact inputs. Existing decisions and source math are archived in docs/SITES_HISTORY.md.

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

## Rebuild step 1: readable screen code, November 21, 2026: released and verified live

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

Release: Michael asked to merge PR #21, which merged as `99f615e` with both Vercel checks passing on `a3d9d3c`. Production completed. `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets. A fresh visit to the live site in Playwright's Chromium at 375 px showed all 23 steps, the Up next card and 2,000 g on the Ingredients tab, with no console errors and a document width of 375.

Not verified: a real phone.

## Rebuild step 2: the new core beside the old one, November 21, 2026: released and verified live

Michael asked to merge step 1 and start step 2: build the new core beside the old one and prove they agree. Branch `rebuild-new-core`, from `main` at `99f615e`. The app still uses `src/lib/`; nothing it runs changed.

`src/domain/` is the new core:
- `recipes.ts`: the six recipes as data, in menu order. Each default is the sum it came from, such as `share(100, 780)` for House's water held back, or Red Spring & Rye's 724 g of water over 944 g of flour. Settings are named (`flours`, `build.starter`) instead of v5's `flour_x` and `buildSeed` keys.
- `formula.ts`: the weights, the mixing stages, the leaven balance, and total and added hydration.
- `methods.ts`: the House and Tartine timings as named constants. They will replace the spreadsheet cells each save carries once step 3 switches the app over.
- `schedule.ts`: the steps for a bake, notes included.
  - Every step carries its facts: kind, phase, hands-on and active minutes, moves the plan, part of bulk, turn number. Step ids are unchanged, because saved checklists use them.
  - Red Spring & Rye's different cold-proof wording is a recipe field, `overnightProof: false` (decision 2 in BEHAVIOUR.md).
- `bakeday.ts`: the live schedule, skipping, the bulk estimate, turns that follow the dough, the advice, retiming and gaps. These now read the step facts instead of matching ids. Turn numbers are still read from checked ids, because a checklist can hold turns added for cool dough.
- `quiet.ts` and `text.ts`: quiet hours, rounding, dates and durations.

How the agreement is checked:
- `tests/baseline/cores.ts` gives the record two interchangeable cores. `observe.ts` now runs plans, recipe settings and helpers through either, so `baseline.test.ts` checks the record against both. Saved data stays with the old core until step 3.
- `tests/baseline/agree.test.ts` checks that the new recipes equal the old ones, defaults to the last bit. It then compares 4,000 seeded random plans and bake days and 2,000 random recipe settings through both cores; text and times must match exactly, numbers to one part in a billion. The random plans cover random settings, loaf counts, oven capacity, reheat, anchor, proof, dates (the daylight-saving days included), check-offs, extra checked turns, temperatures and readings.

Evidence (this session, on `rebuild-new-core`):
- `npm test` passed 126 of 126 with the host zone and with `BASELINE_ZONE=rule`, in about 6 seconds. The new core reproduced all 214 recorded plans, 45 recipe calculations and 53 helper results, and agreed with the old core on every random case.
- Three deliberate breaks in the new core were each caught by both the comparison and the record: a turn margin of 14 instead of 15 minutes (13 random plans and 2 recorded plans), one word of a note, and the bench rest made not hands-on. The new core was restored byte for byte.
- `npm run build` had 0 errors, 0 warnings and the 4 existing hints. The browser record passed 38 of 38, and Prettier is clean.

Release: Michael asked to merge PR #22 once the verifier reported clean. It merged as `df33449`, with both Vercel checks passing on `2b20edd`.
- Production completed, and `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets.
- A fresh visit to the live site at 375 px showed all 23 steps, the Up next card and 2,000 g, with no console errors.

The `verifier` agent's check of `fd909cb` passed every criterion and found no difference between the cores.
- It compared 49,404 risky cases and 20,000 more random plans from another seed.
- Its measured coverage of the 4,000 random plans includes 1,920 temperature estimates, 479 plans with extra turns, 2,424 with skipped steps, 2,592 with several batches, 155 planned back from the finish on a daylight-saving date, and 298 dough checks.
- It found one gap: no test fixed the order of a later batch's reheat and warm-up when they tie, which happens with a 60-minute reheat. Closed in step 3a.

Code review fixes, same day (Michael asked for the six findings from a code review at extra-high effort):
- Recipes are found with `recipeById`, a Map, so an id such as `constructor` from a corrupt save finds nothing instead of a built-in. The new core has no `manual-rye`.
- The recipes and their defaults are frozen. `defaultSettings(recipe)` returns a fresh copy to start or restore a plan from, so no code can change the defaults in place.
- `agree.test.ts` now also compares the new `totalHydration` and `addedHydration` with the old ones, and checks the round trip, on 2,000 random settings plus the edge builds. Before, every test converted with the old function.
- It also compares the new `dateString`, `clockText`, `round`, `durationText`, `untilText` and `shiftText` with the old ones, every 7 minutes through 2026 and on 20,000 random values. Before, every check formatted times with the old helpers.
- Each new check failed on a deliberate break, which was then restored: wrong brackets in `addedHydration`, and minutes without padding in `clockText`.
- The header of `observe.ts` and the `methods.ts` line above were corrected.
- Not done: the 38°C defect stays in both cores until Michael decides (decision 5).

Not verified: nothing in the app runs the new core yet; step 3 switches it over.

## Rebuild step 3a: saved data and actions, November 21, 2026: merged and verified live

Michael asked to merge step 2 and start step 3. Step 3 is split into three pull requests, each of which keeps the app working and must pass the full record:
- 3a: saved data version 6 and the actions, as tested code, with nothing on screen changing;
- 3b: the Schedule tab's rules in `src/view/`, the screen switched to the new core and state, and TanStack Form and Table removed;
- 3c: `src/lib/` deleted, with its tests carried over or retired with a reason.

3a, on branch `rebuild-state` from `main` at `df33449`. Nothing the app runs changed.
- `src/state/schema.ts`: version 6 holds only what can be edited.
  - Each recipe keeps its `settings` and its `bake` (checklist, check-off times, dough temperature, readings).
  - Shared: the selected recipe, menu order, date, time, plan-around choice, Tartine proof, loaves at once, reheat and temperature unit.
  - `freshState`, `planOf` and `selected` are helpers.
- `src/state/load.ts`: `loadState` reads `bread-planner.v6`. When that is missing or unusable, it upgrades `bread-planner.v5`, which it never writes or removes, so a rollback finds the plan as it was. `serialize` writes version 6.
  - Every value is checked as version 5's `restorePlanner` checked it, and the House red spring carry-over is kept.
  - A corrupt date or time falls back to the save's creation date (decision 4, kept until Michael decides). As merged this held only for a version 5 save: a version 6 save fell back to tomorrow. Step 3b fixes that.
  - Not carried: versions 1 to 4, `manual-rye`, the spreadsheet cells, and the checklists in the old part of a save, which are always empty.
- `src/state/actions.ts`: every change the screen makes, as a function from one state to the next.
  - Settings, total hydration, restore defaults, recipe choice, oven, reheat, proof and unit.
  - Date and time (clearing temperatures while nothing is checked), plan around, and plan the next bake (which keeps the checklist, decision 1).
  - Checking, Done at, clear checklist, the dough temperature and readings.

Evidence (this session, on `rebuild-state`):
- `npm test` passed 146 of 146 with the host zone and with `BASELINE_ZONE=rule`. The build had 0 errors, 0 warnings and the 4 existing hints. The browser record passed 38 of 38, and no record file changed.
- `tests/baseline/load.test.ts` compares the new loader with `restorePlanner`; `manual-rye` is left out, as not carried. It covers the 24 recorded kinds of saved data (including the selected plan's step times), the 21 saved plans the browser tests open, and 3,000 random corruptions of real saves.
- Three deliberate breaks in the loader were each caught by both the record and the corruption test: dropping the 100% limit on water held back, the creation-date fallback, and the red spring carry-over.
- `src/state/state.test.ts` (14 tests) checks every action against BEHAVIOUR.md, on states frozen so that changing one in place would throw. It also checks loading order and that a version 6 save loads back exactly, and it passes in three time zones.
  - It caught a real bug before commit: version 6 kept each recipe's bake under `bake`, but loading read it where version 5 keeps it, so checks and readings would have been lost on reload.
- The random plans in `agree.test.ts` now include a 60-minute reheat. Swapping a later batch's reheat and warm-up then fails 481 of them, closing the gap the step 2 verifier found.

Release: merged as pull request #23 at `c427c2e`. Production deployment `dpl_Q13AZwpkgDRQefxq5853yWiGDJdH` is READY for that commit. `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets, and a live smoke at phone width (23 steps, an Up next card, 2,000 g in the Ingredients tab, no console errors) passed, both on November 21 after the merge.

Independent check (the verifier, on `e99250c`, the same tree as `c427c2e`): it failed two criteria, both narrow. Everything else reproduced: 146 of 146 in both zones, 38 of 38 browser tests, 100 hand-built and 30,000 random saves loading as the old loader does, 3,000 save-and-reload round trips, and 42,114 random screen changes matching the old handlers with frozen state.
- Decision 4 held only for version 5 saves (above). Once 3b saves version 6, every save would lose its creation date. Fixed in 3b.
- The HANDOFF still said the pull request was open, and its "not carried" list left out the old checklists. Corrected here.
- Also noted: a storage read that throws escaped `loadState` (the old app caught it), and one of its 7 deliberate breaks survived: dropping the floor of 0 in `setTotalHydration`. Both handled in 3b.


## Rebuild step 3b: the app switched to the new core and state, November 21, 2026: merged and verified live

Michael asked to merge step 3a and start step 3b. Branch `rebuild-switch`, from `main` at `c427c2e`. The screen and the browser record are unchanged; the save is now version 6.
- `src/view/schedule.ts`: `scheduleView(state, now, when)` works out what the Schedule tab shows. That covers the live schedule, what is up next, whether the plan has ended, the bulk advice and which temperature field to offer, quiet-hour work, the cold proof and the batch summary. These rules were inline in `ScheduleTab.tsx`.
- The screen runs on `src/domain`, `src/state` and `src/view`.
  - `App.tsx` loads with `loadState`, holds the state in React and saves version 6 on every change.
  - `PlannerContext` gives each part of the screen the state and an `update` that applies an action. Fields and menus call actions instead of a form.
  - Nothing in the app imports `src/lib/` any more, apart from the shadcn `cn` helper in `src/lib/utils.ts`.
- TanStack Form and TanStack Table are removed from `package.json` and the lockfile. The flour table is a plain shadcn table with the same markup.
- From the 3a verifier:
  - Version 6 keeps `created`: the date and time the plan was first made, taken from a version 5 save's old part. A corrupt date still falls back to it after the switch, so decision 4 stays Michael's.
  - A storage read that throws starts the planner fresh, as before.
  - A test now covers a total hydration below what the leaven brings: it stops at no added water.
- The record's tests compute the Schedule tab through each core (`Core.view` in `tests/baseline/cores.ts`). For the old core that is the rules as `ScheduleTab.tsx` held them; for the new one it is `scheduleView`. The 214 recorded plans and the 4,000 random plans therefore check the new view module itself.
- `docs/BEHAVIOUR.md` (saved data) and the README describe version 6.

Evidence (this session, on `rebuild-switch`):
- `npm test` passed 147 of 147 with the host zone and with `BASELINE_ZONE=rule`. The build had 0 errors, 0 warnings and the 4 existing hints. The Prettier check passed.
- `npm run test:browser` passed 38 of 38, and no record file changed. The first reload flow now also checks that the version 5 save is still exactly as seeded and that the check is in the version 6 save.
- Deliberate breaks, each caught and then restored:

| Break | Failing tests |
|---|---|
| The after-mixing field offered on the wrong step | 3 |
| The dough check ignoring the time | 3 |
| Up next naming the wrong following step | 1 (`app.test.ts`) |
| Version 6 forgetting the creation date | 1 |
| Underway ignoring an ended plan | 3 |
| Saving under another key | 8 or more browser flows |

- Production for 3a was checked before this work (above).

Independent check (the verifier, on `fda25ac`): criteria 1 to 7 met, criterion 8 (docs) not met.
- It built the old and new apps side by side and drove both with the same scripts: 21 saved plans on both tabs, 14 scenarios and 165 step snapshots, all identical. After each scenario, the new app's version 6 save held the same planner as the old app's version 5 save.
- Storage failures, decision 4 across reloads, a clean `npm ci` without TanStack, and every claim above reproduced.
- Not met: the README said the bulk estimate "does not change the planned steps"; it moves preshape and every later step. That sentence predates step 3b.
- It also found deliberate breaks that no test caught (the behaviour was right in each): eight in its first report and two more in its re-check, which a flaky screenshot had hidden. It also found Timeline still working out the total time and "All batches done" itself, the TanStack mention in this file's scope section, and an unwritten consequence of a rollback.

Fixed on the same branch:
- The README sentence, and the scope section above.
- `Timeline.tsx` shows the view's `totalMinutes` and `allDone`, so the record tests what the screen shows. Breaking either in the view now fails 3 tests.
- New checks for each surviving break, all of which now fail the build or the browser record:
  - four browser flows: the plan time, each leaven build field and Restore defaults on a recipe other than House, the hydration minimum and its slider, and storage that cannot be read or written;
  - `src/view/schedule.test.ts`: the checked count leaves out checks for steps no longer on the schedule, while the bake still counts as underway;
  - after the re-check, a fifth flow: the reheat time between batches is saved as typed.
- `docs/BEHAVIOUR.md` notes that edits made after a rollback stay in version 5, as decision 6.
- Two nits: an unused blur handler in `NumberField.tsx`, and a repeated import in `src/view/schedule.ts`.
- After the fixes and the re-check: `npm test` passed 148 of 148 in both zones, the browser record 43 of 43 with no record file changed, and the build and format check passed. The ten breaks each fail a named test.
- Proposal from the re-check, done in step 4: the phone screenshots of the Ingredients screens sometimes fail with the page scrolled about 370 px further, because the scroll position after opening the three sections depends on timing. Waiting for the sections to finish opening before the screenshot would steady it. It failed 1 in 3 and 2 in 5 runs in the verifier's copies, and in none of this session's runs in the worktree.

Second re-check (the verifier, on `9d0dbbf`): PASS on all eight criteria. All 61 of its deliberate breaks fail a named test.

Release: merged as pull request #24 at `9c1a7b9`, after that PASS. Production deployment `dpl_AXtu64CcshGUZL86iWJbbc2oahbW` is READY for that commit. On November 21 after the merge:
- `node scripts/verify-deployment.mjs https://bread.assemblydigital.com` passed 9 checks and 7 assets.
- The live smoke at phone width passed: 23 steps, an Up next card, 2,000 g in the Ingredients tab, no console errors.
- A live upgrade check, in a fresh headless browser on the production site, opened the recorded `mid-bulk` version 5 save. It showed "6 of 22 steps checked" before and after a reload, wrote a version 6 save holding those checks, and left the version 5 text exactly as seeded, with no console errors.

Not done here: step 3c deletes `src/lib/`. The old core still runs in the tests, and `app.test.ts` still uses the old loader to decide which recorded plans saved data can hold.

## Rebuild step 3c: the old core deleted, November 21, 2026: merged and verified live

Michael asked to merge step 3b once the verifier was clean, then do step 3c. Branch `rebuild-retire-lib`, on top of step 3b. Nothing the app runs changed.
- Deleted: `src/lib/model.ts`, `recipes.ts` and `bakeday.ts`, with their tests. `src/lib/utils.ts`, shadcn's `cn` helper, stays where `components.json` expects it.
- The old core's 111 tests were each carried over, retired with a reason, or found to be a loading rule that the state tests or the record already cover.

| Old file | Tests | Carried | Retired | Loading rules, already covered |
|---|---|---|---|---|
| `model.test.ts` | 44 | 31 | 12 | 1 |
| `recipes.test.ts` | 32 | 25 | 3 | 4 |
| `bakeday.test.ts` | 35 | 33 | 0 | 2 |

- The carried tests became 89 new tests next to the code (some old tests merged, one split): `src/domain/formula.test.ts` (12), `schedule.test.ts` (17), `recipes.test.ts` (20), `quiet.test.ts` (5), `bakeday.test.ts` (34), and `src/components/text.test.ts` (1, the loaf wording).
  - Each keeps the old expected values. Where weights now come from exact shares instead of rounded grams (Red Spring & Rye, and House at 3 × 750 g), they compare to within 1e-9.
  - Every carried test passed on the new core first time, in America/Vancouver and in UTC.
- Retired, because the rebuild does not carry what they test (docs/BEHAVIOUR.md):
  - Spreadsheet cells: "all 59 original numeric inputs plus B4 are represented once", "leaven build uses bread flour rather than all flour", "custom partial leaven deducts only used flour and water, retaining a real reserve", and "edited manual recipes and even the optional Red Fife row migrate without data loss".
  - Editable timings, which are now fixed in `src/domain/methods.ts`: "autolyse overlaps leaven; changing its duration leaves final mix unchanged" (the overlap itself is carried), "each turn interval moves only subsequent steps", "every timing input has an observable effect", "extending book bulk adds folds and moves later steps, while preheat allowance overlaps", and "all independent House timing controls affect its schedule without changing custom timing".
  - Saved versions 1 to 4: the v1 migration, v2 upgrade, v3 upgrade, v4 persistence and v4 migration tests.
  - Recipe de-duplication: "deduplication ignores hydration and batch size but preserves different flour/leaven/salt/method".
  - Parts of carried tests were retired for the same reasons, for example the 100 g of dusting flour the app never showed, and the hidden `manual-rye` recipe.
- The record's harness now runs on the new code alone.
  - `observe.ts` builds each recorded case as planner state and observes it through `src/domain`, `src/view` and `src/state`. `cores.ts` is deleted.
  - `agree.test.ts` is retired: it compared the new core with the deleted one. Its last run, at `9d0dbbf`, passed 4,000 random plans and 2,000 random recipes. Its one test of the new code alone, recipe lookup and frozen defaults, moved to `src/domain/recipes.test.ts` after the verifier found it had been dropped.
  - `load.test.ts` no longer compares loaders. It checks that every recorded save, every saved plan and 3,000 random corruptions, as version 5 and as version 6 saves, load into a valid planner that comes back the same from its own save.
  - `app.test.ts` saves each recorded plan as version 6 and decides which ones saved data can hold by a version 6 round trip. The same four can't.
  - The saved-data inputs in `baseline.json` and the saved plans in `tests/browser/saved-plans.json` are version 5 saves that only the deleted code could build, so they are kept as they are.
  - `src/state/state.test.ts` gained the House red-spring carry-over, including a save with neither flour, which no fixed test pinned.
- `baseline.json` was regenerated from the new code. Plans, recipe calculations and helpers came out identical. Each of the 24 saved-data results was identical apart from its `manual-rye` entry, which the rebuild does not carry.

Evidence (this session, on `rebuild-retire-lib`):
- `npm test` passed 117 of 117 with the host zone and with `BASELINE_ZONE=rule`. The build had 0 errors, 0 warnings and 0 hints; the 4 old hints were in a deleted file. The Prettier check passed.
- `npm run test:browser` passed 43 of 43, and no record file changed. One earlier run failed only the phone screenshot of the House Ingredients screen: the flake recorded as a proposal in step 3b. That screen then passed three runs on its own, and the full suite passed on the next run.
- Deliberate breaks, each caught and then restored:

| Break | Failing tests |
|---|---|
| No House red-spring carry-over on load | 2 |
| House preshape of 5 minutes | 10 |
| Bulk reference of 77°F | 11 |
| Loaves at once capped at 3 | 4 |
| Loaf wording | 1 |

Independent check (the verifier, on `ba3b5b9`): FAIL on criteria 5 and 8. Criteria 1 to 4, 6 and 7 were met.
- It built both revisions: `dist/` is byte-identical. All 259 recorded plan and recipe inputs build the same planner as before. The regenerated `baseline.json` differs only by `manual-rye`, and the update is a no-op.
- It accounted for all 111 old tests, and 101 of its first 107 breaks failed `npm test`. The carried unit tests passed in 7 time zones.
- Finding A: with the old-loader comparison gone, a version 5 save's setting names were no longer pinned. Breaking the reading of water held back, loaf weight, salt, leaven or Red Fife parts passed every test. That reader runs the first time a browser opens step 3b or later.
- Finding B: the recipe lookup test above had been deleted with `agree.test.ts`. Without it, looking recipes up in a plain object passed every test, and a damaged save naming the recipe `constructor` would then fail to load.
- Docs: the `agree.test.ts` sentence, the 1e-9 note, and the README's list of test folders.

Fixed on the same branch:
- `src/state/state.test.ts`: every setting of every recipe, given a distinct valid value, loads exactly from a version 5 save and from a version 6 save. Each of the verifier's five breaks, and dropping the leaven build's water, now fails it.
- The recipe lookup test is back, in `src/domain/recipes.test.ts`. The verifier's two breaks (recipes not frozen, a plain-object lookup) each fail it.
- The three doc corrections.
- After the fixes: `npm test` passed 119 of 119 in both zones, and the build and format check passed.

Proposal, done in step 4: a saved time such as `25:00` passes the HH:MM check and gives a plan with no steps, as it did before the rebuild. The time field can't produce one; only a damaged save can. Checking the hour and minute on load would close it.

Second check (the verifier, on `4bb0e3d`): PASS on all eight criteria. Every setting-name break on both save versions, and both recipe lookup breaks, fail a named test. It noted that a saved 0 on the version 5 path was not pinned (done in step 4).

Release: merged as pull request #25 at `e39c146`, after that PASS. Production deployment `dpl_5JFY9yWnrExGSB7voohA6NAnXPXn` is READY for that commit. On November 21 after the merge, `verify-deployment.mjs` passed 9 checks and 7 assets, the live smoke at phone width passed (23 steps, no console errors), and the live upgrade check passed again ("6 of 22 steps checked" before and after a reload, version 5 text unchanged).

## Rebuild step 4: cleanup, November 21, 2026: merged and verified live

Michael agreed to every item proposed after step 3c and asked for step 4. Branch `rebuild-cleanup`, from `main` at `e39c146`.
- Removed the unused shadcn `dialog` and `separator` components and the unused `.dark` colour block. The `dark` variant line stays, with a note: without it, Tailwind would apply the components' `dark:` styles whenever the phone is in dark mode.
  - Removing them left the built JavaScript byte-identical; the app's bundle changes only through the new date and time checks below. In the CSS, the `.dark` block and the 7 utility classes only the deleted components used are gone, and the 51 effective `:root` properties are unchanged.
- Loading now checks that a saved date is a real calendar date and a time is from 00:00 to 23:59. An impossible one falls back to the plan's creation date or time, as a malformed one already did, so an impossible date or time in a damaged save no longer opens a plan with no steps (docs/BEHAVIOUR.md, saved data). Two cases still give no steps, as before this step: a time skipped by daylight saving, which the screen itself allows, and a year before 1000 (a proposal below).
  - New state test: the last day of every month and the day after, in a common and a leap year, century leap years, the edges of the day, values with anything before or after them, and the creation date checked the same way.
  - `load.test.ts` is tighter: every plan it loads must have steps unless its recipe has no flour (or, as corrected below, it needs more than 1,000 batches), and it checks loaded dates as real ones through the Date object, independently of the loader's month table, and times by range.
  - Two recorded plans, "an impossible date" (2026-02-31) and "an impossible time" (25:00), can no longer reach the screen through saved data, so `app.test.ts` lists them as unreachable. `baseline.json` is unchanged. (Before writing the code I had checked only the saved-data cases and expected no test to change; the recorded plans showed otherwise.)
- The per-setting state test from step 3c now also loads every setting that may be 0 as 0, from both save versions. The verifier's two zero-value breaks now fail it.
- The flaky Ingredients phone screenshots: `openIngredients` waits for each section to finish opening before the next click, so the final scroll position no longer depends on the machine's speed.
  - Under heavy load (16 workers on 8 cores, each Ingredients screen 12 times), it went from 58 of 84 failing (54 in the verifier's run) to 84 of 84 passing. It also passed 70 of 70 at normal load.
  - The seven phone first-screen images of the Ingredients screens were re-recorded. A full-page screenshot of each screen contains both the old and the new image, about 368 px apart. Where they overlap they differ by at most 14 pixels, each by one colour level, along the card's two edges. Only the scroll position changed. Every other record file, desktop and whole-page images included, is unchanged.
- `npm run build` now runs Prettier's check first (leaving out `vercel.json`, as below), so a badly formatted file fails the Vercel build. A deliberately misformatted file made the build exit 1.
  - The first Vercel build of this branch failed on `vercel.json` alone. A diagnostic build on a throwaway branch printed the file: on Vercel's build machine it is rewritten as one minified line of 382 bytes: `JSON.stringify` of the committed file plus a newline. The build now checks `prettier --check . '!vercel.json'`, so only the build leaves that file out; `npm run format:check` still covers it.
- Decision 6 is closed as kept: Michael is the planner's only user.
- This file's header now points to the newest section marked verified live instead of naming an old release.
- Step 3c's release, and its verifier's second check, are recorded in its section above. Two of its proposals are marked done here.

Evidence (this session, on `rebuild-cleanup`):
- `npm test` passed 120 of 120 with the host zone and with `BASELINE_ZONE=rule`. The build, now with the format check, had 0 errors, 0 warnings and 0 hints.
- `npm run test:browser` passed 43 of 43. The whole browser suite also passed 129 of 129 three times over with 12 workers.
- Deliberate breaks, each caught and then restored:

| Break | Failing tests |
|---|---|
| A saved 0 setting read as missing (version 5) | 1 |
| A saved 0 flour part read as missing (version 5) | 1 |
| Any day up to 31 accepted | 2 |
| Every fourth year counted as a leap year | 1 |
| Times checked for shape only | 3 |

Independent check (the verifier, on `bfa8586` and `c87066a`): FAIL on criteria 5 and 8; criteria 1 to 4, 6 (at `c87066a`) and 7 were met.
- It confirmed the code: 10,626 dates from year 0000 to 9999 and all 10,000 `HH:MM` strings agree with an independent check, on both save versions. Nothing a person can enter is newly refused, both daylight-saving days included. The record changes are only the intended ones, the flake fix held through three heavy-load runs, and the wait fails at the timeout instead of hanging.
- Five of its 51 breaks survived every test: January given 30 days, June or September given 31, and either date or time pattern without its anchors.
- Docs: "the built JavaScript is byte-identical" held only for the component removal; "a damaged save can no longer open a plan with no steps" was too broad; and some figures and wording were wrong.
- It suggested leaving `vercel.json` out of the build's check only.

Fixed on the same branch:
- The state test above now covers every month's last day, in a common and a leap year, and values with anything before or after them. Each of the five breaks now fails it.
- `load.test.ts` checks loaded dates through the Date object and times by range, and its comment names the two kinds of plan that still give no steps.
- The build alone leaves `vercel.json` out; the README says so.
- The corrections above.
- After the fixes: `npm test` passed 120 of 120 in both zones, and the build had 0 errors, 0 warnings and 0 hints.

Proposal, done with Michael's decisions (below): a year before 1000 gave a plan with no steps, because `dateString` in `src/domain/text.ts` doesn't pad the year, so the schedule's own date check fails. It was already so before the rebuild. The date field allows such a year, as in 0202. Padding the year to four digits would fix it. While a year is being typed, the field can also pass through five-digit years such as 60102, which show no schedule either; a reload then fell back to the creation date, as before step 4; since Michael's decisions it falls back to tomorrow.

Second check (the verifier, on `097426b`): PASS on all eight criteria. The five earlier survivors fail the date test, 55 of 56 new breaks fail a named test (the one survivor adds a multiline flag to the date pattern), and all 51 first-round breaks fail. Vercel built `097426b` with the narrowed check and passed. A last commit after that PASS changed only wording: these paragraphs, a load.test comment, and a line in docs/BEHAVIOUR.md.

Release: merged as pull request #26 at `5e79d67`, with Michael's approval after that PASS. Production deployment `dpl_9V4VeDQ7fS1AqWiWnwg59QZQzcex` is READY for that commit. On November 21 after the merge:
- `verify-deployment.mjs` passed 9 checks and 7 assets.
- The live smoke at phone width passed: 23 steps, no console errors.
- The live upgrade check passed again: "6 of 22 steps checked" before and after a reload, version 5 text unchanged.
- A live check of the new rule: a version 6 save holding 2026-02-31 at 25:00, created 2026-11-23 at 08:30, opened on 2026-11-23 at 08:30 with "0 of 23 steps checked" and no console errors.

Correction, found while making Michael's decisions: "every plan it loads must have steps unless its recipe has no flour" missed one case. The schedule also gives no steps for more than 1,000 batches, and a corruption with a loaf count of 1,000,000,000 showed it once the random sequence changed. `load.test.ts` now allows that case, and the schedule's comment and docs/BEHAVIOUR.md now name it.

## Michael's decisions, November 21, 2026: merged and verified live

Michael chose all of the recommendations for decisions 1 to 5 in docs/BEHAVIOUR.md, plus the step 4 proposal about years before 1000. Branch `rebuild-decisions`, from `main` at `5e79d67`.
1. "Plan the next bake" starts a fresh checklist: `planNextBake` clears the checks, their times and the dough temperatures as it moves the date. It is offered only once a plan has ended, when nothing is checked or every step is checked or skipped.
2. Red Spring & Rye uses the House cold-proof wording: "Overnight cold proof", "refrigerate overnight", and "Cold proof (daytime)" when the proof falls within one day. The recipe flag that set it apart is gone.
3. Checklists stay per recipe.
4. A missing or invalid saved date falls back to tomorrow, and a time to 9:00 AM. The planner no longer saves a creation date, and ignores one an earlier save holds.
5. The °C field accepts 10–37.7°C, so every °C value it takes survives a reload; 38°C shows "Use 10 to 37.7°C".
- Years before 1000: `dateString` writes the year in four digits, so a date such as 0202-11-22 gives a schedule.

Record changes, each checked case by case against the committed record:
- `baseline.json`, regenerated: 29 Red Spring & Rye plans differ only in the cold-proof step's title and note, now the wording House plans already had (no new text). The "an invalid date and time" saved-data case differs only in its date, now tomorrow, and the times that follow. The helper `inTempRange(38, "C")` is now false. Otherwise only the `recordedFrom` line changed, and two texts no case uses any more left the text table: the old cold-proof note, in its one-batch and multi-batch forms. The old title stays, because Tartine uses it.
- The browser record: only the Red Spring & Rye schedule's text snapshot changed, in the cold-proof step's three lines. The flow for a fully checked plan was rewritten: after "Plan the next bake" it must now match the ended plan's recorded result exactly, and its old snapshot is deleted.

Evidence (this session, on `rebuild-decisions`):
- `npm test` passed 122 of 122 with the host zone and with `BASELINE_ZONE=rule`. New or rewritten state tests cover decisions 1, 4 and 5, and a schedule test covers years before 1000.
- A throwaway browser check typed 38°C (refused, with "Use 10 to 37.7°C") and 37.7°C (kept after a reload).
- `npm run build` had 0 errors, 0 warnings and 0 hints, and `npm run test:browser` passed 43 of 43.
- Deliberate breaks, each caught and then restored:

| Break | Failing tests |
|---|---|
| "Plan the next bake" keeps the checklist | 1 |
| Red Spring & Rye's old cold-proof wording | 2 |
| A damaged time falls back to 10:00 | 3 |
| A damaged date falls back to the day after tomorrow | 4 |
| The °C field accepts 38 again | 2 |
| Years not padded to four digits | 1 |

Independent check (the verifier, on `efebe0a`): FAIL on criteria 1 (one sub-check) and 7.
- It drove the built app for every decision. Decisions 1, 2 and 4, the after-mixing °C field, and the year 0202 behaved as BEHAVIOUR.md says, and a version 6 save from production, with its creation date, loads the same and drops it. The record changes are exactly the listed ones, decoded leaf by leaf. All six break counts above reproduced.
- Not met: a later reading of 37.7°C could not be added, because the browser enforced the field's half-degree step on the form (26.3°C and 78.2°F failed too, already before this PR). So "10–37.7°C" was untrue for later readings.
- New in this PR: a saved 100°F shown in °C read "37.8" with "Use 10 to 37.7°C" beside it.
- A survivor: a version 6 time falling back to the old creation time again passed every test.
- Docs: Red Spring & Rye's method row, the five-digit-year sentence, and the °C range; also the `app.test.ts` comment, two rules that did not say they changed, and smaller wording.

Fixed on the same branch:
- The later-reading form has `noValidate`: the planner already checks the range, and the step only sets what the field's arrows do. A new browser flow adds a 37.7°C reading.
- The after-mixing field never flags a saved value exactly as shown. A new browser flow shows a saved 100°F as 37.8°C without an error, through a reload.
- The decision 4 state test now damages the time of a save that holds a creation time, and expects 9:00 AM.
- The docs above.
- After the fixes: `npm test` passed 122 of 122 in both zones and `npm run test:browser` 45 of 45. Undoing either temperature fix fails its new flow, and the creation-time fallback fails the state test.

Second check (the verifier, on `e8e590f`): every behaviour check passed in the built app, including what `noValidate` and the shown-value rule let through and still refuse. FAIL on one HANDOFF sentence about the text table, now corrected. It also found two breaks no test caught: an after-mixing field that never shows its error, and a later-reading field without the planner's own range check. The two °C flows now type 37.9°C and 38°C, expect the error, and expect 38°C not to be added even with Enter.

The last commit, `1819d02`, made those fixes and changed only tests and this file. It was checked in this session but not sent back to the verifier: `npm test` passed 122 of 122, the build had 0 errors, 0 warnings and 0 hints with a clean format check, `npm run test:browser` passed 45 of 45, and Vercel built it.

Release: merged as pull request #27 at `40fd02b`, with Michael's approval. Production deployment `dpl_ADz3fHU5bkKXqaxoUXx7fLqvQ6Po` is READY for that commit and holds the `bread.assemblydigital.com` alias. On November 22 after the merge:
- `verify-deployment.mjs` passed 9 checks and 7 assets.
- The live smoke at phone width passed: 23 steps, an Up next card, 2,000 g in the Ingredients tab, nothing wider than the screen, no console errors.
- The live upgrade check passed again: "6 of 22 steps checked" before and after a reload, version 5 text unchanged.
- A live check of each decision, with the clock fixed at November 21, 3:20 PM, and no console errors:
  1. A fully checked plan (23 of 23): "Plan the next bake" moved the date to 2026-11-22 with "0 of 23 steps checked" and no button, the same after a reload.
  2. Red Spring & Rye showed "Overnight cold proof" with "Cover the shaped loaves in their baskets and refrigerate overnight."
  3. One step checked on House showed 0 of 19 on Tartine and 1 of 23 again on House.
  4. A version 6 save holding 2026-02-31 at 25:00, created 2026-11-23 at 08:30, opened on 2026-11-22 at 09:00, and the saved plan no longer holds a creation date.
  5. In °C, 38 showed "Use 10 to 37.7°C" with Update disabled, and Enter added nothing; 37.7 was added as "37.7°C at 3:20 PM" and kept after a reload. A saved 100°F showed as 37.8 with no error, also after a reload, and typing 37.9 showed the error.
- A plan dated 0202-11-22 kept that date and showed 23 steps.


## Done at fits an iPhone screen, November 22, 2026: merged and verified live, except on an iPhone

Observed in Michael's iPhone screenshot of production, November 22: in each checked step, the Done at date field ran into its time field, and the time field ran off the right edge of the screen.

Cause, from the code and its history (not reproduced on an iPhone): the Done at date field came in on November 21 (`6e5f7c5`, "Let Done at take a date as well as a time") without the reset the plan card's date and time fields got on October 19 (`7aa9882`). iPhone Safari sizes a native date or time field by its own picker unless the field's appearance is reset.

Change: `src/index.css` gives the Done at fields the plan card's reset: no native appearance, the value aligned left, and no padding inside the field's own parts. Branch `fix-done-at-iphone`, from `handoff-decisions-release`.

Evidence (this session):
- A new browser flow opens a bake in progress at phone width. It checks that all 14 date and time fields have their appearance reset, and that each of the 6 Done at pairs keeps its date before its time and its time inside the screen. It failed before the change (appearance "auto", not "none") and passes after; taking Done at out of the reset again fails it.
- `npm run test:browser` passed 46 of 46 with no recorded screenshot changed, so Chromium draws both widths as before. `npm test` passed 122 of 122. The build had 0 errors, 0 warnings and 0 hints, with a clean format check.
- Not verified: how an iPhone draws the fields. Chromium can't draw iPhone's control, this Mac has no Xcode for the iOS Simulator, and the test checks the reset rather than the iPhone layout. Not sent to the verifier, as a one-rule style change.

Release: merged as pull request #29 at `523fa89`, with Michael's approval, right after pull request #28 (this file's record of his decisions) at `eaa04d2`. Production deployment `dpl_6hbbhCDnXNU3wVRinWg3obih18sq` is READY for `523fa89` and holds the `bread.assemblydigital.com` alias. On November 22 after the merge, with no console errors:
- `verify-deployment.mjs` passed 9 checks and 7 assets; the live smoke, upgrade and impossible-date checks passed as for the decisions release, and so did the live check of each decision.
- At phone width in Chromium, the first Done at date field's appearance is "none" (it was "auto" before this release), and the pair sits where it did, inside the screen.
- Not confirmed: the fields on Michael's iPhone. He hasn't reported back yet.

## Up next moves past an unchecked step, November 22, 2026: merged and verified live

Michael's request: with Feed starter unchecked and every step through Turn 3 checked, Up next should show Turn 4, not stay on Feed starter. Only the start of bulk and the turns could be skipped, so any other unchecked step held Up next back. Branch `up-next-after-checked`, from `main` at `523fa89`.

Change: `skippedSteps` in `src/domain/bakeday.ts` marks any step left unchecked before the latest checked step as Skipped, not only bulk steps. The rest follows from the existing view:
- Up next is the first step after the latest checked one.
- A skipped step leaves the quiet-hours list and can still be checked.
- A forgotten early step no longer keeps a finished plan from ending.
- A step the plan starts at the same time as the latest checked one stays open (added at Michael's choice; see below).

docs/BEHAVIOUR.md records it as decision 7, and the `bulk` flag's comment in `src/domain/schedule.ts` now says what the flag still does: bulk never ends before the latest checked bulk step.

Tests, each failing before the change:
- `bakeday.test.ts`: the skip test is rewritten for the new rule. Its old assertions, "feed, leaven and autolyse are never skipped" and "only bulk steps", described the rule Michael changed. It also checks that a step checked out of order, such as a late feed, does not decide what is skipped: the step furthest along the schedule does. A made-up id passes nothing over. (A checked "turn 9" would, because the planner adds a checked extra turn to the schedule.)
- `view/schedule.test.ts`:
  - Michael's example: the feed skipped, Up next Turn 4 then Turn 5, and checking the feed late leaves Up next on Turn 4.
  - With the feed and the autolyse both forgotten, checking the feed late leaves the autolyse skipped and Up next on Turn 4.
  - A plan with only the feed unchecked has ended once its last loaf is out.
- A browser flow checks Michael's example in the built app. It failed before with "Feed starter" where "Turn 4" was expected, and it now also checks the Skipped badge, a reload, and checking the feed late.

Record changes: `baseline.json` was regenerated. 32 of its 214 plans changed, all as the new rule implies:
- Every step that was neither checked nor skipped and comes before the latest checked step is now skipped.
- Up next and the step after it are the first steps left.
- Whether the plan has ended and whether everything is done follow from that. One plan, "random bake 71", now counts as ended, so it is no longer underway; that is the one change to `underway`.
- Only the newly skipped steps lost their quiet-hours mark, and the quiet-hours count matches the marks in every plan.

My script checked each changed plan against the old record and the rule, and the verifier separately rebuilt every plan's new output from the old record and the rule, with no mismatch in 214 plans. Otherwise only the `recordedFrom` line changed. No browser screen changed: no saved browser plan leaves an early step unchecked.

Evidence (this session, on `up-next-after-checked`):
- `npm test` passed 131 of 131 with the host zone and with `BASELINE_ZONE=rule`, and `npm run build` had 0 errors, 0 warnings and 0 hints with a clean format check, on the final code (`bcedabb` and this file).
- `npm run test:browser` passed 48 of 48.
- Deliberate breaks: I reran the verifier's own break script (its reading of my breaks, then its five breaks of the same-time rule) at `bcedabb`, in a separate copy, against the full unit and browser suites. Every break is caught and was restored:

| Break | Unit tests failing (of 131) | Browser tests failing (of 48) |
|---|---|---|
| Only bulk steps skip (the old rule) | 9 | 1 |
| The step just before the latest checked one is not skipped | 6 | 1 |
| Steps after the latest checked one are skipped too | 12 | 13 |
| The first checked step decides, not the latest | 7 | 2 |
| Up next ignores skipped steps | 6 | 3 |
| Skipped steps stay on the quiet-hours list | 2 | 0 |
| The step checked last decides, not the one furthest along | 3 | 0 |
| Same-time steps are skipped too (no exception) | 5 | 1 |
| Live times decide which steps start together | 4 | 1 |
| The same, made in the view by passing the live steps as the plan | 3 | 1 |
| The live steps' planned times decide, so an extra turn gets a partner | 4 | 0 |
| Steps within 30 minutes of the latest checked one stay open | 6 | 0 |
| Steps less than 30 minutes from it stay open | 4 | 0 |
| A step sharing a planned time with any checked step stays open | 3 | 0 |
| Only the step just before the latest checked one can stay open | 1 | 0 |
| Steps missing from the plan pair with each other | 1 | 0 |
| The plan is read by position, not by id | 2 | 0 |
| The step checked last sets the shared time | 2 | 0 |

Independent check (the verifier, on `c08319a`): FAIL on one of seven criteria.
- It drove the built app with its own script. In Michael's example, Up next showed Turn 4, then Turn 5, with Feed starter marked Skipped, through two reloads. Checking the feed late kept Up next on Turn 4.
- The rule held for several batches, steps at the same time, extra turns, "Ready: preshape now", Original Tartine and a warm proof. The test commands passed, the docs matched, and nothing else changed.
- Not met: one of its seven breaks survived. When the step checked last decided, rather than the one furthest along, a late check of one forgotten step brought back another. The seventh row of the table above is that break; the two tests added for it now catch it.
- It also found two inexact claims in this section, now corrected:
  - The record's `underway` change was left out.
  - The browser column of an earlier version of the break table counted only five chosen flows, so its "5" for the third break couldn't be reproduced.

What the rule did that Michael should know, found by the verifier and each confirmed in the built app:
- Of two steps the plan starts at the same time, checking the second first skipped the first. Checking Preheat before "Take both loaves out of the fridge" (both 7:50 AM) marked the fridge step Skipped, and Up next jumped to "Bake covered", an hour later. The same happened to Tartine's "Add salt and final water" beside "Begin warm bulk fermentation". Fixed below, at Michael's choice. A step only a few minutes earlier is still skipped: with 5 loaves, 2 at once, checking "Batch 1: remove lid" (9:10) skips "Warm batch 2" (9:03). An earlier version of this list put that case with the same-time ones; it isn't one.
- One mis-tap on the last step ends the bake: checking the cooling mark on a fresh plan skips the 22 steps before it, hides Up next and shows "All batches done". Unchecking it puts everything back.
- A skipped step records no time. If it is one that moves the plan, such as Mix final dough, the times keep following the last checked step that moves it.

Same-time steps stay open, Michael's choice on November 22 ("Proceed", to my recommendation):
- Change: `skippedSteps` takes the plan as well. A step that the plan starts at the same minute as the latest checked step is not skipped. The plan's times decide, not the live ones, for two reasons:
  - A check-off a minute late moves its own live time away from its partner's.
  - A cool-dough extra turn isn't in the plan, so it has no partner, though it can fall due at the planned preshape: Turn 8 is at 6:15 PM in the default plan, like preshape. It is still skipped once preshape is done.
- Tests, each failing before except the extra-turn ones, which guard against comparing the wrong times:
  - `bakeday.test.ts`: Preheat checked first leaves the fridge step open, even when checked late; a later check passes both; Tartine's warm bulk leaves the salt step open; an extra turn at the planned preshape time is still skipped.
  - `view/schedule.test.ts`: the same for the fridge step, with Up next and the step after it, and for Tartine; and a cool-dough bake whose preshape is checked 4½ hours into bulk skips Turns 1 to 8, with Up next on the bench rest.
  - A browser flow checks every step through the cold proof, then Preheat. It failed before with "Bake covered (both loaves)" where "Take both loaves out of the fridge" was expected, and now also checks that nothing shows Skipped, through a reload.
- The record didn't change. 206 of its 214 plans have steps at the same time, but in the 7 where the latest checked step has a partner listed before it, that partner is checked too (the verifier's count).

Second independent check (the verifier, on `cff488d`): FAIL on one of eight criteria.
- Passed: its earlier surviving break now fails 2 unit tests. In the built app, it checked the fridge and Tartine pairs, Michael's example, a partner checked late, cool dough with a late preshape, and four loaves with four reheat times; all behaved as intended, with no console errors. The record is unchanged, and the test commands, docs, break table and scope held.
- Not met: three of its five breaks of the same-time rule passed every test, though each gave a wrong Up next in a reachable bake:
  - only the step just before the checked one could stay open, which cuts a group of three;
  - with the guard for steps missing from the plan dropped, a checked Turn 9 left Turn 8 open;
  - the step checked last set the shared time, so Basket rest checked late after Preheat skipped the fridge step.
- `bcedabb` adds tests for all three: a group of three steps at 9:33 with four loaves and no reheat, Turn 9 checked before Turn 8, and Basket rest checked late after Preheat, in the domain and in the view. The tests pass on the real code, and the last three rows of the table above show them catching the three breaks.

What the same-time rule does that Michael should know (the verifier's findings):
- Some pairs are accidents of the reheat time. With 15 minutes, "Batch 1: 15-minute cooling mark" shares a time with "Batch 2: bake covered", so checking the bake keeps the cooling mark as Up next instead of "Batch 2: remove lid". With 17 minutes, "Warm batch 2" pairs with batch 1's bake. Changing the reheat time mid-bake changes which steps pair.
- Tartine's "Warm both loaves to room temperature" (1:10 PM) is 30 minutes before Preheat (1:40 PM), not at the same time, so checking Preheat first still skips it. Only the House-method recipes have the fridge-out and Preheat pair.
- The pairing lasts only until the next check: checking anything later skips the open partner.

The last commit, `48a0213`, changed only this file. The verifier didn't re-run on `bcedabb` or `48a0213`.

Release: merged as pull request #30 at `2bd709e`, with Michael's approval. Production deployment `dpl_BnWDPJYE6SGaDTB1v5D6YBYG4Mjx` is READY for that commit and holds the `bread.assemblydigital.com` alias. On November 22 after the merge, with no console errors:
- `verify-deployment.mjs` passed 9 checks and 7 assets. The live smoke, upgrade, impossible-date and decision checks passed as for the decisions release. The first Done at date field's appearance is still "none" at phone width.
- On a fresh plan with the clock fixed at November 21, 3:20 PM:
  - Michael's example: Start leaven through Turn 3 checked showed "7 of 23 steps checked", Up next "Turn 4" and only Feed starter Skipped, the same after a reload. Checking Feed starter then gave 8 of 23, nothing Skipped, and Up next still Turn 4.
  - Every step through the cold proof, then Preheat: 18 of 23, Up next "Take both loaves out of the fridge" and nothing Skipped, the same after a reload. Checking "Bake covered" then skipped the fridge step, and Up next became "Remove lid".

## A big skip asks first, November 22, 2026: committed, pull request open

Michael's request: fix the mis-tap on the last step. Checking the last step on a fresh plan marked the 22 steps before it Skipped and showed "All batches done". Branch `confirm-big-skip`, from `main` at `2bd709e`.

Change:
- `skipsOnCheck` in `src/view/schedule.ts` works out which steps a check would newly mark Skipped, by applying the check to a copy of the planner. It asks first when more than three of them count.
  - Once the start of bulk is due by the live schedule, the start of bulk and the turns don't count: skipping them then is how a bake goes when the dough is ready early. So "Ready: preshape now", which only shows during bulk, never asks.
  - Before that, they count, so a tap on "Cut and preshape" the evening before asks.
  - Steps already skipped, and a same-time partner left open, never count.
- The Schedule tab runs every check through it: a timeline check box, the Up next card's Done button and "Ready: preshape now".
- When it asks, a dialog says "Skip N earlier steps?" and "Checking "<step>" marks N earlier steps as Skipped. You can still check them later." It has "Check and skip" and "Don't check it", with focus on "Don't check it".
  - The check is recorded at the tap, so what it skips is what the question counted.
  - Closing the dialog puts focus back on the step's check box.
- Unchecking never asks.
- docs/BEHAVIOUR.md records it as decision 8.

Tests, each failing before its change:
- `view/schedule.test.ts`:
  - The last step on a fresh plan asks, with 22 skips.
  - These don't ask:
    - The leaven checked with the feed forgotten skips just the feed.
    - In Michael's example, Turn 3 skips nothing new.
    - Preshape after Turn 1, once bulk has started, skips six turns.
    - The first check at Mix final dough skips three steps.
    - Preheat skips nothing while its partner stays open.
  - These ask:
    - The first check at Turn 1, before bulk is due, skips five steps.
    - The day before, at 3:20 PM, preshape would skip twelve steps.
  - With the feed checked, Turn 1 would skip the leaven, the autolyse, the mix and the start of bulk. It asks the day before, at 3:20 PM, and at 2:14 PM on bake day, but not from 2:15 PM, the start of bulk.
- Browser flows:
  - A tap on the last step of a fresh plan opens the dialog.
    - "Don't check it" leaves 0 of 23 checked, with Up next on Feed starter.
    - "Check and skip" gives 1 of 23 checked, 22 Skipped and "All batches done", the same after a reload.
    - Focus is back on the check box after either.
    - It failed before the change, finding no dialog. Its first run after the change failed at the reload check, because it read the page while the dialog was still closing; it now waits for the dialog to close.
  - Cool dough at 60°F, preshape tapped at 5:45 PM on bake day and confirmed a minute later: the dialog says 11, and 11 steps are skipped. Recorded at the confirm, 12 were, because Turn 7 had come due.
  - The same bake drawn at 5:45:20 PM and tapped at 5:45:50, which rounds to 5:46: the dialog says 12, and 12 are skipped. Recorded at the screen's 30-second clock, 11 were; counted there too, the dialog said 11.

Evidence (this session, on `confirm-big-skip`, final code):
- `npm test` passed 133 of 133 with the host zone and with `BASELINE_ZONE=rule`.
- `npm run build` had 0 errors, 0 warnings and 0 hints with a clean format check.
- `npm run test:browser` passed 51 of 51 after the second check's fix, with no recorded screen changed.
- `npm run baseline:update` left the record unchanged.
- At 390 px wide, the dialog fits the screen (320 px, from 35 px) with focus on "Don't check it" and no console errors.
- Deliberate breaks at `3bc6ca2`, each caught and then restored, in a separate copy against the full unit and browser suites. Each browser failure is one of the two new flows:

| Break | Unit tests failing | Browser tests failing |
|---|---|---|
| It never asks | 2 | 2 |
| The start of bulk and the turns always count | 2 | 0 |
| The start of bulk and the turns never count (the first version) | 1 | 0 |
| The start of bulk counts even once it is due | 1 | 0 |
| Three steps are enough to ask | 2 | 0 |
| Steps already skipped count again | 1 | 0 |
| Bulk's planned start decides, not its live one | 1 | 0 |
| The tab never shows the question | 0 | 2 |
| "Check and skip" doesn't check | 0 | 2 |
| "Don't check it" checks anyway | 0 | 1 |
| The check is recorded at the confirm | 0 | 1 |
| Focus isn't returned to the check box | 0 | 1 |

Independent check (the verifier, on `879f679`): FAIL on five of nine criteria (1, 3, 5, 7 and 9), from four small defects.
- Passed:
  - The mis-tap fix in the built app, with the dialog, its cancel paths and the check box.
  - Normal use never asking, across 68,940 checks in 147 setups and in the browser.
  - Nothing else changing, the test commands, and the scope.
- Not met, each fixed in `3bc6ca2`:
  - Closing the dialog left focus on the page body, so the next Tab jumped to the top. Focus now goes back to the step's check box.
  - The count was worked out at the tap but the check recorded at the confirm, so with cool dough a turn could come due in between: 11 asked, 12 skipped. The check is now recorded at the tap.
  - One break survived: counting the start of bulk towards asking. With the new rule, the bulk-time test catches it.
  - Two HANDOFF claims were wrong. "Checking preshape with turns left never asks" was untrue on a fresh plan. The first break table's "2" browser failures for "Three steps are enough to ask" couldn't be reproduced: rerun with the failing tests named, it is 0, and the verifier also gets 0.
- It also found that turns never counting let a tap on "Cut and preshape" the evening before skip 11 steps without asking, and suggested excusing them only once bulk has started. They now count until the start of bulk is due.

Second check (the verifier, on `022d29d`): FAIL on two small items.
- Passed:
  - its four findings are fixed in the built app;
  - the bulk-time rule never asked in 81,522 realistic checks across 105 setups, and caught every big tap the day before;
  - the test commands, the record, the scope and the break table all reproduce.
- Not met: recording the check at the screen's 30-second clock instead of the tap passed every test, because the 60°F flow draws and taps in the same minute. A new flow draws at 5:45:20 and taps at 5:45:50; it fails under that break (11 skipped against 12 asked) and under counting at the screen's clock (11 asked against 12 expected).
- Not met: this section said the first check failed four of nine criteria; it was five, from four defects. Corrected, with two looser wordings it noted: the "flaky run" and "the evening before" for a 3:20 PM test.
- What Michael should know, from its notes:
  - Once bulk is due, a tap past preshape still skips quietly: "Basket rest" at the start of bulk skips 10 steps, all turns and shaping, without asking.
  - Whether a tap asks depends on the clock while the start of bulk is unchecked.
  - A two-batch bake with the 30-minute reheat and only its bake steps checked asks "Skip 5" at Batch 2.

## Only Preuss House and Original Tartine, November 22, 2026: committed, pull request open

Michael's request: remove the four-flour, five-flour, Red Spring & Rye and White & Whole Wheat recipes, so only Preuss House and Tartine are available. Branch `remove-four-recipes`, from `confirm-big-skip`.

Change:
- `src/domain/recipes.ts` keeps Preuss House and Original Tartine. Things only the removed recipes used went with them:
  - the red spring, all-purpose and Red Fife flours;
  - the `houseCompletion` flag, with its line "Uses the House leaven, salt and overnight method." on the Ingredients tab and its style;
  - the per-kilo helper.
- Saved data needs no new code. The loader already reads only recipes it knows and falls back to the first recipe on the menu:
  - A save whose selected recipe was removed opens on Preuss House.
  - House and Tartine keep their settings and checklists.
  - The removed recipes' data is dropped at the next save. A version 5 save is never written, so its copy stays as it was.
- docs/BEHAVIOUR.md records it as decision 9 and marks decision 2, Red Spring & Rye's cold-proof wording, superseded. Its record counts, and the README's, are updated. The README and BEHAVIOUR.md had said 16 browser actions since step 0; there are now 29.

Tests:
- New, each failing before the change:
  - The menu is exactly Preuss House then Original Tartine, and the four ids find nothing.
  - A version 6 save with Red Spring & Rye selected, and a version 5 save with Five-Flour selected, open on Preuss House with House and Tartine only. Tartine keeps its settings and checklist.
  - A browser flow opens the recipe menu and finds exactly the two options.
- Tests that covered only a removed recipe are gone:
  - Red Spring & Rye as the spreadsheet's main calculator;
  - White & Whole Wheat and the two blends' weights and stages;
  - Red Spring & Rye's own red spring parts on load.
- Tests that used a removed recipe as an example now use Preuss House or Tartine:
  - The schedule tests moved from Red Spring & Rye to Preuss House with every expected time unchanged; the two schedule the same.
  - The floating-point case Red Spring & Rye covered, 311.99999999999994 g made against 312 g used, is kept by Preuss House set to its numbers. A direct check confirmed the noise reproduces.
  - "Every setting changes the weights" and "no flour, no weights" now use House and Tartine. The note test now changes House's flours.
- The load fuzz test still names the removed recipes, because old saves can hold them.

Record changes:
- `baseline.json`: the 80 random bakes were drawn from all six recipes with a seeded generator. Drawing from two would change every later bake, so the remaining ones are now kept exactly as recorded, like the saved-data cases. The generator is in git history.
- A script compared the old and new records:
  - 94 plans and 19 recipe calculations left, exactly those for the removed recipes.
  - The other 120 plans, 26 calculations and 53 helper results are identical, in the same order.
  - All 24 saved-data cases changed: each lists the recipes, and the four are gone. Two cases also changed recipe:
    - "an edited plan" had Five-Flour selected and now opens on Preuss House, with its schedule.
    - "an odd recipe order", whose menu held only Four-Flour, now opens on Preuss House with House alone on the menu. That is the loader's existing rule for such a save.
  - A second `npm run baseline:update` left the record unchanged.
- The browser record: the eight screens of the removed recipes, with their 32 snapshot files, are deleted.
