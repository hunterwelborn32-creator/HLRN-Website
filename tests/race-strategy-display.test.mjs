import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const html=readFileSync(new URL("../race-strategy/index.html",import.meta.url),"utf8");
const scripts=[...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]).filter(Boolean);
const app=scripts.find(s=>s.includes('const API="https://hlrn-live-feed'));
assert.ok(app,"Strategy Center application script found");
const elements=new Map();
function el(id){
 if(!elements.has(id)){
  const e={id,children:[],attributes:{},textContent:"",className:"",style:{},append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=nodes},setAttribute(k,v){this.attributes[k]=v}};
  elements.set(id,e);
 }
 return elements.get(id);
}
const visits=[
 {carIdx:0,number:"11",name:"Driver Alpha",lap:2,exitLap:3,flag:"GREEN"},
 {carIdx:0,number:"11",name:"Driver Alpha",lap:4,exitLap:5,flag:"GREEN"},
 {carIdx:1,number:"22",name:"Driver Bravo",lap:4,exitLap:7,flag:"GREEN"},
 {carIdx:2,number:"33",name:"Driver Charlie",lap:6,exitLap:8,flag:"CAUTION"},
 {carIdx:1,number:"22",name:"Driver Bravo",lap:9,exitLap:10,flag:"GREEN"}
];
const state={online:true,lap:11,totalLaps:12,flag:"GREEN",track:"Simulation Speedway",
 drivers:[{carIdx:0,number:"11",name:"Driver Alpha",position:1,onPitRoad:false}],pitHistory:visits,
 raceControl:{history:[{number:1,startLap:6,restartLap:8,reason:"Synthetic caution"}],totalCautionLaps:2}};
const payloads={"/api/state":state,"/api/laps":{lapSnapshots:[{lap:1},{lap:2}]},
 "/api/recap":{raceFrozen:false}};
const context={console,document:{hidden:false,getElementById:el,createElement:tag=>({...el("__tmp"+Math.random()),tagName:tag})},
 AbortSignal:{timeout:()=>({})},setInterval:()=>0,fetch:async url=>({ok:true,json:async()=>structuredClone(payloads[new URL(url).pathname])})};
vm.runInNewContext(app,context,{filename:"race-strategy-inline.js"});
await new Promise(resolve=>setTimeout(resolve,100));
const rowValues=id=>el(id).children.map(row=>row.children.map(cell=>cell.textContent));
assert.equal(rowValues("pitHistory").length,5,"All visits rendered");
assert.deepEqual(rowValues("pitHistory")[0],["#22 Driver Bravo",9,10,"GREEN"],"Newest visit on top");
assert.equal(rowValues("strategyRows").length,3,"Separate drivers");
assert.deepEqual(rowValues("strategyRows")[0],["#11 Driver Alpha",2,4,7]);
assert.deepEqual(rowValues("strategyRows")[2],["#33 Driver Charlie",1,6,5]);
assert.equal(el("pitTimeline").children.filter(s=>s.className.includes(" stop")).length,4,"Two entries at same lap share timeline bar");
assert.equal(el("pitTimeline").children.filter(s=>s.className.includes("yellow")).length,1);
assert.equal(rowValues("cautionRows").length,1);
assert.ok(el("feedStatus").textContent.includes("LIVE"));
console.log("Strategy Center presentation passed: 5 visits, 3 drivers, 4 marked laps, caution and lap counts.");
