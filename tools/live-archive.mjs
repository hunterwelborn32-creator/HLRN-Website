/* Staging interface for the existing trusted iRacing server/bridge.
 * No separate WebSocket, no invented telemetry, no public write endpoint.
 * Call recordFinalSession(finalState) ONLY from the authenticated producer path
 * when final results are confirmed. Save/publish through durable storage:
 * Render's default local file system is ephemeral. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const safe=x=>String(x??'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,90);
export function verifyFinalSession(s){
  if(!s||typeof s!=='object'||!safe(s.sessionId)||!['hosted','sunday','monday'].includes(s.series)||
     !Array.isArray(s.finalResults)||!s.finalResults.length)
    throw new Error('Final session requires sessionId, series, and nonempty finalResults');
  if(!s.isFinal)throw new Error('Never archive live or unconfirmed race results as final');
  if(s.finalResults.some(r=>!r||!Number.isFinite(Number(r.finish))||Number(r.finish)<1))
    throw new Error('All archived finishing positions must be positive numeric values');
  const cleaned={schemaVersion:1,sessionId:safe(s.sessionId),series:s.series,track:String(s.track||''),
    finishedAt:s.finishedAt||null,source:'authenticated iRacing bridge',
    finalResults:s.finalResults,events:Array.isArray(s.events)?s.events:[],
    raceStats:s.raceStats&&typeof s.raceStats==='object'?s.raceStats:null};
  return cleaned;
}
export async function recordFinalSession(session,root){
  const data=verifyFinalSession(session);
  if(!root)throw new Error('Explicit persistent archive root required; do not silently use Render ephemeral disk');
  const folder=resolve(root,'data/live-archive');await mkdir(folder,{recursive:true});
  const name=safe(data.series+'-'+data.sessionId)+'.json';
  await writeFile(resolve(folder,name),JSON.stringify(data,null,2)+'\n','utf8');
  let index={schemaVersion:1,sessions:[]};
  try{index=JSON.parse(await readFile(resolve(folder,'index.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const record={sessionId:data.sessionId,series:data.series,track:data.track,finishedAt:data.finishedAt,file:name};
  index.sessions=[record,...(index.sessions||[]).filter(x=>x.file!==name)];
  await writeFile(resolve(folder,'index.json'),JSON.stringify(index,null,2)+'\n','utf8');
  return record;
}
