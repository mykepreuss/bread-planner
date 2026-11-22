import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {useForm,useSelector} from '@tanstack/react-form';
import {useTable,tableFeatures,flexRender,type ColumnDef} from '@tanstack/react-table';
import {Wheat,Clock3,Check,RotateCcw,Info,Flame,Snowflake,Scale,CalendarDays,Moon,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Slider} from '@/components/ui/slider';
import {Label} from '@/components/ui/label';
import {Card,CardContent,CardHeader,CardTitle,CardDescription} from '@/components/ui/card';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Checkbox} from '@/components/ui/checkbox';
import {Badge} from '@/components/ui/badge';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '@/components/ui/accordion';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from '@/components/ui/table';
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from '@/components/ui/tooltip';
import {AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {coldProofWindow,calendarText,dateString,durationText,loafText,timeText,round,type InputSpec} from '@/lib/model';
import {definitions,flourNames,createPlanner,restorePlanner,calculateRecipe,recipeSchedule,recipeDefaults,quietHourActions,totalHydration,addedHydration,type Planner,type Profile} from '@/lib/recipes';
import {followDough,holdTemperature,withReading,bulkDoneText,turnNumber,inTempRange,retime,clockText,stepGaps,shiftText,stampNow,untilText,skippedSteps,stepPhase,bulkAdvice,toF,fromF,tempLimits,type LiveStep} from '@/lib/bakeday';
import {cn} from '@/lib/utils';

const STORAGE='bread-planner.v5';
function loadPlan():Planner {
  try{return restorePlanner(JSON.parse(localStorage.getItem(STORAGE)||'null'));}catch{return createPlanner();}
}
function useCalculator(initial:Planner){return useForm({defaultValues:initial});}
type Calculator=ReturnType<typeof useCalculator>;
const FormContext=createContext<Calculator|null>(null);
function useCalc(){const form=useContext(FormContext);if(!form)throw new Error('Calculator unavailable');return form;}
const g=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:1});
const sliderRanges:Record<string,{min:number;max:number;step:number}>={
  hydration:{min:50,max:100,step:1},
  leaven:{min:0,max:50,step:1},
  salt:{min:0,max:5,step:.1},
  reserve:{min:0,max:100,step:1},
};

function Amount({value,onChange,onBlur,label,id,min=0,step=.1,max}:{value:number;onChange:(n:number)=>void;onBlur:()=>void;label:string;id?:string;min?:number;step?:number;max?:number}){
  const [draft,setDraft]=useState(String(round(value,3)));const [focused,setFocused]=useState(false);
  useEffect(()=>{if(!focused)setDraft(String(round(value,3)));},[value,focused]);
  const n=Number(draft);const invalid=draft.trim()===''||!Number.isFinite(n)||n<min||(max!==undefined&&n>max)||(step===1&&!Number.isInteger(n));
  return <><Input id={id} aria-label={label} aria-invalid={invalid} title={invalid?`Enter ${step===1?'a whole number':'a number'} of at least ${min}`:undefined} type="number" inputMode="decimal" min={min} max={max} step={step} value={draft} onFocus={()=>setFocused(true)} onChange={e=>{setDraft(e.target.value);const num=e.target.valueAsNumber;if(Number.isFinite(num)&&num>=min&&(max===undefined||num<=max)&&(step!==1||Number.isInteger(num)))onChange(num);}} onBlur={()=>{setFocused(false);if(invalid)setDraft(String(round(value,3)));onBlur();}}/>{invalid&&<span className="input-error">Use {step===1?'a whole number':'a number'} {max===undefined?`≥ ${min}`:`from ${min} to ${max}`} </span>}</>;
}
function NumberField({spec,compact=false,context,hydrationParams}:{spec:InputSpec;compact?:boolean;context?:string;hydrationParams?:Record<string,number>}){
  const form=useCalc(),id=useSelector(form.store,s=>s.values.recipe);
  const name=spec.cell==='reheat'?spec.cell:`recipes.${id}.params.${spec.cell}` as const;
  const range=compact?undefined:sliderRanges[spec.cell];
  return <form.Field name={name} validators={{onChange:({value})=>Number.isFinite(value)&&value>=(spec.min??0)?undefined:'Enter a valid amount'}}>{field=>{const value=hydrationParams?Math.round(totalHydration(hydrationParams)):field.state.value,min=hydrationParams?Math.ceil(totalHydration({...hydrationParams,hydration:0})):spec.min??0,rangeMin=range?Math.max(min,Math.min(range.min,Math.floor(value/10)*10)):0,rangeMax=range?Math.max(range.max,Math.ceil(value/10)*10,rangeMin+10):0;
    const change=(next:number)=>field.handleChange(hydrationParams?Math.max(0,addedHydration(next,hydrationParams)):next);
    return <div className={compact?'cell-control':'number-field'}>
    {!compact&&<Label htmlFor={`field-${spec.cell}`}>{spec.label}</Label>}
    <div className="amount-wrap"><Amount id={`field-${spec.cell}`} label={context?`${spec.label} (${context})`:spec.label} value={value} min={min} max={spec.cell==='reserve'?100:undefined} step={spec.step??.001} onChange={change} onBlur={field.handleBlur}/><span className="unit">{spec.unit}</span></div>
    {range&&<div className="range-control"><Slider aria-label={`Adjust ${spec.label.toLowerCase()}`} aria-valuetext={`${value.toLocaleString(undefined,{maximumFractionDigits:3})} percent`} value={[value]} min={rangeMin} max={rangeMax} step={range.step} onValueChange={([next])=>change(next)} onValueCommit={field.handleBlur}/><div className="range-limits" aria-hidden="true"><span>{g(rangeMin)}%</span><span>{g(rangeMax)}%</span></div></div>}
  </div>;}}</form.Field>;
}
function FieldGroup({specs}:{specs:InputSpec[]}){return <div className="field-grid">{specs.map(spec=><NumberField key={spec.cell} spec={spec}/>)}</div>;}
function Panel({title,description,children,icon,className}:{title:string;description?:string;children:ReactNode;icon?:ReactNode;className?:string}){return <Card className={cn('work-card',className)}><CardHeader><div className="card-title-row"><CardTitle>{title}</CardTitle>{icon}</div>{description&&<CardDescription>{description}</CardDescription>}</CardHeader><CardContent>{children}</CardContent></Card>;}
function Weights({rows,totalLabel,total}:{rows:[string,number][];totalLabel?:string;total?:number}){return <dl className="weights">{rows.map(([name,amount])=><div key={name}><dt>{name}</dt><dd>{g(amount)} <span>g</span></dd></div>)}{total!==undefined&&<div className="weight-total"><dt>{totalLabel||'Total'}</dt><dd>{g(total)} <span>g</span></dd></div>}</dl>;}

function LeavenBalance({made,used,reserve,shortfall}:{made:number;used:number;reserve:number;shortfall:number}){
  return <div className={`leaven-balance${shortfall>0?' is-short':''}`} aria-label="Leaven balance"><div><span>Made</span><strong>{g(made)} g</strong></div><div><span>Used in dough</span><strong>{g(used)} g</strong></div><div><span>{shortfall>0?'Short by':'Reserved'}</span><strong>{g(shortfall>0?shortfall:reserve)} g</strong></div></div>;
}
function MethodGuide({book}:{book:boolean}){return <Accordion type="multiple" className="method-guide">
  <AccordionItem value="ready"><AccordionTrigger>Mature starter and readiness guide</AccordionTrigger><AccordionContent><div className="guide-copy">
    <p><strong>Start with an established starter.</strong> This bake schedule assumes your starter already rises and falls predictably after feeding. It does not include the initial week of starter establishment.</p>
    <p><strong>Leaven:</strong> look for an aerated, puffy build. A spoonful should float in room-temperature water. If it sinks, ferment longer before mixing.</p>
    <p><strong>Bulk:</strong> keep covered at 75°F to 80°F / 24°C to 27°C. Fold all four sides with a wet hand every half-hour. The book calls for a billowy dough with 20% to 30% volume increase after about three hours; if needed, allow up to another hour with folds. Allow more time when the dough needs it.</p>
    <p><strong>Proof and bake:</strong> the book gives 3 to 4 hours warm, or 10 to 12 hours refrigerated with a return to room temperature. Later serial batches may spend longer chilled or waiting to bake. Judge the dough's condition as well as the planned times.</p>
    <p><strong>Crust and cooling:</strong> bake uncovered until rich golden brown, extending the time if needed. The base should sound hollow when tapped. Move to a rack and cool at least 15 minutes before slicing.</p>
    {!book&&<p>This recipe uses a separate flour-and-water autolyse, followed by the final mix and an overnight cold proof. Work the first three turns vigorously, going around all four sides twice, to build gluten structure early; later turns are a single round. The dated schedule shows when to refrigerate and bake.</p>}
  </div></AccordionContent></AccordionItem>
  <AccordionItem value="starter"><AccordionTrigger>Establishing a starter from scratch</AccordionTrigger><AccordionContent><div className="guide-copy">
    <p>Make a reserve of equal weights white-bread and whole-wheat flour, such as 1,000 g of each. It covers repeated feedings, not one dough batch.</p>
    <p>In a jar, mix 100 g warm water, about 80°F / 27°C, with 100 g of the flour blend. Cover with a towel and leave at room temperature for 2 to 3 days, looking for bubbling and expansion.</p>
    <p>Once active, feed at the same time daily: discard 80%, then add equal weights warm water and flour blend, such as 50 g of each. Allow about a week for predictable rises and falls and a slightly sour smell before building the leaven for bread.</p>
  </div></AccordionContent></AccordionItem>
  <AccordionItem value="shaping"><AccordionTrigger>Shaping, basket preparation and baking</AccordionTrigger><AccordionContent><div className="guide-copy">
    <p><strong>Preshape:</strong> dust the dough top, divide equally and turn flour-side down. Bring cut edges onto themselves and work each piece into a taut round, keeping dusting flour on the outside. Cover and bench-rest for 30 minutes.</p>
    <p><strong>Baskets:</strong> use rice flour, about 200 g for the two-loaf book batch. Line baskets or bowls with towels, flour generously, and keep the unused rice flour.</p>
    <p><strong>Final shape:</strong> dust and flip each round flour-side down. Stretch the bottom corners toward you and fold into the middle; repeat from both sides and the top. Roll seam-side down into a taut round. Transfer to a basket seam-side up and cover for the selected proof.</p>
    <p><strong>Hot pots:</strong> preheat lidded Dutch ovens inside the oven. Dust loaf tops, carefully turn into the hot pots seam-side down, score with a lame or razor, cover and lower to the bake temperature. Remove lids carefully for the uncovered bake because steam may escape.</p>
    <p><strong>Next batch:</strong> remove baked loaves to a rack, clean the pots and reheat them with their lids at the preheat temperature. Wait until they are hot before loading. Keep later refrigerated loaves chilled until their own warm-up; bake only as many as your capacity setting allows.</p>
  </div></AccordionContent></AccordionItem>
</Accordion>;}
/** Re-renders every 30 seconds, and as soon as the page is shown again, so countdowns stay current on a phone that has been asleep. */
function useNow(){
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const tick=()=>setNow(Date.now()),timer=setInterval(tick,30000);document.addEventListener('visibilitychange',tick);return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[]);
  return now;
}
function whenText(at:Date,now:number){return dateString(at)===dateString(new Date(now))?timeText(at):`${calendarText(at)} at ${timeText(at)}`;}
type TempUnit='F'|'C';
/** Measured dough temperature, stored in °F and entered in either unit. An empty field clears it. */
/** The number field and °F/°C switch shared by both dough temperature forms, with an optional action beside them. */
function TempRow({id,draft,unit,invalid,onDraft,onUnit,onFocus,onBlur,children}:{id:string;draft:string;unit:TempUnit;invalid:boolean;onDraft:(v:string)=>void;onUnit:(u:TempUnit)=>void;onFocus?:()=>void;onBlur?:()=>void;children?:ReactNode}){
  const limits=tempLimits[unit];
  return <><div className="dough-temp-row"><Input id={id} type="number" inputMode="decimal" step={.5} min={limits.min} max={limits.max} placeholder={unit==='F'?'78':'26'} value={draft} aria-invalid={invalid} onFocus={onFocus} onChange={e=>onDraft(e.target.value)} onBlur={onBlur}/>
      <Select value={unit} onValueChange={v=>onUnit(v as TempUnit)}><SelectTrigger className="temp-unit" aria-label="Temperature unit"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="F">°F</SelectItem><SelectItem value="C">°C</SelectItem></SelectContent></Select>{children}</div>
    {invalid&&<span className="input-error">Use {limits.min} to {limits.max}°{unit}</span>}</>;
}
function DoughTemperature({id,valueF,unit,onChange,onUnit,advice}:{id:string;valueF:number|null;unit:TempUnit;onChange:(f:number|null)=>void;onUnit:(u:TempUnit)=>void;advice?:string}){
  const shown=valueF===null?'':String(Math.round(fromF(valueF,unit)*10)/10);
  const [draft,setDraft]=useState(shown),[focused,setFocused]=useState(false);
  useEffect(()=>{if(!focused)setDraft(shown);},[shown,focused]);
  const invalid=draft.trim()!==''&&!inTempRange(Number(draft),unit);
  const change=(v:string)=>{setDraft(v);if(v.trim()==='')onChange(null);else if(inTempRange(Number(v),unit))onChange(toF(Number(v),unit));};
  return <div className="dough-temp">
    <Label htmlFor={id}>Dough temperature after mixing</Label>
    <TempRow id={id} draft={draft} unit={unit} invalid={invalid} onDraft={change} onUnit={onUnit} onFocus={()=>setFocused(true)} onBlur={()=>{setFocused(false);if(invalid)setDraft(shown);}}/>
    <p className="bulk-advice" aria-live="polite">{advice??'Measure the dough after mixing to estimate how long bulk will take. The plan counts 78°F / 26°C as normal.'}</p>
  </div>;
}
/** A later reading during bulk. It is added with the time it was taken, and re-times only the fermentation still to come. */
function Remeasure({id,unit,onUnit,onAdd,advice}:{id:string;unit:TempUnit;onUnit:(u:TempUnit)=>void;onAdd:(f:number)=>void;advice?:string}){
  const [draft,setDraft]=useState(''),entered=draft.trim()!=='',valid=entered&&inTempRange(Number(draft),unit);
  return <form className="dough-temp" onSubmit={e=>{e.preventDefault();if(valid){onAdd(toF(Number(draft),unit));setDraft('');}}}>
    {advice&&<p className="bulk-advice lead" aria-live="polite">{advice}</p>}
    <Label htmlFor={id}>Dough temperature now</Label>
    <TempRow id={id} draft={draft} unit={unit} invalid={entered&&!valid} onDraft={setDraft} onUnit={onUnit}><Button type="submit" variant="outline" disabled={!valid}>Update</Button></TempRow>
  </form>;
}
/** From 30 minutes before bulk should end, a turn's card leads with the dough: check it, and preshape now if it is ready. */
function NowCard({next,then,shift,now,onDone,bulk,doughCheck}:{next:LiveStep;then?:LiveStep;shift:number;now:number;onDone:()=>void;bulk?:ReactNode;doughCheck?:{readiness?:string;onReady:()=>void}}){
  const due=+next.at<=now;
  return <section className={`now-card phase-${stepPhase(next.id)}${due?' is-due':''}`} aria-label="Up next">
    <div className="now-when"><span className="eyebrow">Up next</span><span className="now-countdown">{untilText(+next.at-now)}</span></div>
    <h2>{next.title}</h2>
    <p className="now-time"><time dateTime={next.at.toISOString()}>{whenText(next.at,now)}</time></p>
    {doughCheck&&<div className="dough-check"><p><strong>Check the dough before this turn.</strong>{doughCheck.readiness&&<> Ready when: {doughCheck.readiness}</>}</p><Button variant="outline" onClick={doughCheck.onReady}>Ready: preshape now</Button></div>}
    {next.note&&<p className="now-note">{next.note}</p>}
    {next.readiness&&<p className="readiness-cue"><strong>Ready when:</strong> {next.readiness}</p>}
    {shift!==0&&<p className="now-shift"><Clock3 size={16}/>{shiftText(shift)}</p>}
    {bulk}
    <div className="now-actions"><Button size="lg" onClick={onDone}><Check/> Done</Button>{then&&<p>Then: {then.title} · {whenText(then.at,now)}</p>}</div>
  </section>;
}
const features=tableFeatures({});
function FlourTable({values}:{values:Planner}){
  const r=calculateRecipe(values),d=definitions[values.recipe];
  const rows=d.flours.map(key=>({key,grams:r?.flours.find(f=>f.key===key)?.grams??0,percent:r?.flours.find(f=>f.key===key)?.percent??0}));
  type Row=typeof rows[number];
  const columns=useMemo<ColumnDef<typeof features,Row>[]>(()=>[
    {id:'flour',header:'Flour',cell:ctx=><span className="flour-name">{flourNames[ctx.row.original.key]}<small>{ctx.row.original.grams>0?`${g(ctx.row.original.grams)} g in this batch · ${g(ctx.row.original.percent)}%`:'Optional · not used'}</small></span>},
    {id:'parts',header:'Blend parts',cell:ctx=><NumberField compact spec={{key:ctx.row.original.key,cell:`flour_${ctx.row.original.key}`,label:`${flourNames[ctx.row.original.key]} proportion`,value:0,unit:'parts'}}/>},
  ],[]);
  const table=useTable({features,columns,data:rows});
  return <Table className="flour-table"><TableHeader>{table.getHeaderGroups().map(group=><TableRow key={group.id}>{group.headers.map(h=><TableHead key={h.id}>{flexRender(h.column.columnDef.header,h.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.map(row=><TableRow key={row.id}>{row.getAllCells().map(cell=><TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell,cell.getContext())}</TableCell>)}</TableRow>)}</TableBody></Table>;
}
function spec(cell:string,label:string,unit:string,min=0,step=.001):InputSpec{return {key:cell,cell,label,unit,value:0,min,step};}
function RecipeFormula({values,onReset}:{values:Planner;onReset:()=>void}){
  const r=calculateRecipe(values),d=definitions[values.recipe],p=values.recipes[values.recipe].params,book=d.method==='tartine';
  const buildFlour=d.flours.includes('red')?'Red spring flour':d.flours.includes('white')?'White-bread flour':'Bread flour';
  return <><div className="formula-layout"><div className="form-stack">
    <Panel title="Your batch" description="Each recipe remembers its own settings."><FieldGroup specs={[spec('count','Number of loaves','loaves',1,1),spec('weight','Dough weight per loaf','g',1)]}/><div className="hydration-control"><NumberField spec={spec('hydration','Total hydration','%',0,1)} hydrationParams={p}/><p className="field-note">Includes the flour and water in the leaven used.</p></div></Panel>
    <Panel title="Flour blend" description="Parts set the balance between flours. The gram weights scale to your batch."><FlourTable values={values}/>{!r&&<p className="notice" role="alert">Add at least one flour part to calculate this recipe.</p>}</Panel>
    <Accordion type="multiple" className="recipe-settings"><AccordionItem value="formula"><AccordionTrigger>Leaven, salt & water split</AccordionTrigger><AccordionContent><FieldGroup specs={[spec('leaven','Leaven / added flour','%'),spec('salt','Salt / added flour','%'),spec('reserve','Water reserved for final mix','%')]}/><p className="field-note">The water split is a percentage of total added water.</p></AccordionContent></AccordionItem>
    <AccordionItem value="build"><AccordionTrigger>Leaven build</AccordionTrigger><AccordionContent><p className="field-note build-description">Build quantities per 1,000 g added flour. The amounts made scale with your batch. Mature starter is equal weights flour and water. If the build is empty, the leaven is treated as 100% hydration.</p><FieldGroup specs={[spec('buildSeed','Mature starter','g'),spec('buildBread',buildFlour,'g'),spec('buildWheat','Whole-wheat flour','g'),spec('buildWater','Water','g')]}/>{r&&<><div className="detail-divider"/><Weights rows={['Mature starter',buildFlour,'Whole-wheat flour','Water'].map((label,i)=>[label,r.madeParts[i]])} total={r.made}/><LeavenBalance made={r.made} used={r.used} reserve={r.reserve} shortfall={r.shortfall}/></>}</AccordionContent></AccordionItem>
    <AccordionItem value="defaults"><AccordionTrigger>Recipe defaults</AccordionTrigger><AccordionContent><div className="recipe-recovery"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm"><RotateCcw/> Restore recipe defaults</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restore {d.name} defaults?</AlertDialogTitle><AlertDialogDescription>This resets this recipe's quantities and checklist. The other recipes, your schedule and oven settings are retained.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep my changes</AlertDialogCancel><AlertDialogAction onClick={onReset}>Restore defaults</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></AccordionContent></AccordionItem></Accordion>
  </div><div className="result-stack">{r?<><Card className="formula-result"><CardContent><div className="result-total" aria-live="polite">{g(r.total)}<span>g</span></div><p>Total dough for {loafText(p.count)}</p><div className="result-metrics"><span>{Math.round(r.totalHydration)}%<small>total hydration</small></span><span>{g(p.weight)} g<small>per loaf</small></span></div></CardContent></Card>
    {d.houseCompletion&&<p className="recipe-origin"><Snowflake size={18}/>Uses the House leaven, salt and overnight method.</p>}
    {r.shortfall>0&&<p className="notice" role="alert">Make {g(r.shortfall)} g more leaven before mixing. Increase the leaven build.</p>}
    <Panel title={book?'01 / Initial mix and rest':'01 / Autolyse'} description={book?'Leaven goes into this mix before the initial rest.':'Mix the flour and first water addition. Keep the final-mix ingredients separate.'}><Weights rows={r.initial}/></Panel>
    <Panel title={book?'02 / Salt and remaining water':'02 / Final mix'} description={book?'Add after the initial rest, then begin bulk fermentation.':'Add after the autolyse, once the leaven is ready.'}><Weights rows={r.final}/></Panel>
    <div className="recipe-totals"><span><strong>{g(r.flour)} g</strong> added flour</span><span><strong>{g(r.water)} g</strong> added water</span><span><strong>{g(r.used)} g</strong> leaven used</span></div>
    {book&&<Panel title="Basket and dusting flour" description="Separate supplies, outside dough weight."><Weights rows={[["Rice flour",r.dustingRice]]}/></Panel>}
  </>:<p className="notice" role="alert">Set a flour blend to calculate the recipe.</p>}</div></div></>;
}
function App(){
  const [initial]=useState(loadPlan),form=useCalculator(initial),values=useSelector(form.store,s=>s.values);
  const [tab,setTab]=useState('schedule');
  useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify({version:5,plan:values}));}catch{/* Keep the calculator usable when browser storage is unavailable. */}},[values]);
  const definition=definitions[values.recipe],book=definition.method==='tartine',profile=values.recipes[values.recipe],calc=calculateRecipe(values);
  const total=calc?.total,hydration=totalHydration(profile.params),weight=profile.params.weight,count=profile.params.count,batches=Math.ceil(count/values.ovenCapacity);
  const now=useNow(),checks=profile.done,doneAt=profile.doneAt;
  const readings=profile.bulkTemps;
  const planned=useMemo(()=>recipeSchedule(values),[values]),{steps,shift,estimate,turns,bulkMinutes,checkFrom}=useMemo(()=>followDough(planned,checks,doneAt,profile.doughTemp,readings),[planned,checks,doneAt,profile.doughTemp,readings]);
  const doneStep=steps.find(s=>s.id==='done'),firstStep=steps[0];
  const skipped=skippedSteps(steps,checks),settled=[...checks,...skipped];
  const remaining=steps.filter(s=>!settled.includes(s.id)),completed=steps.filter(s=>checks.includes(s.id)).length,next=remaining[0],days=Array.from(new Set(steps.map(s=>dateString(s.at))));
  const stale=doneStep!==undefined&&+doneStep.at<now&&(completed===0||remaining.length===0);
  const tempText=(f:number)=>`${round(fromF(f,values.tempUnit),values.tempUnit==='C'?1:0)}°${values.tempUnit}`;
  const advice=bulkMinutes!==null?bulkDoneText(bulkMinutes,estimate):estimate?bulkAdvice(estimate,at=>whenText(at,now),{turns,hold:holdTemperature(estimate,now),temp:tempText}):undefined;
  const setProfile=(change:Partial<Profile>)=>form.setFieldValue('recipes',previous=>({...previous,[values.recipe]:{...previous[values.recipe],...change}}));
  const setDoughTemp=(doughTemp:number|null)=>setProfile({doughTemp});
  const addReading=(f:number)=>setProfile({bulkTemps:withReading(readings,{at:stampNow(),f})});
  const removeReading=(at:number)=>setProfile({bulkTemps:readings.filter(r=>r.at!==at)});
  // Dough temperatures belong to one bake. A new bake (a new date or time before anything is checked, or Plan the next bake) starts without them.
  const clearTemps=()=>{if(profile.doughTemp!==null||readings.length)setProfile({doughTemp:null,bulkTemps:[]});};
  const changeWhen=(field:{handleChange:(v:string)=>void},value:string)=>{field.handleChange(value);if(!checks.length)clearTemps();};
  const onUnit=(u:TempUnit)=>form.setFieldValue('tempUnit',u);
  const afterMixField=(id:string)=><DoughTemperature id={id} valueF={profile.doughTemp} unit={values.tempUnit} onChange={setDoughTemp} onUnit={onUnit} advice={advice}/>;
  const nowBulk=(id:string)=>{const during=id==='shape'||turnNumber(id)>0;
    if(during&&profile.doughTemp!==null)return <Remeasure id="now-dough-temp" unit={values.tempUnit} onUnit={onUnit} onAdd={addReading} advice={advice}/>;
    if(during||id==='rest')return afterMixField('now-dough-temp');};
  const shapeStep=steps.find(s=>s.id==='shape');
  const doughCheck=next&&turnNumber(next.id)>0&&shapeStep&&checkFrom&&now>=+checkFrom?{readiness:shapeStep.readiness,onReady:()=>toggle('shape',true)}:undefined;
  function planNext(){const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);form.setFieldValue('date',dateString(tomorrow));clearTemps();}
  const gaps=stepGaps(steps);
  const nightActions=quietHourActions(steps,settled),nightIds=new Set(nightActions.map(({step})=>step.id));
  const proofWindow=coldProofWindow(steps);
  const setProgress=(done:string[],times:Record<string,number>)=>setProfile({done,doneAt:times});
  const toggle=(id:string,checked:boolean)=>{const times={...doneAt};if(checked)times[id]=stampNow();else delete times[id];setProgress(checked?[...checks.filter(x=>x!==id),id]:checks.filter(x=>x!==id),times);};
  const retimeStep=(id:string,date:string,hhmm:string)=>{const t=retime(date,hhmm);if(t!==null)setProgress(checks,{...doneAt,[id]:t});};
  function changeAnchor(anchor:'leaven'|'done'){const step=planned.find(s=>s.id===anchor);if(step){form.setFieldValue('date',dateString(step.at));form.setFieldValue('time',`${String(step.at.getHours()).padStart(2,'0')}:${String(step.at.getMinutes()).padStart(2,'0')}`);}form.setFieldValue('anchor',anchor);}
  function resetRecipe(){form.setFieldValue('recipes',{...values.recipes,[values.recipe]:recipeDefaults(values)});}
  return <TooltipProvider><FormContext.Provider value={form}><div className="app-shell">
    <Tabs value={tab} onValueChange={setTab} className="main-tabs"><div className="nav-row"><TabsList className="nav-tabs"><TabsTrigger value="schedule"><CalendarDays/> Schedule</TabsTrigger><TabsTrigger value="formula"><Scale/> Ingredients</TabsTrigger></TabsList></div>
      <div className="recipe-switch"><div><Label htmlFor="recipe-choice">Recipe</Label><Select value={values.recipe} onValueChange={v=>form.setFieldValue('recipe',v)}><SelectTrigger id="recipe-choice" aria-label="Recipe"><SelectValue/></SelectTrigger><SelectContent>{values.order.map(id=><SelectItem value={id} key={id}>{definitions[id].name}</SelectItem>)}</SelectContent></Select></div><p>{definition.description}</p></div>
      <TabsContent value="schedule">{next&&!stale&&<NowCard next={next} then={remaining[1]} shift={shift} now={now} onDone={()=>toggle(next.id,true)} bulk={nowBulk(next.id)} doughCheck={doughCheck}/>}{nightActions.length>0&&<section className="quiet-warning" role="region" aria-label="Quiet hours warning"><Moon size={22}/><div><h2>{nightActions.length} {nightActions.length===1?'action needs':'actions need'} you during quiet hours</h2><p>Hands-on work is scheduled after 10:30 PM or before 7:00 AM. Try an earlier start or a different finish time. Overnight rests are fine.</p><Accordion type="single" collapsible className="quiet-details"><AccordionItem value="actions"><AccordionTrigger>View affected steps</AccordionTrigger><AccordionContent><ul>{nightActions.map(({step,continues})=><li key={step.id}><time dateTime={step.at.toISOString()}>{calendarText(step.at)} at {timeText(step.at)}</time><span>{step.title}{continues&&<small>Continues past 10:30 PM</small>}</span></li>)}</ul></AccordionContent></AccordionItem></Accordion></div></section>}<div className={`schedule-layout${checks.length>0&&!stale?' is-underway':''}`}><div className="schedule-sidebar">
        <Card className="plan-card"><CardHeader><CardTitle>When are we baking?</CardTitle></CardHeader><CardContent>
          <Label>Plan around</Label><Select value={values.anchor} onValueChange={v=>changeAnchor(v as 'leaven'|'done')}><SelectTrigger className="anchor-select" aria-label="Plan around"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="leaven">Starting the leaven</SelectItem><SelectItem value="done">All loaves out of the oven</SelectItem></SelectContent></Select>
          <div className="date-time-fields"><form.Field name="date">{f=><div><Label htmlFor="plan-date">{values.anchor==='leaven'?'Leaven date':'Last batch date'}</Label><Input id="plan-date" type="date" value={f.state.value} onChange={e=>changeWhen(f,e.target.value)} onBlur={f.handleBlur}/></div>}</form.Field><form.Field name="time">{f=><div><Label htmlFor="plan-time">Time</Label><Input id="plan-time" type="time" value={f.state.value} onChange={e=>changeWhen(f,e.target.value)} onBlur={f.handleBlur}/></div>}</form.Field></div>
          {doneStep&&<div className="finish-summary"><Flame size={19}/><div><span>Baking complete</span><strong>{timeText(doneStep.at)}</strong><small>{calendarText(doneStep.at)}</small></div></div>}
        </CardContent></Card>
        <Panel title="Your batch" icon={<Wheat size={18}/>} className="setup-card"><NumberField spec={spec('count','Number of loaves','loaves',1,1)}/><div className="batch-facts"><span><strong>{g(weight)} g</strong> per loaf</span><span><strong>{total===undefined?'—':g(total)} g</strong> total dough</span><span><strong>{Math.round(hydration)}%</strong> total hydration</span></div><Button variant="link" className="text-link" onClick={()=>setTab('formula')}>View ingredients</Button></Panel>
        <Panel title="Oven and proof" className="setup-card"><div className="field-grid"><div className="number-field"><Label htmlFor="oven-capacity">Loaves baked at once</Label><Select value={String(values.ovenCapacity)} onValueChange={v=>form.setFieldValue('ovenCapacity',Number(v))}><SelectTrigger id="oven-capacity"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="1">1 loaf</SelectItem><SelectItem value="2">2 loaves</SelectItem></SelectContent></Select></div>{batches>1&&<NumberField spec={{key:'reheat',cell:'reheat',label:'Reheat between batches',value:30,unit:'min',step:1}}/>}</div><p className="field-note"><strong>{batches} {batches===1?'batch':'batches'}</strong> for {loafText(count)}.</p>{!book&&proofWindow&&<div className="cold-proof-summary"><div><Snowflake size={18}/><strong>Cold proof, {durationText(proofWindow.minutes)}</strong></div><p><span>{calendarText(proofWindow.start)} at {timeText(proofWindow.start)}</span><span>to {calendarText(proofWindow.end)} at {timeText(proofWindow.end)}</span></p><span className="cold-proof-status">{proofWindow.overnight?'Overnight cold ferment':'Daytime proof with this start time'}</span></div>}{book&&<><Label className="proof-label">Final proof</Label><Select value={values.proof} onValueChange={v=>form.setFieldValue('proof',v as 'cold'|'warm')}><SelectTrigger aria-label="Final proof"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cold">Refrigerated, 10 to 12 hours</SelectItem><SelectItem value="warm">Warm, 3 to 4 hours</SelectItem></SelectContent></Select><p className="field-note">{values.proof==='cold'?'Allows 60 minutes to warm each batch.':'Later batches wait longer during serial baking. Judge their condition before loading.'}</p></>}</Panel>
        <div className="sidebar-note"><Info size={17}/><p>Readiness comes before the clock. Wait until the dough is ready, then check the step. Later steps move to match.</p></div>
      </div><section className="timeline-section" aria-labelledby="schedule-heading"><div className="section-heading"><div><h2 id="schedule-heading">Bake schedule</h2></div></div>
        <div className="timeline-meta"><span><Clock3 size={14}/>{firstStep&&doneStep?durationText((+doneStep.at-(+firstStep.at))/60000):'Set a date and time'} total</span><span>{completed} of {steps.length} steps checked</span><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Clear checklist" disabled={!completed} onClick={()=>{setProgress([],{});clearTemps();}}><RotateCcw size={14}/></Button></TooltipTrigger><TooltipContent>Clear this recipe's checklist</TooltipContent></Tooltip></div>
        {!book&&proofWindow&&!proofWindow.overnight&&<p className="notice overnight-warning" role="status">This cold proof falls within one calendar day. For an overnight ferment, shift your start or finish time so this rest spans the night. The dates below show your current plan.</p>}
        {stale&&doneStep&&<p className="notice" role="status"><span>This plan ended {calendarText(doneStep.at)}. <Button variant="link" className="inline-link" onClick={planNext}>Plan the next bake</Button> to move it to tomorrow and keep every setting.</span></p>}
        {!steps.length&&<p className="notice" role="alert">Choose a valid date, time, positive whole loaf count and oven capacity. A time skipped by daylight saving cannot be used.</p>}
        {days.map((day,dayIndex)=><div className="day-group" key={day}><div className="day-heading"><span className="day-number">Day {dayIndex+1}</span><h3>{calendarText(steps.find(s=>dateString(s.at)===day)!.at)}</h3><span className="day-rule"/></div><div className="step-list">{steps.filter(s=>dateString(s.at)===day).map(step=>{const done=checks.includes(step.id),skip=skipped.includes(step.id);return <div key={step.id} className={`timeline-step phase-${stepPhase(step.id)} ${done?'is-done':''} ${skip?'is-skipped':''} ${!stale&&next?.id===step.id?'is-next':''}`}><div className="step-check"><Checkbox id={`step-${step.id}`} checked={done} onCheckedChange={v=>toggle(step.id,v===true)} aria-label={`Complete ${step.title}`}/></div><time dateTime={step.at.toISOString()}>{timeText(step.at)}</time><div className="step-details"><Label htmlFor={`step-${step.id}`}>{step.title}{step.id==='fridge'&&<Snowflake size={14}/>} {!stale&&next?.id===step.id&&<Badge variant="secondary" className="next-badge">Up next</Badge>}{skip&&<Badge variant="outline" className="skipped-badge">Skipped</Badge>}{nightIds.has(step.id)&&<Badge variant="outline" className="quiet-badge"><Moon size={12}/> Quiet hours</Badge>}</Label>{done&&step.actual&&<div className="done-at" role="group" aria-labelledby={`done-at-label-${step.id}`}><span className="done-at-label" id={`done-at-label-${step.id}`}>Done at</span><Input type="date" aria-label={`Date ${step.title} was done`} value={dateString(step.actual)} onChange={e=>retimeStep(step.id,e.target.value,clockText(step.actual!))}/><Input type="time" aria-label={`Time ${step.title} was done`} value={clockText(step.actual)} onChange={e=>retimeStep(step.id,dateString(step.actual!),e.target.value)}/></div>}{step.note&&<p>{step.note}</p>}{step.readiness&&<p className="readiness-cue"><strong>Ready when:</strong> {step.readiness}</p>}{step.id==='rest'&&<>{afterMixField('timeline-dough-temp')}{readings.length>0&&<ul className="bulk-readings" aria-label="Later dough temperatures">{readings.map(r=><li key={r.at}><span><strong>{tempText(r.f)}</strong> at {timeText(new Date(r.at))}</span><Button variant="ghost" size="icon-sm" aria-label={`Remove the ${tempText(r.f)} reading from ${timeText(new Date(r.at))}`} onClick={()=>removeReading(r.at)}><X size={14}/></Button></li>)}</ul>}</>}</div>{(gaps.get(step.id)??0)>0&&<span className="step-gap"><span className="sr-only">Next step in </span>{durationText(gaps.get(step.id)!)}</span>}</div>;})}</div></div>)}
        {remaining.length===0&&steps.length>0&&<div className="bake-complete"><Wheat/> All batches done. Enjoy your bread.</div>}
      </section></div></TabsContent>
      <TabsContent value="formula"><RecipeFormula values={values} onReset={resetRecipe}/></TabsContent>
    </Tabs><MethodGuide book={book}/>
  </div></FormContext.Provider></TooltipProvider>;
}
export default App;
