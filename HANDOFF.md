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
