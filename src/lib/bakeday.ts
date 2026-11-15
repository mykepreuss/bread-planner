import {durationText,type Step} from './model.ts';

/** A step as it stands on bake day: when it was planned, and when it now falls or was actually done. */
export type LiveStep=Step&{planned:Date;actual?:Date};

/** Checking these steps never moves the rest of the plan. The starter feed sits outside the bake, and the autolyse only needs to be ready before the leaven is. */
const fixedSteps=new Set(['feed','autolyse']);

/** Check-off times are kept to the minute, so shifted steps land on whole minutes. */
export function stampNow(now=Date.now()){return Math.round(now/60000)*60000;}

/**
 * Moves the plan to follow the dough. Each checked step with a recorded time takes that time.
 * Unchecked steps after it keep their planned spacing from it, so a late leaven moves everything that follows.
 */
export function liveSchedule(steps:Step[],done:string[],doneAt:Record<string,number>={}){
  const checked=new Set(done);let shift=0;
  const live:LiveStep[]=steps.map(step=>{
    const t=checked.has(step.id)?doneAt[step.id]:undefined;
    if(typeof t==='number'&&Number.isFinite(t)){
      if(!fixedSteps.has(step.id))shift=t-+step.at;
      return {...step,planned:step.at,actual:new Date(t),at:new Date(t)};
    }
    return {...step,planned:step.at,at:new Date(+step.at+shift)};
  });
  return {steps:live,shift:Math.round(shift/60000)};
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
