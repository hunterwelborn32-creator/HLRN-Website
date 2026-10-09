(function(){
"use strict";

const TZ="America/New_York";
const SERIES={
  sunday:{
    key:"sunday",label:"Sunday Night League",short:"Sunday Night",dow:0,hour:20,minute:30,
    network:"High Line Racing Network",broadcaster:"Tommy Rogers",
    channelUrl:"https://www.youtube.com/@High_Line_Racing"
  },
  monday:{
    key:"monday",label:"Monday Night League",short:"Monday Night",dow:1,hour:20,minute:30,
    network:"RSI Broadcasting",broadcaster:"Randy Schweitzer",channelId:"UC135wLYabc9eh_JpnaiIY4w",
    channelUrl:"https://www.youtube.com/@rsibroadcasting",uploads:"UU135wLYabc9eh_JpnaiIY4w"
  }
};

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function zonedParts(date){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",
    hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
  }).formatToParts(date).reduce((a,p)=>(a[p.type]=p.value,a),{});
  const map={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
  return {y:+parts.year,m:+parts.month,d:+parts.day,dow:map[parts.weekday],h:+parts.hour,min:+parts.minute,s:+parts.second};
}
function zonedToUtc(y,m,d,h,min){
  const guess=Date.UTC(y,m-1,d,h,min,0);
  const p=zonedParts(new Date(guess));
  const asUtc=Date.UTC(p.y,p.m-1,p.d,p.h,p.min,p.s||0);
  return new Date(guess-(asUtc-guess));
}
function addLocalDays(baseParts,days){
  const dt=new Date(Date.UTC(baseParts.y,baseParts.m-1,baseParts.d+days,12,0,0));
  return {y:dt.getUTCFullYear(),m:dt.getUTCMonth()+1,d:dt.getUTCDate(),dow:dt.getUTCDay()};
}
function eventCandidates(){
  const now=new Date(), p=zonedParts(now), items=[];
  Object.values(SERIES).forEach(s=>{
    for(let delta=-7;delta<=8;delta++){
      const day=addLocalDays(p,delta);
      if(day.dow!==s.dow) continue;
      items.push({series:s,time:zonedToUtc(day.y,day.m,day.d,s.hour,s.minute)});
    }
  });
  return items.sort((a,b)=>a.time-b.time);
}
function currentAndNext(){
  const now=Date.now(), events=eventCandidates();
  let current=null,next=null;
  for(const e of events){
    const start=e.time.getTime()-15*60000;
    const end=e.time.getTime()+4*60*60000;
    if(now>=start&&now<=end) current=e;
    if(!next&&e.time.getTime()>now) next=e;
  }
  return {current,next};
}
function fmtEvent(date){
  return new Intl.DateTimeFormat("en-US",{timeZone:TZ,weekday:"long",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(date);
}
function pad(n){return String(Math.max(0,n)).padStart(2,"0")}
function setCountdown(target){
  const diff=Math.max(0,target.getTime()-Date.now());
  const days=Math.floor(diff/86400000);
  const hours=Math.floor(diff%86400000/3600000);
  const mins=Math.floor(diff%3600000/60000);
  const secs=Math.floor(diff%60000/1000);
  const vals={days,hours,mins,secs};
  Object.entries(vals).forEach(([k,v])=>{const el=document.querySelector('[data-count="'+k+'"]');if(el)el.textContent=pad(v)});
}
let broadcastData={sunday:null};
let latestRace={sunday:null,monday:null};

function buildLatestRace(snapshot,league){
  const rows=Array.isArray(snapshot?.leagues?.[league]?.results)?snapshot.leagues[league].results:[];
  const races=new Map();
  rows.forEach(row=>{
    const race=Number(row?.raceNumber);
    if(!Number.isFinite(race)||race<=0)return;
    if(!races.has(race)){
      races.set(race,{race,track:String(row?.track||""),date:row?.date||""});
    }
  });
  const list=[...races.values()].sort((a,b)=>b.race-a.race);
  return list[0]||null;
}
function raceResultsUrl(league){
  const race=latestRace[league];
  return race
    ? "../results/?league="+encodeURIComponent(league)+"&race="+encodeURIComponent(race.race)+"#raceReportView"
    : "../results/?league="+encodeURIComponent(league);
}


function sundayReplay(){
  return broadcastData.sunday&&broadcastData.sunday.latestReplay||null;
}
function sundayChannelId(){
  return broadcastData.sunday&&broadcastData.sunday.channelId||null;
}
function playerUrl(s,live){
  if(s.key==="sunday"){
    const channelId=sundayChannelId();
    const replay=sundayReplay();
    if(live&&channelId)return "https://www.youtube.com/embed/live_stream?channel="+encodeURIComponent(channelId)+"&autoplay=0&rel=0";
    if(replay&&replay.videoId)return "https://www.youtube.com/embed/"+encodeURIComponent(replay.videoId)+"?rel=0";
    return "";
  }
  return live
    ? "https://www.youtube.com/embed/live_stream?channel="+encodeURIComponent(s.channelId)+"&autoplay=0&rel=0"
    : "https://www.youtube.com/embed/videoseries?list="+encodeURIComponent(s.uploads)+"&rel=0";
}
function replayUrl(s){
  if(s.key==="sunday"){
    const replay=sundayReplay();
    return replay&&replay.videoId?"https://www.youtube.com/embed/"+encodeURIComponent(replay.videoId)+"?rel=0":"";
  }
  return "https://www.youtube.com/embed/videoseries?list="+encodeURIComponent(s.uploads)+"&rel=0";
}
function showFrame(frame,url,fallback){
  if(!frame)return;
  if(url){
    frame.hidden=false;
    if(frame.dataset.src!==url){frame.src=url;frame.dataset.src=url}
    if(fallback)fallback.hidden=true;
  }else{
    frame.removeAttribute("src");
    frame.dataset.src="";
    frame.hidden=true;
    if(fallback)fallback.hidden=false;
  }
}

let active="sunday";

function render(){
  const state=currentAndNext();
  const q=new URLSearchParams(location.search).get("league");
  if(q&&SERIES[q]) active=q;
  else if(state.current) active=state.current.series.key;
  else if(state.next) active=state.next.series.key;

  const s=SERIES[active];
  const isLive=!!(state.current&&state.current.series.key===active);
  const main=$("#bcMainPlayer");
  const mainFallback=$("#bcSundayMainFallback");
  const desired=playerUrl(s,isLive);
  if(s.key==="sunday"){
    showFrame(main,desired,mainFallback);
  }else{
    if(mainFallback)mainFallback.hidden=true;
    showFrame(main,desired,null);
  }
  if(main)main.title=(s.key==="sunday"&&!isLive?"Previous ":"Latest ")+s.label+" broadcast";

  $$(".bc-tab").forEach(btn=>btn.classList.toggle("active",btn.dataset.series===active));
  const pStatus=$("#bcPlayerStatus");
  const pSub=$("#bcPlayerSub");
  const pTitle=$("#bcPlayerTitle");
  const pDesc=$("#bcPlayerDesc");
  const yt=$("#bcYoutubeLink");
  const resultsLink=$("#bcResultsLink");
  if(pStatus)pStatus.textContent=s.key==="sunday"?(isLive?"SUNDAY RACE NIGHT":"PREVIOUS SUNDAY RACE"):(isLive?"ON AIR":"LATEST REPLAYS");
  if(pSub)pSub.textContent=s.key==="sunday"?"Official High Line Racing YouTube uploads":"Most recent uploads from the broadcast channel";
  if(pTitle){
    const replay=sundayReplay();
    pTitle.textContent=s.key==="sunday"&&replay&&replay.title?replay.title:(s.label+" • "+s.broadcaster);
  }
  if(pDesc)pDesc.textContent=s.key==="sunday"
    ? "Previous Sunday coverage from the official High Line Racing YouTube channel • Sunday Night League • 8:30 PM ET."
    : (isLive?"Watch the scheduled live race broadcast. ":"Catch up on recent HLRN race coverage. ")+s.network+" • 8:30 PM ET.";
  if(yt){yt.href=s.channelUrl;yt.textContent="OPEN "+(active==="sunday"?"HLRN":"RSI")+" YOUTUBE ↗"}
  if(resultsLink){
    const race=latestRace[active];
    resultsLink.href=raceResultsUrl(active);
    resultsLink.textContent=race
      ? "RACE "+race.race+" RESULTS →"
      : "LATEST RACE RESULTS →";
  }

  $("[data-results-series]").forEach(link=>{
    const league=link.dataset.resultsSeries;
    const race=latestRace[league];
    link.href=raceResultsUrl(league);
    if(race){
      link.textContent="RACE "+race.race+(race.track?" • "+race.track:"")+" RESULTS →";
    }
  });

  const flag=$("#bcNetworkFlag"), headline=$("#bcNetworkHeadline"), meta=$("#bcNetworkMeta");
  if(state.current){
    if(flag){flag.classList.add("is-live");flag.querySelector("span").textContent="ON AIR"}
    if(headline)headline.textContent=state.current.series.label;
    if(meta)meta.textContent=state.current.series.broadcaster+" • Scheduled race window";
  }else if(state.next){
    if(flag){flag.classList.remove("is-live");flag.querySelector("span").textContent="NEXT BROADCAST"}
    if(headline)headline.textContent=state.next.series.label;
    if(meta)meta.textContent=fmtEvent(state.next.time)+" • "+state.next.series.broadcaster;
    setCountdown(state.next.time);
  }

  Object.values(SERIES).forEach(series=>{
    const card=document.querySelector('[data-upcoming="'+series.key+'"]');
    if(!card)return;
    const next=eventCandidates().find(e=>e.series.key===series.key&&e.time.getTime()>Date.now()-15*60000);
    const dateEl=card.querySelector("[data-next-date]");
    const countEl=card.querySelector("[data-next-count]");
    if(next&&dateEl)dateEl.textContent=fmtEvent(next.time);
    if(next&&countEl){
      const diff=next.time.getTime()-Date.now();
      if(diff<=0&&diff>-4*3600000)countEl.textContent="RACE WINDOW OPEN";
      else{
        const d=Math.max(0,Math.floor(diff/86400000)),h=Math.max(0,Math.floor(diff%86400000/3600000)),m=Math.max(0,Math.floor(diff%3600000/60000));
        countEl.textContent=(d?d+"D ":"")+h+"H "+m+"M";
      }
    }
  });
}

function bind(){
  $$(".bc-tab").forEach(btn=>btn.addEventListener("click",()=>{
    active=btn.dataset.series;
    const u=new URL(location.href);u.searchParams.set("league",active);history.replaceState(null,"",u);
    render();
  }));
  $$(".bc-filter").forEach(btn=>btn.addEventListener("click",()=>{
    const f=btn.dataset.filter;
    $$(".bc-filter").forEach(x=>x.classList.toggle("active",x===btn));
    $$(".bc-person,.bc-replay-card").forEach(card=>{
      const show=f==="all"||card.dataset.series===f;
      card.style.display=show?"":"none";
    });
  }));
}

function refreshReplayFrames(){
  Object.values(SERIES).forEach(s=>{
    const f=document.querySelector('[data-replay-frame="'+s.key+'"]');
    if(!f)return;
    if(s.key==="sunday"){
      const fallback=$("#bcSundayReplayFallback");
      const replay=sundayReplay();
      showFrame(f,replayUrl(s),fallback);
      const title=$("#bcSundayReplayTitle");
      const foot=$("#bcSundayReplayFoot");
      if(title)title.textContent=replay&&replay.title?replay.title:"Sunday Replays";
      if(foot)foot.textContent=replay&&replay.title
        ?"Previous Sunday broadcast from the official High Line Racing YouTube channel."
        :"The latest completed Sunday broadcast will load here automatically.";
    }else{
      showFrame(f,replayUrl(s),null);
    }
  });
}

async function loadBroadcastData(){
  const stamp=Date.now();
  try{
    const [broadcastRes,snapshotRes]=await Promise.all([
      fetch("../data/broadcasts.json?ts="+stamp,{cache:"no-store"}),
      fetch("../data/hlrn.json?ts="+stamp,{cache:"no-store"}).catch(()=>null)
    ]);
    if(!broadcastRes.ok)throw new Error("broadcast data "+broadcastRes.status);
    const data=await broadcastRes.json();
    broadcastData.sunday=data&&data.sunday||null;
    if(snapshotRes?.ok){
      try{
        const snapshot=await snapshotRes.json();
        latestRace.sunday=buildLatestRace(snapshot,"sunday");
        latestRace.monday=buildLatestRace(snapshot,"monday");
      }catch(_){}
    }
  }catch(err){
    console.warn("HLRN broadcast sync not ready",err);
  }
  refreshReplayFrames();
  render();
}


// Optional verified timeline file: /data/replay-moments.json.
// No synthetic times: hidden until a matching replay video and timestamps are published.
async function loadReplayMoments(){
  const status=$("#bcMomentsStatus"),list=$("#bcMomentsList");
  if(!status||!list)return;
  const videoId=sundayReplay()?.videoId;
  try{
    const response=await fetch("../data/replay-moments.json",{cache:"no-store"});
    if(!response.ok)throw new Error("Moments not published");
    const payload=await response.json();
    const entries=Array.isArray(payload?.replays)?payload.replays:[];
    const verified=entries.filter(x=>x&&x.verified===true&&typeof x.videoId==="string"&&/^[A-Za-z0-9_-]{11}$/.test(x.videoId)&&
      (x.league==="monday"||x.league==="sunday")&&
      (x.league!=="sunday"||x.videoId===videoId));
    const moments=verified.flatMap(x=>(Array.isArray(x.moments)?x.moments:[]).filter(m=>
      Number.isInteger(m.seconds)&&m.seconds>=0&&m.seconds<=86400&&typeof m.label==="string"&&m.label.length<=100
    ).map(m=>({league:x.league,videoId:x.videoId,seconds:m.seconds,label:m.label}))).slice(0,24);
    if(!moments.length)throw new Error("No verified moments");
    list.replaceChildren(...moments.map(m=>{
      const a=document.createElement("a");a.className="bc-moment";a.target="_blank";a.rel="noopener noreferrer";
      a.href="https://www.youtube.com/watch?v="+encodeURIComponent(m.videoId)+"&t="+m.seconds+"s";
      const sm=document.createElement("small");sm.textContent=m.league.toUpperCase()+" • REPLAY";
      const b=document.createElement("strong");b.textContent=m.label;
      const time=document.createElement("span");time.textContent="WATCH FROM "+Math.floor(m.seconds/60)+":"+String(m.seconds%60).padStart(2,"0")+" →";
      a.append(sm,b,time);return a;
    }));
    status.textContent="Jump to verified moments in the saved broadcasts.";
  }catch(_){
    list.replaceChildren();
    status.textContent="No verified highlight timestamps yet. Watch the latest Sunday or Monday replay above; moments will appear when broadcast times are synchronized.";
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  bind();refreshReplayFrames();render();loadBroadcastData();loadReplayMoments();
  setInterval(render,1000);
  setInterval(loadBroadcastData,5*60*1000);
});
})();