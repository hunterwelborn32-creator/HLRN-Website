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

  const slugify=value=>pretty(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");

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

  function raceVehicle(rows,latest){
    const cars=rows.map(r=>String(r?.car||"")).filter(Boolean);
    const joined=cars.join(" | ").toLowerCase();
    if(cars.length&&cars.every(c=>/truck|silverado|tundra|f150|ram/i.test(c)))return "NASCAR TRUCKS";
    if(/arca/i.test(joined))return "ARCA";
    if(/gen\s*7|next gen/i.test(joined))return "GEN 7";
    if(/gen\s*6/i.test(joined))return "GEN 6";
    return String(latest?.winnerCar||rows[0]?.car||"Hosted Racing")
      .replace(/^NASCAR\s+/i,"")
      .replace(/\s+(Chevrolet|Toyota|Ford|RAM).*$/i,"")
      .trim()
      .toUpperCase() || "HOSTED RACING";
  }

  function winnerPhoto(name,iRating){
    const img=$("h10HostedWinnerPhoto");
    if(!img)return;
    img.hidden=true;

    const system=window.HLRNDrivers;
    const slug=slugify(name);
    // Hosted results often omit the trailing iRacing name suffix (e.g.
    // "John Miles" vs the directory's "John Miles4"). Match photoSlug,
    // display name, or an alias before considering a generated suit.
    const normalized=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]/g,"");
    const key=normalized(name);
    const record=system?.resolve?.(name)
      ||system?.getAll?.().find(rec=>
        normalized(rec.photoSlug)===key||
        normalized(rec.displayName)===key||
        normalized(rec.rawName)===key||
        (rec.aliases||[]).some(alias=>normalized(alias)===key)
      );
    const actualName=record?.rawName||record?.name||name;
    img.dataset.hlrnDriverName=actualName;
    if(Number(iRating)>0)img.dataset.hlrnIRating=String(iRating);
    else delete img.dataset.hlrnIRating;
    delete img.dataset.hlrnTierFallback;

    const photoSlug=record?.hasPhoto!==false&&record?.photoSlug
      ?String(record.photoSlug).trim():slug;
    const real=record?.hasPhoto===false?"":(
      photoSlug?"assets/driver-photos/cutout/"+encodeURIComponent(photoSlug)+".webp":""
    );
    const explicit=system?.resolve?.(actualName);
    const manifestReal=explicit?.hasPhoto!==false&&explicit?.photoSlug
      ?"assets/driver-photos/cutout/"+encodeURIComponent(explicit.photoSlug)+".webp":"";
    const tier=system?.iRatingFallbackPhoto?.(
      system?.verifiedIRating?.(record||actualName,iRating)||iRating
    )||"";
    // Never place an iRating fallback ahead of an existing real photograph.
    const candidates=[manifestReal,real,tier].filter((src,i,list)=>src&&list.indexOf(src)===i);

    let index=0;
    const tryNext=()=>{
      if(index>=candidates.length){
        img.removeAttribute("src");
        img.hidden=true;
        return;
      }
      const src=candidates[index++];
      const probe=new Image();
      probe.onload=()=>{
        img.src=src;
        img.alt=pretty(name)+" driver photo";
        img.hidden=false;
      };
      probe.onerror=tryNext;
      probe.src=src;
    };
    tryNext();
  }

  function render(snapshot){
    const latest=snapshot?.hosted?.latest;
    if(!latest)return;

    const rows=Array.isArray(latest.results)?latest.results:[];
    const winnerRow=rows.find(r=>Number(r?.position)===1)||rows[0]||{};
    const winner=pretty(latest.winner||winnerRow.driver||"");

    put("h10HostedTrack",latest.track,"Latest Hosted Race");
    put("h10HostedDate",longDate(latest.date));
    put("h10HostedVehicle",raceVehicle(rows,latest),"Hosted Racing");
    put("h10HostedField",rows.length||"");
    put("h10HostedLaps",latest.totalLaps||winnerRow.laps);
    put("h10HostedCautions",latest.cautions);
    put("h10HostedTotalIncidents",latest.totalIncidents);

    put("h10HostedWinner",winner,"Hosted Winner");
    put("h10HostedNumber",latest.winnerCarNumber||winnerRow.carNumber);

    const link=$("h10HostedWinnerLink");
    if(link){
      const profile=window.HLRNDrivers?.profileUrl?.(winner);
      link.href=profile||"standings/hosted.html";
      link.setAttribute("aria-label",winner ? "Open "+winner+" driver profile" : "Open Hosted standings");
    }

    winnerPhoto(winner,winnerRow.iRating??winnerRow.irating);
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
