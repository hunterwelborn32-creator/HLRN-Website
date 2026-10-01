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
  const localDateKey=(d=new Date())=>{
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };
  const humanDate=(key)=>{
    try{return new Date(key+"T12:00:00").toLocaleDateString([], {month:"short",day:"numeric"}).toUpperCase();}
    catch(e){return key;}
  };

  let schedulesPromise=null;
  let dataPromise=null;
  function loadSchedules(){
    if(!schedulesPromise) schedulesPromise=fetch(url("data/schedules-2026.json?v=20261001nx1"),{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null);
    return schedulesPromise;
  }
  function loadData(){
    if(!dataPromise) dataPromise=fetch(url("data/hlrn.json?v=20261001nx1"),{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null);
    return dataPromise;
  }

  function nextRace(items){
    const today=localDateKey();
    const races=(Array.isArray(items)?items:[]).filter(x=>x&&!x.off&&x.date);
    return races.find(x=>x.date>=today)||races[races.length-1]||null;
  }
  function raceStateLabel(race){
    if(!race||!race.date) return "SCHEDULE";
    const today=localDateKey();
    if(race.date===today) return "RACE DAY";
    const a=new Date(today+"T12:00:00"),b=new Date(race.date+"T12:00:00");
    const diff=Math.round((b-a)/86400000);
    if(diff===1) return "TOMORROW";
    if(diff>1&&diff<7) return diff+" DAYS";
    return race.week?"WEEK "+race.week:"NEXT";
  }
  function raceCard(league,race){
    if(!race) return "";
    const cls=league==="monday"?"monday":"sunday";
    const title=league==="monday"?"MONDAY NIGHT":"SUNDAY NIGHT";
    return `
      <a class="nx-race-week-card ${cls}" href="${url("results/")}" aria-label="${esc(title)} next race at ${esc(race.track)}">
        <span class="nx-race-week-status">${esc(raceStateLabel(race))}</span>
        <span class="nx-race-week-series">${title}</span>
        <strong>${esc(race.track||"TBA")}</strong>
        <span class="nx-race-week-meta">${esc(humanDate(race.date))} • ${esc(race.car||"")} • 8:30 PM ET</span>
      </a>`;
  }

  async function installRaceWeekend(){
    if(document.getElementById("hlrn-race-weekend-strip")) return;
    const nav=document.getElementById("hlrn-global-nav");
    if(!nav) return;
    const sch=await loadSchedules();
    const sunday=nextRace(sch?.leagues?.sunday);
    const monday=nextRace(sch?.leagues?.monday);
    if(!sunday&&!monday) return;
    const strip=document.createElement("section");
    strip.id="hlrn-race-weekend-strip";
    strip.innerHTML=`
      <div class="nx-race-week-label"><i></i><span>HLRN RACE WEEK</span></div>
      <div class="nx-race-week-cards">${raceCard("sunday",sunday)}${raceCard("monday",monday)}</div>
      <a class="nx-race-week-live" href="${url("live/")}"><i></i><span>RACE CENTER</span></a>`;
    nav.insertAdjacentElement("afterend",strip);
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
      if(e.target.closest("a,button,input,select,textarea")) return;
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
    if(route!=="live"||document.getElementById("hlrn-live-network-deck")) return;
    const page=document.querySelector(".page")||document.querySelector("main")||document.body;
    const deck=document.createElement("section");
    deck.id="hlrn-live-network-deck";
    deck.innerHTML=`
      <div class="nx-live-deck-title"><small>HLRN NETWORK CONTROL</small><strong>RACE COMMAND</strong><span id="nxLiveConn">STANDBY</span></div>
      <div class="nx-live-deck-grid">
        <button data-nx-tab="control"><small>FLAG</small><strong id="nxLiveFlag">OFFLINE</strong></button>
        <button data-nx-tab="race"><small>LAP</small><strong id="nxLiveLap">—</strong></button>
        <button data-nx-tab="race"><small>LEADER</small><strong id="nxLiveLeader">—</strong></button>
        <button data-nx-tab="fastest"><small>FASTEST</small><strong id="nxLiveFast">—</strong></button>
        <button data-nx-tab="battles"><small>FIELD</small><strong id="nxLiveField">—</strong></button>
        <button data-nx-tab="timeline"><small>TIME LEFT</small><strong id="nxLiveTime">—</strong></button>
      </div>`;
    page.prepend(deck);
    deck.addEventListener("click",e=>{
      const b=e.target.closest("[data-nx-tab]"); if(!b)return;
      const t=b.dataset.nxTab;
      document.querySelector('.tab[data-tab="'+t+'"]')?.click();
    });
    const text=(id)=>document.getElementById(id)?.textContent?.trim()||"—";
    const sync=()=>{
      const flag=text("flag");
      document.getElementById("nxLiveFlag").textContent=flag;
      document.getElementById("nxLiveLap").textContent=text("lap");
      document.getElementById("nxLiveLeader").textContent=(document.getElementById("leaderName")?.innerText||"—").trim().replace(/\s+/g," ");
      document.getElementById("nxLiveFast").textContent=text("bestLap");
      document.getElementById("nxLiveField").textContent=text("carCount");
      document.getElementById("nxLiveTime").textContent=text("timeRemaining");
      const conn=text("socketStatus");
      const c=document.getElementById("nxLiveConn"); c.textContent=conn;
      deck.dataset.flag=canon(flag);
      deck.dataset.conn=canon(conn);
    };
    sync(); setInterval(sync,1000);
  }

  async function installDriverProfileCommand(){
    if(route!=="drivers") return;
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

  await installRaceWeekend();
  await Promise.all([
    installHomeRaceHub(),
    installNewsNetwork(),
    installMobileStandingsCards(),
    installDriverProfileCommand()
  ]);
  installAdminPitPass();
  installLiveCommandDeck();
});
})();