// Track-specific geometry registry. Only publish independently verified,
// attributed geometries here. A track being in catalog.mjs does not mean
// its accurate outline has been sourced.
// All paths share the standard 860 x 470 SVG viewport.
// path: closed SVG track centerline; progressOffset: fractional correction
// for start/finish along the path; direction: 1 or -1.
export const VERIFIED_GEOMETRIES=Object.freeze({
 // Example (do not uncomment without a licensed, calibrated path):
 // "example-track": {path:"M ... Z", direction:1, progressOffset:0,
 //    source:"https://...", attribution:"...", license:"..."}
});
export function geometryFor(id){
 const g=VERIFIED_GEOMETRIES[id];if(!g)return null;
 if(typeof g.path!=="string"||!/^\s*M\s*[-\d.]+[ ,]+[-\d.]+/i.test(g.path))return null;
 if(!g.source||!g.attribution||!g.license||![1,-1].includes(g.direction))return null;
 if(!Number.isFinite(g.progressOffset)||g.progressOffset<0||g.progressOffset>=1)return null;
 return g;
}
export function lapToPathPct(lapPct,geometry,fallbackProfile){
 const pct=Number(lapPct);
 if(!Number.isFinite(pct))return null;
 const base=geometry?geometry.progressOffset+geometry.direction*pct:
   (["daytona","trioval","oval","short"].includes(fallbackProfile)?0.5-pct:pct);
 return ((base%1)+1)%1;
}
