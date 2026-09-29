(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};

function pretty(name){
  let s=String(name||"").trim();
  if(s.includes(",")){const p=s.split(",");const last=(p.shift()||"").trim().replace(/\d+$/,"");s=(p.join(" ").trim()+" "+last).trim();}
  return s.replace(/(\p{L})\d+$/u,"$1").trim();
}
function shortDate(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "";
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"America/New_York"}).format(d).toUpperCase();
}
function setText(id,value){const el=$(id);if(el)el.textContent=value}

async function json(url){
  const res=await fetch(url+(url.includes("?")?"&":"?")+"v="+Date.now(),{cache:"no-store"});
  if(!res.ok)throw new Error("HTTP "+res.status);
  return res.json();
}

function renderStandings(snapshot){
  for(const key of ["sunday","monday"]){
    const rows=[...(snapshot?.leagues?.[key]?.drivers||[])].sort((a,b)=>num(a.rank,999)-num(b.rank,999)||num(b.points)-num(a.points));
    const leader=rows[0];
    if(!leader)continue;
    setText(key==="sunday"?"nrSundayLeader":"nrMondayLeader",pretty(leader.driver));
    setText(key==="sunday"?"nrSundayMeta":"nrMondayMeta","P1 • "+num(leader.points)+" PTS");
  }
}

function renderLead(recap){
  if(!recap)return;
  const winner=recap.winner||{};
  const series=String(recap.series||"HLRN").toUpperCase();
  const track=recap.track||"HLRN Race";
  setText("nrLeadTag","POST-RACE • "+series);
  setText("nrLeadTitle",(winner.name?winner.name+" WINS AT ":"FINAL FROM ")+track);
  setText("nrLeadExcerpt",winner.name
    ? "The checkered flag is down. "+winner.name+" is the recorded winner as HLRN preserves the complete post-race record from "+track+"."
    : "The latest HLRN race has been frozen and published to the permanent race archive.");
  setText("nrLeadDate",recap.displayDate||shortDate(recap.raceFrozenAt));
  setText("nrLeadSeries",series);
  setText("nrLeadStats",
    [recap.completedLapsCaptured!=null?recap.completedLapsCaptured+" laps saved":null,
     recap.cautions!=null?recap.cautions+" cautions":null,
     recap.leadChanges!=null?recap.leadChanges+" lead changes":null].filter(Boolean).join(" • "));
  const link=$("nrLeadLink"); if(link)link.href=recap.url||"race-recaps/";
}

async function load(){
  try{
    const recapIndex=await json("../data/race-recaps/index.json");
    const recaps=Array.isArray(recapIndex?.recaps)?recapIndex.recaps:[];
    if(recaps.length)renderLead(recaps[0]);
    setText("nrRecapCount",recaps.length?recaps.length+" PUBLISHED":"READY");
  }catch(err){
    console.warn("HLRN Newsroom recap lead:",err);
    setText("nrRecapCount","ARCHIVE READY");
  }

  if(window.HLRNData){
    try{
      const snapshot=await HLRNData.load();
      renderStandings(snapshot);
      if(snapshot?.generatedAt){
        setText("nrUpdated","UPDATED "+new Date(snapshot.generatedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}).toUpperCase());
      }
    }catch(err){console.warn("HLRN Newsroom standings:",err)}
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});else load();
})();