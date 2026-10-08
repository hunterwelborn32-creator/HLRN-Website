
(()=>{
"use strict";
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let allRecaps=[],filter="all";
let raceIndex={sunday:[],monday:[]};

function seriesKey(value){
  const s=String(value||"").toLowerCase();
  if(s.includes("sunday"))return "sunday";
  if(s.includes("monday"))return "monday";
  return "other";
}
function seriesLabel(value){
  const key=seriesKey(value);
  return key==="sunday"?"SUNDAY NIGHT":key==="monday"?"MONDAY NIGHT":"HLRN";
}
function val(value,fallback="—"){
  return value===0||value?String(value):fallback;
}
function dateKey(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "";
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(d);
  const part=type=>parts.find(x=>x.type===type)?.value||"";
  return part("year")+"-"+part("month")+"-"+part("day");
}
function trackKey(value){
  return String(value||"").toLowerCase()
    .replace(/\([^)]*\)/g," ")
    .replace(/\b(international|motor|speedway|superspeedway|raceway|oval)\b/g," ")
    .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function buildRaceIndex(snapshot){
  const out={sunday:[],monday:[]};
  for(const league of ["sunday","monday"]){
    const seen=new Map();
    const rows=Array.isArray(snapshot?.leagues?.[league]?.results)?snapshot.leagues[league].results:[];
    rows.forEach(row=>{
      const race=Number(row?.raceNumber);
      if(!Number.isFinite(race)||race<=0)return;
      if(!seen.has(race)){
        seen.set(race,{
          race,
          track:String(row?.track||""),
          trackKey:trackKey(row?.track),
          dateKey:dateKey(row?.date),
          dateMs:Date.parse(row?.date||"")||0
        });
      }
    });
    out[league]=[...seen.values()];
  }
  return out;
}
function exactResultsUrl(item){
  const league=seriesKey(item?.series);
  if(league!=="sunday"&&league!=="monday")return "";
  const targetTrack=trackKey(item?.track);
  const targetDate=dateKey(item?.raceFrozenAt||item?.publishedAt);
  let candidates=(raceIndex[league]||[]).filter(r=>targetTrack&&r.trackKey===targetTrack);
  if(!candidates.length&&targetTrack){
    candidates=(raceIndex[league]||[]).filter(r=>r.trackKey&&(
      r.trackKey.includes(targetTrack)||targetTrack.includes(r.trackKey)
    ));
  }
  // Prefer a verified race number if the published story includes it.
  const statedRace=Number(item?.raceNumber);
  if(Number.isSafeInteger(statedRace)&&statedRace>0){
    const verified=(raceIndex[league]||[]).find(r=>r.race===statedRace);
    if(verified&&(!targetTrack||verified.trackKey===targetTrack)&&(!targetDate||verified.dateKey===targetDate)){
      return "/results/?league="+league+"&race="+verified.race+"#raceReportView";
    }
  }
  // A matching date and track identify a race; never choose the nearest date.
  if(targetDate){
    const matches=candidates.filter(r=>r.dateKey===targetDate);
    if(matches.length===1)return "/results/?league="+league+"&race="+matches[0].race+"#raceReportView";
    return "";
  }
  if(candidates.length===1)return "/results/?league="+league+"&race="+candidates[0].race+"#raceReportView";
  return "";
}
function resultsUrl(item){
  return exactResultsUrl(item)
    || item?.resultsUrl
    || (item?.slug?"/results/?recap="+encodeURIComponent(item.slug):"/results/");
}
function replayUrl(item){
  const key=seriesKey(item?.series);
  return key==="sunday"||key==="monday"?"/broadcasters/?league="+key:"/broadcasters/";
}
function storyUrl(item){return item?.url||"/news/race-recaps/"}
function stat(value,label,copy){
  return '<div class="nr-recap-stat"><small>'+esc(label)+'</small><b>'+esc(val(value))+'</b><span>'+esc(copy||"")+'</span></div>';
}
function feature(item){
  const mount=$("#nrRecapFeature");
  if(!mount)return;
  if(!item){
    mount.innerHTML='';
    mount.hidden=true;
    return;
  }
  mount.hidden=false;
  const key=seriesKey(item.series),winner=item.winner||{};
  mount.innerHTML=
    '<article class="nr-recap-hero '+esc(key)+'">'+
      '<div><div class="nr-recap-eyebrow"><i></i> LATEST RACE STORY <span class="nr-series-tag '+esc(key)+'">'+esc(seriesLabel(item.series))+'</span></div>'+
      '<h3>'+esc(item.title||((winner.name||"HLRN Winner")+" at "+(item.track||"HLRN Race")))+'</h3>'+
      '<p>'+esc(item.subtitle||"HLRN has preserved the permanent checkered-flag record from this race.")+'</p></div>'+
      '<div><div class="nr-recap-winner"><small>RECORDED WINNER</small><strong>#'+esc(winner.number||"—")+' '+esc(winner.name||"—")+'</strong></div>'+
      '<div class="nr-recap-actions">'+
        '<a class="nr-recap-btn primary" href="'+esc(storyUrl(item))+'">READ STORY →</a>'+
        '<a class="nr-recap-btn" href="'+esc(resultsUrl(item))+'">FULL RESULTS →</a>'+
        '<a class="nr-recap-btn" href="'+esc(replayUrl(item))+'">WATCH REPLAY →</a>'+
      '</div></div>'+
    '</article>'+
    '<aside class="nr-recap-stats">'+
      stat(item.cautions,"Cautions","Frozen race recorder")+
      stat(item.penalties,"Penalties","Black flags / penalties")+
      stat(item.leadChanges,"Lead Changes","Recorded snapshots")+
      stat(item.completedLapsCaptured,"Laps Saved","Completed-lap archive")+
    '</aside>';
}
function card(item){
  const key=seriesKey(item.series),winner=item.winner||{};
  return '<article class="nr-recap-card '+esc(key)+'" data-series="'+esc(key)+'">'+
    '<div class="nr-recap-card-head"><span>'+esc(item.displayDate||"CHECKERED FLAG")+'</span><b class="nr-series-tag '+esc(key)+'">'+esc(seriesLabel(item.series))+'</b></div>'+
    '<div class="nr-recap-card-main">'+
      '<small>'+esc(item.track||"HLRN RACE")+'</small>'+
      '<h3>'+esc(item.title||"HLRN Race Recap")+'</h3>'+
      '<p>'+esc(item.subtitle||"Permanent HLRN post-race record.")+'</p>'+
      '<div class="nr-recap-card-winner"><span>WINNER</span><strong>#'+esc(winner.number||"—")+' '+esc(winner.name||"—")+'</strong></div>'+
      '<div class="nr-recap-card-stats">'+
        '<div><b>'+esc(val(item.cautions))+'</b><span>Cautions</span></div>'+
        '<div><b>'+esc(val(item.penalties))+'</b><span>Penalties</span></div>'+
        '<div><b>'+esc(val(item.leadChanges))+'</b><span>Lead Chg</span></div>'+
      '</div>'+
    '</div>'+
    '<div class="nr-recap-card-actions">'+
      '<a href="'+esc(storyUrl(item))+'">Story →</a>'+
      '<a href="'+esc(resultsUrl(item))+'">Results →</a>'+
      '<a href="'+esc(replayUrl(item))+'">Replay →</a>'+
    '</div>'+
  '</article>';
}
function render(){
  const shown=filter==="all"?allRecaps:allRecaps.filter(x=>seriesKey(x.series)===filter);
  const grid=$("#nrRecapGrid"),count=$("#nrRecapFilterCount");
  if(count)count.textContent=shown.length?shown.length+" PUBLISHED RECAP"+(shown.length===1?"":"S"):"";
  if(grid){
    grid.innerHTML=shown.length?shown.map(card).join(""):"";
    grid.hidden=!shown.length;
  }
  $$(".nr-recap-filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
}
async function load(){
  const featureMount=$("#nrRecapFeature"),grid=$("#nrRecapGrid");
  try{
    const stamp=Date.now();
    const [recapRes,snapshotRes]=await Promise.all([
      fetch("/data/race-recaps/index.json?v="+stamp,{cache:"no-store"}),
      fetch("/data/hlrn.json?v="+stamp,{cache:"no-store"}).catch(()=>null)
    ]);
    if(!recapRes.ok)throw new Error("recap index "+recapRes.status);
    const data=await recapRes.json();
    if(snapshotRes?.ok){
      try{raceIndex=buildRaceIndex(await snapshotRes.json())}catch(_){}
    }
    allRecaps=Array.isArray(data?.recaps)?data.recaps:[];
    feature(allRecaps[0]||null);
    render();
  }catch(err){
    console.warn("HLRN recap center",err);
    if(featureMount)featureMount.innerHTML='<div class="nr-recap-empty">The permanent recap archive is temporarily unavailable.</div>';
    if(grid)grid.innerHTML='<div class="nr-recap-empty">Unable to load race recaps right now.</div>';
  }
}
function bind(){
  $$(".nr-recap-filter").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.filter;render()}));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{bind();load()},{once:true});
else{bind();load()}
})();
