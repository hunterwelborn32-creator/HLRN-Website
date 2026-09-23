/* Build factual race summaries + driver profile catalog from published snapshot.
 * Never infer caution count, lead changes, incident causes or pit information.
 * Node 20+, no dependencies. Does not touch original Sheet or live relay. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const num=x=>(x===null||x===undefined||String(x).trim()==='')?null:(Number.isFinite(Number(x))?Number(x):null);
const str=x=>String(x??'').trim();
export const displayName=name=>{
  const s=str(name); if(!s.includes(','))return s;
  const [surname,...first]=s.split(','); return [first.join(',').trim(),surname.trim()].filter(Boolean).join(' ');
};
export const slug=name=>{
  const shown=displayName(name).replace(/\d+$/,'').trim();
  const key=shown.toLowerCase().replace(/[^a-z0-9]/g,'');
  const known={ethanfonsecamoreno:'ethan-moreno',dylancjones:'dylan-jones',joshuamckinney:'josh-mckinney',jeremysjeffries:'jeremy-jeffries',ericpedleyhayden:'eric-hayden',randyschweitzerrsi:'randy-schweitzer',sebastianmicheals:'sebastian-michaels',vicenteguerrero:'vincente-guerrero'};
  return known[key]||shown.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
};
function dateValue(s) {const d=Date.parse(str(s));return Number.isFinite(d)?new Date(d).toISOString():null;}
function identityMatch(row, mappings, series) {
  return (mappings.drivers||[]).find(m=>{
    if(m.driverId!=null&&row.driverId!=null&&str(m.driverId)===str(row.driverId)) return true;
    if(m.series===series&&m.name&&str(m.name).toLowerCase()===str(row.driver).toLowerCase()) return true;
    return false;
  })||null;
}
export function buildDerived(snapshot, mappings={drivers:[]}, oldReports={reports:[]}) {
  if(snapshot.schemaVersion!==1 || !snapshot.generatedAt || !snapshot.leagues) throw new Error('Invalid source snapshot');
  const drivers=[];const reports=[];const seen=new Set();
  for(const series of ['sunday','monday']) {
    const league=snapshot.leagues[series];
    if(!league||!Array.isArray(league.drivers)||!Array.isArray(league.results)||!league.drivers.length)
      throw new Error('Missing '+series+' source data');
    const names=new Map();
    for(const d of league.drivers){
      if(d.driverId!=null)names.set(str(d.driverId),displayName(d.driver));
    }
    const byDriver=new Map();
    const byRace=new Map();
    for(const r of league.results){
      const id=str(r.driverId); if(id){if(!byDriver.has(id))byDriver.set(id,[]);byDriver.get(id).push(r);}
      const raceId=str(r.raceId)||('round-'+str(r.raceNumber));
      if(!raceId||raceId==='round-')continue;
      if(!byRace.has(raceId))byRace.set(raceId,[]);
      byRace.get(raceId).push(r);
    }
    for(const d of league.drivers){
      const mapping=identityMatch(d,mappings,series);
      const id=str(d.driverId)||slug(d.driver);
      const races=(byDriver.get(str(d.driverId))||[]).slice().sort((a,b)=>(num(b.raceNumber)??0)-(num(a.raceNumber)??0));
      drivers.push({series,id,name:displayName(d.driver),sourceName:str(d.driver),
        photoSlug:str(mapping?.photoSlug)||slug(d.driver),rank:num(d.rank),points:num(d.points),
        change:num(d.change),races:num(d.races),wins:num(d.wins),top5:num(d.top5),top10:num(d.top10),
        avgFinish:num(d.avgFinish),results:races.map(r=>({raceId:str(r.raceId),raceNumber:num(r.raceNumber),track:str(r.track),date:dateValue(r.date),start:num(r.start),finish:num(r.finish),points:num(r.points),lapsLed:num(r.lapsLed),incidents:num(r.incidents),status:str(r.status)}))});
    }
    for(const [raceId,entries] of byRace){
      const rows=entries.filter(r=>num(r.finish)!=null&&num(r.finish)>0).sort((a,b)=>num(a.finish)-num(b.finish));
      if(!rows.length)continue;
      const leader=rows[0]; const winner=rows.find(r=>num(r.finish)===1);
      const positions=rows.map(r=>({id:str(r.driverId),name:names.get(str(r.driverId))||'',start:num(r.start),finish:num(r.finish),gain:num(r.start)!=null?num(r.start)-num(r.finish):null,points:num(r.points),lapsLed:num(r.lapsLed),incidents:num(r.incidents),status:str(r.status)}));
      const key=series+':'+raceId;seen.add(key);
      reports.push({key,series,raceId,raceNumber:num(leader.raceNumber),track:str(leader.track),date:dateValue(leader.date),
        winner:winner?{name:names.get(str(winner.driverId))||'',id:str(winner.driverId)}:null,
        classified:rows.length,top10:positions.slice(0,10),results:positions,
        biggestGainers:positions.filter(p=>p.gain!=null&&p.gain>0).sort((a,b)=>b.gain-a.gain||a.finish-b.finish).slice(0,3),
        dataNotes:['Finishing results reflect published race rows.','Caution count, lead changes, penalties and incident causes are not available in this source.']});
    }
  }
  const hosted=snapshot.hosted;
  if(hosted&&Array.isArray(hosted.rankings)){
    for(const d of hosted.rankings){
      if(!str(d.driver))continue;
      const mapping=identityMatch(d,mappings,'hosted');
      drivers.push({series:'hosted',id:slug(d.driver),name:displayName(d.driver),sourceName:str(d.driver),
        photoSlug:str(mapping?.photoSlug)||slug(d.driver),rank:num(d.rank),points:null,races:num(d.races),wins:num(d.wins),top5:num(d.top5),top10:num(d.top10),avgFinish:num(d.averageFinish),results:[]});
    }
  }
  if(hosted?.latest&&Array.isArray(hosted.latest.results)&&hosted.latest.results.length){
    const last=hosted.latest;
    const winner=str(last.winner)||(last.results.find(r=>num(r.position)===1)?.driver||'');
    const key='hosted:latest';seen.add(key);
    reports.push({key,series:'hosted',raceId:'latest',raceNumber:null,track:str(last.track),date:dateValue(last.date),
      winner:winner?{name:displayName(winner),id:slug(winner)}:null,
      classified:last.results.length,
      top10:last.results.slice().sort((a,b)=>(num(a.position)??999)-(num(b.position)??999)).slice(0,10).map(r=>({id:slug(r.driver),name:displayName(r.driver),start:num(r.start),finish:num(r.position),gain:num(r.start)!=null&&num(r.position)!=null?num(r.start)-num(r.position):null,lapsLed:num(r.lapsLed),incidents:num(r.incidents),carNumber:str(r.carNumber),status:''})),
      results:last.results.slice().sort((a,b)=>(num(a.position)??999)-(num(b.position)??999)).map(r=>({id:slug(r.driver),name:displayName(r.driver),start:num(r.start),finish:num(r.position),gain:num(r.start)!=null&&num(r.position)!=null?num(r.start)-num(r.position):null,lapsLed:num(r.lapsLed),incidents:num(r.incidents),carNumber:str(r.carNumber),status:''})),
      biggestGainers:[], dataNotes:['Hosted latest-race report uses the existing Hosted API. Historical Hosted sessions remain in the original Hosted page.']});
  }
  // Keep previously published historical reports if the active source no longer includes the race.
  for(const r of (oldReports.reports||[]))if(r&&str(r.key)&&!seen.has(str(r.key)))reports.push(r);
  reports.sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0)||String(b.key).localeCompare(String(a.key)));
  return {profiles:{schemaVersion:1,generatedAt:snapshot.generatedAt,drivers},
          reports:{schemaVersion:1,generatedAt:snapshot.generatedAt,reports}};
}
export async function run({root=ROOT}={}){
  const source=JSON.parse(await readFile(resolve(root,'data/hlrn.json'),'utf8'));
  let mappings={drivers:[]}, old={reports:[]};
  try{mappings=JSON.parse(await readFile(resolve(root,'data/driver-identities.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  try{old=JSON.parse(await readFile(resolve(root,'data/derived/reports.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const out=buildDerived(source,mappings,old);
  await mkdir(resolve(root,'data/derived'),{recursive:true});
  await writeFile(resolve(root,'data/derived/profiles.json'),JSON.stringify(out.profiles,null,2)+'\n');
  await writeFile(resolve(root,'data/derived/reports.json'),JSON.stringify(out.reports,null,2)+'\n');
  console.log(`Derived profiles: ${out.profiles.drivers.length}; reports: ${out.reports.reports.length}`);
  return out;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  run().catch(e=>{console.error('Derived data build failed:',e.message);process.exitCode=1;});
