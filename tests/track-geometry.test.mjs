import assert from "node:assert/strict";
import {geometryFor,lapToPathPct,VERIFIED_GEOMETRIES} from "../track-map/verified-geometry.mjs";
assert.equal(geometryFor("nonexistent"),null);
assert.ok(geometryFor("daytona-oval")?.path,"Daytona source-extracted path available");
assert.match(geometryFor("daytona-oval").calibration,/provisional/,"No real-session calibration claim");
assert.ok(Math.abs(lapToPathPct(.1,null,"oval")-.4)<1e-9);
assert.ok(Math.abs(lapToPathPct(.9,null,"oval")-.6)<1e-9);
assert.ok(Math.abs(lapToPathPct(.1,{progressOffset:.7,direction:1},"road")-.8)<1e-9);
assert.ok(Math.abs(lapToPathPct(.1,{progressOffset:.7,direction:-1},"road")-.6)<1e-9);
console.log("Verified geometry gate and calibrated lap direction passed.");

const daytona=geometryFor("daytona-oval");
assert.equal(daytona.direction,1,"Daytona source path must move from frontstretch toward Turn 1");
assert.equal(daytona.progressOffset,0,"Provisional source start position must be at frontstretch");
assert.ok(daytona.path.startsWith("M 428.5,389.8"),"Source-derived path must start near frontstretch center");
assert.match(daytona.calibration,/provisional/,"Do not claim verified iRacing start line");
