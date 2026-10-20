import {defaults as legacyDefaults,restorePlan as restoreLegacy,ingredients,bookIngredients,houseIngredients,schedule as legacySchedule,dateString,type Plan,type Step} from './model.ts';

export const flourNames:Record<string,string>={red:'Red spring flour',white:'White-bread flour',wheat:'Whole-wheat flour',rye:'Rye flour',ap:'All-purpose flour',fife:'Red Fife flour'};
export type RecipeDefinition={id:string;name:string;description:string;method:'house'|'custom'|'tartine';flours:string[];late:string[];houseCompletion?:boolean};
export const definitions:Record<string,RecipeDefinition>={
  house:{id:'house',name:'Preuss House',description:'Our red spring, whole-wheat and rye loaf. Autolyse, then an overnight cold proof.',method:'house',flours:['red','wheat','rye'],late:['rye']},
  tartine:{id:'tartine',name:'Original Tartine',description:'The book’s 90/10 white and whole-wheat loaf, with leaven in the initial mix. Its 12-hour leaven suits an evening start.',method:'tartine',flours:['white','wheat'],late:[]},
  'white-wheat':{id:'white-wheat',name:'White & Whole Wheat',description:'An 80/20 white and whole-wheat loaf, with a separate autolyse and overnight cold proof.',method:'house',flours:['white','wheat'],late:[]},
  'red-rye':{id:'red-rye',name:'Red Spring & Rye',description:'Red spring, whole wheat and rye with extra leaven, a separate autolyse and an overnight cold proof.',method:'custom',flours:['red','wheat','rye'],late:['rye']},
  'five-flour':{id:'five-flour',name:'Five-Flour Sourdough',description:'All-purpose, red spring, Red Fife, whole wheat and rye.',method:'house',flours:['ap','red','fife','wheat','rye'],late:['rye'],houseCompletion:true},
  'four-flour':{id:'four-flour',name:'Four-Flour Sourdough',description:'All-purpose, red spring, whole wheat and rye, with more whole wheat than the five-flour recipe.',method:'house',flours:['ap','red','fife','wheat','rye'],late:['rye'],houseCompletion:true},
  'manual-rye':{id:'manual-rye',name:'Red Spring & Rye Variation',description:'Your separately edited red-spring-and-rye formula.',method:'house',flours:['red','wheat','rye'],late:['rye']},
};
export type Profile={params:Record<string,number>;done:string[]};
export type Planner={recipes:Record<string,Profile>;order:string[];recipe:string;date:string;time:string;anchor:'leaven'|'done';proof:'cold'|'warm';ovenCapacity:number;reheat:number;legacy:Plan};
const clean=(n:number)=>Math.abs(n)<1e-12?0:n;
/** Leaven balances compare sums of separately scaled parts, so sub-microgram differences are arithmetic noise, not a deficit. */
const balance=(n:number)=>Math.max(0,Math.abs(n)<1e-6?0:n);
function leavenFractions(p:Record<string,number>){
  // Mature starter is 100% hydration. Only the portion of the build used in
  // the dough contributes; an empty build assumes the same 100% hydration.
  const flour=p.buildSeed/2+p.buildBread+p.buildWheat,water=p.buildSeed/2+p.buildWater,total=flour+water;
  return total>0?{flour:flour/total,water:water/total}:{flour:.5,water:.5};
}
/** Persisted v5 hydration remains added water / added flour to preserve saved quantities. */
export function totalHydration(p:Record<string,number>){
  const leaven=leavenFractions(p);
  return (p.hydration+p.leaven*leaven.water)/(1+p.leaven*leaven.flour/100);
}
export function addedHydration(total:number,p:Record<string,number>){
  const leaven=leavenFractions(p);
  return clean(total*(1+p.leaven*leaven.flour/100)-p.leaven*leaven.water);
}
function profile(flours:Record<string,number>,water:number,leaven:number,salt:number,finalWater:number,count:number,weight:number,build:number[],done:string[]=[]):Profile{
  const flour=Object.values(flours).reduce((a,b)=>a+b,0),denominator=flour||1;
  return {params:{count,weight,hydration:water/denominator*100,leaven:leaven/denominator*100,salt:salt/denominator*100,reserve:water?finalWater/water*100:0,...Object.fromEntries(Object.entries(flours).map(([k,n])=>[`flour_${k}`,n/denominator*100])),buildSeed:build[0]/denominator*1000,buildBread:build[1]/denominator*1000,buildWheat:build[2]/denominator*1000,buildWater:build[3]/denominator*1000},done:[...done]};
}
/** Identity ignores hydration, water staging and yield, but retains flour, leaven, salt and mixing method. */
export function recipeSignature(id:string,p:Profile){
  const d=definitions[id],entries=Object.entries(p.params).filter(([k,n])=>k.startsWith('flour_')&&n>0).sort(([a],[b])=>a.localeCompare(b)),total=entries.reduce((a,[,n])=>a+n,0)||1;
  return JSON.stringify({method:d.method==='tartine'?'tartine':'autolyse',late:d.late.filter(k=>(p.params[`flour_${k}`]||0)>0).sort(),flours:entries.map(([k,n])=>[k,Math.round(n/total*1e8)]),leaven:Math.round(p.params.leaven*1e6),salt:Math.round(p.params.salt*1e6)});
}
export function consolidate(profiles:Record<string,Profile>,order:string[]){
  const seen=new Map<string,string>(),aliases:Record<string,string>={},unique:string[]=[];
  for(const id of order){const signature=recipeSignature(id,profiles[id]),prior=seen.get(signature);if(prior){aliases[id]=prior;continue;}seen.set(signature,id);unique.push(id);aliases[id]=id;}
  return {order:unique,aliases};
}
export function createPlanner(legacy:Plan=legacyDefaults()):Planner{
  const c=legacy.cells,h=houseIngredients(c),b=bookIngredients(c),old=ingredients(c,legacy.customUseAll?undefined:c.customLeavenUsed);
  const recipes:Record<string,Profile>={
    house:profile({red:800*h.scale,wheat:100*h.scale,rye:100*h.scale},h.water,h.used,h.second[2],h.second[3],c.houseCount,c.houseWeight,h.madeParts,legacy.houseDone),
    tartine:profile({white:b.white,wheat:b.wheat},b.water,b.used,b.salt,b.finalWater,c.bookCount,c.bookWeight,b.madeParts,legacy.bookDone),
    'white-wheat':profile({white:c.N2,wheat:c.N3},c.N4+c.N8,c.N6,c.N7,c.N8,2,(c.N2+c.N3+c.N4+c.N8+c.N6+c.N7)/2,[28,71,71,142].map(n=>n*(c.N2+c.N3)/1000)),
    'manual-rye':profile({red:c.J2,wheat:c.J3,rye:c.J5},c.J4+c.J8,c.J6,c.J7,c.J8,2,(c.J2+c.J3+c.J4+c.J5+c.J6+c.J7+c.J8)/2,[28,71,71,142].map(n=>n*(c.J2+c.J3+c.J5)/1000)),
  };
  const r=old??ingredients(legacyDefaults().cells)!;
  recipes['red-rye']=profile({red:r.autolyse[0],wheat:r.autolyse[1],rye:r.second[0]},r.water,r.leavenUsed,r.final[3],r.second[3],c.F24,r.total/c.F24,r.leaven,legacy.done);
  for(const [id,prefix] of [['five-flour','R'],['four-flour','S']] as const){
    const flours=Object.fromEntries(['ap','red','fife','wheat','rye'].map((k,i)=>[k,c[`${prefix}${i+2}`]])),flour=Object.values(flours).reduce((a,b)=>a+b,0),water=c[`${prefix}11`]+c[`${prefix}12`],count=flour>1250?3:2;
    recipes[id]=profile(flours,water,flour*.2,flour*.02,c[`${prefix}12`],count,(flour*1.22+water)/count,[28,71,71,142].map(n=>n*flour/1000));
  }
  const {order}=consolidate(recipes,['house','tartine','white-wheat','red-rye','five-flour','four-flour','manual-rye']);
  return {recipes,order,recipe:legacy.recipe==='custom'?'red-rye':legacy.recipe,date:legacy.date,time:legacy.time,anchor:legacy.anchor,proof:legacy.proof,ovenCapacity:c.ovenCapacity,reheat:c.batchReheat,legacy};
}
export function restorePlanner(saved:unknown):Planner{
  const envelope=saved as {version?:number;plan?:Partial<Planner>};
  if(!envelope||envelope.version!==5)return createPlanner(restoreLegacy(saved));
  const p=envelope.plan;if(!p||typeof p!=='object')return createPlanner();
  const base=createPlanner(restoreLegacy({version:4,plan:p.legacy}));
  for(const id of Object.keys(definitions)){
    const source=p.recipes?.[id];if(!source)continue;
    for(const [key,defaultValue] of Object.entries(base.recipes[id].params)){
      const n=source.params?.[key],min=key==='count'||key==='weight'?1:0;
      if(typeof n==='number'&&Number.isFinite(n)&&n>=min&&(key!=='count'||Number.isInteger(n))&&(key!=='reserve'||n<=100))base.recipes[id].params[key]=n;else base.recipes[id].params[key]=defaultValue;
    }
    base.recipes[id].done=Array.isArray(source.done)?source.done.filter(x=>typeof x==='string'):[];
  }
  base.order=Array.isArray(p.order)?[...new Set(p.order.filter(id=>typeof id==='string'&&Object.hasOwn(definitions,id)))]:base.order;
  if(!base.order.length)base.order=['house'];
  // Duplicates merge once, when legacy data migrates through createPlanner. A saved order is kept as it is, so an edited recipe never disappears from the list.
  base.recipe=typeof p.recipe==='string'&&base.order.includes(p.recipe)?p.recipe:base.order[0];
  if(typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date))base.date=p.date;
  if(typeof p.time==='string'&&/^\d{2}:\d{2}$/.test(p.time))base.time=p.time;
  base.anchor=p.anchor==='done'?'done':'leaven';base.proof=p.proof==='warm'?'warm':'cold';
  if(typeof p.ovenCapacity==='number'&&Number.isInteger(p.ovenCapacity)&&p.ovenCapacity>0)base.ovenCapacity=p.ovenCapacity;
  if(typeof p.reheat==='number'&&Number.isFinite(p.reheat)&&p.reheat>=0)base.reheat=p.reheat;
  return base;
}
export function calculateRecipe(plan:Planner,id=plan.recipe){
  const d=definitions[id],p=plan.recipes[id].params,total=p.count*p.weight,parts=d.flours.reduce((a,k)=>a+(p[`flour_${k}`]||0),0),denominator=1+(p.hydration+p.leaven+p.salt)/100;
  if(parts<=0||!Number.isFinite(total)||denominator<=0)return null;
  const flour=total/denominator,water=flour*p.hydration/100,used=flour*p.leaven/100,salt=flour*p.salt/100,finalWater=water*p.reserve/100;
  const flours=d.flours.map(key=>({key,name:flourNames[key],grams:clean(flour*(p[`flour_${key}`]||0)/parts),percent:100*(p[`flour_${key}`]||0)/parts}));
  const initial:[string,number][]=[...flours.filter(f=>f.grams>0&&!d.late.includes(f.key)).map(f=>[f.name,f.grams] as [string,number]),['Water',water-finalWater]];
  if(d.method==='tartine')initial.unshift(['Leaven used',used]);
  const final:[string,number][]=[...flours.filter(f=>f.grams>0&&d.late.includes(f.key)).map(f=>[f.name,f.grams] as [string,number]),...(d.method==='tartine'?[]:[['Leaven used',used] as [string,number]]),['Salt',salt],['Water',finalWater]];
  const madeParts=['buildSeed','buildBread','buildWheat','buildWater'].map(k=>p[k]*flour/1000),made=madeParts.reduce((a,b)=>a+b,0);
  const leaven=leavenFractions(p),totalFlour=flour+used*leaven.flour,totalWater=water+used*leaven.water;
  return {total,flour,water,used,salt,hydration:p.hydration,totalHydration:totalHydration(p),totalFlour,totalWater,flours,initial,final,madeParts,made,reserve:balance(made-used),shortfall:balance(used-made),dustingWheat:flour*.1,dustingRice:flour*.1};
}
export function recipeSchedule(plan:Planner):Step[]{
  if(!calculateRecipe(plan))return [];
  const d=definitions[plan.recipe],p=plan.recipes[plan.recipe].params,base:Plan={...plan.legacy,date:plan.date,time:plan.time,anchor:plan.anchor,proof:plan.proof,recipe:d.method,cells:{...plan.legacy.cells,ovenCapacity:plan.ovenCapacity,batchReheat:plan.reheat,houseCount:p.count,bookCount:p.count,F24:p.count}};
  const r=calculateRecipe(plan)!,gram=(n:number)=>`${Math.round(n*10)/10} g`;
  const buildFlour=(d.flours.includes('red')?flourNames.red:d.flours.includes('white')?flourNames.white:'Bread flour').toLowerCase();
  const [seed,bread,wheat,buildWater]=r.madeParts,keep=r.reserve>0?` You use ${gram(r.used)} in the dough and keep ${gram(r.reserve)}.`:r.shortfall>0?` This makes ${gram(r.shortfall)} less than the ${gram(r.used)} the dough needs; increase the build.`:` All ${gram(r.used)} goes into the dough.`;
  const leavenNote=d.method==='tartine'
    ?`Mix ${gram(seed)} (about 1 tbsp) of mature starter with ${gram(buildWater)} water, then add ${gram(bread)} ${buildFlour} and ${gram(wheat)} whole-wheat flour. Cover at room temperature.${keep}`
    :`Mix ${gram(seed)} mature starter, ${gram(bread)} ${buildFlour}, ${gram(wheat)} whole-wheat flour and ${gram(buildWater)} water. Keep it separate from the autolyse and cover.${keep}`;
  return legacySchedule(base).map(step=>{
    if(step.id==='leaven')return {...step,note:leavenNote};
    if(step.id==='autolyse'&&d.method!=='tartine')return {...step,note:`Mix ${r.initial.map(([name,n])=>`${name.toLowerCase()} (${Math.round(n*10)/10} g)`).join(', ')}. Cover. Keep the remaining ingredients for the final mix.`};
    if(step.id==='mix'&&d.method!=='tartine')return {...step,note:`Add ${r.final.map(([name,n])=>`${name.toLowerCase()} (${Math.round(n*10)/10} g)`).join(', ')} after the autolyse. Mix until incorporated.`};
    return step;
  });
}
export function recipeDefaults(plan:Planner,id=plan.recipe){return createPlanner().recipes[id];}

const handsOnStep=/^(feed|leaven|autolyse|mix|turn\d+|shape|bench1|fold|basket|fridge|proof|warmup(?:-\d+)?|preheat|reheat-\d+|covered(?:-\d+)?|uncovered(?:-\d+)?|out-\d+|done)$/;
function isQuietTime(at:Date){const minute=at.getHours()*60+at.getMinutes()+at.getSeconds()/60;return minute>22*60+30||minute<7*60;}
export function quietHourActions(steps:Step[],completed:string[]=[]){
  const checked=new Set(completed);
  return steps.flatMap(step=>{
    if(checked.has(step.id)||!handsOnStep.test(step.id)||!Number.isFinite(+step.at))return [];
    const startsQuiet=isQuietTime(step.at);
    // Most durations are unattended rests or bake intervals. Only these three
    // durations describe continuous mixing or shaping work.
    const activeDuration=['mix','shape','fold'].includes(step.id)?step.duration:0;
    const end=new Date(+step.at+activeDuration*60000);
    const continues=activeDuration>0&&(isQuietTime(end)||dateString(step.at)!==dateString(end));
    return startsQuiet||continues?[{step,continues:!startsQuiet}]:[];
  });
}
