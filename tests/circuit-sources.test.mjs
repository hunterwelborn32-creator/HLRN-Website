import assert from "node:assert/strict";
import {CIRCUIT_ART_SOURCES,referenceFor} from "../track-map/circuit-sources.mjs";
import {geometryFor} from "../track-map/verified-geometry.mjs";
assert.ok(Object.keys(CIRCUIT_ART_SOURCES).length>=5);
for(const [id,r] of Object.entries(CIRCUIT_ART_SOURCES)){
 assert.ok(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(r.url));
 assert.ok(r.author&&r.license&&r.status&&r.layout);
 assert.equal(referenceFor(id),r);
 if(id==="daytona-oval")assert.match(geometryFor(id).calibration,/provisional/);else assert.equal(geometryFor(id),null,"Artwork reference is not a calibrated car path");
}
assert.match(referenceFor("sonoma").status,/configuration requires review/);
assert.equal(referenceFor("unknown"),null);
console.log("Circuit source licenses/attributions and no-premature-geometry checks passed.");
