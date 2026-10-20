import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults as legacyDefaults,restorePlan as restoreLegacy,schedule as legacySchedule,houseIngredients,bookIngredients,ingredients} from './model.ts';
import {createPlanner,restorePlanner,calculateRecipe,consolidate,recipeSignature,recipeSchedule,recipeDefaults,definitions,quietHourActions} from './recipes.ts';
const approx=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const plan=()=>{const p=createPlanner();p.date='2026-10-21';p.time='09:00';return p;};
test('one dropdown contains six distinct recipes and the House duplicate is removed',()=>{
  const p=plan();assert.deepEqual(p.order,['house','tartine','white-wheat','red-rye','five-flour','four-flour']);assert.equal(p.recipe,'house');
  assert.equal(new Set(p.order.map(id=>recipeSignature(id,p.recipes[id]))).size,p.order.length);
  assert.equal(recipeSignature('house',p.recipes.house),recipeSignature('manual-rye',p.recipes['manual-rye']));
});
test('deduplication ignores hydration and batch size but preserves different flour/leaven/salt/method',()=>{
  const p=plan(),r=p.recipes['manual-rye'];r.params.hydration=85;r.params.reserve=20;r.params.count=4;r.params.weight=750;
  assert.deepEqual(consolidate(p.recipes,['house','manual-rye']).order,['house']);
  r.params.leaven=30;assert.equal(consolidate(p.recipes,['house','manual-rye']).order.length,2);
  r.params.leaven=20;r.params.flour_wheat=20;assert.equal(consolidate(p.recipes,['house','manual-rye']).order.length,2);
});
test('base House stages, hydration and leaven reserve match the supplied recipe exactly',()=>{
  const p=plan(),r=calculateRecipe(p)!;assert.equal(r.total,2000);approx(r.flour,1000);approx(r.water,780);approx(r.used,200);approx(r.salt,20);approx(r.made,312);approx(r.reserve,112);
  assert.deepEqual(r.initial.map(x=>x[0]),['Red spring flour','Whole-wheat flour','Water']);r.initial.forEach(([,n],i)=>approx(n,[800,100,680][i]));r.final.forEach(([,n],i)=>approx(n,[100,200,20,100][i]));
});
test('book recipe retains its quantities, initial leaven, and dusting supplies',()=>{
  const p=plan(),r=calculateRecipe(p,'tartine')!;approx(r.total,1970);approx(r.hydration,75);assert.equal(r.initial[0][0],'Leaven used');
  r.initial.forEach(([,n],i)=>approx(n,[200,900,100,700][i]));r.final.forEach(([,n],i)=>approx(n,[20,50][i]));approx(r.made,415);approx(r.reserve,215);approx(r.dustingWheat,100);approx(r.dustingRice,100);
});
test('white and whole wheat is a separate 80/20 flour recipe with its original staged water',()=>{
  const p=plan(),r=calculateRecipe(p,'white-wheat')!;approx(r.total,2020);approx(r.hydration,80);r.initial.forEach(([,n],i)=>approx(n,[800,200,750][i]));r.final.forEach(([,n],i)=>approx(n,[200,20,50][i]));
});
test('old main calculator imports its actual flour, water and leaven instead of becoming a House duplicate',()=>{
  const old=legacyDefaults();old.recipe='custom';const expected=ingredients(old.cells)!,p=createPlanner(old),r=calculateRecipe(p)!;
  assert.equal(p.recipe,'red-rye');approx(r.total,2002);approx(r.flour,944);approx(r.water,724);approx(r.used,312);approx(r.hydration,724/944*100);
  r.initial.forEach(([,n],i)=>approx(n,expected.autolyse[i]));r.final.forEach(([,n],i)=>approx(n,expected.second[i]));
});
test('both blends become full House-method recipes with all original flour and water amounts',()=>{
  const p=plan();for(const [id,flour,water,total,count] of [['five-flour',1000,800,2020,2],['four-flour',1500,1200,3030,3]] as const){
    const r=calculateRecipe(p,id)!;approx(r.flour,flour);approx(r.water,water);approx(r.used,flour*.2);approx(r.salt,flour*.02);approx(r.total,total);assert.equal(p.recipes[id].params.count,count);assert.equal(definitions[id].method,'house');
  }
  assert.ok(!calculateRecipe(p,'four-flour')!.initial.some(([name])=>name==='Red Fife flour'));
  assert.notEqual(recipeSignature('five-flour',p.recipes['five-flour']),recipeSignature('four-flour',p.recipes['four-flour']));
});
test('edited manual recipes and even the optional Red Fife row migrate without data loss',()=>{
  const old=legacyDefaults();old.cells.J5=150;old.cells.S4=100;old.cells.S12=90;const p=createPlanner(old);
  assert.ok(p.order.includes('manual-rye'));const r=calculateRecipe(p,'manual-rye')!;approx(r.flours.find(x=>x.key==='rye')!.grams,150);
  const b=calculateRecipe(p,'four-flour')!;approx(b.flours.find(x=>x.key==='fife')!.grams,100);approx(b.water,1215);assert.deepEqual(p.legacy,old);
});
test('every profile conserves dough mass and scales count, loaf weight and hydration independently',()=>{
  const p=plan();for(const id of p.order){const profile=p.recipes[id],other=structuredClone(p.recipes.house);if(id!=='house')profile.params.count+=1;
    profile.params.weight=800;profile.params.hydration+=5;const r=calculateRecipe(p,id)!;
    approx([...r.initial,...r.final].reduce((a,[,n])=>a+n,0),profile.params.count*800);approx(100*r.water/r.flour,profile.params.hydration);
    if(id!=='house')assert.deepEqual(p.recipes.house,other);
  }
});
test('flour proportions normalize visibly to batch weights, and zero flour is a valid empty state',()=>{
  const p=plan();p.recipes.house.params.flour_red=60;const r=calculateRecipe(p)!;approx(r.flours[0].percent,75);approx(r.flours.reduce((a,f)=>a+f.grams,0),r.flour);
  for(const key of ['red','wheat','rye'])p.recipes.house.params[`flour_${key}`]=0;assert.equal(calculateRecipe(p),null);assert.deepEqual(recipeSchedule(p),[]);
});
test('leaven shortfall is independent of recipe identity and never creates a negative reserve',()=>{
  const p=plan();for(const key of ['buildSeed','buildBread','buildWheat','buildWater'])p.recipes.house.params[key]=0;
  const r=calculateRecipe(p)!;approx(r.used,200);assert.equal(r.made,0);assert.equal(r.reserve,0);approx(r.shortfall,200);
});
test('each recipe schedules its own count, with overnight House proof and all-batch backward planning',()=>{
  const p=plan();for(const id of p.order){p.recipe=id;const a=recipeSchedule(p),done=a.find(x=>x.id==='done')!;
    const count=p.recipes[id].params.count;assert.equal(a.filter(x=>x.id.startsWith('covered')).length,Math.ceil(count/p.ovenCapacity));
    const date=`${done.at.getFullYear()}-${String(done.at.getMonth()+1).padStart(2,'0')}-${String(done.at.getDate()).padStart(2,'0')}`,time=`${String(done.at.getHours()).padStart(2,'0')}:${String(done.at.getMinutes()).padStart(2,'0')}`;
    assert.deepEqual(recipeSchedule({...p,anchor:'done',date,time}),a);
    if(id!=='tartine'){const fridge=a.find(x=>x.id==='fridge')!,end=new Date(+fridge.at+fridge.duration*60000);assert.notEqual(fridge.at.getDate(),end.getDate());}
  }
});
test('recipe schedule descriptions follow the selected flours and quantities',()=>{
  const p=plan();p.recipe='white-wheat';const s=recipeSchedule(p),note=s.find(x=>x.id==='mix')!.note!;assert.ok(!note.includes('rye'));assert.match(s.find(x=>x.id==='autolyse')!.note!,/white-bread flour \(800 g\)/);
});
test('v4 migration preserves selected recipe, edited ingredients, dates, capacity and all prior data',()=>{
  const old=legacyDefaults();old.recipe='custom';old.cells.F19=74;old.cells.houseWeight=850;old.cells.N3=250;old.cells.R12=70;old.done=['feed'];old.houseDone=['autolyse'];old.bookDone=['leaven'];old.cells.ovenCapacity=3;
  const p=restorePlanner({version:4,plan:old});assert.equal(p.recipe,'red-rye');assert.deepEqual(p.legacy,old);assert.equal(p.ovenCapacity,3);assert.equal(p.date,old.date);assert.equal(p.time,old.time);assert.deepEqual(p.recipes['red-rye'].done,['feed']);assert.deepEqual(p.recipes.house.done,['autolyse']);assert.deepEqual(p.recipes.tartine.done,['leaven']);approx(calculateRecipe(p,'white-wheat')!.flours.find(x=>x.key==='wheat')!.grams,250);
});
test('v5 reload keeps each recipe’s hydration, yield, checklist and listing, including a migrated variant',()=>{
  const p=plan();p.recipe='five-flour';p.recipes['five-flour'].params.hydration=73;p.recipes['five-flour'].params.count=4;p.recipes['five-flour'].done=['feed'];p.recipes.house.done=['mix'];p.ovenCapacity=1;
  const restored=restorePlanner(JSON.parse(JSON.stringify({version:5,plan:p})));assert.deepEqual(restored,p);
  p.order.push('manual-rye');p.recipe='manual-rye';p.recipes['manual-rye'].params.hydration=90;
  const kept=restorePlanner({version:5,plan:p});assert.equal(kept.recipe,'manual-rye');assert.deepEqual(kept.order,p.order);
});
test('saved recipes stay listed when edits make two formulas identical; legacy data still merges once',()=>{
  const p=plan(),five=p.recipes['five-flour'].params,four=p.recipes['four-flour'].params;
  for(const key of Object.keys(five))if(key.startsWith('flour_'))four[key]=five[key];
  p.recipe='four-flour';assert.equal(recipeSignature('five-flour',p.recipes['five-flour']),recipeSignature('four-flour',p.recipes['four-flour']));
  const once=restorePlanner(JSON.parse(JSON.stringify({version:5,plan:p})));assert.deepEqual(once.order,p.order);assert.equal(once.recipe,'four-flour');
  once.recipes['five-flour'].params.flour_ap=10;
  const twice=restorePlanner(JSON.parse(JSON.stringify({version:5,plan:once})));assert.deepEqual(twice.order,p.order);assert.equal(twice.recipe,'four-flour');
  for(const id of ['house','white-wheat'])for(const key of Object.keys(p.recipes[id].params))if(key.startsWith('flour_'))p.recipes[id].params[key]=0;
  assert.deepEqual(restorePlanner(JSON.parse(JSON.stringify({version:5,plan:p}))).order,p.order);
  const odd=restorePlanner({version:5,plan:{...p,order:['four-flour','bogus','four-flour'],recipe:'house'}});assert.deepEqual(odd.order,['four-flour']);assert.equal(odd.recipe,'four-flour');
  assert.deepEqual(createPlanner().order,['house','tartine','white-wheat','red-rye','five-flour','four-flour']);
});
test('arithmetic noise never reports a leaven shortfall, while real deficits still do',()=>{
  const p=plan(),r=calculateRecipe(p,'red-rye')!;
  assert.equal(r.shortfall,0);assert.equal(r.reserve,0);approx(r.made,312);approx(r.used,312);
  for(const id of p.order)assert.equal(calculateRecipe(p,id)!.shortfall,0,id);
  p.recipes['red-rye'].params.buildWater-=1;const short=calculateRecipe(p,'red-rye')!;approx(short.shortfall,.944);assert.equal(short.reserve,0);
  p.recipes['red-rye'].params.buildWater+=2;const spare=calculateRecipe(p,'red-rye')!;approx(spare.reserve,.944);assert.equal(spare.shortfall,0);
});
test('invalid persisted parameters fall back to valid defaults and only the selected recipe resets',()=>{
  const p=plan();p.recipes.house.params.count=1.5;p.recipes.house.params.reserve=200;p.recipes.house.params.hydration=NaN;p.ovenCapacity=0;
  const r=restorePlanner({version:5,plan:p});assert.equal(r.recipes.house.params.count,2);assert.equal(r.recipes.house.params.reserve,100/780*100);assert.equal(r.recipes.house.params.hydration,78);assert.equal(r.ovenCapacity,2);
  r.recipes['five-flour'].params.hydration=70;r.recipes.house.params.hydration=90;r.recipes.house=recipeDefaults(r,'house');assert.equal(r.recipes.house.params.hydration,78);assert.equal(r.recipes['five-flour'].params.hydration,70);
});

test('quiet hours catch required actions after 10:30 PM, across midnight and before 7 AM',()=>{
  const at=(time:string)=>({id:'feed',title:'Feed starter',offset:0,duration:660,at:new Date(`2026-10-21T${time}:00`)});
  for(const time of ['22:31','23:59','00:00','02:00','06:59'])assert.equal(quietHourActions([at(time)]).length,1,time);
  for(const time of ['07:00','09:00','22:00','22:30'])assert.equal(quietHourActions([at(time)]).length,0,time);
});
test('quiet hours ignore passive overnight intervals and cooling, but flag their required handling',()=>{
  const row=(id:string,time:string,duration=0)=>({id,title:id,offset:0,duration,at:new Date(`2026-10-21T${time}:00`)});
  assert.deepEqual(quietHourActions([row('leaven','21:00',720),row('fridge','19:15',750),row('rest','23:00',30),row('bench2','23:30',5),row('cooled','23:00'),row('cooled-2','02:00')]),[]);
  assert.deepEqual(quietHourActions([row('fridge','23:00',750),row('bench1','01:00',30)]).map(x=>x.step.id),['fridge','bench1']);
});
test('continuous mixing and shaping that run past the cutoff are flagged, not unattended bake time',()=>{
  const row=(id:string,time:string,duration:number)=>({id,title:id,offset:0,duration,at:new Date(`2026-10-21T${time}:00`)});
  const found=quietHourActions([row('mix','22:20',15),row('shape','22:28',5),row('fold','22:30',5),row('covered','22:20',20),row('mix','22:15',15)]);
  assert.deepEqual(found.map(x=>x.step.id),['mix','shape','fold']);assert.ok(found.every(x=>x.continues));
});
test('quiet hours include subsequent oven batches and exclude completed actions',()=>{
  const p=plan();p.anchor='done';p.time='00:30';p.recipes.house.params.count=4;
  const s=recipeSchedule(p),conflicts=quietHourActions(s),ids=conflicts.map(x=>x.step.id);
  assert.ok(ids.includes('reheat-2'));assert.ok(ids.includes('covered-2'));assert.ok(ids.includes('uncovered-2'));assert.ok(ids.includes('done'));assert.ok(!ids.some(id=>id.startsWith('cooled')));
  assert.deepEqual(quietHourActions(s,ids),[]);assert.deepEqual(quietHourActions([]),[]);
});
test('default House schedule has no quiet-hour work; a late start and book schedule do',()=>{
  const p=plan();assert.deepEqual(quietHourActions(recipeSchedule(p)),[]);
  p.time='17:00';assert.ok(quietHourActions(recipeSchedule(p)).some(x=>x.step.id==='fridge'));
  p.time='09:00';p.recipe='tartine';assert.ok(quietHourActions(recipeSchedule(p)).some(x=>x.step.id==='fold'));
});
