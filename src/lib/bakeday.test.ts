import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanner,recipeSchedule,restorePlanner} from './recipes.ts';
import {liveSchedule,retime,untilText,shiftText,scheduleCalendar,stampNow} from './bakeday.ts';
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
