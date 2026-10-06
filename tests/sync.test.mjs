import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAction, buildSnapshot, sameData, seasonDriverTotals, mergeSeasonDriverTotals, parseTeamRostersHtml, parseStageBonusBreakdownHtml, combineStageAwardMaps, applyStageBonusReclassification, parseSimRacerHubRaceResultsHtml, mergeSimRacerHubRaceResults } from '../tools/sync-data.mjs';
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

test('Monday stage reconciliation keeps native stage points but fills missing stage wins', () => {
 const stages=new Map([['10',{points:5,wins:1,awards:[{label:'Stage 1st Place',points:5}]}]]);
 const rows=applyStageBonusReclassification([
   {driverId:'10',points:389,stagePoints:5,stageWins:0,bonus:84}
 ],stages);
 assert.equal(rows[0].points,389);
 assert.equal(rows[0].stagePoints,5);
 assert.equal(rows[0].stageWins,1);
 assert.equal(rows[0].bonus,84);
});

test('Monday stage reconciliation only moves the missing stage amount out of bonus', () => {
 const stages=new Map([['10',{points:5,wins:1,awards:[]}]]);
 const rows=applyStageBonusReclassification([
   {driverId:'10',points:100,stagePoints:2,stageWins:0,bonus:10}
 ],stages);
 assert.equal(rows[0].stagePoints,5);
 assert.equal(rows[0].stageWins,1);
 assert.equal(rows[0].bonus,7);
});

test('stage parser survives SimRacerHub markup without bonus_form/jsTableRow classes', () => {
 const html=`
 <table><tbody>
 <tr><td><a href="/driver_stats.php?season_id=30442&driver_id=10">Driver One</a></td><td>5</td><td>Stage 1st Place</td></tr>
 <tr><td><a href="/driver_stats.php?season_id=30442&driver_id=20">Driver Two</a></td><td>4</td><td>Stage 2nd Place</td></tr>
 </tbody></table>`;
 const map=parseStageBonusBreakdownHtml(html);
 assert.equal(map.get('10').points,5);
 assert.equal(map.get('10').wins,1);
 assert.equal(map.get('20').points,4);
});


test('SimRacerHub race result parser reads a standard finishing table', () => {
 const html=`
 <table class="table">
  <thead><tr><th>Pos</th><th>Car #</th><th>Driver</th><th>Start</th><th>Pts</th><th>Laps Led</th><th>Inc</th><th>Status</th></tr></thead>
  <tbody>
   <tr><td>1</td><td>91</td><td><a href="driver_stats.php?season_id=30442&driver_id=93794">Bill Daniels</a></td><td>4</td><td>55</td><td>12</td><td>3</td><td>Running</td></tr>
   <tr><td>2</td><td>56</td><td><a href="/driver_stats.php?driver_id=12345&season_id=30442">Benjamin Richards</a></td><td>1</td><td>49</td><td>20</td><td>2</td><td>Running</td></tr>
  </tbody>
 </table>`;
 const rows=parseSimRacerHubRaceResultsHtml(html,'383476');
 assert.equal(rows.length,2);
 assert.equal(rows[0].driverId,'93794');
 assert.equal(rows[0].finish,1);
 assert.equal(rows[0].start,4);
 assert.equal(rows[0].points,55);
 assert.equal(rows[0].lapsLed,12);
 assert.equal(rows[0].incidents,3);
 assert.equal(rows[0].source,'SimRacerHub');
});

test('direct SimRacerHub race rows replace matching race while preserving HLRN race metadata', () => {
 const base=[
  {raceId:'383476',raceNumber:7,track:'Auto Club Speedway',date:'2026-10-05',driverId:'93794',driver:'Daniels, Bill',finish:2,start:4},
  {raceId:'383476',raceNumber:7,track:'Auto Club Speedway',date:'2026-10-05',driverId:'12345',driver:'Richards, Benjamin',finish:1,start:1},
  {raceId:'111',raceNumber:6,track:'Other Track',date:'2026-09-28',driverId:'9',finish:1}
 ];
 const direct=new Map([['383476',[
  {raceId:'383476',driverId:'93794',driver:'Bill Daniels',finish:1,start:4,points:55,source:'SimRacerHub'},
  {raceId:'383476',driverId:'12345',driver:'Benjamin Richards',finish:2,start:1,points:49,source:'SimRacerHub'}
 ]]]); 
 const rows=mergeSimRacerHubRaceResults(base,direct);
 const auto=rows.find(x=>x.raceId==='383476'&&x.driverId==='93794');
 assert.equal(auto.finish,1);
 assert.equal(auto.raceNumber,7);
 assert.equal(auto.track,'Auto Club Speedway');
 assert.equal(auto.source,'SimRacerHub');
 assert.ok(rows.some(x=>x.raceId==='111'));
});
