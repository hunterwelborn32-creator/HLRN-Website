import assert from "node:assert/strict";
import {geometryFor,lapToPathPct,VERIFIED_GEOMETRIES} from "../track-map/verified-geometry.mjs";
assert.equal(geometryFor("nonexistent"),null);
assert.equal(Object.keys(VERIFIED_GEOMETRIES).length,0,"No unlicensed circuit outlines may be silently declared verified");
assert.ok(Math.abs(lapToPathPct(.1,null,"oval")-.4)<1e-9);
assert.ok(Math.abs(lapToPathPct(.9,null,"oval")-.6)<1e-9);
assert.ok(Math.abs(lapToPathPct(.1,{progressOffset:.7,direction:1},"road")-.8)<1e-9);
assert.ok(Math.abs(lapToPathPct(.1,{progressOffset:.7,direction:-1},"road")-.6)<1e-9);
console.log("Verified geometry gate and calibrated lap direction passed.");
