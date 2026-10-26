export type InputSpec = { key:string; label:string; cell:string; value:number; unit:string; min?:number; step?:number };
export const durationSpecs: InputSpec[] = [
  ['feed','Starter feed to leaven','C2',660], ['leaven','Leaven fermentation','C4',300], ['autolyse','Autolyse','C6',270],
  ['mix','Mix final dough','C9',15], ['rest','Initial rest','C10',30],
  ...Array.from({length:7},(_,i)=>[`turn${i+1}`,`After turn ${i+1}`,`C${11+i}`,30]),
  ['shape','Cut and shape','C19',5], ['bench1','First bench rest','C20',30], ['fold','Fold','C22',5],
  ['bench2','Second bench rest','C23',5], ['basket','Basket rest','C24',15], ['fridge','Fridge rest','C25',750],
  ['preheat','Preheat oven','C28',60], ['covered','Bake covered','C29',20], ['uncovered','Bake uncovered','C30',23],
].map(([key,label,cell,value])=>({key:String(key),label:String(label),cell:String(cell),value:Number(value),unit:'min',step:1}));
export const doughSpecs:InputSpec[] = [
  {key:'boule',label:'Target weight per boule',cell:'F23',value:1000,unit:'g',min:1},
  {key:'count',label:'Number of boules',cell:'F24',value:2,unit:'loaves',min:1,step:1},
  {key:'bread',label:'Bread flour',cell:'F17',value:86,unit:'%'},
  {key:'wheat',label:'Whole wheat',cell:'F18',value:14,unit:'%'},
  {key:'water',label:'Hydration',cell:'F19',value:80,unit:'%'},
  {key:'salt',label:'Salt',cell:'F20',value:2,unit:'%'},
];
export const leavenSpecs:InputSpec[] = [
  {key:'build',label:'Build base / bread flour',cell:'J17',value:15,unit:'%'},
  {key:'culture',label:'Culture / build base',cell:'J19',value:20,unit:'%'},
  {key:'leavenBread',label:'Bread flour / build base',cell:'J20',value:50,unit:'%'},
  {key:'leavenWheat',label:'Whole wheat / build base',cell:'J21',value:50,unit:'%'},
  {key:'leavenWater',label:'Water / build base',cell:'J22',value:100,unit:'%'},
];
export const manualSpecs:InputSpec[][] = [
  [['red','Red spring flour','J2',800],['wheat','Whole wheat','J3',100],['water1','Autolyse water','J4',680],['rye','Rye flour','J5',100],['leaven','Leaven','J6',200],['salt','Salt','J7',20],['water2','Final-mix water','J8',100]],
  [['white','White flour','N2',800],['wheat','Whole wheat','N3',200],['water1','Autolyse water','N4',750],['leaven','Leaven','N6',200],['salt','Salt','N7',20],['water2','Final-mix water','N8',50]],
].map(rows=>rows.map(([key,label,cell,value])=>({key:String(key),label:String(label),cell:String(cell),value:Number(value),unit:'g'})));
export const blendSpecs:InputSpec[][] = [
  [350,350,100,100,100,750,50], [500,600,0,250,150,1125,75],
].map((values,i)=>values.map((value,j)=>({key:['ap','red','fife','wheat','rye','water1','water2'][j],label:['AP flour','Red spring flour','Red Fife flour','Whole wheat','Rye flour','Water 1','Water 2'][j],cell:`${i?'S':'R'}${j<5?j+2:j+6}`,value,unit:'g'})));
export const SOURCE_URL='https://docs.google.com/spreadsheets/d/1u79izhQ5-9m9P5Ijh1cvMjSCSBsgyWlM1o-bBtaNwi0/edit#gid=614795420';
export type Recipe = 'house'|'custom'|'tartine';
export const houseBatchSpecs:InputSpec[]=[
  {key:'houseCount',cell:'houseCount',label:'Number of loaves',value:2,unit:'loaves',min:1,step:1},
  {key:'houseWeight',cell:'houseWeight',label:'Dough weight per loaf',value:1000,unit:'g',min:1},
];
export const houseBuildSpecs:InputSpec[]=[
  ['houseSeed','Mature starter',28],['houseRed','Red spring flour',71],['houseWheat','Whole-wheat flour',71],['houseWater','Water',142],
].map(([key,label,value])=>({key:String(key),cell:String(key),label:String(label),value:Number(value),unit:'g'}));
export const houseDurationSpecs:InputSpec[]=durationSpecs.map(s=>({...s,cell:`house${s.key[0].toUpperCase()}${s.key.slice(1)}`,label:s.key==='fridge'?'Overnight cold proof':s.label}));
export const bookBatchSpecs:InputSpec[]=[
  {key:'bookCount',cell:'bookCount',label:'Number of loaves',value:2,unit:'loaves',min:1,step:1},
  {key:'bookWeight',cell:'bookWeight',label:'Dough weight per loaf',value:985,unit:'g',min:1},
];
export const bookBuildSpecs:InputSpec[]=[
  {key:'bookBuild',cell:'bookBuild',label:'Leaven build size',value:100,unit:'%',min:0},
  {key:'bookSeed',cell:'bookSeed',label:'Starter weight (1 tbsp)',value:15,unit:'g'},
];
export const bookDurationSpecs:InputSpec[]=[
  ['bookLeaven','Leaven fermentation',720],['bookRest','Initial dough rest',30],['bookBulk','Bulk fermentation',180],
  ['bookPreshape','Divide and preshape',5],['bookBench','Bench rest',30],['bookShape','Final shaping',5],
  ['bookCold','Refrigerated proof',720],['bookWarm','Warm proof',210],['bookWarmup','Warm-up after fridge',60],
  ['bookPreheat','Preheat pot and oven',30],['bookCovered','Bake covered',20],['bookUncovered','Bake uncovered',20],
].map(([key,label,value])=>({key:String(key),cell:String(key),label:String(label),value:Number(value),unit:'min',step:1}));
export const equipmentSpecs:InputSpec[]=[
  {key:'ovenCapacity',cell:'ovenCapacity',label:'Loaves baked at once',value:2,unit:'loaves',min:1,step:1},
  {key:'batchReheat',cell:'batchReheat',label:'Reheat between batches',value:30,unit:'min',step:1},
];
export const customUseSpec:InputSpec={key:'customLeavenUsed',cell:'customLeavenUsed',label:'Leaven to use in dough',value:312,unit:'g'};
export const allSpecs=[...durationSpecs,...doughSpecs,...leavenSpecs,...manualSpecs.flat(),...blendSpecs.flat(),...bookBatchSpecs,...bookBuildSpecs,...bookDurationSpecs,...houseBatchSpecs,...houseBuildSpecs,...houseDurationSpecs,...equipmentSpecs,customUseSpec];
export function dateString(d:Date) {return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function defaults() {
  const date=new Date(); date.setDate(date.getDate()+1);
  const cells:Record<string,number>={};
  for(const s of allSpecs) cells[s.cell]=s.value;
  return {cells,date:dateString(date),time:'09:00',anchor:'leaven' as 'leaven'|'done',done:[] as string[],bookDone:[] as string[],houseDone:[] as string[],recipe:'house' as Recipe,proof:'cold' as 'cold'|'warm',customUseAll:true};
}
export type Plan = ReturnType<typeof defaults>;
// Google Sheets rounds negative half values away from zero too.
export function round(n:number,places=0) {const factor=10**places;return Math.sign(n)*Math.round((Math.abs(n)+Number.EPSILON)*factor)/factor;}
export function ingredients(c:Record<string,number>,requestedUse?:number) {
  const sumPercent=c.F17+c.F18+c.F19+c.F20;
  if(sumPercent<=0) return null;
  const multiplier=round(c.F23*c.F24/sumPercent,1);
  const base=[round(c.F17*multiplier,1),round(c.F18*multiplier,1),round(c.F19*multiplier),round(c.F20*multiplier)];
  const leavenBase=base[0]*c.J17/100;
  const leaven=['J19','J20','J21','J22'].map(k=>round(leavenBase*c[k]/100));
  const leavenTotal=leaven.reduce((a,b)=>a+b,0);
  const used=requestedUse??leavenTotal;
  const fraction=leavenTotal?used/leavenTotal:0;
  // Round the complete remaining quantity, preserving the sheet's rounding when the whole build is used.
  const final=[round(base[0]-(leaven[1]+leaven[0]/2)*fraction),round(base[1]-leaven[2]*fraction),round(base[2]-(leaven[3]+leaven[0]/2)*fraction),base[3],used];
  const autolyse=[round(final[0]*.88),final[1],round(final[2]*.9)];
  const second=[round(final[0]*.12),final[4],final[3],round(final[2]*.1)];
  const total=[...autolyse,...second].reduce((a,b)=>a+b,0);
  const warnings:string[]=[];
  if(used>leavenTotal)warnings.push(`Your build is ${round(used-leavenTotal,1)} g short of the leaven needed. Increase the build or reduce the amount used before mixing.`);
  if(Math.abs(c.F17+c.F18-100)>.0001) warnings.push(`Your flour percentages total ${round(c.F17+c.F18,2)}%. They are kept independent, as in your sheet.`);
  if(Math.min(...final,...autolyse,...second)<0) warnings.push('This leaven build uses more flour or water than the dough contains. Reduce the build or adjust your formula.');
  if(c.C6>c.C4) warnings.push('Your autolyse begins before the leaven is started with these durations.');
  return {multiplier,base,leavenBase,leaven,leavenTotal,leavenUsed:used,reserve:Math.max(0,leavenTotal-used),shortfall:Math.max(0,used-leavenTotal),final,autolyse,second,total,finalTotal:final.reduce((a,b)=>a+b,0),water:autolyse[2]+second[3],flour:autolyse[0]+autolyse[1]+second[0],warnings};
}
export function bookIngredients(c:Record<string,number>){
  const scale=c.bookCount*c.bookWeight/1970;
  const madeParts=[c.bookSeed*scale,100*scale*c.bookBuild/100,100*scale*c.bookBuild/100,200*scale*c.bookBuild/100];
  const made=madeParts.reduce((a,b)=>a+b,0),used=200*scale;
  return {scale,white:900*scale,wheat:100*scale,initialWater:700*scale,finalWater:50*scale,salt:20*scale,used,made,madeParts,reserve:Math.max(0,made-used),shortfall:Math.max(0,used-made),total:c.bookCount*c.bookWeight,flour:1000*scale,water:750*scale,hydration:75,inclusiveHydration:850/1100*100,dustingWheat:100*scale,dustingRice:100*scale};
}
export function houseIngredients(c:Record<string,number>){
  const scale=c.houseCount*c.houseWeight/2000;
  const autolyse=[800,100,680].map(n=>n*scale),second=[100,200,20,100].map(n=>n*scale);
  const madeParts=houseBuildSpecs.map(s=>c[s.cell]*scale),made=madeParts.reduce((a,b)=>a+b,0),used=200*scale;
  return {scale,autolyse,second,total:c.houseCount*c.houseWeight,flour:1000*scale,water:780*scale,hydration:78,used,made,madeParts,reserve:Math.max(0,made-used),shortfall:Math.max(0,used-made)};
}
export function loafCount(p:Plan){return p.cells[p.recipe==='house'?'houseCount':p.recipe==='tartine'?'bookCount':'F24'];}
export function batchCount(p:Plan){return Math.ceil(loafCount(p)/p.cells.ovenCapacity);}
export function activeDone(p:Plan){return p.recipe==='house'?p.houseDone:p.recipe==='tartine'?p.bookDone:p.done;}

/** New installs and pre-v3 upgrades open House; all prior recipe values remain intact. */
export function restorePlan(saved:unknown):Plan{
  const base=defaults();
  if(!saved||typeof saved!=='object')return base;
  const envelope=saved as {version?:number;plan?:Partial<Plan>};
  if(![1,2,3,4].includes(envelope.version??0)||!envelope.plan||typeof envelope.plan!=='object')return base;
  const p=envelope.plan;
  for(const spec of allSpecs){const n=p.cells?.[spec.cell];if(typeof n==='number'&&Number.isFinite(n)&&n>=(spec.min??0)&&(spec.step!==1||Number.isInteger(n)))base.cells[spec.cell]=n;}
  if(typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date))base.date=p.date;
  if(typeof p.time==='string'&&/^\d{2}:\d{2}$/.test(p.time))base.time=p.time;
  base.anchor=p.anchor==='done'?'done':'leaven';base.recipe=(envelope.version??0)>=3&&['house','custom','tartine'].includes(p.recipe??'')?p.recipe!:'house';base.proof=p.proof==='warm'?'warm':'cold';base.customUseAll=p.customUseAll!==false;
  const strings=(a:unknown)=>Array.isArray(a)?a.filter((x:unknown):x is string=>typeof x==='string'):[];
  base.done=strings(p.done);base.bookDone=strings(p.bookDone);base.houseDone=(envelope.version??0)>=3?strings(p.houseDone):[];
  if((envelope.version??0)<4&&base.cells.ovenCapacity===1)base.cells.ovenCapacity=2;
  if(envelope.version===1)base.done=base.done.filter(x=>!['done','cooled'].includes(x));
  return base;
}
export function manual(c:Record<string,number>,i:number) {
  const p=i?'N':'J';const flour=i?c.N2+c.N3:c.J2+c.J3+c.J5;const water=c[p+'4']+c[p+'8'];
  return {flour,water,total:flour+water+c[p+'6']+c[p+'7'],hydration:flour?100*water/flour:null};
}
export function blend(c:Record<string,number>,i:number) {
  const p=i?'S':'R';const flour=[2,3,4,5,6].reduce((a,r)=>a+c[p+r],0);const water=c[p+'11']+c[p+'12'];return {flour,water,hydration:flour?100*water/flour:null};
}
export type Step={id:string;title:string;offset:number;duration:number;note?:string;readiness?:string;cell?:string;at:Date};
export function schedule(plan:Plan):Step[] {
  const house=plan.recipe==='house',c={...plan.cells};
  if(house)durationSpecs.forEach((s,i)=>{c[s.cell]=c[houseDurationSpecs[i].cell];});
  const book=plan.recipe==='tartine',rows:Omit<Step,'at'>[]=[];
  const push=(id:string,title:string,offset:number,duration:number,note?:string,readiness?:string,cell?:string)=>rows.push({id,title,offset,duration,note,readiness,cell});
  const leavenCue='Use when aerated and puffy, and a spoonful floats in room-temperature water. If it sinks, allow more fermentation before mixing. The displayed times are estimates and do not move automatically.';
  const bulkCue='Look for a billowy dough and 20% to 30% volume increase. The book allows up to one more hour with folds if needed; wait until the dough is ready before moving on.';
  let firstBake=0,preheat=0,covered=0,uncovered=0,warmup=0;
  // With one batch every loaf bakes together, so the bake steps drop batch numbers.
  const count=loafCount(plan),capacity=c.ovenCapacity,batches=batchCount(plan),single=batches===1;
  const loaves=count===1?'the loaf':count===2?'both loaves':`all ${count} loaves`;
  if(book){
    push('leaven','Make leaven',0,c.bookLeaven,'Keep 1 tbsp of mature starter. Mix with the build water, then the equal white/whole-wheat flour blend. Cover at room temperature.',leavenCue);
    let at=c.bookLeaven;
    push('autolyse','Mix dough and rest',at,c.bookRest,'Disperse the leaven used in the initial water, about 80°F / 27°C. Add white and whole-wheat flour; mix until no dry flour remains. Cover for 25 to 40 minutes.');at+=c.bookRest;
    push('mix','Add salt and final water',at,0,'Work in the salt and reserved water. Keep mixing if the dough separates; it should come together again.');
    push('rest','Begin warm bulk fermentation',at,Math.min(30,c.bookBulk),'Cover and keep at 75°F to 80°F / 24°C to 27°C.');
    for(let elapsed=30,n=1;elapsed<c.bookBulk;elapsed+=30,n++)push(`turn${n}`,`Turn ${n}`,at+elapsed,Math.min(30,c.bookBulk-elapsed),n===1?'Wet your hand. Stretch one quadrant over the dough; rotate and repeat to fold all four sides.':'Repeat the four-sided stretch and fold, with wet hands.');
    at+=c.bookBulk;
    push('shape','Divide and preshape',at,c.bookPreshape,'Dust the top, divide equally and turn flour-side down. Shape taut rounds with the dusting flour on the outside.',bulkCue);at+=c.bookPreshape;
    push('bench1','Bench rest and prepare baskets',at,c.bookBench,'Cover the rounds for 30 minutes. Line proofing baskets or bowls with towels and generously dust with the whole-wheat/rice-flour blend.');at+=c.bookBench;
    push('fold','Final shape',at,c.bookShape,'Turn flour-side down. Stretch and fold the bottom, sides and top over the center; roll seam-side down into a taut round. Place seam-side up in a prepared basket.');at+=c.bookShape;
    if(plan.proof==='cold'){
      push('fridge','Refrigerated final proof',at,c.bookCold,'Cover the baskets. The supplied recipe gives 10 to 12 hours in the refrigerator. Later batches remain chilled until their own warm-up.');at+=c.bookCold;
      warmup=c.bookWarmup;push('warmup',single?`Warm ${loaves} to room temperature`:'Warm batch 1 to room temperature',at,warmup,single?`Remove ${count===1?'the loaf':'the loaves'} from the refrigerator. The schedule`:'Remove only the loaves in the first batch. The schedule includes a warm-up allowance; wait longer if the dough needs it.', 'Bring the dough back to room temperature before baking; use its condition, rather than the clock alone.');at+=warmup;
    }else{
      push('proof','Warm final proof',at,c.bookWarm,'Cover and keep at 75°F to 80°F / 24°C to 27°C. The supplied recipe gives 3 to 4 hours.');at+=c.bookWarm;
    }
    firstBake=at;preheat=c.bookPreheat;covered=c.bookCovered;uncovered=c.bookUncovered;
  }else{
    push('feed','Feed starter',-c.C2,c.C2,'Keep an established starter on its regular feeding routine.');
    push('leaven','Start leaven',0,c.C4,'Build the leaven separately from your flour-and-water autolyse.',leavenCue,'C4');
    push('autolyse','Start autolyse',c.C4-c.C6,c.C6,house?'Mix the red spring flour, whole-wheat flour and first water addition only. Cover. Keep the rye, leaven, salt and remaining water for the final mix.':'Mix the red spring flour, whole wheat and autolyse water. Cover. Leaven and rye are added later in your custom method.',undefined,'C6');
    let at=c.C4;
    const add=(id:string,title:string,cell:string,note?:string,readiness?:string)=>{push(id,title,at,c[cell],note,readiness,cell);at+=c[cell];};
    add('mix','Mix final dough','C9','Add the rye, leaven used, salt and reserved water to the autolysed dough. Mix until incorporated.');
    add('rest','Rest','C10','Keep covered in a warm place, about 75°F to 80°F / 24°C to 27°C, for bulk fermentation.');
    for(let i=1;i<=7;i++)add(`turn${i}`,`Turn ${i}`,'C'+(10+i),'Use wet hands to stretch and fold all four sides of the dough.');
    add('shape','Cut and preshape','C19','Divide into equal pieces and form taut rounds.','Look for a billowy dough and 20% to 30% volume increase.');
    add('bench1','Bench rest','C20','Cover the rounds. Prepare towel-lined baskets with the whole-wheat/rice-flour dusting blend.');
    add('fold','Final shape','C22','Fold the edges toward the center and roll into a taut round.');add('bench2','Bench rest','C23','Leave the shaped loaves covered on the bench.');
    add('basket','Basket rest','C24','Place each loaf seam-side up in its prepared basket. Cover.');
    add('fridge',house?'Overnight cold proof':'Refrigerated final proof','C25',house?'Cover the shaped loaves in their baskets and refrigerate overnight. The default is 12 hours 30 minutes, followed by the morning warm-up and bake. Keep later batches chilled until their own warm-up.':'Cover the shaped loaves in their baskets and refrigerate. Keep later batches refrigerated until their own warm-up.');
    preheat=c.C28;firstBake=at+preheat;warmup=preheat;covered=c.C29;uncovered=c.C30;
    push('warmup',single?`Take ${loaves} out of the fridge`:'Take batch 1 out of fridge',at,warmup,`Allow ${single?(count===1?'the loaf':'the loaves'):'the first batch'} to warm while the oven and pots heat.`);
    const feed=rows.find(s=>s.id==='feed');if(feed)feed.cell='C2';
  }
  push('preheat','Preheat oven and Dutch oven',firstBake-preheat,preheat,`Place the lidded Dutch oven or pots in the oven and heat to ${book?'500°F / 260°C':'540°F / 282°C'}. Use one suitable pot per loaf baked at once.`,undefined,book?undefined:'C28');
  if(!Number.isInteger(count)||count<1||!Number.isInteger(capacity)||capacity<1||!Number.isFinite(batches)||batches>1000)return [];
  let finish=firstBake;
  for(let i=0;i<batches;i++){
    const n=i+1,start=firstBake+i*(covered+uncovered+c.batchReheat),last=i===batches-1;
    const firstLoaf=i*capacity+1,lastLoaf=Math.min(count,(i+1)*capacity);
    const label=firstLoaf===lastLoaf?`loaf ${firstLoaf}`:`loaves ${firstLoaf} to ${lastLoaf}`;
    if(i>0){
      push(`reheat-${n}`,`Reheat for batch ${n}`,start-c.batchReheat,c.batchReheat,`Clean the pot, replace its lid and return the oven to ${book?'500°F / 260°C':'540°F / 282°C'}. This interval is a planning allowance; wait for the pot and oven to reheat.`);
      if(!book||plan.proof==='cold')push(`warmup-${n}`,`Warm batch ${n} (${label})`,start-warmup,warmup,'Remove only this batch from the refrigerator. Later loaves have a longer cold proof.','Bring the dough back to room temperature before its own bake.');
    }
    const bakeTemp=book?'450°F / 232°C':'460°F / 238°C';
    push(i?`covered-${n}`:'covered',single?(count===1?'Bake covered':`Bake covered (${loaves})`):`Batch ${n}: bake covered (${label})`,start,covered,`Dust the loaf tops. Carefully turn seam-side down into the hot pot, score with a lame or razor, and cover. Reduce oven to ${bakeTemp}.`,undefined,book?undefined:'C29');
    push(i?`uncovered-${n}`:'uncovered',single?'Remove lid':`Batch ${n}: remove lid`,start+covered,uncovered,`Remove lid carefully: hot steam can escape. Continue at ${bakeTemp}.`,'Bake until the crust is a rich golden brown; extend the uncovered bake if needed.',book?undefined:'C30');
    const out=start+covered+uncovered;finish=out;
    push(last?'done':`out-${n}`,last?(count===1?'Loaf out of the oven':'All loaves out of the oven'):`Batch ${n} out of the oven`,out,15,'Transfer to a wire rack. The base should sound hollow when tapped. Cool each loaf at least 15 minutes before slicing.');
    push(last?'cooled':`cooled-${n}`,last?(single?'15-minute cooling mark':'Last batch: 15-minute cooling mark'):`Batch ${n}: 15-minute cooling mark`,out+15,0,'This is the minimum cooling time stated in the supplied recipe.');
  }
  const chosen=new Date(`${plan.date}T${plan.time}:00`);
  if(!Number.isFinite(chosen.getTime())||dateString(chosen)!==plan.date||`${String(chosen.getHours()).padStart(2,'0')}:${String(chosen.getMinutes()).padStart(2,'0')}`!==plan.time)return [];
  const start=chosen.getTime()-(plan.anchor==='done'?finish*60000:0);
  const steps=rows.map(row=>({...row,cell:house?undefined:row.cell,at:new Date(start+row.offset*60000)})).sort((a,b)=>a.at.getTime()-b.at.getTime());
  if(house&&!coldProofWindow(steps)?.overnight){const fridge=steps.find(s=>s.id==='fridge');if(fridge)fridge.title='Cold proof (daytime)';}
  return steps;
}
export function coldProofWindow(steps:Step[]){
  const fridge=steps.find(s=>s.id==='fridge');if(!fridge)return null;
  const end=new Date(+fridge.at+fridge.duration*60000);
  return {start:fridge.at,end,minutes:fridge.duration,overnight:dateString(fridge.at)!==dateString(end)};
}
export function loafText(n:number) {return `${n.toLocaleString(undefined,{maximumFractionDigits:1})} ${n===1?'loaf':'loaves'}`;}
export function durationText(n:number) {const h=Math.floor(n/60),m=round(n%60,1);return h?`${h}h${m?` ${m}m`:''}`:`${m} min`;}
export function timeText(d:Date) {return d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
export function calendarText(d:Date) {return d.toLocaleDateString([], {weekday:'long',month:'short',day:'numeric'});}
