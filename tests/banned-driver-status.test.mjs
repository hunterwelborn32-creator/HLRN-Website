import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Matthew Brown remains present in published racing records, but is banned',()=>{
  const d=JSON.parse(read('data/hlrn.json'));
  const status=JSON.parse(read('data/driver-status.json')).drivers[0];
  assert.equal(status.driverId,'116507');
  assert.equal(status.status,'BANNED');
  assert.deepEqual(status.excludedFrom,['race-intelligence']);
  for(const league of ['sunday','monday']){
    assert.ok(d.leagues[league].drivers.some(row=>String(row.driverId)==='116507'));
    assert.ok(d.leagues[league].results.some(row=>String(row.driverId)==='116507'));
  }
  assert.ok(d.hosted.sessions.some(row=>/Matthew Brown49/i.test(row.driver)));
  assert.ok(JSON.parse(read('data/driver-pages.json')).drivers.some(row=>row.slug==='matthew-brown49'));
});

test('Race Intelligence excludes all banned drivers without removing their racing records',()=>{
  const intel=read('assets/race-intelligence/intelligence-v1.js');
  const statuses=JSON.parse(read('data/driver-status.json')).drivers;
  const banned=statuses.filter(d=>d.status==='BANNED' && d.excludedFrom?.includes('race-intelligence'));
  assert.ok(banned.length>0);

  const match=intel.match(/EXCLUDED_DRIVER_IDS\s*=\s*new Set\(\s*(\[[^\]]*\])\s*\)/);
  assert.ok(match,'Race Intelligence must define its excluded driver IDs');
  const excludedIds=JSON.parse(match[1]);
  assert.deepEqual([...excludedIds].sort(),banned.map(d=>d.driverId).sort());

  for(const driver of banned){
    assert.ok(intel.includes('"'+driver.name.toLowerCase()+'"'),'Missing excluded driver name: '+driver.name);
  }
  assert.match(intel,/EXCLUDED_DRIVER_IDS\.has\(/);
  assert.doesNotMatch(read('tools/sync-data.mjs'),/excludeDrivers/);
  assert.doesNotMatch(read('tools/build-derived.mjs'),/excludeDrivers/);
});

test('provided banned overlay is loaded and browser enhancement parses',()=>{
  const js=read('assets/banned-driver.js');
  assert.doesNotThrow(()=>new Function(js));
  assert.ok(readFileSync(new URL('../assets/banned-driver.png',import.meta.url)).length>1000);
  assert.match(read('assets/site-shell.js'),/banned-driver\.js/);
  assert.match(read('standings/hosted.html'),/hlrnHostedBannedBadgeDoc\(raw\)/);
});
