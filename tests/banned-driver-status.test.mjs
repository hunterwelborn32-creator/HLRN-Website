import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const normalize=name=>String(name||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');

test('Matthew Brown remains present in published racing records, but is banned',()=>{
  const d=JSON.parse(read('data/hlrn.json'));
  const statuses=JSON.parse(read('data/driver-status.json')).drivers;
  // The status list is alphabetically organized and can grow; never assume index 0.
  const status=statuses.find(driver=>String(driver.driverId)==='116507');
  assert.ok(status,'Matthew Brown must remain in the banned-driver status list');
  assert.equal(status.name,'Matthew Brown49');
  assert.equal(status.status,'BANNED');
  assert.ok(status.excludedFrom?.includes('race-intelligence'));
  for(const league of ['sunday','monday']){
    assert.ok(d.leagues[league].drivers.some(row=>String(row.driverId)==='116507'));
    assert.ok(d.leagues[league].results.some(row=>String(row.driverId)==='116507'));
  }
  assert.ok(d.hosted.sessions.some(row=>/Matthew Brown49/i.test(row.driver)));
  assert.ok(JSON.parse(read('data/driver-pages.json')).drivers.some(row=>row.slug==='matthew-brown49'));
});

test('Race Intelligence excludes all banned drivers by name, alias and available ID without removing racing records',()=>{
  const intel=read('assets/race-intelligence/intelligence-v1.js');
  const statuses=JSON.parse(read('data/driver-status.json')).drivers;
  const banned=statuses.filter(d=>d.status==='BANNED' && d.excludedFrom?.includes('race-intelligence'));
  assert.ok(banned.length>0);

  const match=intel.match(/EXCLUDED_DRIVER_IDS\s*=\s*new Set\(\s*(\[[^\]]*\])\s*\)/);
  assert.ok(match,'Race Intelligence must define excluded driver IDs');
  const excludedIds=JSON.parse(match[1]).map(String).sort();
  const expectedIds=banned.filter(d=>d.driverId!=null&&String(d.driverId).trim()).map(d=>String(d.driverId)).sort();
  assert.deepEqual(excludedIds,expectedIds,'Every known banned driver ID must be excluded (name-only records do not have IDs)');

  const namesMatch=intel.match(/EXCLUDED_DRIVERS\s*=\s*new Set\(\s*(\[[\s\S]*?\])\.map\(name=>normalizeDriverName\(formatDriverName\(name\)\)\)\s*\)/);
  assert.ok(namesMatch,'Race Intelligence must define its normalized excluded name list');
  const excludedNames=new Set(JSON.parse(namesMatch[1]).map(normalize));
  for(const driver of banned){
    for(const name of [driver.name,...(driver.aliases||[])]){
      assert.ok(excludedNames.has(normalize(name)), 'Missing excluded driver name or alias: '+name);
    }
  }

  assert.match(intel,/EXCLUDED_DRIVER_IDS\.has\(/);
  assert.match(intel,/isExcludedDriverName\(/);
  assert.match(intel,/rawDrivers\.filter\(d => !EXCLUDED_DRIVER_IDS\.has/);
  assert.match(intel,/results = rawResults\.filter\(r => !EXCLUDED_DRIVER_IDS\.has/);
  // Exclusion is ONLY for Race Intelligence; official racing records remain untouched.
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

test('Bryce Hinton is reinstated with verified race stats and no ban treatments',()=>{
  const statuses=JSON.parse(read('data/driver-status.json')).drivers;
  assert.equal(statuses.find(d=>String(d.driverId)==='105882'),undefined);
  const profiles=JSON.parse(read('data/derived/profiles.json')).drivers.filter(d=>String(d.id)==='105882');
  assert.deepEqual(profiles.map(d=>d.series).sort(),['monday','sunday']);
  // Compare against the current official standings, not a frozen race count.
  const snapshot=JSON.parse(read('data/hlrn.json'));
  for(const profile of profiles){
    const source=snapshot.leagues[profile.series];
    const standings=source.drivers.filter(d=>String(d.driverId)==='105882');
    assert.equal(standings.length,1,'Expected one official standings row in '+profile.series);
    for(const field of ['races','top5','top10']){
      assert.ok(standings[0][field]!=null && String(standings[0][field]).trim()!=='','Missing official '+field);
      assert.equal(profile[field],Number(standings[0][field]),profile.series+' '+field+' must match official standings');
    }
    const expectedResults=source.results.filter(r=>String(r.driverId)==='105882');
    assert.equal(profile.results.length,expectedResults.length,profile.series+' race history must be retained');
  }
  // Retain the historical reinstatement baseline while allowing new races.
  for(const [field,minimum] of [['races',7],['top5',2],['top10',3]]){
    assert.ok(profiles.reduce((sum,d)=>sum+Number(d[field]||0),0)>=minimum,'Reinstated '+field+' history must not be lost');
  }
  assert.doesNotMatch(read('assets/race-intelligence/intelligence-v1.js'),/105882|Bryce Hinton|Hinton2, Bryce/);
  assert.doesNotMatch(read('assets/banned-driver.js'),/"name":"Bryce Hinton"/);
  const page=read('drivers/bryce-hinton2/index.html');
  assert.ok(page.includes('<h1>Bryce Hinton2</h1>'));
  assert.doesNotMatch(page,/hlrn-ban-stamp|data-hlrn-banned-photo|alt="BANNED"/);
  assert.match(page,/Race History/);
});
