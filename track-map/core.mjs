// HLRN Track Map — pure, read-only telemetry helpers.
// Coordinates are schematic: lapDistPct is distance around a lap, not GPS.
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function validProgress(value){
 if(value===null||value===undefined||value==="")return null;
 const n=Number(value);
 return Number.isFinite(n)&&n>=0&&n<=1?n:null;
}
export function profileFor(track){
 const name=String(track||"").toLowerCase();
 if(/watkins glen|sonoma|road america|charlotte.*roval|cota|circuit of the americas|virginia international|mid.ohio|laguna seca|road atlanta/.test(name))return "road";
 if(/daytona|talladega|atlanta|pocono/.test(name))return "trioval";
 if(/bristol|martinsville|richmond|iowa|north wilkesboro|bowman gray/.test(name))return "short";
 return "oval";
}
export function normalizeDrivers(state){
 if(!state||!Array.isArray(state.drivers))return [];
 return state.drivers.filter(d=>d&&typeof d==="object")
 .map((d,i)=>{
  const pct=validProgress(d.lapDistPct);
  const pos=Number(d.position),carIdx=Number(d.carIdx);
  return {key:Number.isInteger(carIdx)&&carIdx>=0?"idx-"+carIdx:"entry-"+i,
   carIdx:Number.isInteger(carIdx)?carIdx:null,
   name:String(d.name||d.driverName||"Unknown driver"),number:String(d.number??d.carNumber??"—"),
   position:Number.isInteger(pos)&&pos>0?pos:null,
   lapDistPct:pct,onPitRoad:d.onPitRoad===true,
   lapsCompleted:Number.isFinite(Number(d.lapsCompleted))?Number(d.lapsCompleted):null,
   lastLapTime:Number.isFinite(Number(d.lastLapTime))&&Number(d.lastLapTime)>0?Number(d.lastLapTime):null,
   speedMph:Number.isFinite(Number(d.speedMph))&&Number(d.speedMph)>=0?Number(d.speedMph):null
  };
 }).filter(d=>d.lapDistPct!==null||d.onPitRoad)
 .sort((a,b)=>(a.position??9999)-(b.position??9999)).slice(0,65);
}
// Prefer the shortest circular path when telemetry wraps from 99% to 1%.
export function smoothProgress(current,target,blend=0.3){
 const next=validProgress(target);
 if(next===null)return current;
 if(current===null||current===undefined)return next;
 let delta=next-current;
 if(delta>0.5)delta-=1;
 if(delta< -0.5)delta+=1;
 const result=current+delta*clamp(blend,0,1);
 return ((result%1)+1)%1;
}
export function flagType(flag){
 const x=String(flag||"").toUpperCase();
 if(/YELLOW|CAUTION|ONE TO GREEN/.test(x))return "yellow";
 if(/\bRED\b/.test(x))return "red";
 if(/CHECKERED/.test(x))return "checkered";
 if(/WHITE/.test(x))return "white";
 return "green";
}
export function demoState(nowMs){
 // Entirely local deterministic simulation: never contacts Cloudflare.
 const t=Math.max(0,nowMs)/1000;
 const speed=26;
 const base=t/speed;
 const lap=1+Math.floor(base)%50;
 const flag=(lap%12>=7&&lap%12<=8)?"YELLOW":lap%50===0?"WHITE":"GREEN";
 const people=[["82","Demo Driver One"],["66","Demo Driver Two"],["12","Demo Driver Three"],["24","Demo Driver Four"],["9","Demo Driver Five"],["18","Demo Driver Six"],["32","Demo Driver Seven"],["7","Demo Driver Eight"],["55","Demo Driver Nine"],["4","Demo Driver Ten"],["77","Demo Driver Eleven"],["21","Demo Driver Twelve"]];
 const drivers=people.map(([number,name],i)=>{
  const progress=(base+1-i*0.055+0.006*Math.sin(t/6+i))%1;
  const onPitRoad=(i===2||i===6)&&Math.floor(t/18+i)%7===4;
  return {carIdx:i,name,number,position:i+1,lapsCompleted:Math.max(0,lap-1),lapDistPct:(progress+1)%1,onPitRoad,lastLapTime:45.2+i*.17,speedMph:onPitRoad?43:167-i*1.3};
 });
 return {online:true,source:"BROWSER DEMO — NOT IRACING",track:"Demo Daytona International Speedway",lap,totalLaps:50,flag,sessionName:"Simulated Race",phase:"race",drivers,driverCount:drivers.length,ageMs:0};
}
