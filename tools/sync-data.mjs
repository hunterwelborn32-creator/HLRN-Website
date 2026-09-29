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
    const counted = firstNum(driver, ['counted', 'racesCounted', 'races_counted']);
    const ratingTotal = firstNum(driver, ['rat', 'ratingTotal', 'rating_total']);
    out.set(String(driverId), {
      rank: firstNum(driver, ['pos2', 'pos1', 'rank']),
      change: firstNum(driver, ['chg', 'change']),
      starts: firstNum(driver, ['starts']),
      racesCounted: counted,
      wins: firstNum(driver, ['wins']),
      top5: firstNum(driver, ['t5', 'top5']),
      top10: firstNum(driver, ['t10', 'top10']),
      points: firstNum(driver, ['tpts', 'points', 'totalPoints', 'total_points']),
      racePoints: firstNum(driver, ['rpts', 'racePoints', 'race_points', 'race_pts']),
      stagePoints: firstNum(driver, ['spts', 'stagePoints', 'stage_points', 'stage_pts']),
      bonus: firstNum(driver, ['bpts', 'bonus', 'bonusPoints', 'bonus_points']),
      penalty: firstNum(driver, ['ppts', 'penalty', 'penaltyPoints', 'penalty_points']),
      laps: firstNum(driver, ['laps', 'lapsCompleted', 'completedLaps', 'laps_completed']),
      lapsLed: firstNum(driver, ['led', 'lapsLed', 'laps_led']),
      incidents: firstNum(driver, ['inc', 'incidents', 'incidentPoints', 'incident_points']),
      poles: firstNum(driver, ['poles']),
      stageWins: firstNum(driver, ['swins', 'stageWins', 'stage_wins']),
      ratingTotal,
      avgRating: counted && ratingTotal !== null ? ratingTotal / counted : null
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

export function parseStageBonusBreakdownHtml(html) {
  const out = new Map();
  const source = String(html || '');
  const form = source.match(/<form\b[^>]*id=['"]bonus_form['"][^>]*>([\s\S]*?)<\/form>/i);
  if (!form) return out;

  let currentDriverId = '';
  let currentDriverName = '';
  for (const row of form[1].matchAll(/<tr\b[^>]*class=['"][^'"]*jsTableRow[^'"]*['"][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const body = row[1];
    const driver = body.match(/driver_stats\.php\?driver_id=(\d+)[^'"]*['"][^>]*>([\s\S]*?)<\/a>/i);
    if (driver) {
      currentDriverId = String(driver[1]);
      currentDriverName = stripHtml(driver[2]);
    }
    const pointsMatch = body.match(/<td\b[^>]*class=['"][^'"]*text-success[^'"]*['"][^>]*>\s*(?:<span[^>]*>)?\s*([+-]?\d+(?:\.\d+)?)\s*(?:<\/span>)?/i);
    const labelMatch = body.match(/<td\b[^>]*class=['"][^'"]*wrap[^'"]*['"][^>]*>([\s\S]*?)<\/td>/i);
    if (!currentDriverId || !pointsMatch || !labelMatch) continue;

    const label = stripHtml(labelMatch[1]);
    const stageMatch = label.match(/^Stage\s+(\d+)(?:st|nd|rd|th)\s+Place$/i);
    if (!stageMatch) continue;

    const points = num(pointsMatch[1]) ?? 0;
    if (points <= 0) continue;

    const existing = out.get(currentDriverId) || {
      driverId: currentDriverId,
      driver: currentDriverName,
      points: 0,
      wins: 0,
      awards: []
    };
    existing.points += points;
    if (Number(stageMatch[1]) === 1) existing.wins += 1;
    existing.awards.push({ label, points });
    out.set(currentDriverId, existing);
  }
  return out;
}

export function mainSeasonRaceIds(raw) {
  const schedules = Array.isArray(raw?.schedules)
    ? raw.schedules
    : (raw?.schedules && typeof raw.schedules === 'object' ? Object.values(raw.schedules) : []);
  const ids = [];
  for (const schedule of schedules) {
    const race = schedule?.race_id;
    let value = null;
    if (race && typeof race === 'object' && !Array.isArray(race)) {
      value = race['0.0'] ?? race['0'] ?? null;
      if (value === null) value = Object.values(race).find(v => /^\d+$/.test(String(v ?? ''))) ?? null;
    } else if (Array.isArray(race)) {
      value = race.find(v => /^\d+$/.test(String(v ?? ''))) ?? null;
    } else {
      value = race;
    }
    if (/^\d+$/.test(String(value ?? ''))) ids.push(String(value));
  }
  return [...new Set(ids)];
}

export function combineStageAwardMaps(maps = []) {
  const totals = new Map();
  for (const map of maps) {
    if (!(map instanceof Map)) continue;
    for (const [driverId, entry] of map.entries()) {
      const points = num(entry?.points ?? entry) ?? 0;
      if (points <= 0) continue;
      const existing = totals.get(String(driverId)) || {
        driverId: String(driverId),
        driver: entry?.driver || '',
        points: 0,
        wins: 0,
        awards: []
      };
      existing.points += points;
      existing.wins += num(entry?.wins) ?? 0;
      if (Array.isArray(entry?.awards)) existing.awards.push(...entry.awards);
      totals.set(String(driverId), existing);
    }
  }
  return totals;
}

export function publishedStageTotals(drivers = []) {
  const totals = new Map();
  for (const driver of drivers || []) {
    const driverId = String(driver?.driverId ?? '');
    const points = num(driver?.stagePoints) ?? 0;
    const wins = num(driver?.stageWins) ?? 0;
    if (!driverId || (points <= 0 && wins <= 0)) continue;
    totals.set(driverId, {
      driverId,
      driver: driver?.driver || driver?.name || '',
      points,
      wins,
      awards: []
    });
  }
  return totals;
}

export function applyStageBonusReclassification(drivers, stageTotals) {
  if (!(stageTotals instanceof Map) || !stageTotals.size) return drivers || [];
  return (drivers || []).map(driver => {
    const driverId = String(driver?.driverId ?? '');
    const award = stageTotals.get(driverId);
    if (!award) return driver;

    const stagePoints = num(award.points) ?? 0;
    const stageWins = num(award.wins) ?? 0;
    const nativeStage = num(driver?.stagePoints) ?? 0;
    if (nativeStage > 0) return driver;

    const merged = { ...driver, stagePoints, stageWins };
    const bonus = num(driver?.bonus);
    if (bonus !== null && stagePoints > 0) merged.bonus = Math.max(0, bonus - stagePoints);
    return merged;
  });
}

export function applyDriverTeams(drivers, roster = {}) {
  const byId = new Map();
  for (const [team, members] of Object.entries(roster || {})) {
    for (const member of members || []) {
      const driverId = String(member?.driverId ?? '');
      if (driverId && !byId.has(driverId)) byId.set(driverId, team);
    }
  }
  return (drivers || []).map(driver => ({
    ...driver,
    team: byId.get(String(driver?.driverId ?? '')) || driver?.team || ''
  }));
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&#039;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function stripHtml(value = '') {
  return decodeHtml(String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')).trim();
}
function norm(value = '') {
  return stripHtml(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}
function driverVariants(name = '') {
  const raw = stripHtml(name).trim();
  const variants = new Set([norm(raw), norm(raw.replace(/\d+$/g,''))]);
  if (raw.includes(',')) {
    const parts = raw.split(',');
    const last = (parts.shift() || '').trim();
    const first = parts.join(' ').trim();
    variants.add(norm(first + ' ' + last));
    variants.add(norm(first + ' ' + last.replace(/\d+$/g,'')));
  }
  return [...variants].filter(Boolean);
}
export function parseTeamRostersHtml(html, drivers = []) {
  const roster = {};
  const source = String(html || '');
  let headingRe = /<h4\b[^>]*>([\s\S]*?)<\/h4>/gi;
  let matches = [...source.matchAll(headingRe)];
  if (!matches.length) {
    headingRe = /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi;
    matches = [...source.matchAll(headingRe)].filter(m => !/season\s+teams/i.test(stripHtml(m[1])));
  }
  for (let i = 0; i < matches.length; i++) {
    const team = stripHtml(matches[i][1]).trim();
    if (!team) continue;
    const start = (matches[i].index || 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index || source.length) : source.length;
    const section = norm(source.slice(start, end));
    const found = [];
    for (const driver of drivers || []) {
      if (!driver?.driver) continue;
      if (driverVariants(driver.driver).some(v => v.length >= 5 && section.includes(v))) {
        found.push({ driverId: String(driver.driverId ?? ''), driver: String(driver.driver) });
      }
    }
    roster[team] = found;
  }
  return roster;
}
export function buildSnapshot(payloads, old = {}, hosted = old.hosted ?? null, seasonRaw = {}, teamRosters = {}, stageTotals = {}) {
  const leagues = {};
  for (const league of LEAGUES) {
    leagues[league] = {};
    const roster =
      teamRosters[league] && typeof teamRosters[league] === 'object'
        ? teamRosters[league]
        : (old?.leagues?.[league]?.teamRosters || {});
    for (const action of ACTIONS) {
      const verified = validateAction(payloads[league]?.[action], action, league);
      let value = action === 'drivers'
        ? mergeSeasonDriverTotals(verified, seasonRaw[league])
        : verified;
      if (league === 'monday' && action === 'drivers') {
        value = applyStageBonusReclassification(value, stageTotals.monday);
      }
      if (action === 'drivers') value = applyDriverTeams(value, roster);
      leagues[league][action] = value;
    }
    leagues[league].teamRosters = roster;
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

async function requestText(url, description, headers = {}) {
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
      return await res.text();
    } catch (e) {
      last = e;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
  throw new Error(`${description}: ${last?.message || 'failed'}`);
}

async function requestTeamRosters(league, drivers) {
  const url = new URL('https://simracerhub.com/teams.php');
  url.searchParams.set('season_id', String(SEASON_IDS[league]));
  url.searchParams.set('_', String(Date.now()));
  const html = await requestText(url, `${league}/SimRacerHub teams`, {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'text/html,application/xhtml+xml'
  });
  const rosters = parseTeamRostersHtml(html, drivers);
  if (!Object.keys(rosters).length) throw new Error(`${league}/teams: no team sections found`);
  return rosters;
}

async function requestMondayStageTotals(raw) {
  const raceIds = mainSeasonRaceIds(raw);
  if (!raceIds.length) throw new Error('monday/stage breakdown: no completed race ids');

  const maps = await Promise.all(raceIds.map(async raceId => {
    const url = new URL('https://simracerhub.com/season_race.php');
    url.searchParams.set('race_id', raceId);
    url.searchParams.set('scbp', 'y');
    url.searchParams.set('_', String(Date.now()));
    const html = await requestText(url, `monday/stage breakdown race ${raceId}`, {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    });
    return parseStageBonusBreakdownHtml(html);
  }));

  return combineStageAwardMaps(maps);
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

  const stageTotals = {};
  try {
    stageTotals.monday = await requestMondayStageTotals(seasonRaw.monday);
    console.log(`monday stage breakdown rebuilt for ${stageTotals.monday.size} drivers across ${mainSeasonRaceIds(seasonRaw.monday).length} races.`);
  } catch (e) {
    stageTotals.monday = publishedStageTotals(old?.leagues?.monday?.drivers || []);
    console.warn('monday stage breakdown refresh failed; prior published stage totals retained:', e.message);
  }

  const teamRosters = {};
  for (const league of LEAGUES) {
    try {
      const baseDrivers = validateAction(payloads[league]?.drivers, 'drivers', league);
      teamRosters[league] = await requestTeamRosters(league, baseDrivers);
      const assigned = Object.values(teamRosters[league]).reduce((n, rows) => n + rows.length, 0);
      console.log(`${league} team rosters published: ${Object.keys(teamRosters[league]).length} teams / ${assigned} driver assignments.`);
    } catch (e) {
      teamRosters[league] = old?.leagues?.[league]?.teamRosters || {};
      console.warn(`${league} team roster refresh failed; previous roster retained:`, e.message);
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

  const next = buildSnapshot(payloads, old, hosted, seasonRaw, teamRosters, stageTotals);
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
