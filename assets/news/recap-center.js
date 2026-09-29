
(()=>{
"use strict";
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let allRecaps=[],filter="all";

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
function resultsUrl(item){
  return item?.resultsUrl || (item?.slug?"/results/?recap="+encodeURIComponent(item.slug):"/results/");
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
    mount.innerHTML='<div class="nr-recap-empty">The Latest Race Story will appear here automatically after the next real HLRN race is frozen at checkered and published.</div>';
    return;
  }
  const key=seriesKey(item.series),winner=item.winner||{};
  mount.innerHTML=
    '<article class="nr-recap-hero '+esc(key)+'">'+
      '<div><div class="nr-recap-eyebrow"><i></i> LATEST RACE STORY • '+esc(seriesLabel(item.series))+'</div>'+
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
    '<div class="nr-recap-card-head"><span>'+esc(item.displayDate||"CHECKERED FLAG")+'</span><b>'+esc(seriesLabel(item.series))+'</b></div>'+
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
  if(count)count.textContent=shown.length+" PUBLISHED RECAP"+(shown.length===1?"":"S");
  if(grid)grid.innerHTML=shown.length?shown.map(card).join(""):'<div class="nr-recap-empty">No '+(filter==="all"?"published":filter)+" race recaps are in the permanent archive yet.</div>';
  $$(".nr-recap-filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
}
async function load(){
  const featureMount=$("#nrRecapFeature"),grid=$("#nrRecapGrid");
  try{
    const res=await fetch("/data/race-recaps/index.json?v="+Date.now(),{cache:"no-store"});
    if(!res.ok)throw new Error("recap index "+res.status);
    const data=await res.json();
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
