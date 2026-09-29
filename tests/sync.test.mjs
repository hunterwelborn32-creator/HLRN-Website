import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAction, buildSnapshot, sameData, seasonDriverTotals, mergeSeasonDriverTotals, parseTeamRostersHtml } from '../tools/sync-data.mjs';
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

test('team roster parser matches known drivers inside each team section', () => {
 const html='<h4>VRX</h4><div>Trevor Haley</div><div>Brian Hennings</div><h4>DHR</h4><div>Ethan Moreno</div>';
 const drivers=[
  {driverId:'1',driver:'Haley, Trevor'},
  {driverId:'2',driver:'Hennings, Brian'},
  {driverId:'3',driver:'Moreno, Ethan'}
 ];
 const roster=parseTeamRostersHtml(html,drivers);
 assert.deepEqual(roster.VRX.map(x=>x.driverId),['1','2']);
 assert.deepEqual(roster.DHR.map(x=>x.driverId),['3']);
});
