import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanner,recipeSchedule,restorePlanner} from './recipes.ts';
import {liveSchedule,retime,untilText,shiftText,scheduleCalendar,stampNow,skippedSteps,stepPhase,bulkEstimate,bulkAdvice,toF,fromF,BULK_REFERENCE_F} from './bakeday.ts';
const plan=()=>{const p=createPlanner();p.date='2026-10-21';p.time='09:00';return p;};
const minutes=(n:number)=>n*60000;
const at=(steps:{id:string;at:Date}[],id:string)=>+steps.find(s=>s.id===id)!.at;

test('with nothing checked, the live schedule is the plan',()=>{
  const planned=recipeSchedule(plan()),{steps,shift}=liveSchedule(planned,[]);
  assert.equal(shift,0);assert.deepEqual(steps.map(s=>+s.at),planned.map(s=>+s.at));assert.ok(steps.every(s=>+s.planned===+s.at&&!s.actual));
});

test('a late check moves every later step by the same amount and leaves earlier steps alone',()=>{
  const planned=recipeSchedule(plan()),leaven=at(planned,'leaven');
  const {steps,shift}=liveSchedule(planned,['leaven'],{leaven:leaven+minutes(40)});
  assert.equal(shift,40);
  assert.equal(at(steps,'feed'),at(planned,'feed'));
  for(const id of ['autolyse','mix','turn3','fridge','covered','done'])assert.equal(at(steps,id),at(planned,id)+minutes(40),id);
  assert.equal(+steps.find(s=>s.id==='leaven')!.actual!,leaven+minutes(40));
});

test('the latest checked step sets the shift, so catching up early pulls the rest back',()=>{
  const planned=recipeSchedule(plan());
  const {steps,shift}=liveSchedule(planned,['leaven','mix','turn1'],{leaven:at(planned,'leaven')+minutes(40),mix:at(planned,'mix')+minutes(25),turn1:at(planned,'turn1')+minutes(10)});
  assert.equal(shift,10);assert.equal(at(steps,'turn2'),at(planned,'turn2')+minutes(10));
  const early=liveSchedule(planned,['mix'],{mix:at(planned,'mix')-minutes(15)});
  assert.equal(early.shift,-15);assert.equal(at(early.steps,'fridge'),at(planned,'fridge')-minutes(15));
});

test('checking the starter feed or autolyse at any time does not move the bake',()=>{
  const planned=recipeSchedule(plan());
  const {steps,shift}=liveSchedule(planned,['feed','autolyse'],{feed:at(planned,'feed')+minutes(600),autolyse:at(planned,'autolyse')+minutes(45)});
  assert.equal(shift,0);assert.equal(at(steps,'mix'),at(planned,'mix'));assert.equal(at(steps,'autolyse'),at(planned,'autolyse')+minutes(45));
});

test('a step checked without a recorded time keeps following the plan',()=>{
  const planned=recipeSchedule(plan()),{steps,shift}=liveSchedule(planned,['leaven','mix']);
  assert.equal(shift,0);assert.deepEqual(steps.map(s=>+s.at),planned.map(s=>+s.at));
});

test('check-off times round to the minute',()=>{
  assert.equal(stampNow(Date.UTC(2026,9,21,9,0,29)),Date.UTC(2026,9,21,9,0));assert.equal(stampNow(Date.UTC(2026,9,21,9,0,31)),Date.UTC(2026,9,21,9,1));
});

test('editing a recorded time picks the nearest day, including across midnight',()=>{
  const evening=+new Date(2026,9,21,23,50),afterMidnight=+new Date(2026,9,22,0,10);
  assert.equal(retime(evening,'23:35'),+new Date(2026,9,21,23,35));
  assert.equal(retime(evening,'00:05'),+new Date(2026,9,22,0,5));
  assert.equal(retime(afterMidnight,'23:55'),+new Date(2026,9,21,23,55));
  assert.equal(retime(evening,''),null);assert.equal(retime(evening,'7pm'),null);
});

test('countdown and shift wording',()=>{
  assert.equal(untilText(minutes(22)),'in 22 min');assert.equal(untilText(minutes(185)),'in 3h 5m');assert.equal(untilText(minutes(.2)),'due now');assert.equal(untilText(-minutes(12)),'due 12 min ago');
  assert.equal(shiftText(0),'');assert.equal(shiftText(20),'Running 20 min behind plan. Later steps have moved to match.');assert.equal(shiftText(-75),'Running 1h 15m ahead of plan. Later steps have moved to match.');
});

test('the calendar has one alerted event per remaining step at its live time',()=>{
  const planned=recipeSchedule(plan()),{steps}=liveSchedule(planned,['feed','leaven'],{leaven:at(planned,'leaven')+minutes(30)});
  const ics=scheduleCalendar(steps,'Preuss House',['feed','leaven'],Date.UTC(2026,9,20));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n')&&ics.endsWith('END:VCALENDAR\r\n'));
  const events=ics.split('BEGIN:VEVENT').slice(1);
  assert.equal(events.length,planned.length-2);assert.equal((ics.match(/BEGIN:VALARM/g)||[]).length,events.length);
  assert.ok(!ics.includes('SUMMARY:Feed starter'));
  const turn=events.find(e=>e.includes('SUMMARY:Turn 1 '))!,start=new Date(at(planned,'turn1')+minutes(30)).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  assert.ok(turn.includes(`DTSTART:${start}\r\n`),turn);assert.ok(turn.includes('TRIGGER:PT0M'));
  for(const line of ics.split('\r\n'))assert.ok(new TextEncoder().encode(line).length<=75,line);
  const unfolded=ics.replace(/\r\n /g,'');
  assert.ok(unfolded.includes('Mix red spring flour (800 g)\\, whole-wheat flour (100 g)\\, water (680 g).'),'commas are escaped and long lines unfold intact');
});

test('check-off times survive a save and reload, and stray times are dropped',()=>{
  const p=plan();p.recipes.house.done=['leaven','mix'];p.recipes.house.doneAt={leaven:+new Date(2026,9,21,9,20),mix:+new Date(2026,9,21,14,25)};
  assert.deepEqual(restorePlanner(JSON.parse(JSON.stringify({version:5,plan:p}))),p);
  const odd=JSON.parse(JSON.stringify({version:5,plan:p}));odd.plan.recipes.house.doneAt={leaven:'soon',mix:+new Date(2026,9,21,14,25),turn1:+new Date(2026,9,21,15,0)};
  assert.deepEqual(restorePlanner(odd).recipes.house.doneAt,{mix:+new Date(2026,9,21,14,25)});
  const older=JSON.parse(JSON.stringify({version:5,plan:p}));delete older.plan.recipes.house.doneAt;
  const restored=restorePlanner(older);assert.deepEqual(restored.recipes.house.done,['leaven','mix']);assert.deepEqual(restored.recipes.house.doneAt,{});
});

const clock=(d:Date)=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
test('at the 78°F reference, the bulk estimate is the planned 4 hours, from start of bulk to preshape',()=>{
  const {steps}=liveSchedule(recipeSchedule(plan()),[]),e=bulkEstimate(steps,BULK_REFERENCE_F)!;
  assert.equal(e.planned,240);assert.equal(e.minutes,240);assert.equal(e.difference,0);
  assert.equal(+e.readyAt,at(steps,'shape'));assert.equal(+e.checkFrom,at(steps,'shape')-minutes(30));
  assert.match(bulkAdvice(e,clock),/^Bulk should take about 4h, ready around 18:15\. That is close to the plan\. Start checking the dough from 17:45\.$/);
});

test('bulk time halves for every 15°F warmer and doubles for every 15°F cooler',()=>{
  const {steps}=liveSchedule(recipeSchedule(plan()),[]);
  assert.equal(bulkEstimate(steps,93)!.minutes,120);assert.equal(bulkEstimate(steps,63)!.minutes,480);
  assert.equal(bulkEstimate(steps,82)!.minutes,199);assert.equal(bulkEstimate(steps,72)!.minutes,317);
  assert.equal(bulkEstimate(steps,null),null);assert.equal(bulkEstimate(steps,Number.NaN),null);
});

test('warm dough advice says when to start checking and to skip remaining turns; cool dough says keep folding',()=>{
  const {steps}=liveSchedule(recipeSchedule(plan()),[]);
  const warm=bulkAdvice(bulkEstimate(steps,82)!,clock),cool=bulkAdvice(bulkEstimate(steps,72)!,clock);
  assert.equal(warm,'Bulk should take about 3h 19m, ready around 17:34. That is 41 min before the planned preshape. Start checking from 17:04. If the dough is ready before the last turn, skip the remaining turns and preshape.');
  assert.equal(cool,'Bulk should take about 5h 17m, ready around 19:32. That is 1h 17m after the planned preshape. Keep folding every 30 minutes until the dough is ready.');
});

test('the estimate runs from when bulk actually started, and leaves the planned steps alone',()=>{
  const planned=recipeSchedule(plan()),rest=at(planned,'rest');
  const {steps}=liveSchedule(planned,['rest'],{rest:rest+minutes(20)}),e=bulkEstimate(steps,82)!;
  assert.equal(+e.readyAt,rest+minutes(20)+minutes(199));assert.equal(at(steps,'shape'),at(planned,'shape')+minutes(20));
});

test('Tartine estimates its 3-hour warm bulk the same way',()=>{
  const p=plan();p.recipe='tartine';const {steps}=liveSchedule(recipeSchedule(p),[]);
  assert.equal(bulkEstimate(steps,78)!.planned,180);assert.equal(bulkEstimate(steps,93)!.minutes,90);
});

test('°C converts through °F and back',()=>{
  assert.equal(toF(25,'C'),77);assert.equal(toF(80,'F'),80);assert.ok(Math.abs(fromF(77,'C')-25)<1e-9);
});

test('bulk steps left unchecked before a later checked step count as skipped; nothing else does',()=>{
  const steps=recipeSchedule(plan());
  assert.deepEqual(skippedSteps(steps,[]),[]);
  assert.deepEqual(skippedSteps(steps,['leaven','rest','turn1','turn2','turn3','turn4','shape']),['turn5','turn6','turn7']);
  assert.deepEqual(skippedSteps(steps,['mix','shape']),['rest','turn1','turn2','turn3','turn4','turn5','turn6','turn7'],'jumping to preshape passes the whole bulk');
  assert.deepEqual(skippedSteps(steps,['mix']),[],'feed, leaven and autolyse are never skipped');
  assert.deepEqual(skippedSteps(steps,['fridge']),['rest','turn1','turn2','turn3','turn4','turn5','turn6','turn7'],'only bulk steps, even when much later steps are checked');
  assert.deepEqual(skippedSteps(steps,['turn1','turn2']),['rest']);
});

test('dough temperature and unit survive a reload; out-of-range or missing values are dropped',()=>{
  const p=plan();p.tempUnit='C';p.recipes.house.doughTemp=81.5;
  assert.deepEqual(restorePlanner(JSON.parse(JSON.stringify({version:5,plan:p}))),p);
  const odd=JSON.parse(JSON.stringify({version:5,plan:p}));odd.plan.recipes.house.doughTemp=140;odd.plan.tempUnit='K';
  const r=restorePlanner(odd);assert.equal(r.recipes.house.doughTemp,null);assert.equal(r.tempUnit,'F');
  const older=JSON.parse(JSON.stringify({version:5,plan:p}));delete older.plan.recipes.house.doughTemp;delete older.plan.tempUnit;
  const o=restorePlanner(older);assert.equal(o.recipes.house.doughTemp,null);assert.equal(o.tempUnit,'F');
});

test('each step is coloured by its temperature: only the cold proof is cold, and preheat through the last loaf out is oven',()=>{
  const p=plan();p.recipes.house.params.count=4;p.ovenCapacity=2;
  const phases=Object.fromEntries(recipeSchedule(p).map(s=>[s.id,stepPhase(s.id)]));
  assert.deepEqual(Object.keys(phases).filter(id=>phases[id]==='cold'),['fridge']);
  assert.deepEqual(Object.keys(phases).filter(id=>phases[id]==='oven').sort(),['covered','covered-2','done','out-1','preheat','reheat-2','uncovered','uncovered-2'].sort());
  for(const id of ['feed','leaven','autolyse','mix','rest','turn1','shape','bench1','fold','basket','warmup','warmup-2','cooled'])assert.equal(phases[id],'room',id);
  const t=plan();t.recipe='tartine';t.proof='warm';assert.equal(recipeSchedule(t).find(s=>s.id==='proof')&&stepPhase('proof'),'room','a warm proof is room temperature');
});
