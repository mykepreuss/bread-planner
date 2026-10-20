# Source calculator review

Reviewed October 19, 2026. Source: [Bread Calculator, 2 Days](https://docs.google.com/spreadsheets/d/1u79izhQ5-9m9P5Ijh1cvMjSCSBsgyWlM1o-bBtaNwi0/edit?gid=614795420#gid=614795420). App source: main at 3497fb7e7ec061b6043a04b032d9b4930d29b385.

## Scope and evidence

Read-only review of the complete workbook and comparison with the existing app and accumulated user decisions. No source-sheet cells, application code, recipe quantities, or deployments changed. Live recipe selection and view were restored to Preuss House / Schedule after inspection.

The Drive connector returned 403. Downloaded a fresh Excel export through the user's signed-in Google Sheets UI. The export contains one visible sheet, `2 Days`, with content through row 35, 60 numeric/time inputs, and 59 formulas. Inspected all populated cells and exported formulas, including the shared formulas expanded by the reader. Remaining rows through 1013 contain no values/formulas. No hidden sheets/rows, named ranges, data validation, conditional formatting, charts, cell notes, or tables were found in the export. The live All comments / All types / All sheets panel showed Start a discussion with no threads.

Export SHA256: `7ddc0ca34b1d0919e3673bbd7c0c5b7bda8807525c1556b74059bd8162a93da9`.

Independently evaluated all 59 formulas from their input values with a restricted arithmetic parser, including SUM and spreadsheet-style ROUND. All matched the exported Google Sheets cached results within 1e-8. Compared all 60 inputs and 59 outputs against the retained legacy model: 119 checks passed. Ran `TZ=America/Vancouver npm test`: 60 passed, zero failed. This establishes source/default parity and the tested scenarios, not exact equality between the new recipe engine and the old sheet for every possible edit. No live source inputs were temporarily edited, so this review does not claim fresh native-Sheets input-change testing.

Ignored evidence: `artifacts/source-review.json`, containing input/formula/value maps, comparison checks and current recipe outputs. Google export does not establish Sheets-only permissions, version history or scripts; those were outside this calculator review.

## Workbook map and editable inputs

| Block | Inputs | Meaning |
| --- | --- | --- |
| Schedule A:C | B4; C2, C4, C6, C9:C17, C19:C20, C22:C25, C28:C30 | One time anchor plus 21 durations. Seven turn intervals are individually editable. |
| Dough E:G | F17:F20, F23:F24 | Bread flour, whole wheat, water and salt percentages; target loaf weight and count. Six inputs. |
| Leaven I:K | J17, J19:J22 | Build base relative to bread flour, seed fraction, two flour fractions and water fraction. Five inputs. |
| Red spring / rye manual recipe I:J | J2:J8 | Seven ingredient weights, independent of main calculator. |
| White / whole wheat manual recipe M:N | N2:N4, N6:N8 | Six ingredient weights. N5 is blank. |
| Flour blend Q:R | R2:R6, R11:R12 | Five flours and two water additions. Seven inputs. |
| Flour blend Q:S | S2:S6, S11:S12 | Same five flour slots and two water additions. Seven inputs, including zero Red Fife. |

There are five ingredient blocks, not five fully specified source recipes. The two far-right blends have no leaven, salt or mixing-stage instructions. The manual red spring / rye block is exactly the later supplied Preuss House formula.

## Main calculator mechanics

1. F22 sums flour, water and salt percentages. Default: 182.
2. F25 divides desired batch mass by F22 and rounds to one decimal. Default: 2000 / 182 becomes 11.
3. G17:G20 produce inclusive ingredient pools: 946 g bread flour, 154 g whole wheat, 880 g water, 22 g salt.
4. Leaven build base is 15% of G17 only, not total flour. Seed / bread flour / whole wheat / water are independently rounded to 28 / 71 / 71 / 142 g. Build total: 312 g.
5. H29:H33 deduct build flour and water from those pools. Seed is assumed half bread flour and half water. All 312 g leaven enters the dough. Remaining additions: 861 g bread-flour pool, 83 g whole wheat, 724 g water, 22 g salt, 312 g leaven.
6. The staged recipe turns 88% of H29 into red spring flour and 12% into rye. Water splits 90% / 10%, with each stage rounded separately. This creates a rye ingredient from the remaining bread-flour pool; it is not a separate rye percentage input.
7. Result: autolyse 758 / 83 / 652 g; final rye / leaven / salt / water 103 / 312 / 22 / 72 g. Total 2002 g despite a 2000 g target.

The initial 86/14 flour controls are inclusive pools before leaven deduction and the later rye substitution. They are not the final added-flour blend of 80.2966% red spring, 8.7924% whole wheat and 10.9110% rye.

Hydration definitions differ inside the source. F11 simply repeats F19, giving 80%. At the default, the 100%-hydration build contributes 156 g flour and 156 g water: (724 + 156) / (944 + 156) = 80%. J11 and N11 instead divide added water by added flour, excluding leaven. On that latter convention, the main staged recipe is 724 / 944 = 76.694915%. This is a definition change in the app, not lost water.

Changing build proportions away from a balanced flour/water build does not update F11's definition or the assumption that seed is half bread flour and half water. The sheet has no validation preventing zero denominators, inconsistent percentages or negative remaining additions. No cached formula errors exist at the current defaults.

## Recipes and consolidation

| Source block | App recipe | Source flour / water / leaven / salt, g | Dough, g | Added hydration |
| --- | --- | --- | ---: | ---: |
| J2:J8 | Preuss House | 1000 / 780 / 200 / 20 | 2000 | 78% |
| N2:N8 | White & Whole Wheat | 1000 / 800 / 200 / 20 | 2020 | 80% |
| F2:F8 main | Red Spring & Rye | 944 / 724 / 312 / 22 | 2002 | 76.694915% |
| R2:R12 | Five-Flour Sourdough | 1000 / 800; completed with 200 leaven + 20 salt | 2020 | 80% |
| S2:S12 | Four-Flour Sourdough | 1500 / 1200; completed with 300 leaven + 30 salt | 3030 | 80% |
| Recipe supplied in chat | Original Tartine | 1000 / 750 / 200 / 20 | 1970 | 75% |

The main recipe is not a hydration-only House duplicate: it also differs in flour proportions, leaven percentage and salt percentage. White & Whole Wheat has an 80/20 white/whole-wheat blend, distinct from Tartine's 90/10. Five-Flour has AP/red spring/Red Fife/whole wheat/rye at 35/35/10/10/10. Four-Flour has 500/600/0/250/150 g. The two blends are therefore distinct. Completing both with House leaven, salt and overnight method was explicitly authorized. Consolidating the manual red/rye duplicate into House was also authorized.

House exact stages: 800 g red spring + 100 g whole wheat + 680 g water for autolyse, then 100 g rye + 200 g leaven + 20 g salt + 100 g water. House build is 312 g, with 112 g retained after using 200 g. The original sheet's main block uses its entire 312 g build instead. Original Tartine's 415 g build includes a 15 g estimate for the supplied recipe's tablespoon of starter, of which 200 g is used; that seed weight is an app planning assumption.

## Scheduling

Source anchor B4 is 09:00. Feed starter is 11 hours earlier, at 22:00 the prior day. Leaven ferments five hours; autolyse starts at 09:30 and overlaps for four hours 30 minutes. Final mix is 14:00, not 18:30. Seven turns occur 14:45 through 17:45. Preshape 18:15, bench rest 18:20, final shape 18:50, second rest 18:55, basket rest 19:00, refrigerator 19:15. Cold proof is 12 hours 30 minutes. Next-day warm-up/preheat 07:45, covered bake 08:45, uncover 09:05, finished 09:28, minimum cooling milestone 09:43.

Source temperatures: preheat 540 F, bake covered/uncovered 460 F. These differ from the separately supplied original Tartine recipe's 500 F preheat / 450 F bake and remain separated by preset. The source's 'turn up to 460F' uncovered label does not actually change temperature from the preceding 460 F covered step.

The source models one baking cycle irrespective of loaf count, has times without calendar dates, and has no quiet-hour handling. The app adds dates, forward/backward planning through the last oven batch, capacity (default two), per-batch reheating/handling/cooling, overnight display, required-action quiet-hour alerts and readiness instructions. Default House timing preserves the source schedule when both loaves fit together. Passive overnight proof does not trigger the quiet-hour alert.

## Intentional departures in the current app

- Unified added-water / added-flour hydration convention, excluding leaven.
- Exact proportional scaling, normalized flour parts, and explicit leaven-used percentage. At default the main profile preserves 2002 g and all seven staged weights, with two 1001 g loaves. It does not keep the old rounding algorithm for future edits. Example: source F23=750 gives 1493 g after intermediate rounding; current Red Spring & Rye set to two 750 g loaves gives 1500 g.
- Build quantities are grams per 1000 g added flour. Editing the build changes made/reserved/shortfall, while editing leaven-used percentage changes the dough. Original J17 was relative to bread flour only and its whole build was used.
- Timing controls were removed at the user's request. The old duration data and functions remain in the retained legacy model, but the current UI does not expose all 60 original source inputs one for one.
- Separate presets, source-free product wording, simplified tabs, bigger typography, percentage sliders plus exact entry, and absence of transfer/backup features follow explicit requests.

## Findings and recommendations

### Confirmed app defect: false zero-gram leaven shortfall

At default Red Spring & Rye, the current recipe engine produces made=311.99999999999994 g versus used=312 g. `calculateRecipe` returns a positive shortfall of about 5.68e-14 g. App.tsx tests `shortfall > 0` and rounds it for display, producing 'Make 0 g more leaven before mixing.' The live public Recipe view reproduces this at unchanged defaults, including a second warning in the expanded build panel despite Made 312 g / Used 312 g / Reserved 0 g. Source: src/lib/recipes.ts:80-81 and src/App.tsx:57-58,105. Recommend normalizing arithmetic noise before reserve/shortfall comparison, retaining warnings for real deficits. Current 60 tests pass but do not cover this false warning.

### Confirmed wording gap after timing controls were removed

The schedule still says to 'extend the leaven time' and 'adjust bulk time', while Tartine's warm-up note calls its duration editable and the sidebar says warm-up defaults to an allowance users should adjust. No duration editor remains. Recommend describing these as estimates and making readiness guidance clear about the schedule not automatically moving when fermentation runs late. Do not restore the removed timing editor without a new product decision.

### Clarification opportunity: build basis and flour identity

Build controls are correctly labelled per 1000 g added flour, but they show a different basis from the immediately following actual batch quantities. Default Red Spring & Rye shows 29.661 / 75.212 / 75.212 / 150.424 g in controls and 28 / 71 / 71 / 142 g in actual weights. Consider clearer separation of formula basis from weighing instructions. All non-Tartine build flour labels currently say red spring, including White & Whole Wheat. The source labels that build flour generically as bread flour and does not specify independent builds for manual recipes; this is an app assumption to make explicit if flour identity matters. No evidence establishes that the source intended red spring in every leaven.

No recipe block is missing. No source formula failure was found at current inputs. The app preserves original default quantities while intentionally changing several editing semantics. Review complete; application fixes remain proposals, with no code change or deployment performed.

## Authorized follow-up: total hydration

The user confirmed that the spreadsheet is the cooking reference and authorized total hydration as the main figure and slider, with no recipe-quantity changes, followed by deployment. The implementation keeps v5 added-water parameters unchanged and converts the displayed/editable percentage using the composition of the leaven used. Default House and Red Spring & Rye become 80%, White & Whole Wheat and both completed blends 81.8%, and the separate Tartine reference 77.3%. Build reserve does not enter the dough's hydration. Mature starter is treated as equal flour and water; empty builds use that assumption until specified.

The user's zero-shortfall fix, loaf wording and stable edited-recipe listings are preserved. Remaining instructions implying an available duration editor were corrected. The schedule is explicitly an estimate that does not shift automatically when dough needs more time. All 67 tests pass, including quantity preservation, saved-state round trip, slider conversion, custom leaven hydration and real versus arithmetic-noise deficits. See HANDOFF.md for release status; the original findings above document the reviewed revision.
