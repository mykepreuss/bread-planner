import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {useForm,useSelector} from '@tanstack/react-form';
import {useTable,tableFeatures,flexRender,type ColumnDef} from '@tanstack/react-table';
import {Wheat,Clock3,Check,RotateCcw,Info,Flame,Snowflake,Scale,CalendarDays,Moon} from 'lucide-react';
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
import {definitions,flourNames,createPlanner,restorePlanner,calculateRecipe,recipeSchedule,recipeDefaults,quietHourActions,totalHydration,addedHydration,type Planner} from '@/lib/recipes';

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
function Panel({title,description,children,icon}:{title:string;description?:string;children:ReactNode;icon?:ReactNode}){return <Card className="work-card"><CardHeader><div className="card-title-row"><CardTitle>{title}</CardTitle>{icon}</div>{description&&<CardDescription>{description}</CardDescription>}</CardHeader><CardContent>{children}</CardContent></Card>;}
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
    {!book&&<p>This recipe uses a separate flour-and-water autolyse, followed by the final mix and an overnight cold proof. The dated schedule shows when to refrigerate and bake.</p>}
  </div></AccordionContent></AccordionItem>
  <AccordionItem value="starter"><AccordionTrigger>Establishing a starter from scratch</AccordionTrigger><AccordionContent><div className="guide-copy">
    <p>Make a reserve of equal weights white-bread and whole-wheat flour. The supplied recipe prepares 1,000 g of each; that reserve is for repeated feedings, not one dough batch.</p>
    <p>In a jar, mix 100 g warm water, about 80°F / 27°C, with 100 g of the flour blend. Cover with a towel and leave at room temperature for 2 to 3 days, looking for bubbling and expansion.</p>
    <p>Once active, feed at the same time daily: discard 80%, then add equal weights warm water and flour blend, such as 50 g of each. Allow about a week for predictable rises and falls and a slightly sour smell before building the leaven for bread.</p>
  </div></AccordionContent></AccordionItem>
  <AccordionItem value="shaping"><AccordionTrigger>Shaping, basket preparation and baking</AccordionTrigger><AccordionContent><div className="guide-copy">
    <p><strong>Preshape:</strong> dust the dough top, divide equally and turn flour-side down. Bring cut edges onto themselves and work each piece into a taut round, keeping dusting flour on the outside. Cover and bench-rest for 30 minutes.</p>
    <p><strong>Baskets:</strong> blend equal weights whole-wheat and rice flour, 100 g of each for the two-loaf book batch. Line baskets or bowls with towels, flour generously, and keep the unused dusting mix.</p>
    <p><strong>Final shape:</strong> dust and flip each round flour-side down. Stretch the bottom corners toward you and fold into the middle; repeat from both sides and the top. Roll seam-side down into a taut round. Transfer to a basket seam-side up and cover for the selected proof.</p>
    <p><strong>Hot pots:</strong> preheat lidded Dutch ovens inside the oven. Dust loaf tops, carefully turn into the hot pots seam-side down, score with a lame or razor, cover and lower to the bake temperature. Remove lids carefully for the uncovered bake because steam may escape.</p>
    <p><strong>Next batch:</strong> remove baked loaves to a rack, clean the pots and reheat them with their lids at the preheat temperature. Wait until they are hot before loading. Keep later refrigerated loaves chilled until their own warm-up; bake only as many as your capacity setting allows.</p>
  </div></AccordionContent></AccordionItem>
</Accordion>;}
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
  return <><div className="page-heading"><p className="eyebrow">{values.recipe==='house'?'Our default recipe':'Your selected recipe'}</p><h2>{d.name}</h2><p>{d.description}</p></div><div className="formula-layout"><div className="form-stack">
    <Panel title="Your batch" description="Change yield or hydration here. Each recipe remembers its own settings."><FieldGroup specs={[spec('count','Number of loaves','loaves',1,1),spec('weight','Dough weight per loaf','g',1)]}/><div className="hydration-control"><NumberField spec={spec('hydration','Total hydration','%',0,1)} hydrationParams={p}/><p className="field-note">Includes the flour and water in the leaven used. Drag to adjust or type a whole percentage.</p></div></Panel>
    <Panel title="Flour blend" description="Parts set the balance between flours. The gram weights scale to your batch."><FlourTable values={values}/>{!r&&<p className="notice" role="alert">Add at least one flour part to calculate this recipe.</p>}</Panel>
    <Accordion type="multiple" className="recipe-settings"><AccordionItem value="formula"><AccordionTrigger>Leaven, salt & water split</AccordionTrigger><AccordionContent><FieldGroup specs={[spec('leaven','Leaven / added flour','%'),spec('salt','Salt / added flour','%'),spec('reserve','Water reserved for final mix','%')]}/><p className="field-note">The water split is a percentage of total added water. Keep it between 0 and 100%.</p></AccordionContent></AccordionItem>
    <AccordionItem value="build"><AccordionTrigger>Leaven build</AccordionTrigger><AccordionContent><p className="field-note build-description">Build quantities per 1,000 g added flour. The amounts made scale with your batch. Mature starter is equal weights flour and water. An empty build assumes the same hydration for the leaven used.</p><FieldGroup specs={[spec('buildSeed','Mature starter','g'),spec('buildBread',buildFlour,'g'),spec('buildWheat','Whole-wheat flour','g'),spec('buildWater','Water','g')]}/>{r&&<><div className="detail-divider"/><Weights rows={['Mature starter',buildFlour,'Whole-wheat flour','Water'].map((label,i)=>[label,r.madeParts[i]])} total={r.made}/><LeavenBalance made={r.made} used={r.used} reserve={r.reserve} shortfall={r.shortfall}/></>}</AccordionContent></AccordionItem>
    <AccordionItem value="defaults"><AccordionTrigger>Recipe defaults</AccordionTrigger><AccordionContent><div className="recipe-recovery"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm"><RotateCcw/> Restore recipe defaults</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restore {d.name} defaults?</AlertDialogTitle><AlertDialogDescription>This resets this recipe's quantities and checklist. The other recipes, your schedule and oven settings are retained.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep my changes</AlertDialogCancel><AlertDialogAction onClick={onReset}>Restore defaults</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><p>Return this recipe to its original quantities if you need a fresh start.</p></div></AccordionContent></AccordionItem></Accordion>
  </div><div className="result-stack">{r?<><Card className="formula-result"><CardContent><p className="eyebrow">Ready to weigh</p><div className="result-total" aria-live="polite">{g(r.total)}<span>g</span></div><p>Total dough for {loafText(p.count)}</p><div className="result-metrics"><span>{Math.round(r.totalHydration)}%<small>total hydration</small></span><span>{g(p.weight)} g<small>per loaf</small></span></div></CardContent></Card>
    {d.houseCompletion&&<p className="recipe-origin"><Snowflake size={18}/>Uses the House leaven, salt and overnight method.</p>}
    {r.shortfall>0&&<p className="notice" role="alert">Make {g(r.shortfall)} g more leaven before mixing. Increase the leaven build.</p>}
    <Panel title={book?'01 / Initial mix and rest':'01 / Autolyse'} description={book?'Leaven goes into this mix before the initial rest.':'Mix the flour and first water addition. Keep the final-mix ingredients separate.'}><Weights rows={r.initial}/></Panel>
    <Panel title={book?'02 / Salt and remaining water':'02 / Final mix'} description={book?'Add after the initial rest, then begin bulk fermentation.':'Add after the autolyse, once the leaven is ready.'}><Weights rows={r.final}/></Panel>
    <div className="recipe-totals"><span><strong>{g(r.flour)} g</strong> added flour</span><span><strong>{g(r.water)} g</strong> added water</span><span><strong>{g(r.used)} g</strong> leaven used</span></div>
    {book&&<Panel title="Basket and dusting flour" description="Separate supplies, outside dough weight."><Weights rows={[["Whole-wheat flour",r.dustingWheat],["Rice flour",r.dustingRice]]}/></Panel>}
  </>:<p className="notice" role="alert">Set a flour blend to calculate the recipe.</p>}</div></div></>;
}
function App(){
  const [initial]=useState(loadPlan),form=useCalculator(initial),values=useSelector(form.store,s=>s.values);
  const [tab,setTab]=useState('schedule');
  useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify({version:5,plan:values}));}catch{/* Keep the calculator usable when browser storage is unavailable. */}},[values]);
  const definition=definitions[values.recipe],book=definition.method==='tartine',profile=values.recipes[values.recipe],calc=calculateRecipe(values);
  const total=calc?.total,hydration=totalHydration(profile.params),weight=profile.params.weight,count=profile.params.count,batches=Math.ceil(count/values.ovenCapacity);
  const steps=useMemo(()=>recipeSchedule(values),[values]),doneStep=steps.find(s=>s.id==='done'),firstStep=steps[0],checks=profile.done;
  const completed=steps.filter(s=>checks.includes(s.id)).length,next=steps.find(s=>!checks.includes(s.id)),days=Array.from(new Set(steps.map(s=>dateString(s.at))));
  const stale=doneStep!==undefined&&+doneStep.at<Date.now()&&(completed===0||completed===steps.length);
  function planNext(){const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);form.setFieldValue('date',dateString(tomorrow));}
  const nightActions=quietHourActions(steps,checks),nightIds=new Set(nightActions.map(({step})=>step.id));
  const proofWindow=coldProofWindow(steps),recipeName=definition.name;
  const setChecks=(done:string[])=>form.setFieldValue('recipes',previous=>({...previous,[values.recipe]:{...previous[values.recipe],done}}));
  const toggle=(id:string,checked:boolean)=>setChecks(checked?[...checks.filter(x=>x!==id),id]:checks.filter(x=>x!==id));
  function changeAnchor(anchor:'leaven'|'done'){const step=steps.find(s=>s.id===anchor);if(step){form.setFieldValue('date',dateString(step.at));form.setFieldValue('time',`${String(step.at.getHours()).padStart(2,'0')}:${String(step.at.getMinutes()).padStart(2,'0')}`);}form.setFieldValue('anchor',anchor);}
  function resetRecipe(){form.setFieldValue('recipes',{...values.recipes,[values.recipe]:recipeDefaults(values)});}
  return <TooltipProvider><FormContext.Provider value={form}><div className="app-shell">
    <Tabs value={tab} onValueChange={setTab} className="main-tabs"><div className="nav-row"><TabsList className="nav-tabs"><TabsTrigger value="schedule"><CalendarDays/> Schedule</TabsTrigger><TabsTrigger value="formula"><Scale/> Recipe</TabsTrigger></TabsList></div>
      <div className="recipe-switch"><div><Label htmlFor="recipe-choice">Recipe</Label><Select value={values.recipe} onValueChange={v=>form.setFieldValue('recipe',v)}><SelectTrigger id="recipe-choice" aria-label="Recipe"><SelectValue/></SelectTrigger><SelectContent>{values.order.map(id=><SelectItem value={id} key={id}>{definitions[id].name}</SelectItem>)}</SelectContent></Select></div><p>{definition.description}<span>Hydration and yield are settings within each recipe.</span></p></div>
      <TabsContent value="schedule">{nightActions.length>0&&<section className="quiet-warning" role="region" aria-label="Quiet hours warning"><Moon size={22}/><div><h2>{nightActions.length} {nightActions.length===1?'action needs':'actions need'} you during quiet hours</h2><p>Hands-on work is scheduled after 10:30 PM or before 7:00 AM. Try an earlier start or a different finish time. Overnight rests are fine.</p><Accordion type="single" collapsible className="quiet-details"><AccordionItem value="actions"><AccordionTrigger>View affected steps</AccordionTrigger><AccordionContent><ul>{nightActions.map(({step,continues})=><li key={step.id}><time dateTime={step.at.toISOString()}>{calendarText(step.at)} at {timeText(step.at)}</time><span>{step.title}{continues&&<small>Continues past 10:30 PM</small>}</span></li>)}</ul></AccordionContent></AccordionItem></Accordion></div></section>}<div className="schedule-layout"><aside className="schedule-sidebar">
        <Card className="plan-card"><CardHeader><CardTitle>When are we baking?</CardTitle><CardDescription>Plan through the final batch, with time for every loaf.</CardDescription></CardHeader><CardContent>
          <Label>Plan around</Label><Select value={values.anchor} onValueChange={v=>changeAnchor(v as 'leaven'|'done')}><SelectTrigger className="anchor-select" aria-label="Plan around"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="leaven">Starting the leaven</SelectItem><SelectItem value="done">All loaves out of the oven</SelectItem></SelectContent></Select>
          <div className="date-time-fields"><form.Field name="date">{f=><div><Label htmlFor="plan-date">{values.anchor==='leaven'?'Leaven date':'Last batch date'}</Label><Input id="plan-date" type="date" value={f.state.value} onChange={e=>f.handleChange(e.target.value)} onBlur={f.handleBlur}/></div>}</form.Field><form.Field name="time">{f=><div><Label htmlFor="plan-time">Time</Label><Input id="plan-time" type="time" value={f.state.value} onChange={e=>f.handleChange(e.target.value)} onBlur={f.handleBlur}/></div>}</form.Field></div>
          {doneStep&&<div className="finish-summary"><Flame size={19}/><div><span>Baking complete</span><strong>{timeText(doneStep.at)}</strong><small>{calendarText(doneStep.at)}</small></div></div>}
        </CardContent></Card>
        <Card className="batch-card"><CardContent><div className="card-title-row"><p className="eyebrow">{recipeName}</p><Wheat size={18}/></div><strong className="batch-title">{loafText(count)} at {g(weight)} g each</strong><div className="batch-facts"><span><strong>{Math.round(hydration)}%</strong> total hydration</span><span><strong>{total===undefined?'—':g(total)} g</strong> actual dough</span></div><Button variant="link" className="text-link" onClick={()=>setTab('formula')}>View recipe</Button></CardContent></Card>
        <Panel title="Oven and proof" description="Capacity counts loaves with their own suitable pots."><div className="field-grid"><div className="number-field"><Label htmlFor="oven-capacity">Loaves baked at once</Label><Select value={String(values.ovenCapacity)} onValueChange={v=>form.setFieldValue('ovenCapacity',Number(v))}><SelectTrigger id="oven-capacity"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="1">1 loaf</SelectItem><SelectItem value="2">2 loaves</SelectItem></SelectContent></Select></div>{batches>1&&<NumberField spec={{key:'reheat',cell:'reheat',label:'Reheat between batches',value:30,unit:'min',step:1}}/>}</div><p className="field-note"><strong>{batches} {batches===1?'batch':'batches'}</strong> for {loafText(count)}.{batches>1&&' Reheat time is a planning allowance; wait for hot pots and the target temperature.'}</p>{!book&&proofWindow&&<div className="cold-proof-summary"><div><Snowflake size={18}/><strong>Cold proof, {durationText(proofWindow.minutes)}</strong></div><p><span>{calendarText(proofWindow.start)} at {timeText(proofWindow.start)}</span><span>to {calendarText(proofWindow.end)} at {timeText(proofWindow.end)}</span></p><span className="cold-proof-status">{proofWindow.overnight?'Overnight cold ferment':'Daytime proof with this start time'}</span></div>}{book&&<><Label className="proof-label">Final proof</Label><Select value={values.proof} onValueChange={v=>form.setFieldValue('proof',v as 'cold'|'warm')}><SelectTrigger aria-label="Final proof"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cold">Refrigerated, 10 to 12 hours</SelectItem><SelectItem value="warm">Warm, 3 to 4 hours</SelectItem></SelectContent></Select><p className="field-note">{values.proof==='cold'?'The schedule allows 60 minutes to warm each batch. Wait longer if the dough needs it; the displayed times do not move automatically.':'Later batches wait longer during serial baking. Judge their condition before loading.'}</p></>}</Panel>
        <div className="sidebar-note"><Info size={17}/><p>Readiness comes before the clock. Wait longer when needed; the displayed schedule does not move automatically.</p></div>
      </aside><section className="timeline-section" aria-label="Bread schedule"><div className="section-heading"><div><h2>Your bake, step by step.</h2></div></div>
        <div className="timeline-meta"><span><Clock3 size={14}/>{firstStep&&doneStep?durationText((+doneStep.at-(+firstStep.at))/60000):'Set a date and time'} total</span><span>{completed} of {steps.length} steps checked</span><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Clear checklist" disabled={!completed} onClick={()=>setChecks([])}><RotateCcw size={14}/></Button></TooltipTrigger><TooltipContent>Clear this recipe's checklist</TooltipContent></Tooltip></div>
        {!book&&proofWindow&&!proofWindow.overnight&&<p className="notice overnight-warning" role="status">This cold proof falls within one calendar day. For an overnight ferment, shift your start or finish time so this rest spans the night. The dates below show your current plan.</p>}
        {stale&&doneStep&&<p className="notice" role="status"><span>This plan ended {calendarText(doneStep.at)}. <Button variant="link" className="inline-link" onClick={planNext}>Plan the next bake</Button> to move it to tomorrow and keep every setting.</span></p>}
        {!steps.length&&<p className="notice" role="alert">Choose a valid date, time, positive whole loaf count and oven capacity. A time skipped by daylight saving cannot be used.</p>}
        {days.map((day,dayIndex)=><div className="day-group" key={day}><div className="day-heading"><span className="day-number">{String(dayIndex+1).padStart(2,'0')}</span><h3>{calendarText(steps.find(s=>dateString(s.at)===day)!.at)}</h3><span className="day-rule"/></div><div className="step-list">{steps.filter(s=>dateString(s.at)===day).map(step=>{const done=checks.includes(step.id);return <div key={step.id} className={`timeline-step ${done?'is-done':''} ${next?.id===step.id?'is-next':''}`}><div className="step-check"><Checkbox id={`step-${step.id}`} checked={done} onCheckedChange={v=>toggle(step.id,v===true)} aria-label={`Complete ${step.title}`}/></div><time dateTime={step.at.toISOString()}>{timeText(step.at)}</time><div className="step-details"><Label htmlFor={`step-${step.id}`}>{step.title}{step.id==='fridge'&&<Snowflake size={14}/>} {next?.id===step.id&&<Badge variant="secondary" className="next-badge">Up next</Badge>}{nightIds.has(step.id)&&<Badge variant="outline" className="quiet-badge"><Moon size={12}/> Quiet hours</Badge>}</Label>{step.note&&<p>{step.note}</p>}{step.readiness&&<p className="readiness-cue"><strong>Ready when:</strong> {step.readiness}</p>}</div><span className="step-duration">{step.duration>0?durationText(step.duration):<Check size={15}/>}</span></div>;})}</div></div>)}
        {completed===steps.length&&steps.length>0&&<div className="bake-complete"><Wheat/> All batches done. Enjoy your bread.</div>}
      </section></div></TabsContent>
      <TabsContent value="formula"><RecipeFormula values={values} onReset={resetRecipe}/></TabsContent>
    </Tabs><MethodGuide book={book}/>
  </div></FormContext.Provider></TooltipProvider>;
}
export default App;
