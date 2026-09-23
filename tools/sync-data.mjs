/* HLRN verified snapshot sync v2 — league data + optional Hosted source.
 * This replaces tools/sync-data.mjs, never writes a partial league snapshot.
 * Run under Node 20+. Published source URLs are supplied by GitHub Actions secrets. */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/hlrn.json');
export const LEAGUES = ['sunday', 'monday'];
export const ACTIONS = ['drivers', 'teams', 'results'];
export function validateAction(data, action, league) {
  if (!data || typeof data !== 'object' || data.success === false || !Array.isArray(data[action]))
    throw new Error(`${league}/${action}: missing or failed data`);
  if (action === 'drivers' && !data.drivers.length)
    throw new Error(`${league}/drivers: empty; previous published data preserved`);
  return data[action];
}
export function validateHosted(data) {
  if (!data || typeof data !== 'object' || data.success === false || data.ok === false ||
      !data.latest || !Array.isArray(data.latest.results) ||
      !Array.isArray(data.sessions) || !Array.isArray(data.rankings))
    throw new Error('Hosted /action=data: expected latest.results, sessions and rankings');
  if (!data.latest.results.length && !data.sessions.length && !data.rankings.length)
    throw new Error('Hosted data is empty; previous published Hosted snapshot preserved');
  return { latest: data.latest, sessions: data.sessions, rankings: data.rankings };
}
export function buildSnapshot(payloads, old = {}, hosted = old.hosted ?? null) {
  const leagues = {};
  for (const league of LEAGUES) {
    leagues[league] = {};
    for (const action of ACTIONS)
      leagues[league][action] = validateAction(payloads[league]?.[action], action, league);
  }
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), leagues, hosted };
}
export function sameData(a, b) {
  return JSON.stringify(a?.leagues) === JSON.stringify(b?.leagues) &&
    JSON.stringify(a?.hosted) === JSON.stringify(b?.hosted);
}
async function request(url, description) {
  let last;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      const res=await fetch(url, { redirect:'follow', cache:'no-store', signal:AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      if (!data || data.success === false || data.ok === false) throw new Error('Source returned failure');
      return data;
    } catch(e) { last=e; if(attempt<3) await new Promise(r=>setTimeout(r,attempt*1000)); }
  }
  throw new Error(`${description}: ${last?.message || 'failed'}`);
}
export async function sync({ endpoint=process.env.HLRN_LEAGUE_WEBAPP_URL,
                             hostedEndpoint=process.env.HLRN_HOSTED_WEBAPP_URL,
                             output=OUT }={}) {
  if (!endpoint) throw new Error('Set HLRN_LEAGUE_WEBAPP_URL to your working League /exec URL.');
  let old={};
  try { old=JSON.parse(await readFile(output,'utf8')); }
  catch(e){if(e.code!=='ENOENT') throw e;}
  const payloads={};
  for(const league of LEAGUES) {
    payloads[league]={};
    for(const action of ACTIONS) {
      const url=new URL(endpoint); url.searchParams.set('action',action); url.searchParams.set('league',league);
      payloads[league][action]=await request(url,`${league}/${action}`);
    }
  }
  let hosted=old.hosted ?? null;
  if(hostedEndpoint) {
    try {
      const url=new URL(hostedEndpoint); url.searchParams.set('action','data');
      hosted=validateHosted(await request(url,'hosted/data'));
      console.log(`Hosted verified: ${hosted.sessions.length} session rows; ${hosted.rankings.length} rankings.`);
    } catch(e) {
      console.warn('Hosted refresh failed; retaining last Hosted snapshot:',e.message);
    }
  } else console.log('HLRN_HOSTED_WEBAPP_URL not configured; existing Hosted snapshot retained.');
  const next=buildSnapshot(payloads,old,hosted);
  if(sameData(old,next)) {console.log('No data changes; prior snapshot kept.'); return false;}
  const tmp=output+'.tmp';
  await writeFile(tmp,JSON.stringify(next,null,2)+'\n','utf8');
  await rename(tmp,output);
  console.log('Published verified HLRN snapshot at',next.generatedAt);
  return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  sync().catch(e=>{console.error('SYNC FAILED; prior snapshot preserved:',e.message);process.exitCode=1;});
