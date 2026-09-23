/* HLRN source-to-static snapshot. Node 20+, no dependencies.
   Reads the existing Apps Script actions: drivers, teams, results for each league.
   Never overwrites a successful snapshot with a failed, partial or empty drivers response. */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/hlrn.json');
export const LEAGUES = ['sunday', 'monday'];
export const ACTIONS = ['drivers', 'teams', 'results'];
export function validateAction(data, action, league) {
  if (!data || typeof data !== 'object' || data.success === false || !Array.isArray(data[action])) {
    throw new Error(`${league}/${action}: missing or failed data`);
  }
  if (action === 'drivers' && data.drivers.length === 0) {
    throw new Error(`${league}/drivers: empty array; previous snapshot preserved`);
  }
  return data[action];
}
export function buildSnapshot(payloads, old = {}) {
  const leagues = {};
  for (const league of LEAGUES) {
    leagues[league] = {};
    for (const action of ACTIONS) {
      leagues[league][action] = validateAction(payloads[league]?.[action], action, league);
    }
  }
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), leagues, hosted: old.hosted ?? null };
}
export function sameData(a, b) {
  return JSON.stringify(a?.leagues) === JSON.stringify(b?.leagues) && JSON.stringify(a?.hosted) === JSON.stringify(b?.hosted);
}
async function request(url, description) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!body || body.success === false) throw new Error('Source returned failure');
      return body;
    } catch (err) {
      last = err;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
  throw new Error(`${description}: ${last?.message || 'failed'}`);
}
export async function sync({ endpoint = process.env.HLRN_LEAGUE_WEBAPP_URL, output = OUT } = {}) {
  if (!endpoint) throw new Error('Set HLRN_LEAGUE_WEBAPP_URL to the existing Apps Script /exec URL.');
  let old = {};
  try { old = JSON.parse(await readFile(output, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const payloads = {};
  for (const league of LEAGUES) {
    payloads[league] = {};
    for (const action of ACTIONS) {
      const url = new URL(endpoint);
      url.searchParams.set('action', action);
      url.searchParams.set('league', league);
      payloads[league][action] = await request(url, `${league}/${action}`);
    }
  }
  const next = buildSnapshot(payloads, old);
  if (sameData(old, next)) { console.log('No data changes; previous snapshot kept.'); return false; }
  const tmp = output + '.tmp';
  await writeFile(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8');
  await rename(tmp, output);
  console.log('Published verified HLRN snapshot at', next.generatedAt);
  return true;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  sync().catch(err => { console.error('SYNC FAILED; previous snapshot preserved:', err.message); process.exitCode = 1; });
}
