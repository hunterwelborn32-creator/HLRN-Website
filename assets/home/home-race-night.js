(function(){
"use strict";

const ZONE="America/New_York";
const START_HOUR=20;
const START_MINUTE=30;
const COUNTDOWN_MINUTES=60;
const LIVE_END_HOUR=24;

const SCHEDULES={
  sunday:[
    {week:1,date:"2026-06-14",track:"DAYTONA",car:"GEN 7",laps:100},
    {week:2,date:"2026-06-28",track:"IOWA",car:"TRUCKS",laps:200},
    {week:3,date:"2026-07-12",track:"CHICAGOLAND",car:"ARCA",laps:175},
    {week:4,date:"2026-07-19",track:"ECHOPARK",car:"GEN 6",laps:175},
    {week:5,date:"2026-08-09",track:"CHARLOTTE",car:"GEN 7",laps:175},
    {week:6,date:"2026-08-16",track:"TEXAS",car:"TRUCKS",laps:175},
    {week:7,date:"2026-08-23",track:"AUTO CLUB",car:"ARCA",laps:125},
    {week:8,date:"2026-08-30",track:"TALLADEGA",car:"GEN 6",laps:100},
    {week:9,date:"2026-09-13",track:"HOMESTEAD-MIAMI",car:"GEN 7",laps:175},
    {week:10,date:"2026-09-20",track:"MICHIGAN",car:"TRUCKS",laps:125},
    {week:11,date:"2026-09-27",track:"INDIANAPOLIS",car:"ARCA",laps:100},
    {week:12,date:"2026-10-04",track:"IRACING SUPERSPEEDWAY",car:"GEN 6",laps:100},
    {week:13,date:"2026-10-11",track:"KANSAS",car:"GEN 7",laps:175},
    {week:14,date:"2026-10-18",track:"LAS VEGAS",car:"TRUCKS",laps:175},
    {week:15,date:"2026-10-25",track:"DAYTONA",car:"ARCA",laps:100},
    {week:16,date:"2026-11-01",track:"TALLADEGA",car:"GEN 6",laps:100,finale:true}
  ],
  monday:[
    {week:1,date:"2026-08-17",track:"DAYTONA",car:"GEN 7",laps:100},
    {week:2,date:"2026-08-24",track:"IOWA",car:"TRUCKS",laps:200},
    {week:3,date:"2026-08-31",track:"CHICAGOLAND",car:"ARCA",laps:175},
    {week:4,date:"2026-09-14",track:"ECHOPARK",car:"GEN 7",laps:175},
    {week:5,date:"2026-09-21",track:"CHARLOTTE",car:"GEN 7",laps:175},
    {week:6,date:"2026-09-28",track:"TEXAS",car:"TRUCKS",laps:175},
    {week:7,date:"2026-10-05",track:"AUTO CLUB",car:"ARCA",laps:100},
    {week:8,date:"2026-10-12",track:"TALLADEGA",car:"TRUCKS",laps:100},
    {week:9,date:"2026-10-19",track:"HOMESTEAD-MIAMI",car:"GEN 7",laps:175},
    {week:10,date:"2026-10-26",track:"MICHIGAN",car:"TRUCKS",laps:125},
    {week:11,date:"2026-11-02",track:"MARTINSVILLE",car:"ARCA",laps:100},
    {week:12,date:"2026-11-09",track:"IRACING SUPERSPEEDWAY",car:"TRUCKS",laps:100},
    {week:13,date:"2026-11-16",track:"KANSAS",car:"GEN 7",laps:175},
    {week:14,date:"2026-11-23",track:"LAS VEGAS",car:"TRUCKS",laps:175},
    {week:15,date:"2026-11-30",track:"DAYTONA",car:"ARCA",laps:100},
    {week:16,date:"2026-12-07",track:"TALLADEGA",car:"GEN 7",laps:100,finale:true}
  ]
};

function etParts(date){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:ZONE,year:"numeric",month:"2-digit",day:"2-digit",
    weekday:"short",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
  }).formatToParts(date);
  const out={};
  parts.forEach(p=>{if(p.type!=="literal")out[p.type]=p.value});
  return {
    year:Number(out.year),month:Number(out.month),day:Number(out.day),
    hour:Number(out.hour),minute:Number(out.minute),second:Number(out.second),
    weekday:out.weekday
  };
}
function dateKey(p){
  return p.year+"-"+String(p.month).padStart(2,"0")+"-"+String(p.day).padStart(2,"0");
}
function raceForToday(now){
  const p=etParts(now),key=dateKey(p);
  for(const league of ["sunday","monday"]){
    const race=SCHEDULES[league].find(r=>r.date===key);
    if(race)return {league,race,parts:p};
  }
  return null;
}
function secondsSinceMidnight(p){return p.hour*3600+p.minute*60+p.second}
function phaseFor(today){
  const sec=secondsSinceMidnight(today.parts);
  const green=START_HOUR*3600+START_MINUTE*60;
  const countdown=green-COUNTDOWN_MINUTES*60;
  const liveEnd=LIVE_END_HOUR*3600;
  if(sec<countdown)return "raceday";
  if(sec<green)return "countdown";
  if(sec<liveEnd)return "live";
  return "off";
}
function hms(total){
  total=Math.max(0,Math.floor(total));
  const h=Math.floor(total/3600);
  const m=Math.floor((total%3600)/60);
  const s=total%60;
  return [h,m,s].map(v=>String(v).padStart(2,"0"));
}
function seriesName(league){return league==="sunday"?"SUNDAY NIGHT LEAGUE":"MONDAY NIGHT LEAGUE"}
function accent(league){return league==="sunday"?"SUNDAY":"MONDAY"}

let panel=null;
let lastMode="";
let timer=null;

function ensurePanel(){
  if(panel)return panel;
  const host=document.getElementById("hlrnRaceDayHome");
  if(!host)return null;
  panel=document.createElement("section");
  panel.id="hlrnRaceNightTakeover";
  panel.className="rn-takeover";
  panel.setAttribute("aria-label","HLRN Race Night");
  panel.innerHTML=
    '<div class="rn-grid" aria-hidden="true"></div>'+
    '<div class="v7-shell rn-inner">'+
      '<div class="rn-copy">'+
        '<div class="rn-eyebrow"><span class="rn-pulse"></span><b id="rnPhaseLabel">RACE DAY</b><i>//</i><span id="rnSeries">HLRN</span></div>'+
        '<div class="rn-trackline"><span id="rnWeek">WEEK --</span><span id="rnCar">--</span><span id="rnLaps">-- LAPS</span></div>'+
        '<h1 id="rnHeadline">HLRN RACE DAY</h1>'+
        '<h2 id="rnTrack">--</h2>'+
        '<p id="rnMessage">The HLRN race-night system is preparing today’s event.</p>'+
        '<div class="rn-actions">'+
          '<a class="rn-btn primary" href="broadcasters/"><span class="rn-btn-icon">▶</span><span><small>WATCH</small><strong>WATCH BROADCAST</strong></span><b>↗</b></a>'+
          '<a class="rn-btn live" href="live/"><span class="rn-btn-icon">●</span><span><small>RACE CONTROL</small><strong>LIVE RACE CENTER</strong></span><b>→</b></a>'+
          '<a class="rn-btn" id="rnPreview" href="race-preview/"><span class="rn-btn-icon">P</span><span><small>PRE-RACE</small><strong>RACE PREVIEW</strong></span><b>→</b></a>'+
          '<a class="rn-btn" href="standings/"><span class="rn-btn-icon">#</span><span><small>CHAMPIONSHIP</small><strong>STANDINGS</strong></span><b>→</b></a>'+
        '</div>'+
      '</div>'+
      '<aside class="rn-board">'+
        '<div class="rn-board-head"><span class="rn-pulse"></span><div><small id="rnBoardLabel">GREEN FLAG</small><strong>8:30 PM EASTERN</strong></div></div>'+
        '<div class="rn-clock">'+
          '<div><strong id="rnHours">00</strong><span>HOURS</span></div>'+
          '<div><strong id="rnMinutes">00</strong><span>MINUTES</span></div>'+
          '<div><strong id="rnSeconds">00</strong><span>SECONDS</span></div>'+
        '</div>'+
        '<div class="rn-live-now"><span id="rnLiveText">COUNTDOWN TO GREEN</span></div>'+
        '<div class="rn-info">'+
          '<div><span>NETWORK</span><strong>HLRN</strong></div>'+
          '<div><span>SERIES</span><strong id="rnBoardSeries">--</strong></div>'+
          '<div><span>CHAMP LEADER</span><strong id="rnLeader">CONNECTING</strong></div>'+
        '</div>'+
      '</aside>'+
    '</div>'+
    '<div class="rn-crawl"><div class="v7-shell"><b id="rnCrawlLead">HLRN RACE DAY</b><span>◆</span><span id="rnCrawlTrack">8:30 PM EASTERN</span><span>◆</span><span>LIVE RACE CENTER</span><span>◆</span><span>RACE PREVIEW</span><span>◆</span><span>CHAMPIONSHIP STANDINGS</span></div></div>';
  const main=host.querySelector("main");
  host.insertBefore(panel,main||null);
  return panel;
}
function text(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=value;
}
function syncLeader(league){
  const source=document.getElementById(league==="sunday"?"homeSundayLeader":"homeMondayLeader");
  const dest=document.getElementById("rnLeader");
  if(!dest)return;
  const pull=()=>{
    const val=(source&&source.textContent||"").trim();
    if(val&&val!=="CONNECTING"&&val!=="--")dest.textContent=val;
  };
  pull();
  if(source&&!source.dataset.rnObserved){
    source.dataset.rnObserved="1";
    new MutationObserver(pull).observe(source,{subtree:true,childList:true,characterData:true});
  }
}
function apply(today,mode){
  const p=ensurePanel();
  if(!p)return;
  const league=today.league,race=today.race;
  document.body.classList.add("rn-active","rn-"+league,"rn-"+mode);
  document.body.classList.remove("rn-raceday","rn-countdown","rn-live","rn-sunday","rn-monday");
  document.body.classList.add("rn-active","rn-"+league,"rn-"+mode);
  p.classList.toggle("is-live",mode==="live");
  p.classList.toggle("is-countdown",mode==="countdown");

  text("rnSeries",seriesName(league));
  text("rnBoardSeries",league.toUpperCase());
  text("rnWeek","WEEK "+race.week);
  text("rnCar",race.car);
  text("rnLaps",race.laps+" LAPS");
  text("rnTrack",race.track);
  text("rnCrawlTrack",race.track+" • WEEK "+race.week+" • "+race.car+" • "+race.laps+" LAPS");
  const preview=document.getElementById("rnPreview");
  if(preview)preview.href="race-preview/?league="+league;

  const green=START_HOUR*3600+START_MINUTE*60;
  const sec=secondsSinceMidnight(today.parts);
  if(mode==="raceday"){
    const remaining=green-sec,[h,m,s]=hms(remaining);
    text("rnPhaseLabel","RACE DAY");
    text("rnHeadline",league==="sunday"?"SUNDAY IS RACE DAY":"MONDAY IS RACE DAY");
    text("rnMessage","Tonight at 8:30 PM Eastern, High Line Racing Network goes green at "+race.track+". Get the preview, check the championship battle, then come back for race-night coverage.");
    text("rnBoardLabel","TIME TO GREEN");
    text("rnLiveText","RACE DAY • GREEN FLAG 8:30 PM ET");
    text("rnCrawlLead","HLRN RACE DAY");
    text("rnHours",h);text("rnMinutes",m);text("rnSeconds",s);
  }else if(mode==="countdown"){
    const remaining=green-sec,[h,m,s]=hms(remaining);
    text("rnPhaseLabel","GREEN FLAG COUNTDOWN");
    text("rnHeadline","HLRN GOES LIVE IN");
    text("rnMessage",race.track+" is next. The final hour is underway — open the Race Preview, check the standings, and get ready for the green flag.");
    text("rnBoardLabel","COUNTDOWN TO GREEN");
    text("rnLiveText","FINAL HOUR • RACE NIGHT");
    text("rnCrawlLead","GREEN FLAG COUNTDOWN");
    text("rnHours",h);text("rnMinutes",m);text("rnSeconds",s);
  }else{
    text("rnPhaseLabel","HLRN IS LIVE");
    text("rnHeadline","HLRN IS LIVE");
    text("rnMessage",seriesName(league)+" is in its race-night window at "+race.track+". Watch the broadcast or open the Live Race Center for race-night information.");
    text("rnBoardLabel","RACE STATUS");
    text("rnLiveText","● LIVE RACE WINDOW");
    text("rnCrawlLead","HLRN IS LIVE");
    text("rnHours","LIVE");text("rnMinutes","NOW");text("rnSeconds","●");
  }
  syncLeader(league);
}
function clear(){
  document.body.classList.remove("rn-active","rn-raceday","rn-countdown","rn-live","rn-sunday","rn-monday");
}
function update(){
  const now=new Date();
  const today=raceForToday(now);
  if(!today){clear();lastMode="";return}
  const mode=phaseFor(today);
  if(mode==="off"){clear();lastMode="";return}
  apply(today,mode);
  lastMode=today.league+"-"+mode+"-"+today.race.week;
}
function start(){
  ensurePanel();
  update();
  timer=setInterval(update,1000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")update()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();