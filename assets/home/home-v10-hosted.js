/* HLRN Home V10 — latest Hosted race hero card */
(function(){
  "use strict";

  const $=id=>document.getElementById(id);
  const put=(id,value,fallback="--")=>{
    const el=$(id);
    if(!el)return;
    const text=String(value==null?"":value).trim();
    el.textContent=text||fallback;
  };

  const pretty=name=>{
    const raw=String(name||"").trim();
    if(!raw)return "";
    if(raw.includes(",")){
      const parts=raw.split(",");
      const last=(parts.shift()||"").trim().replace(/\d+$/,"");
      const first=parts.join(" ").trim();
      return (first+" "+last).trim();
    }
    return raw.replace(/([A-Za-z])\d+$/,"$1").trim();
  };

  const longDate=value=>{
    const raw=String(value||"").trim();
    if(!raw)return "--";
    let d;
    const slash=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(slash){
      d=new Date(Number(slash[3]),Number(slash[1])-1,Number(slash[2]),12,0,0);
    }else{
      d=new Date(raw);
    }
    if(!Number.isFinite(d.getTime()))return raw.toUpperCase();
    return new Intl.DateTimeFormat("en-US",{
      timeZone:"America/New_York",
      month:"short",
      day:"numeric",
      year:"numeric"
    }).format(d).toUpperCase();
  };

  function winnerPhoto(name){
    const img=$("h10HostedWinnerPhoto");
    if(!img)return;
    img.hidden=true;

    const system=window.HLRNDrivers;
    const src=system?.photoUrl?.(name,"cutout")||"";
    if(!src)return;

    const probe=new Image();
    probe.onload=()=>{
      img.src=src;
      img.alt=pretty(name)+" driver photo";
      img.hidden=false;
    };
    probe.onerror=()=>{
      img.removeAttribute("src");
      img.hidden=true;
    };
    probe.src=src;
  }

  function render(snapshot){
    const latest=snapshot?.hosted?.latest;
    if(!latest)return;

    const rows=Array.isArray(latest.results)?latest.results:[];
    const winnerRow=rows.find(r=>Number(r?.position)===1)||rows[0]||{};
    const winner=pretty(latest.winner||winnerRow.driver||"");

    put("h10HostedWinner",winner,"Hosted Winner");
    put("h10HostedNumber",latest.winnerCarNumber||winnerRow.carNumber);
    put("h10HostedCar",latest.winnerCar||winnerRow.car,"Hosted Race");
    put("h10HostedTrack",latest.track,"Latest Hosted Race");
    put("h10HostedDate",longDate(latest.date));
    put("h10HostedField",rows.length||"");
    put("h10HostedLaps",latest.totalLaps||winnerRow.laps);
    put("h10HostedCautions",latest.cautions);
    put("h10HostedStart",winnerRow.start);
    put("h10HostedLed",winnerRow.lapsLed);
    put("h10HostedIncidents",winnerRow.incidents);

    const link=$("h10HostedWinnerLink");
    if(link){
      const profile=window.HLRNDrivers?.profileUrl?.(winner);
      link.href=profile||"standings/hosted.html";
    }

    winnerPhoto(winner);
  }

  async function load(){
    try{
      if(window.HLRNDrivers?.load)await window.HLRNDrivers.load();
      const snapshot=window.HLRNData
        ? await window.HLRNData.load()
        : await fetch("data/hlrn.json?v="+Date.now(),{cache:"no-store"}).then(r=>{
            if(!r.ok)throw new Error("HLRN data HTTP "+r.status);
            return r.json();
          });
      render(snapshot);
    }catch(err){
      console.warn("HLRN Hosted hero card unavailable",err);
    }
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",load,{once:true});
  }else{
    load();
  }

  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible")load();
  });
})();
