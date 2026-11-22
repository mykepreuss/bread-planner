# How Bread Planner behaves

This is the contract for the rebuild: what the app does today, at commit `34699a7`, written from the code and checked against the recorded outputs. The rebuild must keep all of it unless Michael decides otherwise. The decisions waiting on him are at the end.

Two records back it up. `npm test` checks the code against `tests/baseline/baseline.json` (214 plans, 45 recipe calculations, 24 kinds of saved data). `npm run test:browser` checks the built site against 22 recorded screens at phone and desktop width and 15 recorded actions.

## Recipes

The recipe menu lists six recipes, in this order. Each keeps its own settings and checklist.

| Recipe | Method | Flour parts | Loaves | Total hydration shown |
| --- | --- | --- | --- | --- |
| Preuss House (the default) | House | Anita's all-purpose 80, whole wheat 10, rye 10 | 2 × 1,000 g | 80% |
| Original Tartine | Tartine | white-bread 90, whole wheat 10 | 2 × 985 g | 77% |
| White & Whole Wheat | House | white-bread 80, whole wheat 20 | 2 × 1,010 g | 82% |
| Red Spring & Rye | House, except the cold proof's wording | red spring 80.3, whole wheat 8.8, rye 10.9 | 2 × 1,001 g | 80% |
| Five-Flour Sourdough | House | all-purpose 35, red spring 35, Red Fife 10, whole wheat 10, rye 10 | 2 × 1,010 g | 82% |
| Four-Flour Sourdough | House | all-purpose 33.3, red spring 40, Red Fife 0, whole wheat 16.7, rye 10 | 3 × 1,010 g | 82% |

Rye is added at the final mix in every recipe that has it. Five-Flour and Four-Flour say "Uses the House leaven, salt and overnight method."

## Ingredients

Each recipe stores: loaf count and weight, added hydration, leaven used and salt (each a percentage of added flour), the share of water held back for the final mix, the flour parts, and a leaven build in grams per 1,000 g of added flour (mature starter, flour, whole wheat, water).

- **Weights.** Total dough is loaves × weight. Added flour is total ÷ (1 + (hydration + leaven + salt) ÷ 100). Water, leaven used and salt follow from their percentages. Each flour gets its share of the parts. A flour with 0 parts is listed as "Optional · not used" and left out of the mixing lists.
- **Mixing stages.** House method: the autolyse gets the early flours and the water not held back, and the final mix gets rye, leaven used, salt and the held-back water. Tartine: the initial mix gets leaven used, the flours and the first water, and the second addition gets salt and the remaining water. At the defaults these are exactly House 800/100/680 g then 100/200/20/100 g, and Tartine 200/900/100/700 g then 20/50 g.
- **Leaven.** The build is scaled by added flour ÷ 1,000. The app shows Made, Used in dough, and Reserved or Short by. A deficit under a millionth of a gram counts as none. A real deficit shows "Make N g more leaven before mixing."
- **Total hydration** counts the flour and water in the leaven used. Mature starter is taken as half flour and half water; an empty build is taken as 100% hydration. The field shows a whole number, and typing a value sets the added hydration that gives it, so the dough weight stays the same. Its lowest accepted value is the total hydration with no added water.
- **Controls.** Hydration, leaven, salt and water held back have both a slider and a number field. The sliders run 50–100%, 0–50%, 0–5% and 0–100%, and widen to show a value typed outside that range. An invalid entry shows its allowed range and reverts when you leave the field. Loaf count must be a whole number of 1 or more.
- **Tartine only:** rice flour for the baskets, 20% of added flour.
- "Restore recipe defaults" resets the selected recipe's settings and checklist after a confirmation. Other recipes, the dates and the oven settings are kept.

## Schedule

Times below are for a 9:00 AM leaven start with two loaves baked together. Durations are fixed; there is no editor.

**House method:** feed starter at 10:00 PM the evening before, start leaven 9:00, start autolyse 9:30, final mix 2:00 PM, start bulk 2:15, seven turns every 30 minutes from 2:45, preshape 6:15 (10 min), bench rest 6:25, final shape 6:55, basket rest 7:00, cold proof 7:20 PM for 12 h 30 min. Next morning: take the loaves out and preheat to 540°F at 7:50, bake covered at 460°F 8:50, remove lid 9:10, out 9:33, 15-minute cooling mark 9:48.

**Tartine:** make leaven 9:00 AM, mix and rest 9:00 PM, salt, final water and start of warm bulk 9:30, five turns from 10:00, divide and preshape 12:30 AM (5 min), bench rest 12:35, final shape 1:05, then either refrigerate 1:10 for 12 h and warm 1 h, or a warm proof of 3 h 30 min. Preheat to 500°F 30 minutes before the bake, and bake at 450°F, 20 minutes covered and 20 uncovered.

- **Turn wording.** House-method turns 1–3 say to go around all four sides twice, vigorously; turns 4–7 are one round. Tartine keeps the book's wording.
- **Step notes** name the selected recipe's ingredients and grams: the leaven build and what is kept, the autolyse, and the final mix. Every step has a note. "Keep later batches chilled until their own warm-up" appears only with more than one batch.
- **Batches.** Loaves baked at once is 1 or 2. With more loaves than that, later batches each get a reheat (30 minutes by default, editable once there is more than one batch) and, unless Tartine's proof is warm, their own warm-up. Titles then name the batch and its loaves. One loaf, or two baked together, drop batch numbers ("Bake covered (both loaves)", "Remove lid").
- **Plan around** the leaven start or "All loaves out of the oven" (the last batch). Switching converts the date and time so every step stays where it was.
- **Cold proof.** For House-method recipes, the oven card shows the cold proof's start, end and length, marked as an overnight cold ferment or a daytime proof. A daytime one adds a notice above the steps and renames the step "Cold proof (daytime)". Red Spring & Rye keeps its own name, "Refrigerated final proof", in both cases, as Tartine does.
- **Quiet hours** run from after 10:30 PM until 7:00 AM. Hands-on steps that start then are listed in a warning with a badge on each step. Mixing and shaping that run past the cutoff are listed too. Passive steps are not: the start of bulk and the cooling mark. Checked and skipped steps drop off the list.
- **Timeline.** Steps are grouped by day ("Day 1 Saturday, Nov 21") and listed in the plan's order, which is time order until bake day. Check-offs and the dough temperature move steps but never reorder them, so a step can then show a later time than the one below it (a turn checked at 7:15 PM above a preshape still planned for 6:15). Between steps, a label gives the time to the next step. The cold proof is coloured Fridge blue. The preheat, each reheat, the bakes and each batch out of the oven are Crust brown. Everything else is neutral, including later batches' warm-ups and the cooling marks. The header gives the total time and "N of M steps checked".
- **No schedule** for an impossible date or time, a time skipped by daylight saving, a loaf count that is not a whole number of 1 or more, or a blend with no flour. Elapsed times stay correct across daylight-saving changes.
- **Method guide.** Below the tabs, three closed sections give fixed guidance: mature starter and readiness, establishing a starter from scratch, and shaping, baskets and baking. Every recipe except Tartine adds a paragraph on the House method's autolyse and vigorous early turns.

## Bake day

- **Checking a step** records the time, rounded to the minute. Its "Done at" date and time fields can be corrected; an incomplete entry is ignored. Unchecking removes the time.
- **The plan follows the dough.** A checked step that moves the plan sets how far behind or ahead the plan runs, and every unchecked step after it moves by that amount. The latest such step decides. The starter feed, the autolyse and the turns record their time but move nothing: turns stay on their 30-minute marks from the start of bulk. The Up next card says "Running N behind plan" or "ahead of plan".
- **Skipped.** The start of bulk and any turn left unchecked before a later checked step are marked Skipped. They no longer count as Up next or quiet-hour work.
- **Up next** is the first step not checked or skipped. It shows a countdown, refreshed every 30 seconds and whenever the page comes back into view, plus the note, the readiness cue, a Done button and the step after it. It is hidden once the plan has ended.
- **Ended.** A plan has ended when its last batch is out in the past and either nothing is checked or every step is checked or skipped. It then says "This plan ended …" with "Plan the next bake", which moves the date to tomorrow and keeps every setting.
- **Dough temperature.** Up next shows "Dough temperature after mixing" while the next step is the start of bulk, a turn or preshape. Once a value is in, turns and preshape show "Dough temperature now" with an Update button instead. Each reading is listed under "Start bulk fermentation" with a remove button. A reading in the same minute replaces the earlier one. Readings can be in °F or °C (stored in °F, 50–100°F).
- **Bulk estimate.** The planned bulk counts as dough at 78°F, and time doubles for every 15°F cooler and halves for every 15°F warmer. The reading after mixing applies from the start of bulk, and each later reading from when it was taken, so a new reading re-times only what is left. Readings from before this bake's final mix are ignored; one between the final mix and the start of bulk counts from the start.
- **The estimate moves the plan.** Preshape moves to the estimated end of bulk, never before the latest checked turn, and every later step keeps its spacing. Turns stay on 30-minute marks. A turn due less than 15 minutes before preshape is dropped. Cool dough gains at most two extra turns, and checked turns always stay. Once preshape or a later step is checked, the temperature moves nothing. The timeline then shows the turns that were due before preshape was done, plus any checked ones, and the note says how long bulk took against the estimate.
- **Advice.** The note gives the estimated length and ready time, and says to start checking 30 minutes earlier. Within 15 minutes of the plan it says so and stops there. Further off, it says which way the plan moved and how many turns it now has, adds "keep folding every 30 minutes" for cool dough (capped at one more hour), and names the steady temperature that would preshape at the original time, if that is between 68°F and 86°F.
- **Dough check.** From 30 minutes before the estimated end of bulk, or before preshape if no temperature was entered, a turn's Up next card leads with "Check the dough before this turn" and "Ready: preshape now", which checks preshape.
- **Clearing.** "Clear checklist" clears the selected recipe's checks, times and dough temperatures. "Plan the next bake", or a new date or time while nothing is checked, clears the dough temperatures.
- **Phone layout.** At 850 px and below, once a step is checked and the plan has not ended, the step list moves above the batch and oven cards.
- When every step is checked or skipped, the timeline ends with "All batches done. Enjoy your bread."

## Saved data

- Everything is saved in the browser under `bread-planner.v5` on every change, as `{version: 5, plan}`. Each recipe keeps its own settings, checklist, check-off times, dough temperature and readings. The selected recipe, date, time, plan-around choice, Tartine proof, loaves at once, reheat time and temperature unit are shared.
- Not saved: the open tab and the open sections. A reload opens the Schedule tab with every section closed.
- On loading, a value that is missing or invalid falls back to its default:
  - Settings must be finite numbers of 0 or more. Loaf count and weight must be at least 1, the loaf count whole, and the water held back at most 100%. Unknown settings are dropped.
  - Check-off times are kept only for checked steps. Readings outside 50–100°F are dropped, and readings sort by time.
  - The recipe order keeps known recipes once each, or becomes just Preuss House if empty. The selected recipe must be in the order; otherwise the first recipe is selected.
  - Loaves at once is capped at 2.
  - A House blend saved with red spring flour carries its parts over to Anita's. A preshape saved as 5 minutes, the default before November 12, becomes 10.
  - A save of any other version starts fresh, except versions 1 to 4, which are upgraded today; that upgrade is not carried into the rebuild (see below).

## Not carried into the rebuild

No saved data on this site can reach these, because every version of the app here has saved version 5:

- the hidden "Red Spring & Rye Variation" recipe, which is listed only once old spreadsheet cells are edited;
- upgrades from saved versions 1 to 4;
- the spreadsheet cells and durations stored inside each save, which never change from their defaults.

## Decisions for Michael

The rebuild keeps each of these as it is unless you choose otherwise.

1. **Next bake after a finished one.** On a plan with every step checked, "Plan the next bake" moves the date to tomorrow but keeps the checklist, so the plan still shows as ended. The browser record includes this flow.
2. **Cold proof name.** Red Spring & Rye calls its cold proof "Refrigerated final proof" and leaves "overnight" out of its note; the other House-method recipes say "Overnight cold proof". That wording is the only difference between its method and House.
3. **Checklists per recipe.** Each recipe keeps its own checklist and temperatures, while the date and time are shared.
4. **A corrupt saved date** falls back to the date the save was first created. The rebuild would use tomorrow instead, as for a new plan.
5. **38°C is accepted, then lost.** The °C field accepts 10–38°C, but saved temperatures must be 50–100°F, and 38°C is 100.4°F. A 38°C reading works until the page reloads, then disappears. The fix would be to accept up to 37.7°C. This is a defect in the current app, so the rebuild keeps it until you decide.
