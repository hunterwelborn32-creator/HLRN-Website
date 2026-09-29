(()=>{
"use strict";

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const fmt=(v,d=1)=>{const n=Number(v);if(!Number.isFinite(n))return "—";return Math.abs(n-Math.round(n))<.001?String(Math.round(n)):n.toFixed(d)};
const pretty=name=>{
  let s=String(name||"").trim();
  if(s.includes(",")){const p=s.split(","),last=(p.shift()||"").trim().replace(/\d+$/,"");s=(p.join(" ").trim()+" "+last).trim()}
  return s.replace(/(\p{L})\d+$/u,"$1").trim();
};

const state={snapshot:null,schedule:null,reports:[],league:"sunday",race:null,timer:null};
const params=new URLSearchParams(location.search);
if(["sunday","monday"].includes((params.get("league")||"").toLowerCase()))state.league=params.get("league").toLowerCase();

function offsetMinutesForET(dateText){
  const probe=new Date(dateText+"T12:00:00Z");
  const name=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",timeZoneName:"shortOffset",hour:"2-digit"}).formatToParts(probe).find(p=>p.type==="timeZoneName")?.value||"GMT-4";
  const m=name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if(!m)return -240;
  const sign=m[1]==="-"?-1:1;
  return sign*(Number(m[2])*60+Number(m[3]||0));
}
function easternInstant(dateText,hour=20,minute=30){
  const [y,m,d]=String(dateText).split("-").map(Number);
  const off=offsetMinutesForET(dateText);
  return new Date(Date.UTC(y,m-1,d,hour,minute)-off*60000);
}
function displayDate(dateText){
  return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(easternInstant(dateText,12,0)).toUpperCase();
}
function shortDate(v){
  const d=new Date(v);if(Number.isNaN(d.getTime()))return "";
  return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",year:"numeric"}).format(d).toUpperCase();
}
function leagueLabel(k){return k==="monday"?"MONDAY NIGHT LEAGUE":"SUNDAY NIGHT LEAGUE"}
function leagueShort(k){return k==="monday"?"MONDAY":"SUNDAY"}
function canonicalTrack(v){
  return String(v||"").toLowerCase()
    .replace(/\b(international|motor|speedway|raceway|motorspeedway|the)\b/g," ")
    .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function sameTrack(a,b){
  const x=canonicalTrack(a),y=canonicalTrack(b);
  return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x));
}
function leagueData(k){return state.snapshot?.leagues?.[k]||{drivers:[],teams:[],results:[]}}
function driverUrl(k,d){return "../drivers/?"+new URLSearchParams({league:k,driverId:String(d?.driverId||d?.id||""),driver:pretty(d?.driver||d?.name||"")})}
function teamUrl(k,name){return "../teams/?"+new URLSearchParams({league:k,team:String(name||"")})}
function resultUrl(r){return "../results/?"+new URLSearchParams({league:r?.series||state.league,race:r?.key||""})}

function upcoming(k){
  const list=state.schedule?.leagues?.[k]||[],now=Date.now();
  return list.find(e=>!e.off && easternInstant(e.date).getTime()+4*3600000>=now)||null;
}
function nearestLeague(){
  const s=upcoming("sunday"),m=upcoming("monday");
  if(!s)return m?"monday":"sunday";
  if(!m)return "sunday";
  return easternInstant(s.date)<=easternInstant(m.date)?"sunday":"monday";
}
function reportsFor(k,before){
  const cutoff=before?easternInstant(before.date).getTime():Infinity;
  return state.reports.filter(r=>r.series===k&&Date.parse(r.date)<cutoff).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
function previousRace(k,race){return reportsFor(k,race)[0]||null}
function trackHistory(race){
  const cutoff=easternInstant(race.date).getTime();
  return state.reports.filter(r=>Date.parse(r.date)<cutoff&&sameTrack(r.track,race.track)).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}

function renderTabs(){
  document.body.classList.toggle("pv-monday",state.league==="monday");
  $$(".pv-tab").forEach(b=>b.classList.toggle("active",b.dataset.league===state.league));
}
function renderHero(race){
  $("#pvRaceLabel").textContent=leagueLabel(state.league)+" // WEEK "+(race?.week||"—");
  $("#pvTrack").textContent=race?.track||"SEASON COMPLETE";
  $("#pvDescription").textContent=race?.description||"The selected HLRN league has completed its published schedule.";
  $("#pvWeek").textContent=race?"WEEK "+race.week:"—";
  $("#pvDate").textContent=race?displayDate(race.date):"—";
  $("#pvCar").textContent=race?.car||"—";
  $("#pvLaps").textContent=race?.laps?race.laps+" LAPS":"—";
  $("#pvType").textContent=race?.type||"—";
  $("#pvLocation").textContent=race?.location||"—";
  $("#pvMiles").textContent=race?.miles?race.miles+" MI":"—";
  $("#pvBanking").textContent=race?.banking||"—";
  $("#pvTires").textContent=race?.tires||"—";
  const watch=$("#pvWatchLink"),live=$("#pvLiveLink");
  if(watch)watch.href="../broadcasters/?league="+state.league;
  if(live)live.href="../live/?league="+state.league;
}
function countdown(race){
  if(state.timer)clearInterval(state.timer);
  const ids=["pvDays","pvHours","pvMinutes","pvSeconds"];
  const tick=()=>{
    if(!race){ids.forEach(id=>$("#"+id).textContent="--");$("#pvCountStatus").textContent="SEASON COMPLETE";return}
    const target=easternInstant(race.date).getTime(),diff=target-Date.now();
    if(diff<=0&&diff>-4*3600000){
      ids.forEach(id=>$("#"+id).textContent="00");
      $("#pvCountStatus").textContent="RACE WINDOW OPEN";
      $("#pvCountMeta").textContent=leagueLabel(state.league)+" • "+race.track+" • 8:30 PM ET";
      return;
    }
    if(diff<=-4*3600000){$("#pvCountStatus").textContent="CHECKERED / NEXT UPDATE";return}
    const sec=Math.floor(diff/1000);
    $("#pvDays").textContent=String(Math.floor(sec/86400)).padStart(2,"0");
    $("#pvHours").textContent=String(Math.floor(sec%86400/3600)).padStart(2,"0");
    $("#pvMinutes").textContent=String(Math.floor(sec%3600/60)).padStart(2,"0");
    $("#pvSeconds").textContent=String(sec%60).padStart(2,"0");
    $("#pvCountStatus").textContent=race.finale?"SEASON FINALE":"TIME TO GREEN";
    $("#pvCountMeta").textContent=leagueLabel(state.league)+" • "+race.track+" • 8:30 PM ET";
  };
  tick();state.timer=setInterval(tick,1000);
}
function sortedDrivers(k){
  return [...(leagueData(k).drivers||[])].sort((a,b)=>num(a.rank)-num(b.rank)||num(b.points)-num(a.points));
}
function sortedTeams(k){
  return [...(leagueData(k).teams||[])].sort((a,b)=>num(a.rank)-num(b.rank)||num(b.points)-num(a.points));
}
function renderChamp(){
  const drivers=sortedDrivers(state.league).slice(0,5),leader=drivers[0];
  $("#pvChampGap").textContent=drivers[1]?pretty(leader.driver)+" +"+fmt(num(leader.points)-num(drivers[1].points))+" OVER P2":"CURRENT STANDINGS";
  $("#pvChampList").innerHTML=drivers.length?drivers.map((d,i)=>{
    const gap=leader?num(leader.points)-num(d.points):0;
    return '<div class="pv-row"><div class="rank">P'+(i+1)+'</div><div><a href="'+esc(driverUrl(state.league,d))+'"><strong>'+esc(pretty(d.driver))+'</strong></a><small>'+(i===0?'CHAMPIONSHIP LEADER':fmt(gap)+' PTS BEHIND')+'</small></div><div class="stat"><b>'+fmt(d.points)+'</b><span>POINTS</span></div></div>';
  }).join(""):'<div class="pv-empty">Championship standings are unavailable.</div>';

  const teams=sortedTeams(state.league).slice(0,5),tl=teams[0];
  $("#pvTeamList").innerHTML=teams.length?teams.map((t,i)=>{
    const gap=tl?num(tl.points)-num(t.points):0;
    return '<div class="pv-row"><div class="rank">P'+(i+1)+'</div><div><a href="'+esc(teamUrl(state.league,t.team))+'"><strong>'+esc(t.team)+'</strong></a><small>'+(i===0?'TEAM CHAMPIONSHIP LEADER':fmt(gap)+' PTS BEHIND')+'</small></div><div class="stat"><b>'+fmt(t.points)+'</b><span>POINTS</span></div></div>';
  }).join(""):'<div class="pv-empty">Team standings are unavailable.</div>';
  $("#pvChampLeader").textContent=leader?pretty(leader.driver):"—";
  $("#pvTeamLeader").textContent=tl?tl.team:"—";
}
function driverRecentMap(race){
  const reports=reportsFor(state.league,race),map=new Map();
  reports.forEach(rep=>(rep.results||[]).forEach(row=>{
    const id=String(row.id||"");
    if(!id)return;
    if(!map.has(id))map.set(id,[]);
    const a=map.get(id);if(a.length<4)a.push({finish:num(row.finish),track:rep.track,date:rep.date});
  }));
  return map;
}
function renderWatch(race){
  const recents=driverRecentMap(race),drivers=sortedDrivers(state.league).slice(0,14);
  const rows=drivers.map(d=>{
    const recent=recents.get(String(d.driverId))||[];
    const avg=recent.length?recent.reduce((s,x)=>s+x.finish,0)/recent.length:null;
    return{d,recent,avg};
  }).sort((a,b)=>{
    if(a.avg==null&&b.avg!=null)return 1;if(b.avg==null&&a.avg!=null)return -1;
    if(a.avg!=null&&b.avg!=null&&a.avg!==b.avg)return a.avg-b.avg;
    return num(a.d.rank)-num(b.d.rank);
  }).slice(0,4);
  $("#pvWatchGrid").innerHTML=rows.length?rows.map((x,i)=>{
    const form=x.recent.length?x.recent.map(r=>"P"+r.finish).join(" • "):"NO RECENT RESULTS";
    return '<article class="pv-watch"><div class="eyebrow">DRIVER TO WATCH // '+String(i+1).padStart(2,"0")+'</div><h3>'+esc(pretty(x.d.driver))+'</h3><div class="pv-watch-score">'+(x.avg==null?"—":x.avg.toFixed(1))+'<span>RECENT AVG</span></div><div class="pv-watch-reason">Championship P'+esc(x.d.rank)+' • '+esc(form)+'. Selected from current championship position and recent published finishes.</div><a href="'+esc(driverUrl(state.league,x.d))+'">OPEN DRIVER PROFILE →</a></article>';
  }).join(""):'<div class="pv-empty">Not enough completed results to build the current watch list.</div>';

  const formRows=rows.slice().sort((a,b)=>(a.avg??999)-(b.avg??999));
  $("#pvFormList").innerHTML=formRows.length?formRows.map((x,i)=>'<div class="pv-row"><div class="rank">'+(i+1)+'</div><div><strong>'+esc(pretty(x.d.driver))+'</strong><small>'+esc(x.recent.map(r=>"P"+r.finish).join(" • ")||"NO RECENT RESULTS")+'</small></div><div class="stat"><b>'+(x.avg==null?"—":x.avg.toFixed(1))+'</b><span>AVG</span></div></div>').join(""):'<div class="pv-empty">Recent form is unavailable.</div>';
}
function renderPrevious(race){
  const prev=previousRace(state.league,race),mount=$("#pvPrevious");
  if(!prev){mount.innerHTML='<small>PREVIOUS RACE</small><h3>NO COMPLETED RESULT YET</h3><div class="pv-previous-winner"><span>STATUS</span><strong>WAITING FOR RESULT DATA</strong></div>';return}
  const w=prev.winner||{};
  mount.innerHTML='<small>LAST '+leagueShort(state.league)+' RACE • '+esc(shortDate(prev.date))+'</small><h3>'+esc(prev.track||"HLRN RACE")+'</h3><div class="pv-previous-winner"><span>WINNER</span><strong>'+esc(w.name||"—")+'</strong></div><div class="pv-previous-actions"><a class="pv-btn primary" href="'+esc(resultUrl(prev))+'">FULL RESULTS →</a><a class="pv-btn" href="../news/">NEWSROOM →</a></div>';
  $("#pvPrevWinner").textContent=w.name||"—";
}
function renderHistory(race){
  const hist=trackHistory(race).slice(0,5);
  $("#pvHistoryTitle").textContent="HLRN AT "+race.track;
  $("#pvHistoryList").innerHTML=hist.length?hist.map(r=>{
    return '<a class="pv-history-item" href="'+esc(resultUrl(r))+'"><div class="wk">'+esc(leagueShort(r.series))+'</div><div><strong>'+esc(r.track)+'</strong><small>'+esc(shortDate(r.date))+'</small></div><b>'+esc(r.winner?.name||"—")+' →</b></a>';
  }).join(""):'<div class="pv-empty">No prior stored HLRN race at this track was found.</div>';
}
function strategy(race){
  const type=String(race.type||"").toUpperCase(),miles=num(race.miles);
  if(type.includes("SUPER")||miles>=2.4){
    return[
      ["DRAFT","STAY CONNECTED","Momentum comes from the draft. Avoid getting isolated and protect runs before making moves."],
      ["POSITION","PICK THE RIGHT LANE","Track which line is organized before committing. A strong push is often worth more than forcing a solo pass."],
      ["PATIENCE","SURVIVE THE EARLY CHAOS","The race is long enough that every early opening does not need to be taken. Preserve the car for the final run."],
      ["PIT CYCLES","ENTER WITH HELP","Green-flag stops can split the pack. A coordinated entry and exit can matter as much as raw speed."]
    ];
  }
  if(type.includes("SHORT")||miles<1){
    return[
      ["ENTRY","CONTROL THE BRAKE ZONE","Avoid overdriving corner entry. Stable braking helps protect the rear tires and improves drive off."],
      ["TIRES","SAVE THE REAR","Wheelspin compounds over a run. Smooth throttle application matters when the track gets slick."],
      ["TRAFFIC","PLAN PASSES EARLY","Closing rates are quick on a short oval. Set up exits rather than relying on late dive-bombs."],
      ["RESTARTS","PROTECT TRACK POSITION","Short runs can be decisive. Know your preferred lane and be ready for immediate pressure."]
    ];
  }
  return[
    ["LONG RUN","BUILD A BALANCED CAR","Do not judge the race by the first few laps. The best line can change as tires and track conditions evolve."],
    ["TIRES","LIMIT EARLY SLIP","Saving tire early can open passing opportunities late in a run when other cars begin to fade."],
    ["LANES","SEARCH FOR GRIP","Use practice to learn where the car stays stable in traffic and which lane works when following closely."],
    ["PIT ROAD","MINIMIZE LOST TIME","Clean entry, hitting the box and a controlled exit protect track position during green-flag cycles."]
  ];
}
function renderStrategy(race){
  $("#pvStrategy").innerHTML=strategy(race).map(x=>'<article class="pv-tip"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><p>'+esc(x[2])+'</p></article>').join("");
}
function renderNotes(race){
  const ds=sortedDrivers(state.league),ts=sortedTeams(state.league),prev=previousRace(state.league,race);
  const notes=[
    ["CHAMPIONSHIP",ds[0]?pretty(ds[0].driver)+" enters race week P1 with "+fmt(ds[0].points)+" points.":"Standings are still loading."],
    ["TEAM BATTLE",ts[0]?ts[0].team+" leads the current team championship with "+fmt(ts[0].points)+" points.":"Team standings are unavailable."],
    ["LAST RESULT",prev?.winner?.name?(prev.winner.name+" won the previous "+leagueShort(state.league)+" race at "+prev.track+"."):"No prior result is available."],
    ["RACE FORMAT",(race.car||"Car")+" • "+(race.laps||"—")+" laps • "+(race.tires||"Tire data unavailable")+" • "+(race.type||"Track type unavailable")]
  ];
  $("#pvNotes").innerHTML=notes.map((x,i)=>'<div class="pv-row"><div class="rank">'+String(i+1).padStart(2,"0")+'</div><div><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small></div><div class="stat"><b>RACE WEEK</b><span>NOTE</span></div></div>').join("");
}
function renderLeague(k,push=true){
  state.league=k;state.race=upcoming(k);renderTabs();
  if(push){const u=new URL(location.href);u.searchParams.set("league",k);history.replaceState({},"",u.pathname+"?"+u.searchParams.toString())}
  renderHero(state.race);countdown(state.race);
  if(!state.race){
    ["pvChampList","pvTeamList","pvWatchGrid","pvFormList","pvHistoryList","pvStrategy","pvNotes"].forEach(id=>$("#"+id).innerHTML='<div class="pv-empty">SEASON COMPLETE.</div>');
    return;
  }
  renderChamp();renderWatch(state.race);renderPrevious(state.race);renderHistory(state.race);renderStrategy(state.race);renderNotes(state.race);
}
async function json(url){
  const res=await fetch(url+(url.includes("?")?"&":"?")+"v="+Date.now(),{cache:"no-store"});
  if(!res.ok)throw new Error(url+" "+res.status);return res.json();
}
async function init(){
  $$(".pv-tab").forEach(b=>b.addEventListener("click",()=>renderLeague(b.dataset.league,true)));
  try{
    const loaded=await Promise.all([HLRNData.load(),json("../data/schedules-2026.json"),json("../data/derived/reports.json")]);
    state.snapshot=loaded[0];state.schedule=loaded[1];state.reports=loaded[2]?.reports||[];
    if(!params.get("league"))state.league=nearestLeague();
    $("#pvUpdated").textContent=state.snapshot?.generatedAt?"DATA "+new Date(state.snapshot.generatedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}).toUpperCase():"LIVE DATA";
    renderLeague(state.league,false);
  }catch(err){
    console.error("HLRN Race Preview",err);
    $("#pvTrack").textContent="PREVIEW DATA UNAVAILABLE";
    $("#pvDescription").textContent="The shared HLRN race-week data could not be loaded right now.";
    ["pvChampList","pvTeamList","pvWatchGrid","pvFormList","pvHistoryList","pvStrategy","pvNotes"].forEach(id=>{const el=$("#"+id);if(el)el.innerHTML='<div class="pv-empty">DATA TEMPORARILY UNAVAILABLE.</div>'});
  }
}
document.addEventListener("DOMContentLoaded",init);
})();