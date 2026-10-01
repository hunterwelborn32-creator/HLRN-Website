(function(){
"use strict";

if(window.__HLRN_NETWORK_UPGRADES__) return;
window.__HLRN_NETWORK_UPGRADES__=true;

function ready(fn){
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn,{once:true});
  else fn();
}

ready(async function(){
  const self=[...document.scripts].slice().reverse().find(s=>/\/network-upgrades\.js(?:\?|$)/i.test(s.src||""));
  let root;
  try{root=new URL("../",self&&self.src?self.src:location.href);}catch(e){root=new URL("/",location.origin);}
  const url=(p="")=>new URL(p,root).href;
  const route=document.documentElement.dataset.hlrnRoute||((location.pathname.split("/").filter(Boolean)[0]||"home").toLowerCase());

  const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const canon=(v)=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const displayDriverName=(name)=>{
    let s=String(name||"").trim();
    if(s.includes(",")){
      const parts=s.split(",");
      const last=(parts.shift()||"").trim();
      const first=parts.join(" ").trim();
      s=(first+" "+last).trim();
    }
    return s;
  };
  const RACE_TIME_ZONE="America/New_York";
  const LIVE_STATE_URL="https://hlrn-live-feed.onrender.com/api/state";
  const NETWORK_CONTROL_URL="https://raw.githubusercontent.com/HunterWelborn32-creator/HLRN-Website/main/data/network-control.json";

  function easternParts(date=new Date()){
    const parts=new Intl.DateTimeFormat("en-US",{
      timeZone:RACE_TIME_ZONE,
      year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",second:"2-digit",
      hourCycle:"h23"
    }).formatToParts(date);
    const out={};
    parts.forEach(p=>{if(p.type!=="literal")out[p.type]=p.value;});
    return {
      year:Number(out.year||0),month:Number(out.month||0),day:Number(out.day||0),
      hour:Number(out.hour||0),minute:Number(out.minute||0),second:Number(out.second||0)
    };
  }
  function easternNow(){
    const p=easternParts();
    const dateKey=`${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`;
    return {...p,dateKey,minutes:p.hour*60+p.minute};
  }
  const localDateKey=()=>easternNow().dateKey;
  const humanDate=(key)=>{
    if(!key) return "TBA";
    try{return new Date(key+"T12:00:00").toLocaleDateString("en-US",{timeZone:RACE_TIME_ZONE,month:"short",day:"numeric"}).toUpperCase();}
    catch(e){return key;}
  };
  function dateSerial(key){
    const m=String(key||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])):0;
  }
  function dayDiff(fromKey,toKey){
    const a=dateSerial(fromKey),b=dateSerial(toKey);
    return a&&b?Math.round((b-a)/86400000):0;
  }

  const memoryCache=new Map();
  async function cachedJSON(cacheKey,href,ttlMs){
    const now=Date.now();
    const mem=memoryCache.get(cacheKey);
    if(mem&&now-mem.at<ttlMs) return mem.value;
    try{
      const raw=sessionStorage.getItem("hlrn_nx_cache_"+cacheKey);
      if(raw){
        const saved=JSON.parse(raw);
        if(saved&&now-Number(saved.at||0)<ttlMs&&saved.value){
          memoryCache.set(cacheKey,{at:Number(saved.at),value:saved.value});
          return saved.value;
        }
      }
    }catch(e){}
    try{
      const r=await fetch(href,{cache:"default"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      const value=await r.json();
      memoryCache.set(cacheKey,{at:now,value});
      try{sessionStorage.setItem("hlrn_nx_cache_"+cacheKey,JSON.stringify({at:now,value}));}catch(e){}
      return value;
    }catch(e){
      return mem?.value||null;
    }
  }

  let schedulesPromise=null;
  let dataPromise=null;
  function loadSchedules(){
    if(!schedulesPromise) schedulesPromise=cachedJSON("schedule_2026",url("data/schedules-2026.json?v=20261001nx3"),6*60*60*1000);
    return schedulesPromise;
  }
  function loadData(){
    if(!dataPromise){
      dataPromise=cachedJSON("hlrn_data",url("data/hlrn.json?v=20261001nx3"),60*1000);
      setTimeout(()=>{dataPromise=null},65*1000);
    }
    return dataPromise;
  }

  function raceContext(items,series){
    const now=easternNow();
    const races=(Array.isArray(items)?items:[]).filter(x=>x&&!x.off&&x.date).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const today=races.find(x=>x.date===now.dateKey)||null;
    const future=races.find(x=>x.date>now.dateKey)||null;
    const past=races.filter(x=>x.date<now.dateKey).pop()||null;
    const race=today||future||past||null;
    if(!race) return {series,race:null,mode:"schedule",label:"SCHEDULE",days:0,isToday:false};
    let mode="next",label="NEXT RACE",days=dayDiff(now.dateKey,race.date),isToday=!!today;
    if(today){
      if(now.minutes<17*60){mode="race-day";label="RACE DAY";}
      else if(now.minutes<20*60){mode="pre-race";label="PRE-RACE";}
      else if(now.minutes<20*60+30){mode="grid";label="GRID OPEN";}
      else {mode="race-window";label="RACE WINDOW";}
    }else if(future){
      if(days===1){mode="tomorrow";label="TOMORROW";}
      else if(days>1&&days<=4){mode="race-week";label=days+" DAYS";}
      else if(days>4&&days<=7){mode="race-week";label="RACE WEEK";}
      else{mode="next";label=race.week?"WEEK "+race.week:"NEXT RACE";}
    }else{
      mode="final";label="FINAL";
    }
    return {series,race,mode,label,days,isToday,now};
  }

  function nextRace(items){
    return raceContext(items,"").race;
  }
  function raceStateLabel(race){
    return raceContext(race?[race]:[],"").label;
  }

  function raceSeriesTitle(series){return series==="monday"?"MONDAY NIGHT":"SUNDAY NIGHT";}

  function applyLiveProbe(ctxs,live){
    if(!live||typeof live!=="object") return ctxs;
    const active=ctxs.find(x=>x.isToday);
    if(!active) return ctxs;
    const phase=canon(live.phase||live.sessionName||live.sessionState||"");
    const flag=canon(live.flag||"");
    const hasCars=Number(live.driverCount||0)>0||Array.isArray(live.drivers)&&live.drivers.length>0;
    const online=live.online!==false&&(hasCars||phase.includes("race")||phase.includes("qual")||phase.includes("practice"));
    const complete=!!live.raceFrozen||phase.includes("final")||phase.includes("complete")||flag.includes("checkered");
    if(complete){active.mode="final";active.label="FINAL";}
    else if(online){
      if(phase.includes("practice")){active.mode="practice";active.label="PRACTICE LIVE";}
      else if(phase.includes("qual")){active.mode="qualifying";active.label="QUALIFYING LIVE";}
      else{active.mode="live";active.label="LIVE NOW";}
    }
    active.live=live;
    return ctxs;
  }

  async function probeLiveState(){
    const ctrl=("AbortController" in window)?new AbortController():null;
    const timer=ctrl?setTimeout(()=>ctrl.abort(),4200):0;
    try{
      const r=await fetch(LIVE_STATE_URL,{cache:"no-store",signal:ctrl?.signal});
      if(!r.ok) return null;
      return await r.json();
    }catch(e){return null;}
    finally{if(timer)clearTimeout(timer);}
  }

  async function probeNetworkControl(){
    const ctrl=("AbortController" in window)?new AbortController():null;
    const timer=ctrl?setTimeout(()=>ctrl.abort(),4200):0;
    try{
      const r=await fetch(NETWORK_CONTROL_URL+"?t="+Date.now(),{cache:"no-store",signal:ctrl?.signal});
      if(!r.ok) return null;
      const state=await r.json();
      return state&&typeof state==="object"?state:null;
    }catch(e){return null;}
    finally{if(timer)clearTimeout(timer);}
  }

  function controlLabel(mode){
    return ({
      "race-day":"RACE DAY",
      practice:"PRACTICE LIVE",
      qualifying:"QUALIFYING LIVE",
      live:"RACE MODE ACTIVE",
      checkered:"CHECKERED",
      final:"OFFICIAL FINAL"
    })[mode]||String(mode||"").replace(/-/g," ").toUpperCase();
  }

  function applyNetworkControl(ctxs,control){
    if(!control||control.enabled!==true||!control.mode||control.mode==="auto") return ctxs;
    const series=["sunday","monday"].includes(String(control.series||"").toLowerCase())
      ?String(control.series).toLowerCase()
      :"sunday";
    let active=ctxs.find(x=>x.series===series)||ctxs[0];
    if(!active) return ctxs;
    active.mode=String(control.mode).toLowerCase();
    active.label=controlLabel(active.mode);
    active.manual=true;
    active.control=control;
    active.isToday=true;
    return ctxs;
  }

  function syncNetworkReaction(active,control){
    const manual=!!active?.manual;
    const mode=active?.mode||"schedule";
    const series=active?.series||"";
    const liveish=["live","practice","qualifying"].includes(mode);
    const prominent=manual||liveish||["race-day","checkered","final"].includes(mode);

    let banner=document.getElementById("hlrn-network-mode-banner");
    if(!prominent){
      banner?.remove();
      return;
    }
    if(!banner){
      banner=document.createElement("section");
      banner.id="hlrn-network-mode-banner";
      banner.setAttribute("aria-live","polite");
      const strip=document.getElementById("hlrn-race-weekend-strip");
      (strip||document.getElementById("hlrn-global-nav"))?.insertAdjacentElement("afterend",banner);
    }

    const headline=(manual&&String(control?.headline||"").trim())
      ||(series?raceSeriesTitle(series)+" • ":"")+controlLabel(mode);
    const note=(manual&&String(control?.note||"").trim())
      ||(mode==="checkered"
        ?"Race complete. Official results and standings are under review."
        :mode==="final"
          ?"Official HLRN results are posted."
          :liveish
            ?"Race Center is active with live HLRN timing and race-control data."
            :"HLRN race-day coverage is active.");

    banner.className="mode-"+mode+" "+(series||"")+" "+(manual?"manual":"automatic");
    banner.innerHTML=`
      <div class="nx-network-state"><i></i><span>${manual?"NETWORK CONTROL":"AUTOMATIC NETWORK"}</span></div>
      <strong>${esc(headline)}</strong>
      <span class="nx-network-note">${esc(note)}</span>
      <a href="${mode==="final"?url("results/"):mode==="checkered"?url("live/?section=report"):url("live/")}">${mode==="final"?"OFFICIAL RESULTS":mode==="checkered"?"REVIEW RACE":"RACE CENTER"} →</a>`;

    const homeState=document.getElementById("h9NetworkState");
    if(homeState) homeState.textContent=headline;
    const broadcasterState=document.getElementById("bcNetworkFlag");
    if(broadcasterState) broadcasterState.textContent=liveish?"LIVE":mode==="checkered"?"CHECKERED":mode==="final"?"FINAL":controlLabel(mode);
    const newsLive=document.querySelector("#hlrn-news-network-rail .nx-news-live span");
    if(newsLive) newsLive.textContent=mode==="final"?"OFFICIAL HLRN":mode==="checkered"?"CHECKERED":liveish?"HLRN LIVE":"LATEST HLRN";
  }

  function raceCard(ctx){
    if(!ctx?.race) return "";
    const series=ctx.series;
    const race=ctx.race;
    const title=raceSeriesTitle(series);
    const liveish=["live","practice","qualifying"].includes(ctx.mode);
    const target=liveish?url("live/"):url("results/");
    return `
      <a class="nx-race-week-card ${series} mode-${esc(ctx.mode)}" href="${target}" aria-label="${esc(title)} ${esc(ctx.label)} at ${esc(race.track)}">
        <span class="nx-race-week-status">${liveish?'<i aria-hidden="true"></i>':""}${esc(ctx.label)}</span>
        <span class="nx-race-week-series">${title}</span>
        <strong>${esc(race.track||"TBA")}</strong>
        <span class="nx-race-week-meta">${esc(humanDate(race.date))} • ${esc(race.car||"")} • ${esc(race.laps||"—")} LAPS • 8:30 PM ET</span>
      </a>`;
  }

  function setGlobalRaceMode(ctxs){
    const manual=ctxs.find(x=>x.manual);
    const today=ctxs.find(x=>x.isToday);
    const active=manual||today||ctxs.filter(x=>x.race&&x.race.date>=localDateKey()).sort((a,b)=>dateSerial(a.race.date)-dateSerial(b.race.date))[0]||ctxs[0];
    const mode=active?.mode||"schedule";
    const series=active?.series||"";
    const source=active?.manual?"manual":"automatic";
    document.documentElement.dataset.hlrnRaceMode=mode;
    document.documentElement.dataset.hlrnRaceSeries=series;
    document.documentElement.dataset.hlrnRaceSource=source;
    document.body?.setAttribute("data-hlrn-race-mode",mode);
    document.body?.setAttribute("data-hlrn-race-series",series);
    document.body?.setAttribute("data-hlrn-race-source",source);
    const nav=document.getElementById("hlrn-global-nav");
    if(nav){nav.dataset.raceMode=mode;nav.dataset.raceSeries=series;nav.dataset.raceSource=source;}
    return active;
  }

  async function installRaceWeekend(){
    const nav=document.getElementById("hlrn-global-nav");
    if(!nav) return;
    const sch=await loadSchedules();
    if(!sch?.leagues) return;

    let strip=document.getElementById("hlrn-race-weekend-strip");
    if(!strip){
      strip=document.createElement("section");
      strip.id="hlrn-race-weekend-strip";
      nav.insertAdjacentElement("afterend",strip);
    }

    let liveProbe=null;
    let networkControl=null;
    async function refresh({probe=false}={}){
      let ctxs=[
        raceContext(sch.leagues.sunday,"sunday"),
        raceContext(sch.leagues.monday,"monday")
      ];

      if(probe){
        const [nextLive,nextControl]=await Promise.all([
          ctxs.some(x=>x.isToday)?probeLiveState():Promise.resolve(null),
          probeNetworkControl()
        ]);
        liveProbe=nextLive||liveProbe;
        networkControl=nextControl||networkControl;
      }

      ctxs=applyLiveProbe(ctxs,liveProbe);
      ctxs=applyNetworkControl(ctxs,networkControl);
      const active=setGlobalRaceMode(ctxs);
      const mode=active?.mode||"schedule";
      const manual=!!active?.manual;
      const liveish=["live","practice","qualifying"].includes(mode);
      const networkLabel=manual?"HLRN NETWORK CONTROL":liveish?"HLRN LIVE":"HLRN RACE WEEK";
      const rightLabel=mode==="final"?"OFFICIAL RESULTS":mode==="checkered"?"REVIEW RACE":liveish?"WATCH LIVE":"RACE CENTER";
      const rightHref=mode==="final"?url("results/"):mode==="checkered"?url("live/?section=report"):url("live/");

      strip.className="mode-"+mode+" "+(manual?"manual":"automatic");
      strip.innerHTML=`
        <div class="nx-race-week-label"><i></i><span>${networkLabel}</span><b>${manual?"MANUAL":"AUTO"}</b></div>
        <div class="nx-race-week-cards">${ctxs.map(raceCard).join("")}</div>
        <a class="nx-race-week-live" href="${rightHref}"><i></i><span>${rightLabel}</span></a>`;
      syncNetworkReaction(active,networkControl);
    }

    await refresh({probe:true});
    setInterval(()=>refresh({probe:true}),15000);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh({probe:true})});
  }

  function standingsSeries(){
    const p=location.pathname.toLowerCase();
    if(p.includes("/standings/monday")) return "monday";
    if(p.includes("/standings/sunday")) return "sunday";
    return "";
  }
  function matchDriver(data,name,series){
    const list=data?.leagues?.[series]?.drivers||[];
    const target=canon(name);
    return list.find(d=>canon(displayDriverName(d.driver))===target)
      ||list.find(d=>canon(displayDriverName(d.driver)).includes(target)||target.includes(canon(displayDriverName(d.driver))))
      ||null;
  }

  async function installMobileStandingsCards(){
    const series=standingsSeries();
    if(!series) return;
    const body=document.getElementById("driverBody");
    if(!body) return;
    const sheet=document.createElement("div");
    sheet.id="hlrn-mobile-driver-sheet";
    sheet.setAttribute("aria-hidden","true");
    sheet.innerHTML=`
      <div class="nx-sheet-backdrop" data-close-driver-sheet></div>
      <article class="nx-driver-sheet-card" role="dialog" aria-modal="true" aria-labelledby="nxSheetDriverName">
        <button class="nx-sheet-close" type="button" data-close-driver-sheet aria-label="Close driver stats">×</button>
        <div class="nx-sheet-series ${series}">${series==="monday"?"MONDAY NIGHT":"SUNDAY NIGHT"} • QUICK CARD</div>
        <div class="nx-sheet-identity">
          <div class="nx-sheet-photo"></div>
          <div><span class="nx-sheet-rank"></span><h2 id="nxSheetDriverName"></h2><p class="nx-sheet-team"></p></div>
        </div>
        <div class="nx-sheet-stats"></div>
        <div class="nx-sheet-actions"><a class="nx-sheet-profile" href="#">FULL DRIVER PROFILE</a><button type="button" data-close-driver-sheet>CLOSE</button></div>
      </article>`;
    document.body.appendChild(sheet);

    function close(){
      sheet.classList.remove("open");
      sheet.setAttribute("aria-hidden","true");
      document.body.classList.remove("nx-sheet-open");
    }
    sheet.querySelectorAll("[data-close-driver-sheet]").forEach(el=>el.addEventListener("click",close));
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheet.classList.contains("open"))close();});

    body.addEventListener("click",async e=>{
      if(!window.matchMedia("(max-width:900px)").matches) return;
      if(e.target.closest("button,input,select,textarea")) return;
      const profileTap=e.target.closest(".hlrn-driver-profile-link");
      if(e.target.closest("a")&&!profileTap) return;
      if(profileTap) e.preventDefault();
      const row=e.target.closest("tr");
      if(!row||row.querySelector(".message")) return;
      const name=row.querySelector(".hlrn-driver-profile-name")?.textContent?.trim()||row.querySelector(".name-col")?.innerText?.trim()||"";
      if(!name) return;
      const data=await loadData();
      const d=matchDriver(data,name,series);
      const profile=row.querySelector(".hlrn-driver-profile-link")?.getAttribute("href")||url("drivers/");
      const img=row.querySelector(".name-col img")?.getAttribute("src")||"";
      const shown=d?displayDriverName(d.driver):name;
      const stats=[
        ["Points",d?.points],
        ["Wins",d?.wins],
        ["Top 5",d?.top5],
        ["Top 10",d?.top10],
        ["Avg Finish",d?.avgFinish!=null?Number(d.avgFinish).toFixed(2):null],
        ["Avg Rating",d?.avgRating!=null?Number(d.avgRating).toFixed(1):null],
        ["Laps Led",d?.lapsLed],
        ["Incidents",d?.incidents],
        ["Poles",d?.poles],
        ["Stage Wins",d?.stageWins],
        ["Starts",d?.starts],
        ["Stage Pts",d?.stagePoints]
      ];
      sheet.querySelector(".nx-sheet-photo").innerHTML=img?`<img src="${esc(img)}" alt="">`:`<span>${esc(shown.slice(0,2).toUpperCase())}</span>`;
      sheet.querySelector(".nx-sheet-rank").textContent=d?.rank?("P"+d.rank+" IN CHAMPIONSHIP"):"DRIVER";
      sheet.querySelector("#nxSheetDriverName").textContent=shown;
      sheet.querySelector(".nx-sheet-team").textContent=(d?.team||"Independent")+" • "+(d?.starts??"—")+" starts";
      sheet.querySelector(".nx-sheet-stats").innerHTML=stats.map(([k,v])=>`<div><small>${esc(k)}</small><strong>${esc(v??"—")}</strong></div>`).join("");
      sheet.querySelector(".nx-sheet-profile").href=profile;
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden","false");
      document.body.classList.add("nx-sheet-open");
    });

    const hint=document.querySelector("#drivers .hlrn-mobile-scroll-hint");
    if(hint) hint.textContent="Tap a driver for Quick Card • Swipe for full stats";
  }

  async function installHomeRaceHub(){
    if(route!=="home"||document.getElementById("hlrn-home-race-hub")) return;
    const [sch,data]=await Promise.all([loadSchedules(),loadData()]);
    const sunday=nextRace(sch?.leagues?.sunday),monday=nextRace(sch?.leagues?.monday);
    const sunLeader=data?.leagues?.sunday?.drivers?.slice()?.sort((a,b)=>(a.rank||999)-(b.rank||999))[0];
    const monLeader=data?.leagues?.monday?.drivers?.slice()?.sort((a,b)=>(a.rank||999)-(b.rank||999))[0];
    const hub=document.createElement("section");
    hub.id="hlrn-home-race-hub";
    hub.innerHTML=`
      <div class="nx-home-hub-head">
        <div><small>HLRN NETWORK CENTER</small><h2>Race Week <span>Command</span></h2></div>
        <div class="nx-home-hub-actions"><a href="${url("results/")}">FULL SCHEDULE</a><a class="primary" href="${url("live/")}">ENTER RACE CENTER</a></div>
      </div>
      <div class="nx-home-race-grid">
        ${homeRaceBlock("sunday",sunday,sunLeader)}
        ${homeRaceBlock("monday",monday,monLeader)}
      </div>`;
    const strip=document.getElementById("hlrn-race-weekend-strip");
    (strip||document.getElementById("hlrn-global-nav"))?.insertAdjacentElement("afterend",hub);
  }
  function homeRaceBlock(series,race,leader){
    const isMon=series==="monday";
    return `
      <article class="nx-home-race-card ${series}">
        <div class="nx-home-race-top"><span>${isMon?"MONDAY NIGHT":"SUNDAY NIGHT"}</span><b>${esc(raceStateLabel(race))}</b></div>
        <div class="nx-home-race-track">${esc(race?.track||"TBA")}</div>
        <div class="nx-home-race-meta">${esc(humanDate(race?.date||""))} • ${esc(race?.car||"")} • ${esc(race?.laps||"—")} LAPS • 8:30 PM ET</div>
        <div class="nx-home-race-leader"><small>CHAMPIONSHIP LEADER</small><strong>${esc(leader?displayDriverName(leader.driver):"TBA")}</strong><span>${leader?.points??"—"} PTS</span></div>
        <div class="nx-home-race-links"><a href="${url("standings/"+series+".html")}">STANDINGS</a><a href="${url("results/")}">RACE INFO</a></div>
      </article>`;
  }

  async function installNewsNetwork(){
    if(route!=="news"||document.getElementById("hlrn-news-network-rail")) return;
    const sch=await loadSchedules();
    const sunday=nextRace(sch?.leagues?.sunday),monday=nextRace(sch?.leagues?.monday);
    const rail=document.createElement("section");
    rail.id="hlrn-news-network-rail";
    rail.innerHTML=`
      <div class="nx-news-live"><i></i><span>LATEST HLRN</span></div>
      <div class="nx-news-ticker"><b>SUNDAY</b> ${esc(sunday?.track||"TBA")} • ${esc(humanDate(sunday?.date||""))}<span>///</span><b>MONDAY</b> ${esc(monday?.track||"TBA")} • ${esc(humanDate(monday?.date||""))}</div>
      <nav><a href="${url("news/")}">NEWSROOM</a><a href="${url("news/race-recaps/")}">RACE RECAPS</a><a href="${url("live/")}">RACE CENTER</a></nav>`;
    (document.getElementById("hlrn-race-weekend-strip")||document.getElementById("hlrn-global-nav"))?.insertAdjacentElement("afterend",rail);
    document.body.classList.add("hlrn-news-network-upgraded");
    const markLead=()=>{
      const lead=document.querySelector(".nr-desk-card,.nr-lead,.nr-lead-story,.nr-feature,main article");
      if(lead) lead.classList.add("hlrn-network-lead-story");
    };
    markLead(); setTimeout(markLead,400); setTimeout(markLead,1400);
  }

  function installAdminPitPass(){
    if(route!=="meet-the-admins"&&route!=="admins") return;
    const modal=document.getElementById("profileModal");
    const copy=modal?.querySelector(".modal-copy");
    if(!modal||!copy) return;
    if(!copy.querySelector(".nx-admin-pass-head")){
      const head=document.createElement("div");
      head.className="nx-admin-pass-head";
      head.innerHTML='<span>HLRN PIT PASS</span><b>GARAGE • RACE CONTROL • NETWORK</b>';
      const close=copy.querySelector(".close-btn");
      if(close) close.insertAdjacentElement("afterend",head); else copy.prepend(head);
    }
    const rule=copy.querySelector(".profile-rule");
    if(rule&&!copy.querySelector(".nx-admin-access")){
      const access=document.createElement("div");
      access.className="nx-admin-access";
      access.innerHTML='<span>ACTIVE CREDENTIAL</span><span>GARAGE ACCESS</span><span>HLRN OFFICIAL</span><i aria-hidden="true"></i>';
      rule.insertAdjacentElement("afterend",access);
    }
    function syncPass(){
      const name=(document.getElementById("profileName")?.textContent||"HLRN TEAM").trim();
      const num=(document.getElementById("profileCarNumber")?.textContent||"").replace("#","");
      modal.style.setProperty("--nx-pass-number",'"#'+(num||"00")+'"');
      modal.setAttribute("data-pass-name",name);
    }
    new MutationObserver(syncPass).observe(modal,{attributes:true,attributeFilter:["class"]});
    const nm=document.getElementById("profileName");
    if(nm) new MutationObserver(syncPass).observe(nm,{childList:true,subtree:true});
    syncPass();
  }

  function installLiveCommandDeck(){
    if(route!=="live") return;
    const existing=document.getElementById("hlrn-live-network-deck");
    if(existing) existing.remove();
    const page=document.querySelector(".page")||document.querySelector("main")||document.body;
    const deck=document.createElement("section");
    deck.id="hlrn-live-network-deck";
    deck.setAttribute("aria-label","HLRN Race Center 2.0 command deck");
    deck.innerHTML=`
      <div class="nx-live-deck-title">
        <small>HLRN RACE CENTER 2.0</small>
        <strong>RACE COMMAND</strong>
        <span id="nxLiveConn">STANDBY</span>
      </div>
      <div class="nx-live-deck-grid">
        <button data-nx-tab="control"><small>FLAG</small><strong id="nxLiveFlag">OFFLINE</strong></button>
        <button data-nx-tab="race"><small>LAP</small><strong id="nxLiveLap">—</strong></button>
        <button data-nx-tab="race"><small>LEADER</small><strong id="nxLiveLeader">—</strong></button>
        <button data-nx-tab="battles"><small>CLOSEST BATTLE</small><strong id="nxLiveBattle">—</strong></button>
        <button data-nx-tab="control"><small>CAUTION</small><strong id="nxLiveCaution">—</strong></button>
        <button data-nx-tab="control"><small>RESTART</small><strong id="nxLiveRestart">—</strong></button>
        <button data-nx-tab="fastest"><small>FASTEST</small><strong id="nxLiveFast">—</strong></button>
        <button data-nx-tab="timeline"><small>TIME LEFT</small><strong id="nxLiveTime">—</strong></button>
      </div>
      <div class="nx-live-alert">
        <span class="nx-live-alert-kicker"><i></i><b id="nxLiveAlertType">RACE CONTROL</b></span>
        <strong id="nxLiveAlertText">Waiting for the iRacing bridge.</strong>
        <span id="nxLiveAlertMeta">0 CARS • GREEN RUN —</span>
      </div>`;
    page.prepend(deck);

    deck.addEventListener("click",e=>{
      const b=e.target.closest("[data-nx-tab]"); if(!b)return;
      const t=b.dataset.nxTab;
      document.querySelector('.tab[data-tab="'+t+'"]')?.click();
      document.getElementById("tab-"+t)?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    const text=(id)=>document.getElementById(id)?.textContent?.trim()||"—";
    const cleaned=(value)=>String(value||"—").trim().replace(/\s+/g," ");
    let lastSignature="";

    const sync=()=>{
      const flag=text("flag");
      const leader=cleaned(document.getElementById("leaderName")?.innerText);
      const battle=cleaned(text("trackerClosestBattle"));
      const caution=cleaned(text("mrcCaution"));
      const restart=cleaned(text("mrcRestart"));
      const greenRun=cleaned(text("mrcGreenRun"));
      const cars=cleaned(text("carCount"));
      const conn=cleaned(text("socketStatus"));
      const signature=[flag,leader,battle,caution,restart,greenRun,cars,conn,text("lap"),text("bestLap"),text("timeRemaining")].join("|");
      if(signature===lastSignature) return;
      lastSignature=signature;

      document.getElementById("nxLiveFlag").textContent=flag;
      document.getElementById("nxLiveLap").textContent=text("lap");
      document.getElementById("nxLiveLeader").textContent=leader;
      document.getElementById("nxLiveBattle").textContent=battle;
      document.getElementById("nxLiveCaution").textContent=caution;
      document.getElementById("nxLiveRestart").textContent=restart;
      document.getElementById("nxLiveFast").textContent=text("bestLap");
      document.getElementById("nxLiveTime").textContent=text("timeRemaining");
      const c=document.getElementById("nxLiveConn");
      c.textContent=conn+" • "+cars+" CARS";

      const f=canon(flag);
      const connected=/connected|demo/i.test(conn);
      deck.dataset.flag=f;
      deck.dataset.conn=canon(conn);
      let type="RACE CONTROL";
      let message=connected?"Race feed connected. Waiting for green-flag action.":"Waiting for the iRacing bridge.";
      if(f.includes("one to green")){type="ONE TO GREEN";message="Field is preparing for the restart • "+restart;}
      else if(f.includes("caution")||f.includes("yellow")){type="CAUTION";message="Caution "+caution+" • Restart "+restart;}
      else if(f.includes("red")){type="RED FLAG";message="Race Control has stopped the session.";}
      else if(f.includes("checkered")){type="CHECKERED";message="Race complete • Final results are being prepared.";}
      else if(f.includes("green")&&connected){type="GREEN FLAG";message=(leader!=="—"?"Leader: "+leader:"Race is green")+" • "+(battle!=="—"?"Closest battle "+battle:"field running");}
      document.getElementById("nxLiveAlertType").textContent=type;
      document.getElementById("nxLiveAlertText").textContent=message;
      document.getElementById("nxLiveAlertMeta").textContent=cars+" CARS • GREEN RUN "+greenRun;
    };

    sync();
    const observer=new MutationObserver(()=>requestAnimationFrame(sync));
    const watch=document.querySelector(".event-shell")||document.body;
    observer.observe(watch,{subtree:true,childList:true,characterData:true});
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync()});
  }

  async function installDriverProfileCommand(){
    if(route!=="drivers") return;
    if(document.querySelector(".driver-v2-snapshot")){
      document.body.classList.add("hlrn-driver-profile-network");
      return;
    }
    const hero=document.querySelector(".hero");
    const nameEl=hero?.querySelector("h1");
    if(!hero||!nameEl||document.getElementById("hlrn-driver-command")) return;
    const name=nameEl.textContent.trim();
    if(!name) return;
    const data=await loadData();
    const leagues=["sunday","monday","hosted"];
    const found=leagues.map(series=>({series,driver:matchDriver(data,name,series)})).filter(x=>x.driver);
    const command=document.createElement("section");
    command.id="hlrn-driver-command";
    const quick=found.length?found.map(({series,driver:d})=>`
      <a class="nx-driver-command-league ${series}" href="${series==="hosted"?url("standings/hosted.html"):url("standings/"+series+".html")}">
        <small>${series.toUpperCase()} CHAMPIONSHIP</small>
        <strong>P${esc(d.rank??"—")}</strong>
        <span>${esc(d.points??"—")} PTS • ${esc(d.wins??0)} WINS • ${esc(d.top5??0)} TOP 5</span>
      </a>`).join(""):'<div class="nx-driver-command-empty">Current championship data will appear here when available.</div>';
    command.innerHTML=`
      <div class="nx-driver-command-head"><div><small>HLRN DRIVER COMMAND</small><strong>${esc(name)}</strong></div><a href="${url("drivers/")}">ALL DRIVERS</a></div>
      <div class="nx-driver-command-grid">${quick}</div>`;
    hero.insertAdjacentElement("afterend",command);
    document.body.classList.add("hlrn-driver-profile-network");
  }

  function installPerformanceAndMobileAudit(){
    document.documentElement.classList.add("hlrn-mobile-audit-v2","hlrn-performance-v2");

    const tune=()=>{
      const vh=window.innerHeight||800;
      document.querySelectorAll("img").forEach((img,index)=>{
        if(index<3||img.closest("#hlrn-global-nav,.hero,.team-hero,.nr-mast,.event-head")) return;
        const rect=img.getBoundingClientRect();
        if(rect.top>vh*.9){
          if(!img.hasAttribute("loading")) img.loading="lazy";
          if(!img.hasAttribute("decoding")) img.decoding="async";
        }
      });
      document.querySelectorAll("iframe").forEach((frame,index)=>{
        if(index>0&&!frame.hasAttribute("loading")) frame.loading="lazy";
      });
    };

    if("requestIdleCallback" in window) requestIdleCallback(tune,{timeout:1200});
    else setTimeout(tune,250);

    // Keep interactive controls comfortably tappable without rewriting page-specific markup.
    document.querySelectorAll("button,a").forEach(el=>{
      if(el.closest("#hlrn-global-nav,#hlrn-global-footer")) return;
      if(!el.getAttribute("aria-label")&&!el.textContent.trim()&&el.querySelector("svg,img")) el.setAttribute("aria-label","Open");
    });
  }

  // Critical layout/performance layer first; network data modules follow.
  installPerformanceAndMobileAudit();
  installAdminPitPass();
  installLiveCommandDeck();
  await installRaceWeekend();
  await Promise.all([
    installHomeRaceHub(),
    installNewsNetwork(),
    installMobileStandingsCards(),
    installDriverProfileCommand()
  ]);
});
})();