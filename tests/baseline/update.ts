/**
 * Rewrites baseline.json, and the saved plans the browser tests open, from the current code. Run only to record a deliberate change in behaviour, and review the
 * diff before committing it: `npm run baseline:update`.
 */
import {writeFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {cases} from './cases.ts';
import {encode,observers} from './format.ts';
import {useBaselineTimeZone} from './observe.ts';
import {savedPlans} from '../browser/saved-plans.ts';

useBaselineTimeZone();
const all=cases(),commit=execSync('git rev-parse --short HEAD').toString().trim();
// Inputs go through JSON first, so each output is computed from exactly the input the file stores.
const run=<I>(rows:{name:string;input:I}[],observe:(input:I)=>unknown)=>rows.map(({name,input})=>{const stored=JSON.parse(JSON.stringify(input??null));return {name,input:stored,output:observe(stored)};});
const json=encode({
  about:'What Bread Planner shows for each input, recorded from the code before the rebuild. tests/baseline/baseline.test.ts checks the current code against it.',
  recordedFrom:`commit ${commit}`,
  plans:run(all.plans,observers.plans) as never,
  formulas:run(all.formulas,observers.formulas) as never,
  restores:run(all.restores,observers.restores) as never,
  helpers:run(all.helpers,observers.helpers) as never,
});
writeFileSync(new URL('./baseline.json',import.meta.url),json);
const saved=savedPlans();
writeFileSync(new URL('../browser/saved-plans.json',import.meta.url),`[\n${saved.map(p=>`  ${JSON.stringify(p)}`).join(',\n')}\n]\n`);
console.log(`baseline.json: ${all.plans.length} plans, ${all.formulas.length} formulas, ${all.restores.length} saved-data cases, ${all.helpers.length} helpers, ${(json.length/1024).toFixed(0)} KB; saved-plans.json: ${saved.length} saved plans`);
