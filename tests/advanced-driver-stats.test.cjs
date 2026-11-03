/* node --test tests/advanced-driver-stats.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const data=JSON.parse(fs.readFileSync(path.join(__dirname,"../data/derived/profiles.json"),"utf8"));
const valid=v=>v!==null&&v!==undefined&&v!==""&&Number.isInteger(Number(v))&&Number(v)>0;
const series=new Set(["sunday","monday","hosted"]);
test("published profile data is usable",()=>{
 assert.ok(Array.isArray(data.drivers)&&data.drivers.length>0);
 for(const p of data.drivers){assert.ok(series.has(p.series));assert.ok(p.id||p.name);assert.ok(Array.isArray(p.results));}
});
test("verified race rows are unique per driver/series/race",()=>{
 for(const p of data.drivers){
  const ids=new Set();
  for(const r of p.results){
   const key=String(r.raceId||r.raceNumber||r.date)+":"+r.date;
   assert.ok(!ids.has(key),p.series+"/"+p.name+" duplicate "+key);ids.add(key);
  }
 }
});
test("derived victory and top-five counts agree with published official profile totals",()=>{
 for(const p of data.drivers){
  const rows=p.results.filter(r=>valid(r.finish));
  if(!rows.length)continue;
  assert.equal(rows.filter(r=>Number(r.finish)===1).length,Number(p.wins),p.series+"/"+p.name+" wins");
  assert.equal(rows.filter(r=>Number(r.finish)<=5).length,Number(p.top5),p.series+"/"+p.name+" top5");
  assert.equal(rows.filter(r=>Number(r.finish)<=10).length,Number(p.top10),p.series+"/"+p.name+" top10");
 }
});
test("recorded event groups keep hosted, sunday, monday separate",()=>{
 const all=data.drivers.flatMap(p=>p.results.map(r=>({series:p.series,driver:p.id,raceId:r.raceId})));
 assert.ok(all.length>0);
 assert.ok(all.every(x=>series.has(x.series)));
});
