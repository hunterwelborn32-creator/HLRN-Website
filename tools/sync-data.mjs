/* HLRN verified snapshot sync v3 — league data + direct season totals + optional Hosted source.
 * Keeps the existing League Data Hub as the verified base, then enriches driver rows with
 * SimRacerHub aggregate totals when available. If enrichment fails, verified base data is kept.
 * Run under Node 20+. Published source URLs are supplied by GitHub Actions secrets. */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/hlrn.json');
const METRICS_OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/results-race-metrics.json');
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
  return {
    latest: data.latest,
    sessions: data.sessions,
    rankings: data.rankings,
    driverRatings: data.driverRatings && typeof data.driverRatings === 'object' ? data.driverRatings : {}
  };
}

const hostedDriverKey = value => String(value || '')
  .trim()
  .replace(/([A-Za-z])\d+$/, '$1')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export function mergeHostedDriverRatings(previousHosted, refreshedHosted) {
  const ratings = { ...(previousHosted?.driverRatings || {}), ...(refreshedHosted?.driverRatings || {}) };
  const raceDate = refreshedHosted?.latest?.date || null;

  for (const row of refreshedHosted?.latest?.results || []) {
    const driver = String(row?.driver || '').trim();
    const key = hostedDriverKey(driver);
    const rating = firstNum(row, ['iRating', 'irating', 'i_rating']);
    if (!key || rating === null || rating <= 0) continue;
    ratings[key] = {
      driver,
      iRating: Math.round(rating),
      date: raceDate
    };
  }

  return ratings;
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
  // SimRacerHub normally keeps awards in #bonus_form, but falling back to the
  // whole page prevents a harmless markup change from silently deleting stages.
  const scope = form ? form[1] : source;

  let currentDriverId = '';
  let currentDriverName = '';
  for (const row of scope.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const body = row[1];
    const driver = body.match(/driver_stats\.php\?[^"'<>]*driver_id=(\d+)[^"'<>]*['"][^>]*>([\s\S]*?)<\/a>/i)
      || body.match(/driver_stats\.php\?driver_id=(\d+)[^'"]*['"][^>]*>([\s\S]*?)<\/a>/i);
    if (driver) {
      currentDriverId = String(driver[1]);
      currentDriverName = stripHtml(driver[2]);
    }
    if (!currentDriverId) continue;

    const cells = [...body.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)].map(match => ({
      attrs: match[1] || '',
      html: match[2] || '',
      text: stripHtml(match[2] || '')
    }));
    const labelIndex = cells.findIndex(cell => /\bStage\s+\d+(?:st|nd|rd|th)\s+Place\b/i.test(cell.text));
    if (labelIndex < 0) continue;

    const label = cells[labelIndex].text;
    const stageMatch = label.match(/\bStage\s+(\d+)(?:st|nd|rd|th)\s+Place\b/i);
    if (!stageMatch) continue;

    let points = null;
    const successCell = cells.find(cell => /text-success/i.test(cell.attrs) && /^[+]?\d+(?:\.\d+)?$/.test(cell.text));
    if (successCell) points = num(successCell.text);
    if (points === null) {
      for (let i = labelIndex - 1; i >= 0; i--) {
        if (/^[+]?\d+(?:\.\d+)?$/.test(cells[i].text)) {
          points = num(cells[i].text);
          break;
        }
      }
    }
    points = points ?? 0;
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

    const parsedStage = num(award.points) ?? 0;
    const parsedWins = num(award.wins) ?? 0;
    const nativeStage = num(driver?.stagePoints) ?? 0;
    const nativeWins = num(driver?.stageWins) ?? 0;

    // Some Monday races arrive with stage awards inside BNS PTS, while newer
    // SimRacerHub responses may already expose part/all of them in STG PTS.
    // Keep the larger verified stage total, reclassify only the missing amount
    // out of bonus points, and always retain the most complete stage-win count.
    const stagePoints = Math.max(nativeStage, parsedStage);
    const stageWins = Math.max(nativeWins, parsedWins);
    const reclassified = Math.max(0, stagePoints - nativeStage);

    const merged = { ...driver, stagePoints, stageWins };
    const bonus = num(driver?.bonus);
    if (bonus !== null && reclassified > 0) {
      merged.bonus = Math.max(0, bonus - reclassified);
    }
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

function resultHeaderKey(value = '') {
  return stripHtml(value).toLowerCase().replace(/[^a-z0-9#]+/g, '');
}
function cellNumber(value) {
  const text = stripHtml(value).replace(/,/g,'');
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? num(match[0]) : null;
}
function tableCells(rowHtml = '') {
  return [...String(rowHtml).matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(m => ({ tag:String(m[1]).toLowerCase(), html:m[2], text:stripHtml(m[2]) }));
}
function headerIndex(headers, aliases) {
  for (let i=0;i<headers.length;i++) {
    const key=resultHeaderKey(headers[i]);
    if (aliases.includes(key)) return i;
  }
  return -1;
}

export function parseSimRacerHubRaceResultsHtml(html, raceId='') {
  const source=String(html||'');
  const tables=[...source.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]);
  for (const table of tables) {
    const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
    if (!rows.length) continue;

    let headerRow=-1, headers=[];
    for (let i=0;i<Math.min(rows.length,6);i++) {
      const cells=tableCells(rows[i]);
      if (!cells.length) continue;
      const texts=cells.map(c=>c.text);
      const keys=texts.map(resultHeaderKey);
      const hasDriver=keys.some(k=>['driver','drivername','name'].includes(k));
      const hasFinish=keys.some(k=>['pos','position','finish','fin','place'].includes(k));
      if (hasDriver && hasFinish) {
        headerRow=i;
        headers=texts;
        break;
      }
    }
    if (headerRow<0) continue;

    const finishIdx=headerIndex(headers,['pos','position','finish','fin','place']);
    const driverIdx=headerIndex(headers,['driver','drivername','name']);
    const startIdx=headerIndex(headers,['st','start','startingpos','startingposition','grid','qual','qualifying']);
    const totalPointsIdx=headerIndex(headers,['totpts','totalpts','totalpoints']);
    const pointsIdx=headerIndex(headers,['racepts','racepoints','pts','points']);
    const bonusIdx=headerIndex(headers,['bnspts','bonuspts','bonuspoints']);
    const penaltyPointsIdx=headerIndex(headers,['penpts','penaltypts','penaltypoints']);
    const intervalIdx=headerIndex(headers,['int','interval']);
    const lapsIdx=headerIndex(headers,['laps']);
    const ledIdx=headerIndex(headers,['led','lapsled','lapslead']);
    const fastestIdx=headerIndex(headers,['fastestlap','bestlap']);
    const fastLapNoIdx=headerIndex(headers,['fastlap#','fastlapno','fastlapnumber']);
    const avgLapIdx=headerIndex(headers,['avglap','averagelap']);
    const incIdx=headerIndex(headers,['inc','incident','incidents','incidentpoints']);
    const statusIdx=headerIndex(headers,['status','finishstatus']);
    const avgPosIdx=headerIndex(headers,['avgpos','averagepos','averageposition']);
    const carIdx=headerIndex(headers,['#','car','carnumber','number','car#']);
    const ratingIdx=headerIndex(headers,['driverrating','rating']);
    const stagePtsIdx=headerIndex(headers,['stagepts','stagepoints']);
    const srIdx=headerIndex(headers,['sr','safetyrating']);
    const iratingIdx=headerIndex(headers,['irating']);
    const qualTimeIdx=headerIndex(headers,['qualtime','qualifyingtime']);
    const licenseIdx=headerIndex(headers,['iracinglicense','license']);

    const out=[];
    for (const rowHtml of rows.slice(headerRow+1)) {
      const cells=tableCells(rowHtml);
      if (cells.length<=Math.max(finishIdx,driverIdx)) continue;
      const driverCell=cells[driverIdx];
      const driverMatch=(driverCell?.html||'').match(/driver_stats\.php\?[^"'<>]*driver_id=(\d+)/i)
        || (driverCell?.html||'').match(/driver_id=(\d+)/i)
        || rowHtml.match(/driver_id=(\d+)/i);
      const driverId=driverMatch ? String(driverMatch[1]) : '';
      const driver=stripHtml(driverCell?.html||driverCell?.text||'').trim();
      const finish=cellNumber(cells[finishIdx]?.text);
      if ((!driverId && !driver) || finish===null || finish<=0) continue;

      const row={
        raceId:String(raceId||''),
        driverId,
        driver,
        finish,
        source:'SimRacerHub'
      };
      if (startIdx>=0) row.start=cellNumber(cells[startIdx]?.text);
      if (totalPointsIdx>=0) row.totalPoints=cellNumber(cells[totalPointsIdx]?.text);
      if (pointsIdx>=0) row.points=cellNumber(cells[pointsIdx]?.text);
      if (bonusIdx>=0) row.bonusPoints=cellNumber(cells[bonusIdx]?.text);
      if (penaltyPointsIdx>=0) row.penaltyPoints=cellNumber(cells[penaltyPointsIdx]?.text);
      if (intervalIdx>=0) row.interval=cellNumber(cells[intervalIdx]?.text);
      if (lapsIdx>=0) row.lapsCompleted=cellNumber(cells[lapsIdx]?.text);
      if (ledIdx>=0) row.lapsLed=cellNumber(cells[ledIdx]?.text);
      if (fastestIdx>=0) row.fastestLap=cellNumber(cells[fastestIdx]?.text);
      if (fastLapNoIdx>=0) row.fastLapNumber=cellNumber(cells[fastLapNoIdx]?.text);
      if (avgLapIdx>=0) row.avgLap=cellNumber(cells[avgLapIdx]?.text);
      if (incIdx>=0) row.incidents=cellNumber(cells[incIdx]?.text);
      if (statusIdx>=0) row.status=stripHtml(cells[statusIdx]?.text||'');
      if (avgPosIdx>=0) row.avgPosition=cellNumber(cells[avgPosIdx]?.text);
      if (carIdx>=0) row.carNumber=stripHtml(cells[carIdx]?.text||'');
      if (ratingIdx>=0) row.driverRating=cellNumber(cells[ratingIdx]?.text);
      if (stagePtsIdx>=0) row.stagePoints=cellNumber(cells[stagePtsIdx]?.text);
      if (srIdx>=0) row.safetyRating=cellNumber(cells[srIdx]?.text);
      if (iratingIdx>=0) row.irating=cellNumber(cells[iratingIdx]?.text);
      if (qualTimeIdx>=0) row.qualifyingTime=cellNumber(cells[qualTimeIdx]?.text);
      if (licenseIdx>=0) row.iracingLicense=stripHtml(cells[licenseIdx]?.text||'');
      out.push(row);
    }
    if (out.length) return out;
  }
  return [];
}

function simRacerHubPenaltyCount(html) {
  const source=String(html||'');
  const text=stripHtml(source).replace(/\s+/g,' ');
  if (/Driver Penalties\s+No penalties/i.test(text)) return 0;

  const tables=[...source.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]);
  for (const table of tables) {
    const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
    if (!rows.length) continue;
    const header=tableCells(rows[0]).map(c=>resultHeaderKey(c.text));
    const hasDriver=header.some(k=>['driver','drivername','name'].includes(k));
    const hasPenalty=header.some(k=>k.includes('penalt')||k==='reason');
    if (!hasDriver || !hasPenalty) continue;
    let count=0;
    for (const row of rows.slice(1)) {
      const cells=tableCells(row);
      if (!cells.length) continue;
      if (/driver_id=\d+/i.test(row) || cells.some(c=>/\b\d+(?:\.\d+)?\b/.test(c.text))) count++;
    }
    return count;
  }
  return null;
}

export function parseSimRacerHubRaceMetricsHtml(html, raceId='', parsedRows=null) {
  const text=stripHtml(html).replace(/\s+/g,' ').trim();
  const rows=Array.isArray(parsedRows)?parsedRows:parseSimRacerHubRaceResultsHtml(html,raceId);
  const summary=text.match(/\bRACE\s+([^·]{1,40})\s*·\s*(\d+)\s+laps\s*·\s*(\d+)\s+Leaders?\s*·\s*(\d+)\s+Lead Changes?\s*·\s*(\d+)\s+cautions?(?:\s*\((\d+)\s+laps?\))?/i);

  const fastest=rows
    .filter(r=>num(r?.fastestLap)!==null&&num(r.fastestLap)>0)
    .slice()
    .sort((a,b)=>num(a.fastestLap)-num(b.fastestLap))[0]||null;

  return {
    raceId:String(raceId||''),
    source:'SimRacerHub',
    duration:summary?String(summary[1]||'').trim():null,
    raceLaps:summary?num(summary[2]):null,
    leaders:summary?num(summary[3]):null,
    leadChanges:summary?num(summary[4]):null,
    cautions:summary?num(summary[5]):null,
    cautionLaps:summary?num(summary[6]):null,
    penalties:simRacerHubPenaltyCount(html),
    fastestLap:fastest?{
      time:num(fastest.fastestLap),
      formatted:num(fastest.fastestLap)?.toFixed(3),
      driver:fastest.driver||'',
      driverId:String(fastest.driverId||''),
      carNumber:String(fastest.carNumber||''),
      lap:num(fastest.fastLapNumber)
    }:null
  };
}

export function mergeSimRacerHubRaceResults(baseResults=[], directByRace=new Map()) {
  if (!(directByRace instanceof Map) || !directByRace.size) return baseResults || [];
  const base=Array.isArray(baseResults)?baseResults:[];
  const grouped=new Map();
  for (const row of base) {
    const key=String(row?.raceId??'');
    if (!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key).push(row);
  }

  const output=[];
  const used=new Set();
  for (const [raceId,rows] of grouped.entries()) {
    const direct=directByRace.get(String(raceId));
    if (!Array.isArray(direct) || !direct.length) {
      output.push(...rows);
      continue;
    }
    used.add(String(raceId));
    const template=rows[0]||{};
    for (const srh of direct) {
      const match=rows.find(r=>String(r?.driverId??'')===String(srh?.driverId??''))
        || rows.find(r=>norm(r?.driver||r?.name||'')===norm(srh?.driver||''));
      const merged={...(match||{}),...srh};
      merged.raceId=String(raceId);
      for (const key of ['raceNumber','track','date']) {
        if ((merged[key]===null||merged[key]===undefined||merged[key]==='') && template[key]!=null) merged[key]=template[key];
      }
      output.push(merged);
    }
  }
  // Only append direct races that already exist in the verified HLRN season data.
  // This prevents unrelated/test SimRacerHub pages from entering HLRN results.
  return output;
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

async function requestSeasonRaceResults(raw, league) {
  const raceIds=mainSeasonRaceIds(raw);
  const rowsByRace=new Map();
  const metricsByRace=new Map();
  for (const raceId of raceIds) {
    try {
      const url=new URL('https://simracerhub.com/season_race.php');
      url.searchParams.set('race_id',raceId);
      url.searchParams.set('_',String(Date.now()));
      const html=await requestText(url,`${league}/SimRacerHub race ${raceId}`,{
        'User-Agent':'Mozilla/5.0',
        'Accept':'text/html,application/xhtml+xml'
      });
      const rows=parseSimRacerHubRaceResultsHtml(html,raceId);
      if (rows.length) {
        rowsByRace.set(String(raceId),rows);
        metricsByRace.set(String(raceId),parseSimRacerHubRaceMetricsHtml(html,raceId,rows));
      } else {
        console.warn(`${league}/SimRacerHub race ${raceId}: finishing table not recognized; verified fallback retained`);
      }
    } catch (e) {
      console.warn(`${league}/SimRacerHub race ${raceId}: ${e.message}; verified fallback retained`);
    }
  }
  return {rowsByRace,metricsByRace};
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
  output = OUT,
  metricsOutput = METRICS_OUT
} = {}) {
  if (!endpoint) throw new Error('Set HLRN_LEAGUE_WEBAPP_URL to your working League /exec URL.');

  let old = {};
  try { old = JSON.parse(await readFile(output, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }

  let oldMetrics = { schemaVersion: 2, races: [] };
  try { oldMetrics = JSON.parse(await readFile(metricsOutput, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const metricsByKey = new Map(
    (Array.isArray(oldMetrics?.races) ? oldMetrics.races : [])
      .map(item=>[String(item?.key||''),item])
      .filter(([key])=>key)
  );

  const payloads = {};
  for (const league of LEAGUES) {
    payloads[league] = {};
    for (const action of ACTIONS) {
      const url = new URL(endpoint);
      url.searchParams.set('action', action);
      url.searchParams.set('league', league);
      try {
        payloads[league][action] = await request(url, `${league}/${action}`);
      } catch (e) {
        const prior = old?.leagues?.[league]?.[action];
        const usable = Array.isArray(prior) && (action !== 'drivers' || prior.length > 0);
        if (!usable) throw e;
        payloads[league][action] = { success: true, [action]: prior };
        console.warn(`${league}/${action} refresh failed; prior published rows retained:`, e.message);
      }
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

  // Race finishing order + historical race intelligence: SimRacerHub is the
  // preferred published source. The existing HLRN Data Hub remains the safety
  // fallback if a race page has not been updated yet.
  for (const league of LEAGUES) {
    if (!seasonRaw[league]) continue;
    try {
      const direct=await requestSeasonRaceResults(seasonRaw[league],league);
      const base=validateAction(payloads[league]?.results,'results',league);
      const merged=mergeSimRacerHubRaceResults(base,direct.rowsByRace);
      payloads[league].results={success:true,results:merged};

      for (const [raceId,metric] of direct.metricsByRace.entries()) {
        const template=merged.find(row=>String(row?.raceId??'')===String(raceId))
          || base.find(row=>String(row?.raceId??'')===String(raceId))
          || {};
        const raceNumber=num(template.raceNumber);
        const key=`${league}|${raceNumber??''}|${raceId}`;
        metricsByKey.set(key,{
          key,
          league,
          raceNumber,
          raceId:String(raceId),
          track:String(template.track||''),
          date:template.date||null,
          source:'SimRacerHub',
          sourceRaceId:String(raceId),
          duration:metric.duration,
          raceLaps:metric.raceLaps,
          leaders:metric.leaders,
          leadChanges:metric.leadChanges,
          cautions:metric.cautions,
          cautionLaps:metric.cautionLaps,
          penalties:metric.penalties,
          fastestLap:metric.fastestLap
        });
      }

      console.log(`${league} race results: SimRacerHub preferred for ${direct.rowsByRace.size} completed race(s); historical race intelligence captured for ${direct.metricsByRace.size} race(s).`);
    } catch (e) {
      console.warn(`${league} direct SimRacerHub race-result refresh failed; verified HLRN results retained: ${e.message}`);
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
      const refreshedHosted = validateHosted(await request(url, 'hosted/data'));
      const priorHostedCount = Array.isArray(old?.hosted?.sessions) ? old.hosted.sessions.length : 0;
      if (priorHostedCount && refreshedHosted.sessions.length < priorHostedCount) {
        throw new Error(`Hosted source regressed from ${priorHostedCount} to ${refreshedHosted.sessions.length} session rows`);
      }
      hosted = {
        ...refreshedHosted,
        driverRatings: mergeHostedDriverRatings(old?.hosted, refreshedHosted)
      };
      console.log(`Hosted verified: ${hosted.sessions.length} session rows; ${hosted.rankings.length} rankings; ${Object.keys(hosted.driverRatings || {}).length} remembered iRatings.`);
    } catch (e) {
      console.warn('Hosted refresh failed; retaining last Hosted snapshot:', e.message);
    }
  } else {
    console.log('HLRN_HOSTED_WEBAPP_URL not configured; existing Hosted snapshot retained.');
  }

  const next = buildSnapshot(payloads, old, hosted, seasonRaw, teamRosters, stageTotals);
  const dataChanged = !sameData(old, next);

  const metricRaces=[...metricsByKey.values()]
    .filter(item=>item&&['sunday','monday'].includes(String(item.league||'')))
    .sort((a,b)=>String(a.league).localeCompare(String(b.league))||(num(a.raceNumber)??999)-(num(b.raceNumber)??999)||String(a.raceId).localeCompare(String(b.raceId)));
  const metricsChanged = JSON.stringify(oldMetrics?.races||[]) !== JSON.stringify(metricRaces);

  if (!dataChanged && !metricsChanged) {
    console.log('No data or race-intelligence changes; prior snapshots kept.');
    return false;
  }

  if (dataChanged) {
    const tmp = output + '.tmp';
    await writeFile(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8');
    await rename(tmp, output);
    console.log('Published verified HLRN snapshot at', next.generatedAt);
  }

  if (metricsChanged) {
    const metricPayload={
      schemaVersion:2,
      generatedAt:new Date().toISOString(),
      source:'SimRacerHub race pages',
      races:metricRaces
    };
    const tmp=metricsOutput+'.tmp';
    await writeFile(tmp, JSON.stringify(metricPayload,null,2)+'\n','utf8');
    await rename(tmp,metricsOutput);
    console.log(`Published SimRacerHub race intelligence for ${metricRaces.length} completed races.`);
  }

  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  sync().catch(e => {
    console.error('SYNC FAILED; prior snapshot preserved:', e.message);
    process.exitCode = 1;
  });
