# Bread Planner migration

Authorized outcome: rebuild the existing Bread Planner with Astro, publish on Vercel and connect bread.assemblydigital.com through Cloudflare. Public app, browser-local settings. No backend or account system required.

Source: Sites commit e3f364a8f2459c50c980ddb55970d191997f9dba. Exact recipes, legacy migrations, timing/readiness cues, all-loaf scheduling, quiet-hours warnings and synchronized percentage controls retained. Prior receipts and design decisions are archived in docs/SITES_HISTORY.md. Current implementation uses Astro static pages and a React calculator island, preserving shadcn and TanStack.

Acceptance: model/migration/backup tests; Astro typecheck/build; independent browser-local profiles and persistence; backup transfer from the old origin; desktop/phone checks; Vercel READY bound to a source commit; Cloudflare exact DNS-only bread CNAME; authoritative/public DNS and valid HTTPS for the final hostname. All remain pending for this release.

Authority: requested Vercel production release and scoped bread DNS setup. Preserve unrelated zone records and the existing private Sites app. New standalone repository path /Users/mp/Code/mp-hq/bread-planner.
