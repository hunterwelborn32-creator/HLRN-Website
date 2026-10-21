import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {validProgress,profileFor,normalizeDrivers,smoothProgress,flagType,demoState} from "../track-map/core.mjs";
assert.equal(validProgress(null),null);
assert.equal(validProgress(-1),null);
assert.equal(validProgress(""),null);
assert.equal(validProgress("not a number"),null);
assert.equal(validProgress(1.1),null);
assert.equal(validProgress(0),0);
assert.equal(validProgress("0.75"),0.75);
assert.equal(profileFor("Daytona International Speedway"),"daytona");
assert.equal(profileFor("Michigan International Speedway"),"oval");
assert.equal(profileFor("Bristol Motor Speedway"),"short");
assert.equal(profileFor("Watkins Glen International"),"road");
assert.equal(flagType("ONE TO GREEN"),"yellow");
assert.equal(flagType("CHECKERED"),"checkered");
const drivers=normalizeDrivers({drivers:[
 {carIdx:0,name:"Leader",number:"82",position:1,lapDistPct:0.99,onPitRoad:false},
 {carIdx:1,name:"Pit car",number:"66",position:2,onPitRoad:true,lapDistPct:null},
 {carIdx:2,name:"Bad reading",number:"12",position:3,onPitRoad:false,lapDistPct:-1}
]});
assert.equal(drivers.length,2,"Unknown progress must not invent an on-track position");
assert.equal(drivers[0].number,"82");
assert.equal(drivers[1].onPitRoad,true);
assert.ok(Math.abs(smoothProgress(0.99,0.01,1)-0.01)<1e-9,"Wrap smoothly across start/finish");
assert.ok(Math.abs(smoothProgress(0.02,0.98,1)-0.98)<1e-9,"Wrap backward across start/finish");
const a=demoState(0),b=demoState(3000);
assert.equal(a.drivers.length,12);
assert.equal(a.track.includes("Daytona"),true);
assert.equal(a.online,true);
assert.notEqual(a.drivers[0].lapDistPct,b.drivers[0].lapDistPct,"Demo cars move");
assert.ok(a.drivers.every(d=>validProgress(d.lapDistPct)!==null));
const page=readFileSync(new URL("../track-map/index.html",import.meta.url),"utf8");
const live=readFileSync(new URL("../live/index.html",import.meta.url),"utf8");
assert.ok(live.includes('data-tab="track-map"'),"Live tab exists");
assert.ok(live.includes('id="tab-track-map"'),"Live panel exists");
assert.ok(live.includes('src="../track-map/"'),"Live tab uses isolated track map");
assert.ok(page.includes('DEMO=new URLSearchParams(location.search).get("demo")==="1"'));
assert.ok(page.includes("0.5-pct+1"),"Ovals must run counterclockwise from frontstretch start/finish");
assert.ok(page.includes("430 396"),"Daytona frontstretch must have a broad curved tri-oval, not a pointed apex");
assert.ok(page.includes("daytonaDecor")&&page.includes("FRONT TRI-OVAL"),"Daytona broadcast artwork must be present");
assert.ok(page.includes("Will Pittenger"),"Reference attribution must remain visible");
assert.ok(page.includes('if(DEMO)return;'),"Demo mode never connects to live Cloudflare viewer");
assert.ok(page.includes("NOT GPS")&&page.includes("NOT IRACING")===false,"Page must disclose schematic positions");
assert.ok(!page.includes("role=producer"),"Map cannot create producer connection");
assert.ok(!page.includes("fetch("),"Map never writes via HTTP");
const scripts=[...page.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
for(const code of scripts){
 const js=spawnSync(process.execPath,["--check","--input-type=module"],{input:code,encoding:"utf8"});
 assert.equal(js.status,0,js.stderr||"Track Map script syntax invalid");
}
console.log("HLRN Track Map passed: telemetry validation, car animation, layouts, demo isolation, Live tab integration, script syntax.");
