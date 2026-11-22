/**
 * What the planner shows, read through the current code. Step 0 of the rebuild records these observations in
 * baseline.json, and every later step must reproduce them. Inputs are plain data, so the record outlives the code it
 * was taken from: when the old core is replaced, this adapter is the only file that changes.
 *
 * Everything runs in America/Vancouver (`useBaselineTimeZone`). Times are written as local wall-clock time with the
 * UTC offset, such as `2026-11-22 09:00 -08`, so a daylight-saving change shows.
 */
import {createPlanner,restorePlanner,calculateRecipe,recipeSchedule,quietHourActions,addedHydration,totalHydration,type Planner} from '../../src/lib/recipes.ts';
import {coldProofWindow,dateString,durationText,round} from '../../src/lib/model.ts';
import {followDough,skippedSteps,stepPhase,stepGaps,holdTemperature,bulkAdvice,bulkDoneText,turnNumber,untilText,shiftText,fromF,toF,withReading,retime,stampNow,inTempRange,clockText,type BulkReading} from '../../src/lib/bakeday.ts';

export const TIME_ZONE='America/Vancouver';
/**
 * The npm scripts start Node with `TZ=America/Vancouver`: on Vercel's Linux build, Node did not apply a time zone
 * set while running. Setting it here as well covers a direct `node --test` run on a Mac, where it does apply. Either
 * way, check it took, so a baseline is never compared in the wrong zone.
 */
export function useBaselineTimeZone(){
  if(process.env.TZ!==TIME_ZONE)process.env.TZ=TIME_ZONE;
  if(new Date('2026-07-01T12:00:00').getTimezoneOffset()!==420||new Date('2026-12-01T12:00:00').getTimezoneOffset()!==480)throw new Error(`The baseline needs the ${TIME_ZONE} time zone: start Node with TZ=${TIME_ZONE}, as \`npm test\` does.`);
}

/** Local wall-clock time and UTC offset, such as `2026-11-22 09:00 -08`. */
export function stamp(t:Date|number){
  const d=new Date(t);if(!Number.isFinite(+d))return 'invalid';
  const offset=-d.getTimezoneOffset()/60;
  return `${dateString(d)} ${clockText(d)} ${offset<0?'-':'+'}${String(Math.abs(offset)).padStart(2,'0')}`;
}
/**
 * Runs `run` with the clock stopped at `at`: `Date.now()` and `new Date()` give that moment, and dates built from a
 * value work as usual. With `plainText`, a date's toLocaleTimeString and toLocaleDateString give `HH:MM` and
 * `YYYY-MM-DD`, so times on the rendered screen read the same on any machine, whatever its locale.
 */
export function atMoment<T>(at:number,run:()=>T,plainText=false):T{
  const Real=Date;
  class Frozen extends Real{
    constructor(...args:unknown[]){if(args.length)super(...(args as [number]));else super(at);}
    static now(){return at;}
  }
  if(plainText){
    Frozen.prototype.toLocaleTimeString=function(){return clockText(this);};
    Frozen.prototype.toLocaleDateString=function(){return dateString(this);};
  }
  globalThis.Date=Frozen as DateConstructor;
  try{return run();}finally{globalThis.Date=Real;}
}

/** Epoch milliseconds for a local `YYYY-MM-DD HH:MM`. */
export function local(s:string){
  const v=+new Date(`${s.replace(' ','T')}:00`);
  if(!Number.isFinite(v))throw new Error(`Not a local time: ${s}`);
  return v;
}

/**
 * One plan as the baker set it up. `params` are the saved v5 recipe settings for the selected recipe; `totalHydration`
 * is applied after them, as typing into the Total hydration field does. Check-off and reading times are local.
 */
export type PlanInput={recipe:string;date:string;time:string;anchor?:'leaven'|'done';proof?:'cold'|'warm';ovenCapacity?:number;reheat?:number;tempUnit?:'F'|'C';
  params?:Record<string,number>;totalHydration?:number;done?:string[];doneAt?:Record<string,string>;doughTemp?:number|null;bulkTemps?:{at:string;f:number}[];now:string};
export type FormulaInput={recipe:string;params?:Record<string,number>;totalHydration?:number};
export type HelperCall={fn:string;args:unknown[]};

export function planner(i:PlanInput|FormulaInput&{date?:string;time?:string}):Planner{
  const p=createPlanner(),full=i as Partial<PlanInput>;
  if(!(i.recipe in p.recipes))throw new Error(`Unknown recipe ${i.recipe}`);
  Object.assign(p,{recipe:i.recipe,date:full.date??'2026-11-22',time:full.time??'09:00',anchor:full.anchor??'leaven',proof:full.proof??'cold',ovenCapacity:full.ovenCapacity??2,reheat:full.reheat??30,tempUnit:full.tempUnit??'F'});
  if(!p.order.includes(i.recipe))p.order.push(i.recipe);
  const profile=p.recipes[i.recipe];
  Object.assign(profile.params,i.params);
  if(i.totalHydration!==undefined)profile.params.hydration=Math.max(0,addedHydration(i.totalHydration,profile.params));
  profile.done=[...(full.done??[])];
  profile.doneAt=Object.fromEntries(Object.entries(full.doneAt??{}).map(([id,t])=>[id,local(t)]));
  profile.doughTemp=full.doughTemp??null;
  profile.bulkTemps=(full.bulkTemps??[]).map(r=>({at:local(r.at),f:r.f}));
  return p;
}

/**
 * The Schedule tab for one plan: every step as the timeline shows it, and what the Up next card, the notices and the
 * bake summary show. The view block mirrors App.tsx at 34699a7 (lines 173 to 205); step 3 of the rebuild moves those
 * rules into tested code and this adapter then calls it.
 */
export function observePlan(i:PlanInput){
  const plan=planner(i),now=local(i.now),profile=plan.recipes[plan.recipe],checks=profile.done;
  const planned=recipeSchedule(plan);
  const {steps,shift,estimate,turns,bulkMinutes,checkFrom}=followDough(planned,checks,profile.doneAt,profile.doughTemp,profile.bulkTemps);
  const doneStep=steps.find(s=>s.id==='done'),first=steps[0];
  const skipped=skippedSteps(steps,checks),settled=[...checks,...skipped];
  const remaining=steps.filter(s=>!settled.includes(s.id)),completed=steps.filter(s=>checks.includes(s.id)).length,next=remaining[0];
  const stale=doneStep!==undefined&&+doneStep.at<now&&(completed===0||remaining.length===0);
  const tempText=(f:number)=>`${round(fromF(f,plan.tempUnit),plan.tempUnit==='C'?1:0)}°${plan.tempUnit}`;
  const advice=bulkMinutes!==null?bulkDoneText(bulkMinutes,estimate):estimate?bulkAdvice(estimate,stamp,{turns,hold:holdTemperature(estimate,now),temp:tempText}):null;
  const shape=steps.find(s=>s.id==='shape');
  const during=next!==undefined&&(next.id==='shape'||turnNumber(next.id)>0);
  const night=quietHourActions(steps,settled),quiet=new Map(night.map(a=>[a.step.id,a.continues?'continues':'starts']));
  const gaps=stepGaps(steps),proof=coldProofWindow(steps),count=plan.recipes[plan.recipe].params.count;
  return {
    steps:steps.map(s=>({id:s.id,title:s.title,at:stamp(s.at),phase:stepPhase(s.id),gap:gaps.get(s.id)??0,
      ...(s.note!==undefined&&{note:s.note}),...(s.readiness!==undefined&&{ready:s.readiness}),
      ...(+s.planned!==+s.at&&{planned:stamp(s.planned)}),...(s.actual&&{actual:stamp(s.actual)}),
      ...(checks.includes(s.id)?{state:'done'}:skipped.includes(s.id)?{state:'skipped'}:!stale&&next?.id===s.id?{state:'next'}:{}),
      ...(quiet.has(s.id)&&{quiet:quiet.get(s.id)})})),
    view:{
      batches:Math.ceil(count/plan.ovenCapacity),finish:doneStep?stamp(doneStep.at):null,
      totalTime:first&&doneStep?durationText((+doneStep.at-+first.at)/60000):null,
      checked:completed,stale,underway:checks.length>0&&!stale,allDone:remaining.length===0&&steps.length>0,
      days:[...new Set(steps.map(s=>dateString(s.at)))],
      upNext:next&&!stale?{id:next.id,countdown:untilText(+next.at-now),then:remaining[1]?.id??null,
        doughCheck:turnNumber(next.id)>0&&shape!==undefined&&checkFrom!==null&&now>=+checkFrom,
        temperatureField:during&&profile.doughTemp!==null?'now':during||next.id==='rest'?'after mixing':null}:null,
      shift,shiftText:shiftText(shift),
      estimate:estimate&&{planned:estimate.planned,minutes:estimate.minutes,difference:estimate.difference,readyAt:stamp(estimate.readyAt),checkFrom:stamp(estimate.checkFrom),plannedEnd:stamp(estimate.plannedEnd)},
      turns,bulkMinutes,checkFrom:checkFrom?stamp(checkFrom):null,advice,
      quietHours:night.length,coldProof:proof&&{start:stamp(proof.start),end:stamp(proof.end),minutes:proof.minutes,overnight:proof.overnight},
    },
  };
}

/** The Ingredients tab for one recipe: the weights, totals and leaven balance it shows. Null when it cannot calculate. */
export function observeFormula(i:FormulaInput){
  const plan=planner(i),r=calculateRecipe(plan);
  if(!r)return null;
  const params=plan.recipes[plan.recipe].params;
  return {total:r.total,flour:r.flour,water:r.water,used:r.used,salt:r.salt,addedHydration:r.hydration,totalHydration:r.totalHydration,shownHydration:Math.round(r.totalHydration),
    hydrationMin:Math.ceil(totalHydration({...params,hydration:0})),totalFlour:r.totalFlour,totalWater:r.totalWater,
    flours:r.flours.map(f=>({key:f.key,name:f.name,grams:f.grams,percent:f.percent})),initial:r.initial,final:r.final,
    made:r.made,madeParts:r.madeParts,reserve:r.reserve,shortfall:r.shortfall,dustingRice:r.dustingRice};
}

/**
 * Saved data is loaded at this moment. Without a valid saved date a plan starts the next day, so loading at a fixed
 * moment keeps that date the same on every run, and far from every date the cases save.
 */
export const LOADED_AT='2030-01-01 12:00';

/** Saved browser data after loading: the settings, checklists and readings it gives every recipe, and the selected plan's times. */
export function observeRestore(saved:unknown){
  const p=atMoment(local(LOADED_AT),()=>restorePlanner(saved));
  return {recipe:p.recipe,order:p.order,date:p.date,time:p.time,anchor:p.anchor,proof:p.proof,ovenCapacity:p.ovenCapacity,reheat:p.reheat,tempUnit:p.tempUnit,
    recipes:Object.fromEntries(Object.entries(p.recipes).map(([id,r])=>[id,{params:r.params,done:r.done,doneAt:Object.fromEntries(Object.entries(r.doneAt).map(([k,t])=>[k,stamp(t)])),doughTemp:r.doughTemp,bulkTemps:r.bulkTemps.map(b=>({at:stamp(b.at),f:b.f}))}])),
    schedule:recipeSchedule(p).map(s=>`${s.id} ${stamp(s.at)}`)};
}

/** Small helpers whose wording or rounding the screen shows directly. */
export function observeHelper({fn,args}:HelperCall):unknown{
  const a=args as never[];
  switch(fn){
    case 'retime':{const t=retime(a[0],a[1]);return t===null?null:stamp(t);}
    case 'untilText':return untilText(a[0]);
    case 'shiftText':return shiftText(a[0]);
    case 'durationText':return durationText(a[0]);
    case 'stampNow':return stamp(stampNow(local(a[0])+(a[1] as number)*1000));
    case 'withReading':{const read=(r:{at:string;f:number}):BulkReading=>({at:local(r.at),f:r.f});return withReading((a[0] as {at:string;f:number}[]).map(read),read(a[1])).map(r=>({at:stamp(r.at),f:r.f}));}
    case 'toF':return toF(a[0],a[1]);
    case 'fromF':return fromF(a[0],a[1]);
    case 'inTempRange':return inTempRange(a[0],a[1]);
    default:throw new Error(`Unknown helper ${fn}`);
  }
}
