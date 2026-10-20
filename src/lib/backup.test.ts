import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanner} from './recipes.ts';
import {defaults} from './model.ts';
import {makeBackup,readBackup,MAX_BACKUP_BYTES} from './backup.ts';

test('backup round trip preserves edited recipes, checklist and shared schedule settings',()=>{
  const p=createPlanner();p.recipe='five-flour';p.recipes['five-flour'].params.hydration=79.25;p.recipes['five-flour'].done=['autolyse'];p.date='2026-10-25';p.time='08:30';p.ovenCapacity=1;
  assert.deepEqual(readBackup(makeBackup(p)),p);
});
test('the existing v5 storage envelope transfers directly between origins',()=>{
  const p=createPlanner();p.recipes.house.done=['feed'];assert.deepEqual(readBackup(JSON.stringify({version:5,plan:p})),p);
});
test('older stored plans migrate through the existing recipe importer',()=>{
  const p=defaults();p.recipe='custom';p.cells.F19=74;
  const r=readBackup(JSON.stringify({version:4,plan:p}));assert.equal(r.recipe,'red-rye');assert.equal(r.legacy.cells.F19,74);
});
test('invalid, unrelated, oversized and unsupported backups are rejected without creating defaults',()=>{
  for(const raw of ['null','{}','[]','broken',JSON.stringify({version:99,plan:{}}),JSON.stringify({format:'bread-planner',version:2,planner:{}}),JSON.stringify({version:5,plan:{recipes:{},order:[],recipe:'house'}})])assert.throws(()=>readBackup(raw));
  assert.throws(()=>readBackup(' '.repeat(MAX_BACKUP_BYTES+1)),/smaller than 1 MB/);
});
test('untrusted recipe identifiers are excluded during backup restoration',()=>{
  const p=createPlanner();p.order.push('__proto__','constructor');p.recipe='constructor';
  p.recipes.constructor={params:{},done:[]} as never;
  const restored=readBackup(makeBackup(p));assert.equal(restored.recipe,'house');assert.ok(!restored.order.includes('__proto__'));assert.ok(!restored.order.includes('constructor'));
});
