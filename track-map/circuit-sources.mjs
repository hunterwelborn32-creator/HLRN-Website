// Independently checked Wikimedia Commons circuit reference pages.
// Their licenses permit reuse subject to the license terms. These are
// REFERENCE ARTWORK sources, not calibrated iRacing racing-line paths.
// Never show one as a verified path until its geometry has been traced,
// normalized, direction-checked and the start/finish offset calibrated.
export const CIRCUIT_ART_SOURCES=Object.freeze({
 "daytona-oval":{title:"Daytona International Speedway",url:"https://commons.wikimedia.org/wiki/File:Daytona_International_Speedway.svg",author:"Will Pittenger",license:"Public domain",layout:"Oval circuit",status:"source-verified; telemetry alignment pending"},
 "charlotte-oval":{title:"Charlotte Motor Speedway",url:"https://commons.wikimedia.org/wiki/File:Charlotte_Motor_Speedway-track_map.svg",author:"Nascar1996",license:"Public domain",layout:"Oval circuit",status:"source-verified; telemetry alignment pending"},
 "talladega":{title:"Talladega Superspeedway",url:"https://commons.wikimedia.org/wiki/File:Talladega_Superspeedway.svg",author:"Sn1per (based on Clarke-)",license:"Public domain (simple geometry)",layout:"Superspeedway oval",status:"source-verified; telemetry alignment pending"},
 "bristol":{title:"Bristol Motor Speedway",url:"https://commons.wikimedia.org/wiki/File:Bristol_Motor_Speedway_map.svg",author:"Nascar1996",license:"CC BY 4.0",layout:"Short oval",status:"source-verified; telemetry alignment pending"},
 "sonoma":{title:"Sonoma Raceway NASCAR course (historical)",url:"https://commons.wikimedia.org/wiki/File:Infineon_(Sears_Point)_with_emphasis_on_NASCAR_track.svg",author:"Will Pittenger",license:"Public domain",layout:"Historical NASCAR road circuit; confirm modern configuration",status:"reference only; current configuration requires review"}
});
export function referenceFor(id){return CIRCUIT_ART_SOURCES[id]||null}
