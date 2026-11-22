/**
 * America/Vancouver time without the host's time-zone data. Vercel's build machines cannot apply TZ=America/Vancouver,
 * so there the baseline uses this Date instead. It follows the zone's rule in force since 2007: Pacific Standard Time,
 * UTC−8, with Pacific Daylight Time, UTC−7, from 2:00 AM on the second Sunday in March to 2:00 AM on the first Sunday in
 * November. A wall-clock time is read by the host's own parser as if it were UTC, then moved by the offset, so invalid
 * and out-of-range values behave exactly as the host's Date does. It covers the date operations the app and these
 * tests use; vancouver.test.ts compares it with the real zone wherever the host has it.
 */
const Native=Date,HOUR=3600000;
/** The day of the month of the nth Sunday in a month. */
const sunday=(year:number,month:number,nth:number)=>1+(7-new Native(Native.UTC(year,month,1)).getUTCDay())%7+7*(nth-1);

/** Hours behind UTC at an instant: 7 in daylight time, 8 otherwise. */
export function hoursBehind(utc:number){
  const year=new Native(utc).getUTCFullYear(),start=Native.UTC(year,2,sunday(year,2,2),10),end=Native.UTC(year,10,sunday(year,10,1),9);
  return utc>=start&&utc<end?7:8;
}
/**
 * The instant for a wall-clock time, given as milliseconds read as UTC. A repeated hour in November takes the earlier
 * instant, and a skipped hour in March is read with the offset before the change, as JavaScript requires.
 */
function fromWall(wall:number){
  if(!Number.isFinite(wall))return Number.NaN;
  const daylight=wall+7*HOUR;
  return hoursBehind(daylight)===7?daylight:wall+8*HOUR;
}
/** The wall-clock time of a date, as a Date whose UTC fields hold it. */
const wallOf=(d:Date)=>{const t=d.getTime();return new Native(t-hoursBehind(t)*HOUR);};
/** A date-time string without an offset, which JavaScript reads as local time. */
const LOCAL=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

export class VancouverDate extends Native{
  constructor(...args:unknown[]){
    if(args.length===0)super();
    else if(args.length===1)super(typeof args[0]==='string'&&LOCAL.test(args[0])?fromWall(Native.parse(`${args[0]}Z`)):args[0] as number);
    else super(fromWall(Native.UTC(...(args as [number,number]))));
  }
  static override parse(s:string){return LOCAL.test(s)?fromWall(Native.parse(`${s}Z`)):Native.parse(s);}
  override getTimezoneOffset(){const t=this.getTime();return Number.isFinite(t)?hoursBehind(t)*60:Number.NaN;}
  override getFullYear(){return wallOf(this).getUTCFullYear();}
  override getMonth(){return wallOf(this).getUTCMonth();}
  override getDate(){return wallOf(this).getUTCDate();}
  override getDay(){return wallOf(this).getUTCDay();}
  override getHours(){return wallOf(this).getUTCHours();}
  override getMinutes(){return wallOf(this).getUTCMinutes();}
  override getSeconds(){return wallOf(this).getUTCSeconds();}
  override getMilliseconds(){return wallOf(this).getUTCMilliseconds();}
  override setDate(day:number){const w=wallOf(this);w.setUTCDate(day);return this.setTime(fromWall(w.getTime()));}
}

/** Makes `Date` mean VancouverDate for this process. Calling `Date()` without `new` still returns a string. */
export function useVancouverRule(){
  globalThis.Date=new Proxy(VancouverDate,{apply:()=>new Native().toString()}) as unknown as DateConstructor;
}
