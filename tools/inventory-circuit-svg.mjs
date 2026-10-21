#!/usr/bin/env node
// Source-geometry inventory only. Never modifies live geometry automatically.
// Usage: node tools/inventory-circuit-svg.mjs URL output.json
import fs from "node:fs/promises";
const [url,out]=process.argv.slice(2);
if(!url||!out||!/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//.test(url))throw Error("Use the original SVG upload.wikimedia.org URL and output filename");
const response=await fetch(url,{headers:{"User-Agent":"HLRN-TrackMapResearch/1.0 (GitHub Actions; attribution review)"},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error("Source download failed: HTTP "+response.status);
const svg=await response.text();
if(!svg.trimStart().startsWith("<?xml")&&!svg.includes("<svg"))throw Error("Not an SVG");
if(svg.length>5_000_000)throw Error("SVG too large");
const paths=[...svg.matchAll(/<path\b([^>]*?)\/?\s*>/gs)].map((m,i)=>{
 const attrs=m[1];const get=k=>attrs.match(new RegExp('(?:^|\\s)'+k+'="([^"]*)"'))?.[1]??null;
 const d=get("d");return {index:i,id:get("id"),class:get("class"),style:get("style"),transform:get("transform"),d,commands:d?.match(/[A-Za-z]/g)?.length??0,characters:d?.length??0};
});
const report={source:url,retrievedAt:new Date().toISOString(),sha256:null,svgLength:svg.length,pathCount:paths.length,viewBox:svg.match(/viewBox="([^"]+)"/)?.[1]??null,paths};
await fs.writeFile(out,JSON.stringify(report,null,2));
console.log("Saved "+paths.length+" SVG paths to "+out+" — manual selection and calibration still required.");
for(const p of paths)console.log("VECTOR",p.index,"id",p.id,"commands",p.commands,"chars",p.characters,"style",String(p.style).slice(0,90),"preview",String(p.d).slice(0,140));
