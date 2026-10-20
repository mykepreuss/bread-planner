# Bread Planner migration

Authorized outcome: rebuild the existing Bread Planner with Astro, publish on Vercel and connect bread.assemblydigital.com through Cloudflare. Public app, browser-local settings. No backend or account system required.

Source: Sites commit e3f364a8f2459c50c980ddb55970d191997f9dba. Exact recipes, legacy migrations, timing/readiness cues, all-loaf scheduling, quiet-hours warnings and synchronized percentage controls retained. Prior receipts and design decisions are archived in docs/SITES_HISTORY.md. Current implementation uses Astro static pages and a React calculator island, preserving shadcn and TanStack.

Acceptance: model/migration/backup tests; Astro typecheck/build; independent browser-local profiles and persistence; backup transfer from the old origin; desktop/phone checks; Vercel READY bound to a source commit; Cloudflare exact DNS-only bread CNAME; authoritative/public DNS and valid HTTPS for the final hostname. All remain pending for this release.

Authority: requested Vercel production release and scoped bread DNS setup. Preserve unrelated zone records and the existing private Sites app. New standalone repository path /Users/mp/Code/mp-hq/bread-planner.

## Implementation checkpoint

Astro7.4.1 static shell with one React island is implemented. Existing60 tests plus five backup/import tests pass. Astro check passes with0 errors/0 warnings and seven pre-existing hints. Production build passed locally and on Vercel Node24. shadcn's standalone Tailwind variant stylesheet is vendored with its MIT license so the authoring CLI is not installed in the deployed app. Pinned React integration7.0.0 with compatible Vite React plugin6.1.1 and cookie2.0.1 resolves two dependency-resolution failures found during the first builds. npm audit now reports0 vulnerabilities.

Private GitHub source: https://github.com/mykepreuss/bread-planner. Initial source commit98aa00d01815c03e5e93dbdcde884982f1ac8e33. Vercel projectprj_oaBadxUrg76MQyvwFsY68FvfuM8r, teamteam_U2Fu7jNsQEgGylxpq9YR7M2f (mpmba), Git connected. Initial production deploymentdpl_7MjaQ9rLhQyRSjG49gkSy6pFDdks is READY. Public verification alias https://bread-planner-blue.vercel.app. Deployed .env files are excluded by .vercelignore; local Vercel CLI auth files remain ignored.

Native Vercel MCP returned a stale/incomplete project list and404 for the verified existing puppy-club project. The authenticated CLI verified MP/puppy-club and was used as the documented fallback for this release. Cloudflare browser CDP attachment timed out twice; native Chrome controls accessed the already signed-in DNS dashboard. Confirmed no bread record existed, then added only CNAME bread →5f91c9b5d5ea5e2b.vercel-dns-017.com, DNS only, Auto TTL, using Vercel's project-specific recommendation. Final DNS/TLS/browser checks remain.

Live preview acceptance: House loads2000g/78%/two loaves/capacity2, proof19:15→next07:45, completion09:28. Hydration slider78→78.5 and count2→3 produced3000g and two oven batches. Count/hydration survived reload. Test values restored2/78 and checklist empty. No browser errors/warnings. Existing private Sites app retains its original UI; transfer utility deployed there from commit10855203e44afd21adf0b7242586fb704492c1d2, deploymentappgdep_6ad6fca0bb888191b06e8f23215c602e. Its /transfer.html downloads only known planner storage keys to a local JSON file and never changes/deletes source settings.

## Scope correction from user

The app has never been in production and needs no migration or transfer features. Removed the new Saved bakes controls, backup/import modules and related five tests. Closing the transfer tab and removing the temporary utility from the old Sites app. Release starts fresh with the established recipe presets and existing browser-local editing. Existing model/import hardening only filters unrecognized recipe IDs; no recipe math changes. Original60 checks are the required suite.

Cloudflare record is saved. Authoritative DNS plus1.1.1.1 and8.8.8.8 return the exact Vercel CNAME. Vercel domain verification reports configured-correctly. HTTPS first failed during initial certificate provisioning and then returned200 with successful TLS verification. Final UI and release verification follow the feature removal.

Post-correction local acceptance: original60 test suite and Astro production build passed. No backup/import/transfer modules or controls remain in this source. Static HTTPS verification on bread.assemblydigital.com passes: Astro page, metadata/security headers, all10 assets referenced by the deployed asset graph (including JS imports and fonts),404 behavior and an intentional missing-asset negative fixture. Initial verifier incorrectly assumed local and remote build filenames would be identical; Vercel's CSS filename differed, so that criterion was invalid. The corrected verifier follows the actual deployed graph and records live asset hashes rather than claiming local/remote byte identity.
