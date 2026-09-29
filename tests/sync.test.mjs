import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAction, buildSnapshot, sameData, seasonDriverTotals, mergeSeasonDriverTotals } from '../tools/sync-data.mjs';
const payloads = Object.fromEntries(['sunday','monday'].map(l => [l, {
  drivers: { success:true, drivers:[{driverId:l+'-1',name:'Example'}] },
  teams: { success:true, teams:[] },
  results: { success:true, results:[] }
}]));
test('both leagues are retained without inventing results', () => {
 const v = buildSnapshot(payloads);
 assert.equal(v.leagues.sunday.drivers.length, 1);
 assert.equal(v.leagues.monday.results.length, 0);
 assert.equal(v.hosted, null);
});
test('failed, incomplete and empty driver responses are rejected', () => {
 assert.throws(() => validateAction({success:false,drivers:[1]},'drivers','sunday'));
 assert.throws(() => validateAction({success:true},'drivers','sunday'));
 assert.throws(() => validateAction({success:true,drivers:[]},'drivers','sunday'));
});
test('unchanged data does not create a new publish', () => {
 const one = buildSnapshot(payloads); const two = buildSnapshot(payloads);
 assert.ok(sameData(one,two));
});

test('SimRacerHub aggregate driver totals are merged without replacing verified fields', () => {
 const raw={rps:{'sunday-1':{rpts:'100',spts:'12',bpts:'4',ppts:'-2',laps:'500',led:'40',inc:'21'}}};
 const merged=mergeSeasonDriverTotals([{driverId:'sunday-1',driver:'Example',points:150}],raw);
 assert.equal(merged[0].points,150);
 assert.equal(merged[0].racePoints,100);
 assert.equal(merged[0].stagePoints,12);
 assert.equal(merged[0].bonus,4);
 assert.equal(merged[0].penalty,-2);
 assert.equal(merged[0].laps,500);
 assert.equal(merged[0].lapsLed,40);
 assert.equal(merged[0].incidents,21);
});
test('seasonDriverTotals tolerates missing season data', () => {
 assert.equal(seasonDriverTotals(null).size,0);
});
