import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAction, buildSnapshot, sameData, seasonDriverTotals, mergeSeasonDriverTotals, parseTeamRostersHtml, parseStageBonusBreakdownHtml, combineStageAwardMaps, applyStageBonusReclassification } from '../tools/sync-data.mjs';
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


test('full SimRacerHub standings metrics are retained', () => {
 const raw={rps:{'sunday-1':{
   pos2:1,chg:2,starts:11,counted:10,wins:3,t5:8,t10:10,tpts:545,
   rpts:480,spts:42,bpts:23,ppts:0,laps:1617,led:269,inc:160,
   poles:2,swins:4,rat:1010
 }}};
 const row=seasonDriverTotals(raw).get('sunday-1');
 assert.equal(row.rank,1);
 assert.equal(row.change,2);
 assert.equal(row.racesCounted,10);
 assert.equal(row.poles,2);
 assert.equal(row.stageWins,4);
 assert.equal(row.avgRating,101);
 assert.equal(row.points,545);
});

test('Monday bonus breakdown extracts only official Stage place awards', () => {
 const html=`
 <form id="bonus_form"><table><tbody>
 <tr class="jsTableRow"><td class="driver_name" rowspan="2"><a href="driver_stats.php?driver_id=10&season_id=30442">Driver One</a></td><td class="rgt text-success"><span>10</span></td><td class="wrap">Race winner</td></tr>
 <tr class="jsTableRow"><td class="rgt text-success"><span>5</span></td><td class="wrap">Stage 1st Place</td></tr>
 <tr class="jsTableRow"><td class="driver_name"><a href="driver_stats.php?driver_id=20&season_id=30442">Driver Two</a></td><td class="rgt text-success"><span>4</span></td><td class="wrap">Stage 2nd Place</td></tr>
 </tbody></table></form>`;
 const map=parseStageBonusBreakdownHtml(html);
 assert.equal(map.get('10').points,5);
 assert.equal(map.get('10').wins,1);
 assert.equal(map.get('20').points,4);
 assert.equal(map.get('20').wins,0);
});

test('Monday stage awards are reclassified from bonus without changing total points', () => {
 const stages=combineStageAwardMaps([
   new Map([['10',{points:5,wins:1,awards:[]}]]),
   new Map([['10',{points:3,wins:0,awards:[]}],['20',{points:4,wins:0,awards:[]}]])
 ]);
 const rows=applyStageBonusReclassification([
   {driverId:'10',points:100,stagePoints:0,stageWins:0,bonus:20},
   {driverId:'20',points:90,stagePoints:0,stageWins:0,bonus:12}
 ],stages);
 assert.equal(rows[0].points,100);
 assert.equal(rows[0].stagePoints,8);
 assert.equal(rows[0].stageWins,1);
 assert.equal(rows[0].bonus,12);
 assert.equal(rows[1].points,90);
 assert.equal(rows[1].stagePoints,4);
 assert.equal(rows[1].bonus,8);
});
