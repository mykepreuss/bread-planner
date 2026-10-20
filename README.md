# Bread Planner

A browser-local sourdough planner at https://bread.assemblydigital.com, built with Astro, React, shadcn/Radix, TanStack Form and TanStack Table.

## Develop and verify

Use Node24 and npm.

```sh
npm ci
npm run dev
npm test
npm run build
```

Astro statically builds the page shell, metadata and404 page. The calculator is one React island because its recipe inputs, ingredient weights, schedule and checklists share live state. There is no server or database.

## Recipes and persistence

Preuss House is the default. Six distinct editable recipes retain independent settings and checklists. The calculation engine includes separate leaven made/used/reserved, staged ingredients, all-loaf forward/backward scheduling, overnight proof, readiness cues and quiet-hours checks. Percentages support both sliders and exact number entry.

Browser storage uses `bread-planner.v5`. Each browser starts with the default recipes and remembers edits locally. The first release starts fresh; no data transfer or account system is included.

The main hydration figure and slider show total water divided by total flour, including only the leaven used in the dough. Existing ingredient weights and stored v5 added-water percentages are preserved through a display/input conversion. Leaven composition follows its build, assuming equal flour and water in mature starter; an empty build assumes a 100% hydration leaven until specified.

## Deployment

Vercel project `bread-planner`, team `mpmba`, Node24. The build command runs tests and the checked Astro production build. The production branch is `main`. Cloudflare remains authoritative for `assemblydigital.com`; only the `bread` DNS record belongs to this project. Use Vercel's project-specific recommended CNAME, DNS only.

`HANDOFF.md` records current delivery state and verification. `docs/SITES_HISTORY.md` preserves the source calculator's decisions and prior acceptance evidence. The initial Astro migration derives from Sites commit `e3f364a8f2459c50c980ddb55970d191997f9dba`.

The configured shadcn styling and components are owned source. `src/styles/shadcn.css` is the unmodified Tailwind variant stylesheet from shadcn4.22.1, with its MIT license in `docs/licenses/`. The shadcn authoring CLI is not a runtime dependency. React integration7.0 and its compatible Vite React plugin6.1.1 are pinned together. Explicit cookie2.0.1 ensures Astro's prerendered module resolves its required API.
