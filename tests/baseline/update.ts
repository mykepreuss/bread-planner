/**
 * Rewrites baseline.json from the current code. Run it only to record a deliberate change in behaviour, and review the
 * diff before committing it: `npm run baseline:update`. The saved-data inputs, and the saved plans the browser tests
 * open (tests/browser/saved-plans.json), are version 5 saves kept as they are; see cases.ts and saved-plans.ts.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { cases } from './cases.ts';
import { encode, observers } from './format.ts';
import { useBaselineTimeZone } from './observe.ts';

useBaselineTimeZone();
const all = cases(),
  git = (command: string) => execSync(command).toString().trim();
// The app code the record was taken from: the last commit that changed src/, flagged when src/ has uncommitted changes.
const source = `src/ as in commit ${git('git log -1 --first-parent --format=%h -- src')}${git('git status --porcelain -- src') ? ', with uncommitted changes' : ''}`;
// Inputs go through JSON first, so each output is computed from exactly the input the file stores.
const run = <I>(rows: { name: string; input: I }[], observe: (input: I) => unknown) =>
  rows.map(({ name, input }) => {
    const stored = JSON.parse(JSON.stringify(input ?? null));
    return { name, input: stored, output: observe(stored) };
  });
const json = encode({
  about:
    'What Bread Planner shows for each input, recorded from the code before the rebuild and reproduced by every step since. Step 3c left out the hidden manual-rye recipe, which the rebuild does not carry, from the saved-data results. tests/baseline/baseline.test.ts checks the current code against it.',
  recordedFrom: source,
  plans: run(all.plans, observers.plans) as never,
  formulas: run(all.formulas, observers.formulas) as never,
  restores: run(all.restores, observers.restores) as never,
  helpers: run(all.helpers, observers.helpers) as never,
});
// Keep the file as it is when only the recordedFrom line would change, so re-running the update is a no-op.
const file = new URL('./baseline.json', import.meta.url),
  outputs = (text: string) => text.replace(/^"recordedFrom": .*$/m, '');
const unchanged = existsSync(file) && outputs(readFileSync(file, 'utf8')) === outputs(json);
if (!unchanged) writeFileSync(file, json);
console.log(
  `baseline.json${unchanged ? ' (unchanged)' : ''}: ${all.plans.length} plans, ${all.formulas.length} formulas, ${all.restores.length} saved-data cases, ${all.helpers.length} helpers, ${(json.length / 1024).toFixed(0)} KB`,
);
