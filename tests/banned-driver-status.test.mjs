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

test('Race Intelligence alone excludes driver ID 116507 and Matthew Brown',()=>{
  const intel=read('assets/race-intelligence/intelligence-v1.js');
  assert.match(intel,/EXCLUDED_DRIVER_IDS\s*=\s*new Set\(\["116507"\]\)/);
  assert.match(intel,/"matthew brown"/);
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
