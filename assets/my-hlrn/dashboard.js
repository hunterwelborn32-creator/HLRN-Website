(()=>{
"use strict";
const LOGIN_KEY="hlrn_driver_login_device_v1";
const $=id=>document.getElementById(id);
const PROFILE_URL="../data/derived/profiles.json";
const NUMBER_URL="../data/driver-numbers.json";
const SCHEDULE_URL="../data/schedules-2026.json";
const RECAP_INDEX_URL="../data/race-recaps/index.json";
const PHOTO_BASE="https://hunterwelborn32-creator.github.io/HLRN-App/driver-photos/cutout/";

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
function displayName(value){
  let s=String(value||"").trim();
  if(s.includes(",")){const p=s.split(",");const last=(p.shift()||"").trim().replace(/\d+$/,"");const first=p.join(" ").trim();s=(first+" "+last).trim();}
  return s.replace(/(\p{L})\d+$/u,"$1").trim();
}
function nameKey(value){
  return displayName(value).toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]/g,"").replace(/\d+$/,"");
}
function sameDriver(a,b){return !!a&&!!b&&nameKey(a)===nameKey(b)}
function readLogin(){
  try{
    const d=JSON.parse(localStorage.getItem(LOGIN_KEY)||"null");
    return d&&typeof d.driver==="string"&&d.driver.trim()?d:null;
  }catch{return null}
}
function text(id,value){const el=$(id);if(el)el.textContent=value==null?"—":String(value)}
function formatDate(value){
  const raw=String(value||"");
  const d=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(raw+"T12:00:00Z"):new Date(value);
  if(Number.isNaN(d.getTime()))return "DATE TBD";
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"America/New_York"}).format(d).toUpperCase();
}
function easternToday(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const v={};parts.forEach(p=>{if(p.type!=="literal")v[p.type]=p.value});
  return [v.year,v.month,v.day].join("-");
}
function nextRace(schedule){
  const today=easternToday();
  return (Array.isArray(schedule)?schedule:[]).find(r=>!r.off&&String(r.date||"")>=today)||null;
}
function movement(v){
  const n=num(v,0);
  return n>0?"▲ "+n:n<0?"▼ "+Math.abs(n):"—";
}
function canonicalTrack(value){
  return String(value||"").toUpperCase()
    .replace(/&/g," AND ").replace(/[^A-Z0-9]+/g," ").replace(/\s+/g," ").trim()
    .replace(/ INTERNATIONAL SPEEDWAY| MOTOR SPEEDWAY| SPEEDWAY/g,"").trim();
}
async function getJson(url){
  const res=await fetch(url+(url.includes("?")?"&":"?")+"v="+Date.now(),{cache:"no-store"});
  if(!res.ok)throw new Error("HTTP "+res.status+" for "+url);
  return res.json();
}
function driverRow(snapshot,league,profile,name){
  const rows=snapshot?.leagues?.[league]?.drivers||[];
  const id=String(profile?.id||"");
  return rows.find(r=>id&&String(r.driverId||"")===id)||rows.find(r=>sameDriver(r.driver,name))||null;
}
function renderLeague(prefix,profile,row){
  text("myh"+prefix+"Rank",profile?"P"+profile.rank:"P—");
  text("myh"+prefix+"Points",profile?.points??"—");
  text("myh"+prefix+"Stage",profile?.stagePoints??"—");
  text("myh"+prefix+"Avg",profile?.avgFinish!=null?Number(profile.avgFinish).toFixed(2):"—");
  text("myh"+prefix+"Team",row?.team||"—");
  text("myh"+prefix+"Move",profile?movement(profile.change):"—");
}
function renderNext(key,race){
  const label=key==="sunday"?"SUNDAY NIGHT":"MONDAY NIGHT";
  if(!race){
    return '<article class="myh-next '+key+'"><div class="myh-next-top"><span>'+label+'</span><b>SEASON COMPLETE</b></div><div class="myh-next-body"><h3>NO UPCOMING RACE</h3><p>The published 2026 schedule has no remaining '+label.toLowerCase()+' event.</p></div><a href="../results/">VIEW RESULTS →</a></article>';
  }
  return '<article class="myh-next '+key+'">'+
    '<div class="myh-next-top"><span>'+label+'</span><b>WEEK '+esc(race.week)+'</b></div>'+
    '<div class="myh-next-body"><h3>'+esc(race.track)+'</h3><p>'+esc(formatDate(race.date))+' • 8:30 PM ET • '+esc(race.location||"")+'</p>'+
    '<div class="myh-next-facts"><span><b>'+esc(race.car||"—")+'</b><small>CAR</small></span><span><b>'+esc(race.laps||"—")+'</b><small>LAPS</small></span><span><b>'+esc(race.miles||"—")+'</b><small>MILES</small></span><span><b>'+esc(race.tires||"—")+'</b><small>TIRES</small></span></div></div>'+
    '<a href="../race-preview/?league='+key+'">OPEN '+label+' PREVIEW →</a></article>';
}
function renderRecent(rows){
  const el=$("myhRecent");
  if(!rows.length){el.innerHTML='<div class="myh-loading">NO SUNDAY OR MONDAY RESULTS FOUND.</div>';return}
  el.innerHTML=rows.slice(0,6).map(r=>{
    const finish=num(r.finish);
    const cls=finish===1?" win":finish<=5?" top5":"";
    const league=String(r.series||"").toUpperCase();
    return '<div class="myh-result'+cls+'"><div class="myh-result-pos">P'+esc(finish||"—")+'</div>'+
      '<div class="myh-result-copy"><strong>'+esc(r.track||"HLRN Race")+'</strong><span>'+esc(league)+' • RACE '+esc(r.raceNumber||"—")+' • START P'+esc(r.start||"—")+' • '+esc(formatDate(r.date))+'</span></div>'+
      '<div class="myh-result-pts"><b>'+esc(r.points??"—")+'</b><small>POINTS</small></div></div>';
  }).join("");
}
function renderTracks(rows){
  const map=new Map();
  rows.forEach(r=>{
    const key=canonicalTrack(r.track);if(!key||!num(r.finish))return;
    if(!map.has(key))map.set(key,{track:r.track,starts:0,total:0,best:999,wins:0});
    const x=map.get(key);x.starts++;x.total+=num(r.finish);x.best=Math.min(x.best,num(r.finish));x.wins+=num(r.finish)===1?1:0;
  });
  let tracks=[...map.values()].map(x=>({...x,avg:x.total/x.starts}));
  const multi=tracks.filter(x=>x.starts>=2);
  if(multi.length>=3)tracks=multi;
  tracks.sort((a,b)=>a.avg-b.avg||b.starts-a.starts||a.best-b.best);
  const el=$("myhTracks");
  if(!tracks.length){el.innerHTML='<div class="myh-loading">NO TRACK HISTORY AVAILABLE.</div>';return}
  el.innerHTML=tracks.slice(0,5).map((x,i)=>'<div class="myh-track"><div class="myh-track-rank">0'+(i+1)+'</div><div class="myh-track-copy"><strong>'+esc(x.track)+'</strong><span>'+x.starts+' START'+(x.starts===1?"":"S")+' • BEST P'+x.best+(x.wins?" • "+x.wins+" WIN"+(x.wins===1?"":"S"):"")+'</span></div><div class="myh-track-stat"><b>'+x.avg.toFixed(1)+'</b><small>AVG FINISH</small></div></div>').join("");
}
function renderHosted(profile){
  const el=$("myhHosted");
  if(!profile){el.innerHTML='<div class="myh-loading">NO HOSTED PROFILE DATA FOUND.</div>';return}
  el.innerHTML='<div><small>HOSTED STARTS</small><strong>'+esc(profile.races??"—")+'</strong></div>'+
    '<div><small>HOSTED WINS</small><strong>'+esc(profile.wins??"—")+'</strong></div>'+
    '<div><small>TOP 10</small><strong>'+esc(profile.top10??"—")+'</strong></div>'+
    '<div><small>AVG FINISH</small><strong>'+esc(profile.avgFinish!=null?Number(profile.avgFinish).toFixed(2):"—")+'</strong></div>';
}
async function renderPenalties(name,numberValue){
  const el=$("myhPenalties");
  try{
    const index=await getJson(RECAP_INDEX_URL);
    const recaps=(index?.recaps||[]).slice(0,12);
    if(!recaps.length){el.innerHTML='<div class="myh-loading">NO FROZEN RACE RECORDS HAVE BEEN PUBLISHED YET.</div>';return}
    const archives=await Promise.all(recaps.map(async item=>{
      try{return {item,data:await getJson("../data/race-recaps/"+encodeURIComponent(item.slug)+".json")}}catch{return null}
    }));
    const out=[];
    archives.filter(Boolean).forEach(({item,data})=>{
      const recorder=data?.recorder||{};
      const penalties=Array.isArray(recorder.penaltyHistory)?recorder.penaltyHistory:[];
      penalties.forEach(p=>{
        const matched=sameDriver(p.name,name)||(Array.isArray(p.drivers)&&p.drivers.some(x=>sameDriver(x,name)))||
          (numberValue&&String(p.number||"")===String(numberValue))||
          (numberValue&&Array.isArray(p.carNumbers)&&p.carNumbers.some(x=>String(x)===String(numberValue)));
        if(matched)out.push({item,p});
      });
      const finalDrivers=recorder?.race?.drivers||[];
      finalDrivers.filter(d=>sameDriver(d.name,name)&&(d.disqualified||d.dqFlag)).forEach(d=>{
        if(!out.some(x=>x.item?.raceKey===item.raceKey&&/disqual/i.test(String(x.p?.title||"")))){
          out.push({item,p:{title:"Disqualified",reason:d.statusDetail||d.status||"Final classification marked DQ",lap:d.lapsCompleted}});
        }
      });
    });
    out.sort((a,b)=>Date.parse(b.item?.raceFrozenAt||0)-Date.parse(a.item?.raceFrozenAt||0));
    if(!out.length){el.innerHTML='<div class="myh-loading">NO BLACK FLAGS OR DISQUALIFICATIONS FOUND FOR THIS DRIVER IN PUBLISHED FROZEN RACE RECORDS.</div>';return}
    el.innerHTML=out.slice(0,6).map(x=>'<article class="myh-penalty"><div class="myh-penalty-meta">'+esc(x.item?.series||"HLRN")+'<br>'+esc(x.item?.displayDate||formatDate(x.item?.raceFrozenAt))+'</div><div class="myh-penalty-copy"><strong>'+esc(x.p?.title||"BLACK FLAG")+' • '+esc(x.item?.track||"HLRN RACE")+'</strong><span>'+esc(x.p?.reason||x.p?.text||"Reason not supplied by iRacing telemetry")+(x.p?.lap!=null?" • LAP "+esc(x.p.lap):"")+'</span></div><a href="'+esc(x.item?.url||"../news/race-recaps/")+'">RACE RECORD →</a></article>').join("");
  }catch(err){
    console.warn("My HLRN recorder history:",err);
    el.innerHTML='<div class="myh-loading">RECORDER HISTORY IS TEMPORARILY UNAVAILABLE.</div>';
  }
}
async function init(){
  const login=readLogin();
  if(!login){
    $("myhGate").hidden=false;$("myhDashboard").hidden=true;return;
  }
  $("myhGate").hidden=true;$("myhDashboard").hidden=false;
  text("myhName",displayName(login.driver));
  text("myhDiscord",login.discordUsername?"SIGNED IN VIA DISCORD • @"+login.discordUsername:login.discordDisplayName?"SIGNED IN VIA DISCORD • "+login.discordDisplayName:"SIGNED-IN HLRN DRIVER ACCOUNT");
  if(window.HLRNDrivers?.load)await window.HLRNDrivers.load();
  $("myhProfileLink").href=window.HLRNDrivers?.profileUrl?.(login.driver)||"../drivers/";

  try{
    const [profileData,numberData,scheduleData,snapshot]=await Promise.all([
      getJson(PROFILE_URL),getJson(NUMBER_URL),getJson(SCHEDULE_URL),window.HLRNData?HLRNData.load():Promise.resolve(null)
    ]);
    const profiles=(profileData?.drivers||[]).filter(d=>sameDriver(d.name,login.driver)||sameDriver(d.sourceName,login.driver));
    const sunday=profiles.find(d=>d.series==="sunday")||null;
    const monday=profiles.find(d=>d.series==="monday")||null;
    const hosted=profiles.find(d=>d.series==="hosted")||null;
    const primary=sunday||monday||hosted;
    if(!primary)throw new Error("No driver profile matched "+login.driver);

    const numberValue=numberData?.numbers?.[nameKey(login.driver)]||numberData?.numbers?.[nameKey(primary.name)]||"—";
    text("myhNumber","#"+numberValue);text("myhPhotoNumber",numberValue);
    const photoSlug=primary.photoSlug||nameKey(primary.name).replace(/([a-z])([A-Z])/g,"$1-$2");
    const photo=$("myhPhoto");
    photo.src=PHOTO_BASE+encodeURIComponent(photoSlug)+".webp";
    photo.onerror=()=>{photo.style.display="none"};

    const srow=driverRow(snapshot,"sunday",sunday,login.driver);
    const mrow=driverRow(snapshot,"monday",monday,login.driver);
    renderLeague("Sunday",sunday,srow);renderLeague("Monday",monday,mrow);

    const leagueProfiles=[sunday,monday].filter(Boolean);
    const starts=leagueProfiles.reduce((t,p)=>t+num(p.races),0);
    const wins=leagueProfiles.reduce((t,p)=>t+num(p.wins),0);
    const top5=leagueProfiles.reduce((t,p)=>t+num(p.top5),0);
    const top10=leagueProfiles.reduce((t,p)=>t+num(p.top10),0);
    const led=leagueProfiles.reduce((t,p)=>t+num(p.lapsLed),0);
    const incidents=leagueProfiles.reduce((t,p)=>t+num(p.incidents),0);
    const racePoints=leagueProfiles.reduce((t,p)=>t+num(p.racePoints),0);
    const avg=starts?leagueProfiles.reduce((t,p)=>t+num(p.avgFinish)*num(p.races),0)/starts:null;
    text("myhStarts",starts);text("myhWins",wins);text("myhTop5",top5);text("myhTop10",top10);
    text("myhAvg",avg!=null?avg.toFixed(2):"—");text("myhLed",led);text("myhIncidents",incidents);text("myhRacePoints",racePoints);

    const results=leagueProfiles.flatMap(p=>(p.results||[]).map(r=>({...r,series:p.series})))
      .sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)||num(b.raceNumber)-num(a.raceNumber));
    renderRecent(results);renderTracks(results);
    const validFinishes=results.filter(r=>num(r.finish)>0);
    const last5=validFinishes.slice(0,5);
    const last5Avg=last5.length?last5.reduce((t,r)=>t+num(r.finish),0)/last5.length:null;
    const best=validFinishes.length?Math.min(...validFinishes.map(r=>num(r.finish))):null;
    text("myhLast5Avg",last5Avg!=null?last5Avg.toFixed(1):"—");
    text("myhBestFinish",best!=null?"P"+best:"—");
    text("myhTrendNote",last5Avg==null||avg==null?"NOT ENOUGH RESULTS":last5Avg<avg?"RECENT AVG IS "+(avg-last5Avg).toFixed(1)+" POSITIONS BETTER THAN SEASON AVG":last5Avg>avg?"RECENT AVG IS "+(last5Avg-avg).toFixed(1)+" POSITIONS LOWER THAN SEASON AVG":"MATCHING SEASON AVG");

    renderHosted(hosted);
    $("myhNextGrid").innerHTML=renderNext("sunday",nextRace(scheduleData?.leagues?.sunday))+renderNext("monday",nextRace(scheduleData?.leagues?.monday));
    text("myhDataStatus",profileData?.generatedAt?"CURRENT • "+formatDate(profileData.generatedAt):"CURRENT");
    renderPenalties(primary.name,numberValue);
  }catch(err){
    console.error("My HLRN:",err);
    text("myhDataStatus","DATA UNAVAILABLE");
    ["myhRecent","myhTracks","myhHosted","myhPenalties","myhNextGrid"].forEach(id=>{if($(id))$(id).innerHTML='<div class="myh-loading">MY HLRN DATA IS TEMPORARILY UNAVAILABLE.</div>'});
  }
}
window.addEventListener("storage",e=>{if(e.key===LOGIN_KEY)init()});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
