/* HLRN verified snapshot sync v3 — league data + direct season totals + optional Hosted source.
 * Keeps the existing League Data Hub as the verified base, then enriches driver rows with
 * SimRacerHub aggregate totals when available. If enrichment fails, verified base data is kept.
 * Run under Node 20+. Published source URLs are supplied by GitHub Actions secrets. */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/hlrn.json');
export const LEAGUES = ['sunday', 'monday'];
export const ACTIONS = ['drivers', 'teams', 'results'];
export const SEASON_IDS = { sunday: 29832, monday: 30442 };

const num = value => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const firstNum = (obj, keys) => {
  for (const key of keys) {
    const n = num(obj?.[key]);
    if (n !== null) return n;
  }
  return null;
};

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

export function seasonDriverTotals(raw) {
  const out = new Map();
  const rps = raw && typeof raw === 'object' ? raw.rps : null;
  if (!rps || typeof rps !== 'object') return out;

  for (const [driverId, driver] of Object.entries(rps)) {
    if (!driver || typeof driver !== 'object') continue;
    out.set(String(driverId), {
      racePoints: firstNum(driver, ['rpts', 'racePoints', 'race_points', 'race_pts']),
      stagePoints: firstNum(driver, ['spts', 'stagePoints', 'stage_points', 'stage_pts']),
      bonus: firstNum(driver, ['bpts', 'bonus', 'bonusPoints', 'bonus_points']),
      penalty: firstNum(driver, ['ppts', 'penalty', 'penaltyPoints', 'penalty_points']),
      laps: firstNum(driver, ['laps', 'lapsCompleted', 'completedLaps', 'laps_completed']),
      lapsLed: firstNum(driver, ['led', 'lapsLed', 'laps_led']),
      incidents: firstNum(driver, ['inc', 'incidents', 'incidentPoints', 'incident_points'])
    });
  }
  return out;
}

export function mergeSeasonDriverTotals(drivers, raw) {
  const totals = seasonDriverTotals(raw);
  return (drivers || []).map(driver => {
    const found = totals.get(String(driver?.driverId ?? ''));
    if (!found) return driver;
    const merged = { ...driver };
    for (const [key, value] of Object.entries(found)) {
      if (value !== null) merged[key] = value;
    }
    return merged;
  });
}

export function buildSnapshot(payloads, old = {}, hosted = old.hosted ?? null, seasonRaw = {}) {
  const leagues = {};
  for (const league of LEAGUES) {
    leagues[league] = {};
    for (const action of ACTIONS) {
      const verified = validateAction(payloads[league]?.[action], action, league);
      leagues[league][action] =
        action === 'drivers'
          ? mergeSeasonDriverTotals(verified, seasonRaw[league])
          : verified;
    }
  }
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), leagues, hosted };
}

export function sameData(a, b) {
  return JSON.stringify(a?.leagues) === JSON.stringify(b?.leagues) &&
    JSON.stringify(a?.hosted) === JSON.stringify(b?.hosted);
}

async function request(url, description, headers = {}) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        cache: 'no-store',
        headers,
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || data.success === false || data.ok === false) throw new Error('Source returned failure');
      return data;
    } catch (e) {
      last = e;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
  throw new Error(`${description}: ${last?.message || 'failed'}`);
}

async function requestSeasonStandings(league) {
  const seasonId = SEASON_IDS[league];
  const url = new URL('https://simracerhub.com/get_standings.php');
  url.searchParams.set('season_id', String(seasonId));
  url.searchParams.set('_', String(Date.now()));
  const data = await request(url, `${league}/SimRacerHub standings`, {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json,text/javascript,*/*'
  });
  if (!data.rps || typeof data.rps !== 'object')
    throw new Error(`${league}/SimRacerHub standings: missing rps`);
  return data;
}

export async function sync({
  endpoint = process.env.HLRN_LEAGUE_WEBAPP_URL,
  hostedEndpoint = process.env.HLRN_HOSTED_WEBAPP_URL,
  output = OUT
} = {}) {
  if (!endpoint) throw new Error('Set HLRN_LEAGUE_WEBAPP_URL to your working League /exec URL.');

  let old = {};
  try { old = JSON.parse(await readFile(output, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }

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

  const seasonRaw = {};
  for (const league of LEAGUES) {
    try {
      seasonRaw[league] = await requestSeasonStandings(league);
      const count = seasonDriverTotals(seasonRaw[league]).size;
      console.log(`${league} season totals enriched for ${count} drivers.`);
    } catch (e) {
      seasonRaw[league] = null;
      console.warn(`${league} season enrichment failed; verified Data Hub fields retained:`, e.message);
    }
  }

  let hosted = old.hosted ?? null;
  if (hostedEndpoint) {
    try {
      const url = new URL(hostedEndpoint);
      url.searchParams.set('action', 'data');
      hosted = validateHosted(await request(url, 'hosted/data'));
      console.log(`Hosted verified: ${hosted.sessions.length} session rows; ${hosted.rankings.length} rankings.`);
    } catch (e) {
      console.warn('Hosted refresh failed; retaining last Hosted snapshot:', e.message);
    }
  } else {
    console.log('HLRN_HOSTED_WEBAPP_URL not configured; existing Hosted snapshot retained.');
  }

  const next = buildSnapshot(payloads, old, hosted, seasonRaw);
  if (sameData(old, next)) {
    console.log('No data changes; prior snapshot kept.');
    return false;
  }

  const tmp = output + '.tmp';
  await writeFile(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8');
  await rename(tmp, output);
  console.log('Published verified HLRN snapshot at', next.generatedAt);
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  sync().catch(e => {
    console.error('SYNC FAILED; prior snapshot preserved:', e.message);
    process.exitCode = 1;
  });
