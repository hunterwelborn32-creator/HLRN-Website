/* HLRN Advanced Driver Stats — progressive enhancement, archive-scoped.
   Source of truth: /data/derived/profiles.json (published verified results).
   Does not modify canonical league totals, hosted overrides, or existing profile markup. */
(function(){
"use strict";
const DATA="/data/derived/profiles.json", DIRECTORY="/data/driver-pages.json";
const leagueNames={sunday:"Sunday",monday:"Monday",hosted:"Hosted"};
const state={payload:null,manifest:null,loaded:0,busy:null,renderKey:""};
const num=v=>v===null||v===undefined||v===""?null:(Number.isFinite(Number(v))?Number(v):null);
const int=v=>{const n=num(v);return n===null?"—":n.toLocaleString("en-US");};
const nameKey=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const slug=s=>String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const date=s=>{const d=new Date(s);return Number.isNaN(+d)?"—":d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});};
const average=a=>a.length?(a.reduce((s,n)=>s+n,0)/a.length).toFixed(2):"—";
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const good=r=>Number.isInteger(num(r.finish))&&num(r.finish)>0;
const distinct=rows=>{const m=new Map();for(const r of rows){const key=[r.series,r.raceId||r.raceNumber||r.date,r.date].join(":");if(!m.has(key))m.set(key,r);}return [...m.values()].sort((a,b)=>(Date.parse(a.date)||0)-(Date.parse(b.date)||0));};
function enrich(){
 const data=state.payload?.drivers||[];const directory=state.manifest?.drivers||[];
 const bySlug=new Map(directory.map(d=>[d.slug,d]));
 return {drivers:data.map(p=>({...p,slug:directory.find(d=>Object.values(d.ids||{}).some(id=>String(id)===String(p.id))&&d.series?.includes(p.series))?.slug||slug(p.name)})),bySlug};
}
function selectRecords(identity){
 const profiles=enrich().drivers;
 const matches=profiles.filter(p=>(identity.slug&&p.slug===identity.slug)||(identity.id&&String(p.id)===String(identity.id))||(identity.name&&nameKey(p.name)===nameKey(identity.name)));
 const rows=distinct(matches.flatMap(p=>(p.results||[]).map(r=>({...r,series:p.series,id:p.id,name:p.name}))));
 return {matches,rows};
}
function stats(rows){
 const finishes=rows.filter(good).map(r=>Number(r.finish)),starts=rows.filter(r=>num(r.start)>0).map(r=>Number(r.start));
 const sorted=[...rows].filter(good);
 let streak=0,bestStreak=0;
 for(const r of sorted){streak=Number(r.finish)<=10?streak+1:0;bestStreak=Math.max(bestStreak,streak);}
 return {starts:rows.length,wins:finishes.filter(n=>n===1).length,top5:finishes.filter(n=>n<=5).length,top10:finishes.filter(n=>n<=10).length,
 avgFinish:average(finishes),avgStart:average(starts),lapsLed:rows.reduce((n,r)=>n+(num(r.lapsLed)||0),0),bestFinish:finishes.length?Math.min(...finishes):null,winStreak:bestStreak};
}
function achievements(rows){
 const s=stats(rows),out=[];
 if(s.wins)out.push([s.wins===1?"First Victory":"Race Winner",s.wins+" verified "+(s.wins===1?"win":"wins")]);
 if(s.starts>=10)out.push(["10-Start Club","10+ recorded starts"]);
 if(s.starts>=25)out.push(["25-Start Club","25+ recorded starts"]);
 if(s.top5>=10)out.push(["Top Five Specialist","10+ recorded top 5s"]);
 if(s.winStreak>=3)out.push(["Consistency Award","3+ consecutive top 10s"]);
 return out;
}
function cards(s){return [["Recorded starts",s.starts],["Wins",s.wins],["Top 5s",s.top5],["Top 10s",s.top10],["Average finish",s.avgFinish],["Laps led",s.lapsLed]].map(([k,v])=>'<div class="ads-card"><b>'+safe(v)+'</b><span>'+safe(k)+'</span></div>').join("");}
function lineChart(rows){
 const last=rows.filter(good).slice(-20),w=780,h=205;
 if(!last.length)return '<p class="ads-muted">No classified results for the selected filter.</p>';
 const pts=last.map((r,i)=>({x:35+(last.length===1?0:i*(w-70)/(last.length-1)),y:25+(Number(r.finish)-1)*155/Math.max(1,Math.max(10,...last.map(r=>Number(r.finish)))-1),r}));
 return '<svg role="img" aria-label="Finish position by race, lower is better" viewBox="0 0 '+w+' '+h+'" class="ads-chart"><line x1="35" y1="25" x2="35" y2="180" stroke="currentColor" opacity=".3"/><line x1="35" y1="180" x2="745" y2="180" stroke="currentColor" opacity=".3"/><polyline fill="none" stroke="#e31837" stroke-width="3" stroke-linejoin="round" points="'+pts.map(p=>p.x+','+p.y).join(" ")+'"/>'+pts.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="#e31837"><title>'+safe(p.r.track)+': P'+p.r.finish+'</title></circle>').join("")+'</svg><p class="ads-muted">Last '+last.length+' recorded finishes · Lower position is better. Hover points for tracks.</p>';
}
function trackTable(rows){
 const group=new Map();for(const r of rows){const k=String(r.track||"Unknown track");if(!group.has(k))group.set(k,[]);group.get(k).push(r);}
 return [...group].map(([track,list])=>{const s=stats(list);return '<tr><td>'+safe(track)+'</td><td>'+s.starts+'</td><td>'+s.wins+'</td><td>'+int(s.bestFinish)+'</td><td>'+s.avgFinish+'</td></tr>';}).sort((a,b)=>a.localeCompare(b)).join("")||'<tr><td colspan="5">No recorded track results.</td></tr>';
}
function historyTable(rows){
 return [...rows].reverse().map(r=>'<tr><td>'+safe(leagueNames[r.series]||r.series)+'</td><td>'+safe(date(r.date))+'</td><td>'+safe(r.track)+'</td><td>'+int(r.start)+'</td><td>'+int(r.finish)+'</td><td>'+int(r.points)+'</td><td>'+int(r.lapsLed)+'</td><td>'+safe(r.status||"—")+'</td></tr>').join("")||'<tr><td colspan="8">No recorded results.</td></tr>';
}
function heading(title){return '<h3 class="ads-heading">'+safe(title)+'</h3>';}
function profileHTML(identity){
 const {matches,rows}=selectRecords(identity);
 if(!matches.length)return '<p class="ads-muted">Advanced statistics are not available for this driver in the published archive.</p>';
 const leagues=[...new Set(matches.map(p=>p.series))],years=[...new Set(rows.map(r=>String(r.date||"").slice(0,4)))].filter(Boolean).sort().reverse();
 return '<div class="ads-intro"><h2>Advanced Driver Statistics</h2><p>Verified results in the available HLRN archive. Existing official career totals remain unchanged. <a href="/stats/">View HLRN records →</a></p></div>'+
 '<div class="ads-filters"><label>Series <select data-ads-series><option value="all">All recorded series</option>'+leagues.map(l=>'<option value="'+safe(l)+'">'+safe(leagueNames[l]||l)+'</option>').join("")+'</select></label><label>Year <select data-ads-year><option value="all">All recorded years</option>'+years.map(y=>'<option value="'+safe(y)+'">'+safe(y)+'</option>').join("")+'</select></label></div>'+
 '<div data-ads-body></div>';
}
function renderProfileBody(section,identity){
 const {rows}=selectRecords(identity);
 const filterSeries=section.querySelector("[data-ads-series]")?.value||"all",year=section.querySelector("[data-ads-year]")?.value||"all";
 const subset=rows.filter(r=>(filterSeries==="all"||r.series===filterSeries)&&(year==="all"||String(r.date||"").startsWith(year))),s=stats(subset),badges=achievements(subset);
 const bySeries=[...new Set(subset.map(r=>r.series))].map(k=>({k,s:stats(subset.filter(r=>r.series===k))}));
 const hosted=selectRecords(identity).matches.find(p=>p.series==="hosted");
 const hostedOnly=filterSeries==="hosted";
 const hostedSnapshot=hosted&&(filterSeries==="all"||hostedOnly)&&(year==="all"||!year);
 const officialHosted=hostedSnapshot?'<div class="ads-series"><strong>Hosted Racing — official current snapshot</strong><span>'+int(hosted.races)+' starts · '+int(hosted.wins)+' wins · '+int(hosted.top5)+' top 5s · '+int(hosted.top10)+' top 10s. Individual Hosted race history is not in this verified archive and is not combined with Sunday/Monday recorded totals.</span></div>':"";
 const summary=heading(hostedOnly?"Hosted Career Snapshot":"Recorded Career & Season Summary")+(hostedOnly&&hostedSnapshot?'<div class="ads-cards">'+cards({starts:hosted.races??"—",wins:hosted.wins??"—",top5:hosted.top5??"—",top10:hosted.top10??"—",avgFinish:hosted.avgFinish??"—",lapsLed:"—"})+'</div>':'<div class="ads-cards">'+cards(s)+'</div>')+
 ((bySeries.length||officialHosted)?'<div class="ads-series-grid">'+bySeries.map(x=>'<div class="ads-series"><strong>'+safe(leagueNames[x.k])+'</strong><span>'+x.s.starts+' starts · '+x.s.wins+' wins · '+x.s.top5+' top 5s</span></div>').join("")+officialHosted+'</div>':"");
 const tracks=heading("Track-by-Track Performance")+'<div class="ads-scroll"><table class="ads-table"><thead><tr><th>Track</th><th>Starts</th><th>Wins</th><th>Best</th><th>Avg Finish</th></tr></thead><tbody>'+trackTable(subset)+'</tbody></table></div>';
 const awards=heading("Automatic Milestones & Achievements")+(badges.length?'<div class="ads-badges">'+badges.map(a=>'<div class="ads-achievement"><strong>★ '+safe(a[0])+'</strong><span>'+safe(a[1])+'</span></div>').join("")+'</div>':'<p class="ads-muted">Milestones appear as verified race results are added.</p>');
 const history=heading("Full Recorded Race History")+'<div class="ads-scroll"><table class="ads-table"><thead><tr><th>Series</th><th>Date</th><th>Track</th><th>Start</th><th>Finish</th><th>Points</th><th>Led</th><th>Status</th></tr></thead><tbody>'+historyTable(subset)+'</tbody></table></div>';
 section.querySelector("[data-ads-body]").innerHTML=summary+heading("Interactive Finishing Trend")+lineChart(subset)+tracks+awards+history;
}
function resolveIdentity(){
 const match=location.pathname.match(/^\/drivers\/([^/]+)\/?(?:index\.html)?$/i);
 if(match&&match[1]&&match[1]!=="index.html")return {slug:decodeURIComponent(match[1])};
 const profile=document.querySelector("#profileContent h2");
 if(profile&&document.querySelector("#profileView")?.style.display==="block")return {name:profile.textContent.trim(),id:new URLSearchParams(location.search).get("driverId")};
 return null;
}
function renderDriver(){
 const identity=resolveIdentity(),target=document.querySelector("#profileContent")||document.querySelector("main.page");
 if(!identity||!target){document.getElementById("hlrnAdvancedStats")?.remove();state.renderKey="";return;}
 const key=JSON.stringify(identity);
 if(state.renderKey===key&&document.getElementById("hlrnAdvancedStats"))return;
 document.getElementById("hlrnAdvancedStats")?.remove();
 const node=document.createElement("section");node.id="hlrnAdvancedStats";node.className="ads-root";node.innerHTML=profileHTML(identity);
 target.appendChild(node);node.addEventListener("change",e=>{if(e.target.matches("select"))renderProfileBody(node,identity);});
 if(node.querySelector("[data-ads-body]"))renderProfileBody(node,identity);state.renderKey=key;
}
function renderRecords(){
 const target=document.querySelector("#adsRecords");if(!target)return;
 const rows=(state.payload?.drivers||[]).flatMap(p=>distinct((p.results||[]).map(r=>({...r,series:p.series,name:p.name,id:p.id}))));
 const hostedProfiles=(state.payload?.drivers||[]).filter(p=>p.series==="hosted");
 const byDriver=new Map();
 for(const r of rows){const k=r.series+":"+r.id;if(!byDriver.has(k))byDriver.set(k,[]);byDriver.get(k).push(r);}
 const ranked=[...byDriver].map(([key,list])=>({key,name:list[0].name,series:list[0].series,...stats(list)}));
 const sortFor=(metric)=>[...ranked].sort((a,b)=>b[metric]-a[metric]||a.name.localeCompare(b.name)).slice(0,15);
 const table=(metric,label)=>'<section class="ads-record"><h2>'+safe(label)+'</h2><div class="ads-scroll"><table class="ads-table"><thead><tr><th>Rank</th><th>Driver</th><th>Series</th><th>'+safe(label)+'</th></tr></thead><tbody>'+sortFor(metric).map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+safe(x.name)+'</td><td>'+safe(leagueNames[x.series])+'</td><td>'+int(x[metric])+'</td></tr>').join("")+'</tbody></table></div></section>';
 target.innerHTML='<p class="ads-muted">These are records within the verified results currently published in HLRN’s archive, not complete all-time historical records. Rankings update when the official derived profiles file is published.</p>'+table("wins","Recorded Wins")+table("top5","Recorded Top 5s")+table("top10","Recorded Top 10s")+table("lapsLed","Recorded Laps Led")+table("starts","Recorded Starts")+(hostedProfiles.length?'<section class="ads-record"><h2>Hosted Racing — Official Snapshot</h2><p class="ads-muted">Source-provided Hosted career totals, separate from verified race-by-race rankings.</p><div class="ads-scroll"><table class="ads-table"><thead><tr><th>Driver</th><th>Starts</th><th>Wins</th><th>Top 5s</th><th>Top 10s</th></tr></thead><tbody>'+hostedProfiles.slice().sort((a,b)=>(Number(b.wins)||0)-(Number(a.wins)||0)).map(p=>'<tr><td>'+safe(p.name)+'</td><td>'+int(p.races)+'</td><td>'+int(p.wins)+'</td><td>'+int(p.top5)+'</td><td>'+int(p.top10)+'</td></tr>').join("")+'</tbody></table></div></section>':"");
}
async function load(force=false){
 if(state.busy)return state.busy;
 if(!force&&state.payload&&Date.now()-state.loaded<300000)return;
 state.busy=(async()=>{
  const responses=await Promise.all([fetch(DATA,{cache:"no-cache"}),fetch(DIRECTORY,{cache:"no-cache"})]);
  if(!responses[0].ok)throw Error("profiles HTTP "+responses[0].status);
  state.payload=await responses[0].json();state.manifest=responses[1].ok?await responses[1].json():{drivers:[]};
  state.loaded=Date.now();state.renderKey="";
 })();
 try{await state.busy;}finally{state.busy=null;}
}
async function refresh(force=false){try{await load(force);renderDriver();renderRecords();}catch(e){console.warn("HLRN advanced stats unavailable",e);const target=document.querySelector("#adsRecords");if(target)target.textContent="Verified statistics are temporarily unavailable.";}}
function boot(){
 const directory=document.querySelector("#directoryView");
 if(directory&&!directory.querySelector("[data-ads-records-link]")){const p=document.createElement("p");p.dataset.adsRecordsLink="1";p.style.cssText="padding:10px 16px;text-align:right";const a=document.createElement("a");a.href="/stats/";a.textContent="View HLRN Driver Records →";a.style.cssText="font-weight:900;color:#e31837";p.appendChild(a);directory.prepend(p);}
 refresh();
 let queued=false;
 const host=document.querySelector("#profileContent");
 if(host)new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;renderDriver();});}).observe(host,{childList:true});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-state.loaded>300000)refresh(true);});
 setInterval(()=>{if(!document.hidden&&Date.now()-state.loaded>=300000)refresh(true);},300000);
 window.addEventListener("popstate",()=>queueMicrotask(renderDriver));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();