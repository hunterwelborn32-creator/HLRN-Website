/* HLRN Next Gen — four read-only homepage previews.
   No admin controls, mock live timing or modification of official race records. */
(()=>{
"use strict";
const root=document.getElementById("hlrnNextGen");
if(!root)return;
const $=id=>document.getElementById(id), now=()=>Date.now(), text=(id,value)=>{const el=$(id);if(el)el.textContent=value==null?"—":String(value)};
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isoDate=s=>/^\d{4}-\d\d-\d\d$/.test(String(s||""))?String(s):String(s||"").slice(0,10);
const etKey=date=>{const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);const d=Object.fromEntries(parts.map(x=>[x.type,x.value]));return d.year+"-"+d.month+"-"+d.day};
const fmtDate=value=>{const d=new Date(isoDate(value)+"T12:00:00Z");return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric"}).format(d):"TBA"};
const fetchJson=async path=>{const r=await fetch(path,{cache:"no-store"});if(!r.ok)throw Error(path+" "+r.status);return r.json()};
const profileMap=new Map(),profileIdMap=new Map();
let schedule=null,reports=[],profiles=[];
function portrait(driver){
 const p=profileMap.get(String(driver||"").toLowerCase());
 return p?.hasPhoto&&p.photoSlug?"/assets/driver-photos/cutout/"+encodeURIComponent(p.photoSlug)+".webp":"";
}
function profileUrl(driver,id){
 const item=profileMap.get(String(driver||"").toLowerCase())||profileIdMap.get(String(id||""));
 return item?.url||"/drivers/";
}
function photoTag(name,cls){
 const p=portrait(name);return p?'<img class="'+cls+'" src="'+escape(p)+'" alt="" loading="lazy" onerror="this.remove()">':'<span class="'+cls+' ng-placeholder" aria-hidden="true">#</span>';
}
async function loadData(){
 const [s,r,p,d]=await Promise.allSettled([
  fetchJson("/data/schedules-2026.json"),fetchJson("/data/derived/reports.json"),
  fetchJson("/data/derived/profiles.json"),fetchJson("/data/driver-pages.json")]);
 if(s.status==="fulfilled")schedule=s.value;
 if(r.status==="fulfilled")reports=Array.isArray(r.value?.reports)?r.value.reports:[];
 if(p.status==="fulfilled")profiles=Array.isArray(p.value?.drivers)?p.value.drivers:[];
 if(d.status==="fulfilled"){for(const x of d.value?.drivers||[]){
  profileMap.set(String(x.name).toLowerCase(),x);
  for(const id of Object.values(x.ids||{}))profileIdMap.set(String(id),x);
 }}
 drawCountdown();drawSpotlight();drawWinners();
}
function latestReport(series){
 return reports.filter(r=>r.series===series&&r.winner?.name)
  .sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0)||(Number(b.raceNumber)||0)-(Number(a.raceNumber)||0))[0];
}
function drawWinners(){
 const area=$("ngVictoryRows");if(!area)return;
 const leagues=[["sunday","SUNDAY NIGHT"],["monday","MONDAY NIGHT"],["hosted","HOSTED RACING"]];
 area.innerHTML=leagues.map(([series,label])=>{
  const r=latestReport(series);
  if(!r)return '<div class="ng-winner"><span class="ng-series">'+label+'</span><strong>Verified results pending</strong></div>';
  const name=String(r.winner.name),num=r.winner.carNumber||r.top10?.[0]?.carNumber||"—";
  const href=profileUrl(name,r.winner.id),link=series==="hosted"?"/standings/hosted.html":"/results/";
  return '<article class="ng-winner">'+photoTag(name,"ng-winner-photo")+
   '<div class="ng-winner-data"><span class="ng-series">'+label+' · '+escape(fmtDate(r.date))+'</span>'+
   '<a href="'+escape(href)+'" class="ng-winner-name">'+escape(name)+'</a>'+
   '<span>'+escape(r.track||"Official race")+' · <a href="'+link+'">Race results →</a></span></div>'+
   '<b class="ng-number">#'+escape(num)+'</b></article>';
 }).join("");
 text("ngVictoryStatus",reports.length?"Latest verified results":"Results feed unavailable");
}
function spotlightCandidates(){
 // Use only verified race-by-race appearances. Do not infer Hosted career stats.
 const last=reports.filter(r=>["sunday","monday"].includes(r.series)&&r.top10?.length)
  .sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0)).slice(0,8);
 const score=new Map();
 for(const race of last)for(const row of race.top10){
  const finish=Number(row.finish);if(!row.name||!Number.isInteger(finish)||finish<1||finish>10)continue;
  const id=String(row.id||row.name),entry=score.get(id)||{name:row.name,id:row.id||"",top5:0,wins:0,top10:0,finishes:[],series:new Set()};
  entry.top10++;if(finish<=5)entry.top5++;if(finish===1)entry.wins++;
  entry.finishes.push(finish);entry.series.add(race.series);
  score.set(id,entry);
 }
 return [...score.values()].sort((a,b)=>b.wins-a.wins||b.top5-a.top5||b.top10-a.top10||a.name.localeCompare(b.name)).slice(0,6);
}
function drawSpotlight(){
 const host=$("ngSpotlightBody");if(!host)return;
 const candidates=spotlightCandidates();
 if(!candidates.length){host.innerHTML='<p class="ng-empty">Waiting for published race results.</p>';return;}
 // UTC calendar week is stable for every viewer; selection changes each Monday.
 const d=new Date(),utc=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
 const weekday=(utc.getUTCDay()+6)%7;utc.setUTCDate(utc.getUTCDate()-weekday);
 const epochWeek=Math.floor(utc.getTime()/604800000);
 const chosen=candidates[epochWeek%candidates.length];
 const resultProfiles=profiles.filter(p=>String(p.id)===String(chosen.id));
 const totalWins=resultProfiles.reduce((a,p)=>a+(Number(p.wins)||0),0);
 const series=[...chosen.series].map(x=>x.toUpperCase()).join(" / ");
 host.innerHTML='<div class="ng-spotlight-person">'+photoTag(chosen.name,"ng-spotlight-photo")+
  '<div><span class="ng-series">'+escape(series)+' · WEEKLY FEATURE</span><h3>'+escape(chosen.name)+'</h3>'+
  '<a href="'+escape(profileUrl(chosen.name,chosen.id))+'">View driver profile →</a></div></div>'+
  '<div class="ng-mini-stats">'+
  '<span><b>'+chosen.wins+'</b> Recent wins</span><span><b>'+chosen.top5+'</b> Recent top 5s</span>'+
  '<span><b>'+chosen.top10+'</b> Recent top 10s</span></div>'+
  '<p class="ng-note">Based on the latest eight published Sunday/Monday race reports. Rotates weekly among top performers.</p>';
}
function nextRace(){
 if(!schedule?.leagues)return null;
 const today=etKey(new Date());
 return ["sunday","monday"].flatMap(series=>(schedule.leagues[series]||[])
  .filter(r=>r&&!r.off&&r.date>=today&&r.track)
  .map(r=>({...r,series}))).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
}
let eventTime=null;
function drawCountdown(){
 const r=nextRace(),host=$("ngCountdownInfo");if(!host)return;
 if(!r){host.innerHTML='<strong>Next race not announced</strong><span>Official scheduling updates will appear here.</span>';eventTime=null;text("ngCountdownClock","SCHEDULE PENDING");return;}
 // HLRN schedule specifies 8:30 PM ET; use the actual DST offset on race day.
 const sample=new Date(r.date+"T12:00:00Z");
 const tzShort=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",timeZoneName:"short"}).formatToParts(sample).find(x=>x.type==="timeZoneName")?.value||"EST";
 eventTime=Date.parse(r.date+"T20:30:00"+(tzShort==="EDT"?"-04:00":"-05:00"));
 host.innerHTML='<span class="ng-series">'+escape(r.series.toUpperCase())+' NIGHT LEAGUE · RACE '+escape(r.week)+'</span>'+
  '<strong>'+escape(r.track)+'</strong><span>'+escape(fmtDate(r.date))+' · 8:30 PM ET · '+escape(r.car||"Race")+" · "+escape(r.laps||"—")+' laps</span>'+
  '<a href="/race-preview/?league='+encodeURIComponent(r.series)+'">Open Race Preview →</a>';
 tick();
}
function tick(){
 if(!eventTime){return;}
 const delta=Math.max(0,eventTime-now()),seconds=Math.floor(delta/1000),days=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),sec=seconds%60;
 text("ngCountdownClock",delta?days+"d "+String(h).padStart(2,"0")+"h "+String(m).padStart(2,"0")+"m "+String(sec).padStart(2,"0")+"s":"RACE TIME");
}
let socket=null,retryTimer=0,retryDelay=2000,lastLiveAt=0;
const WS="wss://hlrn-live-feed.hunterwelborn32.workers.dev/ws?role=viewer";
const live=(status,cls)=>{text("ngLiveStatus",status);const p=$("ngLivePanel");if(p)p.dataset.status=cls||"idle"};
const validNumber=x=>x!==null&&x!==undefined&&String(x).trim()!==""&&Number.isFinite(Number(x));
function paintLive(s){
 if(!s?.online||s?.raceFrozen||String(s.phase).toLowerCase()!=="race"){
  live("OFF AIR","idle");text("ngLiveFlag","NO ACTIVE RACE");text("ngLiveLeader","Race feed idle");
  text("ngLiveLap","—");text("ngLiveRemaining","—");text("ngLiveCautions","—");text("ngLiveIntervals","—");
  $("ngLiveRows").innerHTML='<p class="ng-empty">The live scoring board appears when an active race is transmitting.</p>';
  return;
 }
 lastLiveAt=now();live("LIVE · VERIFIED FEED","active");
 const ds=(Array.isArray(s.drivers)?s.drivers:[]).filter(d=>validNumber(d.position)&&Number(d.position)>0).sort((a,b)=>Number(a.position)-Number(b.position)).slice(0,8);
 const leader=ds.find(d=>Number(d.position)===1);
 const flag=String(s.flag||"").replaceAll("_"," ").toUpperCase();
 text("ngLiveFlag",flag||"RACING");text("ngLiveLeader",leader?String(leader.name||"Leader pending"):"Leader pending");
 text("ngLiveLap",validNumber(s.lap)?s.lap:"—");
 text("ngLiveRemaining",validNumber(s.totalLaps)&&validNumber(s.lap)?Math.max(0,Number(s.totalLaps)-Number(s.lap)):"—");
 const caution=s.raceControl?.cautionCount??s.cautionCount;
 text("ngLiveCautions",validNumber(caution)?caution:"—");
 text("ngLiveIntervals","From live scoring");
 $("ngLiveRows").innerHTML=ds.length?ds.map(d=>{
  const interval=d.interval??d.gapToLeader??d.gap??null;
  return '<div class="ng-live-row"><b>'+escape(d.position)+'</b><span><strong>'+escape(d.name||"Driver")+'</strong><small>#'+escape(d.number||"—")+'</small></span><em>'+
  (validNumber(interval)?escape(Number(interval)>0?"+"+Number(interval).toFixed(2):Number(interval).toFixed(2)):"—")+'</em></div>';
 }).join(""):'<p class="ng-empty">Race is active; scoring positions not yet available.</p>';
}
function staleCheck(){
 if(!document.hidden&&lastLiveAt&&now()-lastLiveAt>20000){
  lastLiveAt=0;paintLive({online:false});live("STALE · WAITING","idle");
 }
}
function connect(){
 if(document.hidden||socket)return;
 try{
 socket=new WebSocket(WS);
 socket.onopen=()=>{retryDelay=2000;try{socket.send(JSON.stringify({type:"visibility",visible:true}))}catch{};if(!lastLiveAt)live("CONNECTED · WAITING","idle")};
 socket.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==="state")paintLive(m.data)}catch{}};
 socket.onclose=()=>{socket=null;lastLiveAt=0;paintLive({online:false});live("RECONNECTING","idle");if(!document.hidden){clearTimeout(retryTimer);retryTimer=setTimeout(connect,retryDelay);retryDelay=Math.min(15000,retryDelay*1.6)}};
 socket.onerror=()=>{try{socket.close()}catch{}};
 }catch{socket=null;live("FEED UNAVAILABLE","idle")}
}
function visibility(){
 if(document.hidden){clearTimeout(retryTimer);if(socket){try{socket.send(JSON.stringify({type:"visibility",visible:false}));socket.close()}catch{}}socket=null;lastLiveAt=0}
 else connect();
}
document.addEventListener("visibilitychange",visibility);
setInterval(()=>{tick();staleCheck()},1000);
loadData().catch(()=>{});
connect();
setInterval(()=>{if(!document.hidden)loadData().catch(()=>{})},300000);
})();
