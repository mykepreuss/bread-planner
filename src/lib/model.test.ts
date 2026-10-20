import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,ingredients,bookIngredients,houseIngredients,coldProofWindow,houseDurationSpecs,restorePlan,activeDone,batchCount,manual,blend,schedule,round,loafText,durationSpecs,doughSpecs,leavenSpecs,manualSpecs,blendSpecs} from './model.ts';
const plan=():ReturnType<typeof defaults>=>{const p=defaults();return {...p,cells:{...p.cells,ovenCapacity:1},recipe:'custom' as typeof p.recipe,date:'2026-10-21',time:'09:00'};};
const local=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
test('all 59 original numeric inputs plus B4 are represented once',()=>{
  const specs=[...durationSpecs,...doughSpecs,...leavenSpecs,...manualSpecs.flat(),...blendSpecs.flat()];
  assert.equal(specs.length,59);assert.equal(new Set(specs.map(s=>s.cell)).size,59);
  assert.deepEqual(blendSpecs.map(a=>a.map(s=>s.cell)),[['R2','R3','R4','R5','R6','R11','R12'],['S2','S3','S4','S5','S6','S11','S12']]);
});
test('main calculator matches every captured default ingredient result',()=>{
  const r=ingredients(plan().cells)!;
  assert.equal(r.multiplier,11);assert.deepEqual(r.base,[946,154,880,22]);
  assert.deepEqual(r.leaven,[28,71,71,142]);assert.equal(r.leavenTotal,312);
  assert.deepEqual(r.final,[861,83,724,22,312]);assert.equal(r.finalTotal,2002);
  assert.deepEqual(r.autolyse,[758,83,652]);assert.deepEqual(r.second,[103,312,22,72]);
  assert.equal(r.total,2002);assert.equal(r.flour,944);assert.equal(r.water,724);
});
test('manual recipes and flour blends match the captured values',()=>{
  const c=plan().cells;
  assert.deepEqual(manual(c,0),{flour:1000,water:780,total:2000,hydration:78});
  assert.deepEqual(manual(c,1),{flour:1000,water:800,total:2020,hydration:80});
  assert.deepEqual(blend(c,0),{flour:1000,water:800,hydration:80});
  assert.deepEqual(blend(c,1),{flour:1500,water:1200,hydration:80});
});
test('original time cells are preserved when both loaves fit in the oven',()=>{
  const p=plan();p.cells.ovenCapacity=2;
  const actual=Object.fromEntries(schedule(p).filter(s=>s.id!=='warmup').map(s=>[s.id,local(s.at)]));
  assert.deepEqual(actual,{
    feed:'2026-10-20 22:00',leaven:'2026-10-21 09:00',autolyse:'2026-10-21 09:30',mix:'2026-10-21 14:00',rest:'2026-10-21 14:15',
    turn1:'2026-10-21 14:45',turn2:'2026-10-21 15:15',turn3:'2026-10-21 15:45',turn4:'2026-10-21 16:15',turn5:'2026-10-21 16:45',turn6:'2026-10-21 17:15',turn7:'2026-10-21 17:45',
    shape:'2026-10-21 18:15',bench1:'2026-10-21 18:20',fold:'2026-10-21 18:50',bench2:'2026-10-21 18:55',basket:'2026-10-21 19:00',fridge:'2026-10-21 19:15',preheat:'2026-10-22 07:45',covered:'2026-10-22 08:45',uncovered:'2026-10-22 09:05',done:'2026-10-22 09:28',cooled:'2026-10-22 09:43',
  });
});
test('backward planning reproduces the identical forward schedule',()=>{
  const p=plan();const a=schedule(p);const b=schedule({...p,anchor:'done',date:'2026-10-22',time:'10:41'});
  assert.deepEqual(a,b);
});
test('autolyse overlaps leaven; changing its duration leaves final mix unchanged',()=>{
  const p=plan(),a=schedule(p);p.cells.C6=300;const b=schedule(p);
  assert.equal(local(b.find(s=>s.id==='autolyse')!.at),'2026-10-21 09:00');
  assert.equal(+b.find(s=>s.id==='mix')!.at,+a.find(s=>s.id==='mix')!.at);
});
test('each turn interval moves only subsequent steps',()=>{
  const p=plan(),a=schedule(p);p.cells.C13=45;const b=schedule(p);
  assert.equal(+a.find(s=>s.id==='turn3')!.at,+b.find(s=>s.id==='turn3')!.at);
  assert.equal(+b.find(s=>s.id==='turn4')!.at-(+a.find(s=>s.id==='turn4')!.at),15*60000);
  assert.equal(+b.find(s=>s.id==='done')!.at-(+a.find(s=>s.id==='done')!.at),15*60000);
});
test('every timing input has an observable effect',()=>{
  for(const spec of durationSpecs){const p=plan(),a=JSON.stringify(schedule(p));p.cells[spec.cell]+=10;assert.notEqual(JSON.stringify(schedule(p)),a,spec.cell);}
});
test('every dough and leaven input affects the computed weights',()=>{
  for(const spec of [...doughSpecs,...leavenSpecs]){const p=plan(),a=ingredients(p.cells);p.cells[spec.cell]+=spec.cell==='F23'?200:5;const b=ingredients(p.cells);assert.notDeepEqual([b?.base,b?.leaven,b?.final],[a?.base,a?.leaven,a?.final],spec.cell);}
});
test('manual and blend cells change only their own independent block',()=>{
  for(let i=0;i<2;i++)for(const spec of manualSpecs[i]){const p=plan(),other=manual(p.cells,1-i),main=ingredients(p.cells),before=manual(p.cells,i);p.cells[spec.cell]+=100;assert.notDeepEqual(manual(p.cells,i),before,spec.cell);assert.deepEqual(manual(p.cells,1-i),other);assert.deepEqual(ingredients(p.cells),main);}
  for(let i=0;i<2;i++)for(const spec of blendSpecs[i]){const p=plan(),other=blend(p.cells,1-i),main=ingredients(p.cells),before=blend(p.cells,i);p.cells[spec.cell]+=100;assert.notDeepEqual(blend(p.cells,i),before,spec.cell);assert.deepEqual(blend(p.cells,1-i),other);assert.deepEqual(ingredients(p.cells),main);}
});
test('independent percentages stay independent; zero flour has no fake hydration',()=>{
  const p=plan();p.cells.F18=10;assert.ok(ingredients(p.cells)!.warnings.some(x=>x.includes('96%')));assert.equal(p.cells.F17,86);
  p.cells.N2=0;p.cells.N3=0;assert.equal(manual(p.cells,1).hydration,null);
  p.cells.F17=0;p.cells.F18=0;p.cells.F19=0;p.cells.F20=0;assert.equal(ingredients(p.cells),null);
});
test('loaf counts read as one loaf or several loaves',()=>{assert.equal(loafText(1),'1 loaf');assert.equal(loafText(2),'2 loaves');assert.equal(loafText(3),'3 loaves');});
test('uses spreadsheet rounding, including negative half values',()=>{assert.equal(round(-1.5),-2);assert.equal(round(1.5),2);assert.equal(round(1.25,1),1.3);assert.equal(round(2000/182,1),11);});
test('leaven build uses bread flour rather than all flour',()=>{const p=plan();p.cells.F18=0;const r=ingredients(p.cells)!;assert.equal(r.leavenBase,r.base[0]*.15);});
test('invalid date/time produces no invalid timestamps',()=>{assert.deepEqual(schedule({...plan(),date:'2026-02-31'}),[]);assert.deepEqual(schedule({...plan(),time:'25:00'}),[]);});
test('elapsed durations survive daylight-saving changes',()=>{const p={...plan(),date:'2026-11-01'};const a=schedule(p),feed=a.find(s=>s.id==='feed')!,leaven=a.find(s=>s.id==='leaven')!;assert.equal((+leaven.at-(+feed.at))/60000,660);});

test('book preset matches all supplied dough and dusting quantities',()=>{
  const r=bookIngredients(plan().cells);
  assert.equal(r.white,900);assert.equal(r.wheat,100);assert.equal(r.initialWater,700);assert.equal(r.finalWater,50);assert.equal(r.salt,20);assert.equal(r.used,200);assert.equal(r.total,1970);
  assert.deepEqual(r.madeParts,[15,100,100,200]);assert.equal(r.made,415);assert.equal(r.reserve,215);assert.equal(r.shortfall,0);
  assert.equal(r.dustingWheat,100);assert.equal(r.dustingRice,100);assert.equal(r.hydration,75);assert.ok(Math.abs(r.inclusiveHydration-77.272727)<.00001);
});
test('book scaling changes yield without rounding the multiplier or counting dusting/reserve as dough',()=>{
  const p=plan();p.cells.bookCount=3;const r=bookIngredients(p.cells);
  assert.equal(r.total,2955);assert.equal(r.white,1350);assert.equal(r.wheat,150);assert.equal(r.used,300);assert.equal(r.made,622.5);assert.equal(r.reserve,322.5);
  p.cells.bookCount=2;p.cells.bookWeight=1000;assert.equal(bookIngredients(p.cells).total,2000);
});
test('custom partial leaven deducts only used flour and water, retaining a real reserve',()=>{
  const c=plan().cells,r=ingredients(c,200)!;
  assert.equal(r.leavenTotal,312);assert.equal(r.leavenUsed,200);assert.equal(r.reserve,112);
  assert.deepEqual(r.final,[892,108,780,22,200]);assert.equal(r.total,2002);assert.deepEqual(r.leaven,[28,71,71,142]);
  assert.deepEqual(ingredients(c,312),ingredients(c));
});
test('short leaven builds have a shortfall, not a negative reserve',()=>{
  const c=plan().cells,r=ingredients(c,400)!;assert.equal(r.reserve,0);assert.equal(r.shortfall,88);assert.ok(r.warnings.some(w=>w.includes('88 g short')));
  c.bookBuild=0;c.bookSeed=0;const b=bookIngredients(c);assert.equal(b.made,0);assert.equal(b.reserve,0);assert.equal(b.shortfall,200);
});
test('book build controls change made and reserved amounts without changing the amount in dough',()=>{
  const c=plan().cells;c.bookBuild=150;c.bookSeed=20;const r=bookIngredients(c);assert.equal(r.made,620);assert.equal(r.used,200);assert.equal(r.reserve,420);assert.equal(r.total,1970);
});
test('one-pot setting schedules two serial batches, with separate cooling marks',()=>{
  const p=plan(),s=schedule(p),at=(id:string)=>local(s.find(x=>x.id===id)!.at);
  assert.equal(batchCount(p),2);assert.equal(at('out-1'),'2026-10-22 09:28');assert.equal(at('reheat-2'),'2026-10-22 09:28');assert.equal(at('covered-2'),'2026-10-22 09:58');assert.equal(at('done'),'2026-10-22 10:41');assert.equal(at('cooled-1'),'2026-10-22 09:43');assert.equal(at('cooled'),'2026-10-22 10:56');
});
test('parallel capacity and partial final batch cover every loaf once',()=>{
  const p=plan();p.cells.F24=3;p.cells.ovenCapacity=2;const s=schedule(p),covered=s.filter(x=>x.id.startsWith('covered'));
  assert.equal(covered.length,2);assert.match(covered[0].title,/loaves 1 to 2/);assert.match(covered[1].title,/loaf 3/);
  p.cells.ovenCapacity=3;assert.equal(batchCount(p),1);assert.equal(schedule(p).filter(x=>x.id.startsWith('covered')).length,1);
});
test('book cold sequence uses short leaven-containing rest, five folds before dividing, and correct first/last bake times',()=>{
  const p={...plan(),recipe:'tartine' as const},s=schedule(p),at=(id:string)=>local(s.find(x=>x.id===id)!.at);
  assert.equal(at('autolyse'),'2026-10-21 21:00');assert.equal(at('mix'),'2026-10-21 21:30');assert.equal(at('shape'),'2026-10-22 00:30');assert.equal(at('fridge'),'2026-10-22 01:10');
  assert.equal(s.filter(x=>/^turn\d+$/.test(x.id)).length,5);assert.ok(+s.find(x=>x.id==='turn5')!.at<+s.find(x=>x.id==='shape')!.at);assert.equal(at('preheat'),'2026-10-22 13:40');assert.equal(at('covered'),'2026-10-22 14:10');assert.equal(at('out-1'),'2026-10-22 14:50');assert.equal(at('done'),'2026-10-22 16:00');
  assert.match(s.find(x=>x.id==='autolyse')!.note!,/leaven used/);assert.match(s.find(x=>x.id==='preheat')!.note!,/500°F/);assert.match(s.find(x=>x.id==='covered')!.note!,/450°F/);
});
test('book warm proof omits refrigeration and warm-up, and overlaps preheat with proof',()=>{
  const p={...plan(),recipe:'tartine' as const,proof:'warm' as const},s=schedule(p),at=(id:string)=>local(s.find(x=>x.id===id)!.at);
  assert.ok(!s.some(x=>x.id==='fridge'||x.id.startsWith('warmup')));assert.equal(at('preheat'),'2026-10-22 04:10');assert.equal(at('covered'),'2026-10-22 04:40');assert.equal(at('done'),'2026-10-22 06:30');
});
test('extending book bulk adds folds and moves later steps, while preheat allowance overlaps',()=>{
  const p={...plan(),recipe:'tartine' as const},a=schedule(p);p.cells.bookBulk=240;const b=schedule(p);
  assert.equal(b.filter(x=>/^turn\d+$/.test(x.id)).length,7);assert.equal(+b.find(x=>x.id==='done')!.at-(+a.find(x=>x.id==='done')!.at),3600000);
  p.cells.bookPreheat+=20;const c=schedule(p);assert.equal(+c.find(x=>x.id==='done')!.at,+b.find(x=>x.id==='done')!.at);assert.equal(+b.find(x=>x.id==='preheat')!.at-(+c.find(x=>x.id==='preheat')!.at),1200000);
});
test('backward anchor is the last batch for both recipes and proof paths',()=>{
  for(const recipe of ['house','custom','tartine'] as const)for(const proof of ['warm','cold'] as const)for(const capacity of [1,2,3]){
    const p={...plan(),recipe,proof};p.cells.ovenCapacity=capacity;p.cells[recipe==='house'?'houseCount':recipe==='tartine'?'bookCount':'F24']=3;
    const a=schedule(p),finish=a.find(x=>x.id==='done')!.at;
    const b=schedule({...p,anchor:'done',date:local(finish).slice(0,10),time:local(finish).slice(11)});assert.deepEqual(a,b);
  }
});
test('v1 migration preserves original editable cells while opening the new House default',()=>{
  const old=plan();old.cells.F23=750;old.cells.F19=73;old.cells.S12=99;old.done=['feed','covered','done','cooled'];
  const p=restorePlan({version:1,plan:old});assert.equal(p.recipe,'house');assert.equal(p.cells.F23,750);assert.equal(p.cells.F19,73);assert.equal(p.cells.S12,99);assert.equal(p.cells.bookWeight,985);assert.equal(p.cells.ovenCapacity,2);assert.equal(p.customUseAll,true);assert.deepEqual(p.done,['feed','covered']);
});
test('v4 persistence keeps prior presets and checklists, with separate values',()=>{
  const p=plan();p.recipe='tartine';p.proof='warm';p.customUseAll=false;p.cells.customLeavenUsed=200;p.cells.F19=76;p.cells.bookWeight=800;p.done=['feed'];p.bookDone=['leaven'];
  const restored=restorePlan(JSON.parse(JSON.stringify({version:4,plan:p})));assert.deepEqual(restored,p);assert.deepEqual(activeDone(restored),['leaven']);restored.recipe='custom';assert.deepEqual(activeDone(restored),['feed']);assert.equal(restored.cells.F19,76);assert.equal(restored.cells.bookWeight,800);
});
test('invalid saved counts/capacity are rejected and unknown envelopes do not corrupt settings',()=>{
  const p=plan();p.cells.ovenCapacity=0;p.cells.bookCount=1.5;p.cells.F24=NaN;const r=restorePlan({version:2,plan:p});assert.equal(r.cells.ovenCapacity,2);assert.equal(r.cells.bookCount,2);assert.equal(r.cells.F24,2);assert.equal(restorePlan({version:99,plan:p}).recipe,'house');assert.deepEqual(schedule({...plan(),cells:{...plan().cells,ovenCapacity:0}}),[]);
});
test('instructions include readiness, pot preheating, scoring, steam, and batch reheating',()=>{
  for(const recipe of ['house','custom','tartine'] as const){const s=schedule({...plan(),recipe}),text=s.map(x=>`${x.note} ${x.readiness}`).join(' ');for(const required of ['floats','20% to 30%','Dutch oven','score','steam','Clean the pot','wire rack'])assert.ok(text.includes(required),`${recipe}: ${required}`);}
});


test('Preuss House is the default and exactly matches the supplied stages and totals',()=>{
  const p=defaults(),r=houseIngredients(p.cells);
  assert.equal(p.recipe,'house');assert.equal(p.time,'09:00');
  assert.deepEqual(r.autolyse,[800,100,680]);assert.deepEqual(r.second,[100,200,20,100]);
  assert.equal(r.total,2000);assert.equal(r.flour,1000);assert.equal(r.water,780);assert.equal(r.hydration,78);
  assert.deepEqual(r.madeParts,[28,71,71,142]);assert.equal(r.made,312);assert.equal(r.used,200);assert.equal(r.reserve,112);
});
test('House yield scales exactly without altering custom, book or manual recipes',()=>{
  const p=defaults(),custom=ingredients(p.cells),book=bookIngredients(p.cells),m=manual(p.cells,0);
  p.cells.houseCount=3;p.cells.houseWeight=750;const r=houseIngredients(p.cells);
  assert.equal(r.total,2250);assert.deepEqual(r.autolyse,[900,112.5,765]);assert.deepEqual(r.second,[112.5,225,22.5,112.5]);
  assert.equal(r.made,351);assert.equal(r.reserve,126);assert.deepEqual(ingredients(p.cells),custom);assert.deepEqual(bookIngredients(p.cells),book);assert.deepEqual(manual(p.cells,0),m);
});
test('House leaven made and used remain separate, including shortfalls',()=>{
  const p=defaults();p.cells.houseWater=200;const a=houseIngredients(p.cells);assert.equal(a.made,370);assert.equal(a.used,200);assert.equal(a.reserve,170);assert.equal(a.total,2000);
  for(const key of ['houseSeed','houseRed','houseWheat','houseWater'])p.cells[key]=0;
  const b=houseIngredients(p.cells);assert.equal(b.made,0);assert.equal(b.reserve,0);assert.equal(b.shortfall,200);assert.equal(b.used,200);
});
test('House autolyse overlaps leaven and cold proof runs from evening to next morning',()=>{
  const p={...plan(),recipe:'house' as const},s=schedule(p),at=(id:string)=>local(s.find(x=>x.id===id)!.at),w=coldProofWindow(s)!;
  assert.equal(at('leaven'),'2026-10-21 09:00');assert.equal(at('autolyse'),'2026-10-21 09:30');assert.equal(at('mix'),'2026-10-21 14:00');
  assert.equal(local(w.start),'2026-10-21 19:15');assert.equal(local(w.end),'2026-10-22 07:45');assert.equal(w.minutes,750);assert.equal(w.overnight,true);
  assert.equal(at('covered'),'2026-10-22 08:45');assert.equal(at('done'),'2026-10-22 10:41');
  assert.ok(s.every(x=>!x.cell));assert.match(s.find(x=>x.id==='autolyse')!.note!,/flour and first water addition only/);
  p.cells.houseAutolyse=60;assert.equal(local(schedule(p).find(x=>x.id==='autolyse')!.at),'2026-10-21 13:00');assert.equal(+schedule(p).find(x=>x.id==='mix')!.at,+s.find(x=>x.id==='mix')!.at);
});
test('House proof tracks elapsed minutes across midnight and flags daytime plans',()=>{
  const p={...plan(),recipe:'house' as const,time:'21:00'},w=coldProofWindow(schedule(p))!;
  assert.equal(w.overnight,false);assert.equal(schedule(p).find(x=>x.id==='fridge')!.title,'Cold proof (daytime)');assert.equal((+w.end-(+w.start))/60000,750);
  p.cells.houseFridge=1200;assert.equal(coldProofWindow(schedule(p))!.overnight,true);
  const dst=coldProofWindow(schedule({...p,date:'2026-10-31',time:'09:00'}))!;assert.equal((+dst.end-(+dst.start))/60000,1200);
});
test('all independent House timing controls affect its schedule without changing custom timing',()=>{
  const base={...plan(),recipe:'house' as const};
  for(const spec of houseDurationSpecs){const p={...base,cells:{...base.cells}},a=schedule(p),custom=schedule({...p,recipe:'custom'});p.cells[spec.cell]+=10;assert.notDeepEqual(schedule(p),a,spec.cell);assert.deepEqual(schedule({...p,recipe:'custom'}),custom,spec.cell);}
});
test('v2 upgrade selects House once and preserves prior values, proof choice and checklists',()=>{
  const old=plan();old.recipe='tartine';old.cells.F19=74;old.cells.bookWeight=800;old.cells.J5=150;old.cells.S12=90;old.proof='warm';old.done=['feed'];old.bookDone=['leaven'];
  const p=restorePlan({version:2,plan:old});assert.equal(p.recipe,'house');assert.equal(p.cells.F19,74);assert.equal(p.cells.bookWeight,800);assert.equal(p.cells.J5,150);assert.equal(p.cells.S12,90);assert.equal(p.proof,'warm');assert.deepEqual(p.done,['feed']);assert.deepEqual(p.bookDone,['leaven']);assert.deepEqual(p.houseDone,[]);assert.equal(p.cells.houseWeight,1000);
  p.recipe='custom';p.houseDone=['autolyse'];p.cells.houseWeight=850;p.cells.houseFridge=900;
  const restored=restorePlan(JSON.parse(JSON.stringify({version:4,plan:p})));assert.deepEqual(restored,p);restored.recipe='house';assert.deepEqual(activeDone(restored),['autolyse']);
});


test('two loaves bake together by default and finish after one bake cycle',()=>{
  const p={...defaults(),date:'2026-10-21',time:'09:00'},s=schedule(p);
  assert.equal(p.cells.ovenCapacity,2);assert.equal(batchCount(p),1);
  assert.equal(s.filter(x=>x.id.startsWith('covered')).length,1);assert.match(s.find(x=>x.id==='covered')!.title,/loaves 1 to 2/);
  assert.equal(local(s.find(x=>x.id==='done')!.at),'2026-10-22 09:28');assert.ok(!s.some(x=>x.id.startsWith('reheat-')));
});
test('v3 upgrade applies two-loaf default once while preserving recipes and later capacity edits',()=>{
  const old=plan();old.recipe='tartine';old.cells.houseWeight=850;old.houseDone=['autolyse'];
  const p=restorePlan({version:3,plan:old});assert.equal(p.cells.ovenCapacity,2);assert.equal(p.recipe,'tartine');assert.equal(p.cells.houseWeight,850);assert.deepEqual(p.houseDone,['autolyse']);
  p.cells.ovenCapacity=1;assert.equal(restorePlan({version:4,plan:p}).cells.ovenCapacity,1);
  p.cells.ovenCapacity=3;assert.equal(restorePlan({version:3,plan:p}).cells.ovenCapacity,3);
});
