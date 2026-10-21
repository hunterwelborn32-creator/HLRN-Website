import assert from "node:assert/strict";
import {packOffsets} from "../track-map/pack-layout.mjs";
const g=packOffsets([{key:"a",progress:0.998,position:1},{key:"b",progress:0.002,position:2},{key:"c",progress:0.004,position:3}]);
assert.equal(g.size,3,"Wrap-around pack must remain grouped");
assert.deepEqual([g.get("a").lateral,g.get("b").lateral,g.get("c").lateral],[0,-14,14]);
assert.equal(packOffsets([{key:"a",progress:.2},{key:"b",progress:.8}]).size,0,"Separated cars remain centered");
assert.equal(packOffsets([{key:"a",progress:.3,onPitRoad:true},{key:"b",progress:.301}]).size,0,"Pit vehicles are not lane-offset");
console.log("Pack separation checks passed");
