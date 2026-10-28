/* HLRN website-wide driver exclusion. Keep original upstream race records untouched. */
import { readFileSync } from 'node:fs';

const exclusions = JSON.parse(readFileSync(new URL('../data/driver-exclusions.json', import.meta.url), 'utf8'));
const blockedIds = new Set((exclusions.driverIds || []).map(String));
const blockedSlugs = new Set((exclusions.profileSlugs || []).map(s => String(s).toLowerCase()));

export function driverNameKey(value) {
  let name = String(value ?? '').trim().toLowerCase();
  if (name.includes(',')) {
    const [surname, ...given] = name.split(',');
    name = given.join(',').trim() + ' ' + surname.trim();
  }
  return name.replace(/\d+$/, '').replace(/[^a-z]/g, '');
}
const blockedNames = new Set((exclusions.names || []).map(driverNameKey));

export const isExcludedDriverName = name => !!name && blockedNames.has(driverNameKey(name));
export function isExcludedDriverRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  if (blockedIds.has(String(record.driverId ?? record.driverID ?? ''))) return true;
  if (blockedIds.has(String(record.id ?? '')) && (
    record.name != null || record.sourceName != null || record.series != null
  )) return true;
  if (blockedSlugs.has(String(record.slug || '').toLowerCase())) return true;
  return ['driver', 'name', 'driverName', 'driver_name', 'displayName', 'fullName', 'sourceName', 'winnerName']
    .some(key => isExcludedDriverName(record[key]));
}

/* Remove only excluded person rows, map entries and identity fields, preserving every
   other driver's original results and the race/league containers. */
export function excludeDrivers(value) {
  if (Array.isArray(value)) {
    return value
      .filter(item => !(typeof item === 'string' ? isExcludedDriverName(item) : isExcludedDriverRecord(item)))
      .map(excludeDrivers);
  }
  if (!value || typeof value !== 'object') return value;
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (blockedIds.has(key) || blockedSlugs.has(key.toLowerCase()) || isExcludedDriverName(key)) continue;
    if (typeof item === 'string' && isExcludedDriverName(item)) continue;
    if (isExcludedDriverRecord(item)) continue;
    clean[key] = excludeDrivers(item);
  }
  return clean;
}
