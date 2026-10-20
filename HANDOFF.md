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
