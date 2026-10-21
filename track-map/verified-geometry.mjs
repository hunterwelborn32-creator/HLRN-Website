// Track-specific geometry registry. Only publish independently verified,
// attributed geometries here. A track being in catalog.mjs does not mean
// its accurate outline has been sourced.
// All paths share the standard 860 x 470 SVG viewport.
// path: closed SVG track centerline; progressOffset: fractional correction
// for start/finish along the path; direction: 1 or -1.
export const VERIFIED_GEOMETRIES=Object.freeze({
 "daytona-oval":{path:"M 428.5,389.8 L 464.5,389.1 L 499.9,383.8 L 535.0,377.2 L 569.3,366.4 L 602.9,353.4 L 636.3,340.1 L 669.6,326.3 L 701.8,310.4 L 728.6,286.6 L 747.5,256.2 L 758.4,222.1 L 758.4,186.1 L 747.4,152.0 L 727.7,122.1 L 699.4,100.1 L 666.3,86.4 L 630.8,80.6 L 593.4,80.2 L 557.4,80.1 L 521.4,80.0 L 485.4,80.0 L 449.4,80.0 L 413.4,80.0 L 377.4,80.1 L 341.4,80.2 L 305.4,80.3 L 269.4,80.4 L 233.4,80.9 L 197.7,85.3 L 164.6,99.0 L 135.3,119.7 L 114.9,149.3 L 103.4,183.2 L 101.2,219.0 L 110.6,253.7 L 128.5,284.7 L 155.9,307.7 L 188.0,324.0 L 221.0,338.4 L 254.0,352.7 L 287.6,365.6 L 321.6,377.2 L 357.0,383.7 L 392.6,388.2 Z",direction:1,progressOffset:0,source:"https://commons.wikimedia.org/wiki/File:Daytona_International_Speedway.svg",attribution:"Will Pittenger (public-domain original, source-contour centerline extraction)",license:"Public domain",calibration:"provisional — start/finish and direction must be confirmed with real iRacing telemetry"},
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
