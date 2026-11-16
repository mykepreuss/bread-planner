import {durationText,type Step} from './model.ts';

/** A step as it stands on bake day: when it was planned, and when it now falls or was actually done. */
export type LiveStep=Step&{planned:Date;actual?:Date};

/**
 * Checking these steps never moves the rest of the plan. The starter feed sits outside the bake, and the autolyse
 * only needs to be ready before the leaven is. Turns happen during bulk rather than starting a clock: bulk runs its
 * planned length from when bulk started, so a late or early turn must not lengthen or shorten it.
 */
const movesPlan=(id:string)=>id!=='feed'&&id!=='autolyse'&&!/^turn\d+$/.test(id);

/** Check-off times are kept to the minute, so shifted steps land on whole minutes. */
export function stampNow(now=Date.now()){return Math.round(now/60000)*60000;}

/**
 * Moves the plan to follow the dough. Each checked step with a recorded time takes that time.
 * Unchecked steps after it keep their planned spacing from it, so a late leaven moves everything that follows.
 * Checked turns keep their recorded time but move nothing, so later turns stay on their 30-minute marks from bulk start.
 */
export function liveSchedule(steps:Step[],done:string[],doneAt:Record<string,number>={}){
  const checked=new Set(done);let shift=0;
  const live:LiveStep[]=steps.map(step=>{
    const t=checked.has(step.id)?doneAt[step.id]:undefined;
    if(typeof t==='number'&&Number.isFinite(t)){
      if(movesPlan(step.id))shift=t-+step.at;
      return {...step,planned:step.at,actual:new Date(t),at:new Date(t)};
    }
    return {...step,planned:step.at,at:new Date(+step.at+shift)};
  });
  return {steps:live,shift:Math.round(shift/60000)};
}

/** The temperature a step happens at. The page colours steps by it: neutral at room temperature, Fridge for the cold proof, Crust for the oven. */
export type Phase='room'|'cold'|'oven';
export function stepPhase(id:string):Phase{
  if(id==='fridge')return 'cold';
  if(/^(preheat|reheat-\d+|covered(-\d+)?|uncovered(-\d+)?|out-\d+|done)$/.test(id))return 'oven';
  return 'room';
}

/** Bulk steps (its start and the turns) left unchecked once a later step is checked were skipped: the dough was ready sooner. */
export function skippedSteps(steps:Step[],done:string[]){
  const checked=new Set(done),last=steps.reduce((index,step,i)=>checked.has(step.id)?i:index,-1);
  return steps.filter((step,i)=>i<last&&!checked.has(step.id)&&/^(rest|turn\d+)$/.test(step.id)).map(step=>step.id);
}

/**
 * Bulk estimate from dough temperature, agreed with Michael on 2026-11-15: the planned bulk counts as dough at 78°F,
 * and fermentation time doubles for every 15°F (8°C) cooler and halves for every 15°F warmer (The Sourdough Journey's rule).
 * It is advice only. Planned steps and the turn count stay as they are.
 */
export const BULK_REFERENCE_F=78,BULK_DOUBLING_F=15;
export const toF=(n:number,unit:'F'|'C')=>unit==='F'?n:n*9/5+32;
export const fromF=(n:number,unit:'F'|'C')=>unit==='F'?n:(n-32)*5/9;
export const tempLimits={F:{min:50,max:100},C:{min:10,max:38}} as const;
export function bulkEstimate(steps:LiveStep[],doughTempF:number|null){
  const start=steps.find(s=>s.id==='rest'),end=steps.find(s=>s.id==='shape');
  if(doughTempF===null||!Number.isFinite(doughTempF)||!start||!end)return null;
  const planned=Math.round((+end.planned-+start.planned)/60000);
  const minutes=Math.round(planned*2**((BULK_REFERENCE_F-doughTempF)/BULK_DOUBLING_F));
  const readyAt=new Date(+start.at+minutes*60000),checkFrom=new Date(Math.max(+start.at,+readyAt-30*60000));
  return {planned,minutes,difference:minutes-planned,readyAt,checkFrom,plannedEnd:end.at};
}
export function bulkAdvice(e:NonNullable<ReturnType<typeof bulkEstimate>>,time:(d:Date)=>string){
  const lead=`Bulk should take about ${durationText(e.minutes)}, ready around ${time(e.readyAt)}.`;
  if(Math.abs(e.difference)<15)return `${lead} That is close to the plan. Start checking the dough from ${time(e.checkFrom)}.`;
  return e.difference<0
    ?`${lead} That is ${durationText(-e.difference)} before the planned preshape. Start checking from ${time(e.checkFrom)}. If the dough is ready before the last turn, skip the remaining turns and preshape.`
    :`${lead} That is ${durationText(e.difference)} after the planned preshape. Keep folding every 30 minutes until the dough is ready.`;
}

/** Applies an edited clock time to a recorded check-off, choosing the nearest matching day so a correction across midnight stays on the right date. */
export function retime(original:number,hhmm:string){
  const m=/^(\d{2}):(\d{2})$/.exec(hhmm);if(!m||!Number.isFinite(original))return null;
  const candidates=[-1,0,1].map(offset=>{const d=new Date(original);d.setDate(d.getDate()+offset);d.setHours(+m[1],+m[2],0,0);return +d;});
  return candidates.reduce((best,t)=>Math.abs(t-original)<Math.abs(best-original)?t:best);
}

export function untilText(ms:number){
  const min=Math.round(ms/60000);
  return min===0?'due now':min>0?`in ${durationText(min)}`:`due ${durationText(-min)} ago`;
}
export function shiftText(minutes:number){
  return minutes===0?'':`Running ${durationText(Math.abs(minutes))} ${minutes>0?'behind':'ahead of'} plan. Later steps have moved to match.`;
}

const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
const utc=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const encoder=new TextEncoder();
/** iCalendar lines fold at 75 octets; each continuation starts with a space. */
function fold(line:string){
  if(encoder.encode(line).length<=75)return line;
  const out:string[]=[];let current='',length=0;
  for(const ch of line){const n=encoder.encode(ch).length;if(length+n>(out.length?74:75)){out.push(current);current='';length=0;}current+=ch;length+=n;}
  out.push(current);return out.join('\r\n ');
}

/** One event per remaining step, each with an alert when it starts. */
export function scheduleCalendar(steps:LiveStep[],recipeName:string,done:string[],now=Date.now()){
  const checked=new Set(done);
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bread Planner//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for(const step of steps){
    if(checked.has(step.id))continue;
    const end=new Date(+step.at+Math.max(0,step.duration)*60000);
    const description=[step.note,step.readiness&&`Ready when: ${step.readiness}`].filter(Boolean).join('\n\n');
    lines.push('BEGIN:VEVENT',`UID:${step.id}-${utc(step.planned)}@bread-planner`,`DTSTAMP:${utc(new Date(now))}`,`DTSTART:${utc(step.at)}`,`DTEND:${utc(end)}`,`SUMMARY:${escape(`${step.title} · ${recipeName}`)}`);
    if(description)lines.push(`DESCRIPTION:${escape(description)}`);
    lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${escape(step.title)}`,'TRIGGER:PT0M','END:VALARM','END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n')+'\r\n';
}
