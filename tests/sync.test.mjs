import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAction, buildSnapshot, sameData } from '../tools/sync-data.mjs';
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
