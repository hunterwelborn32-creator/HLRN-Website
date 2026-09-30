(function(){
"use strict";

/* HLRN shared theme foundation.
   Light is the current default. The API is ready for a future Night Mode control. */
const HLRN_THEME_KEY="hlrn_site_theme_v2";

function normalizeTheme(value){
  return String(value||"").toLowerCase()==="dark" ? "dark" : "light";
}

function readTheme(){
  try{return normalizeTheme(localStorage.getItem(HLRN_THEME_KEY)||"light");}
  catch(e){return "light";}
}

function applyTheme(value,{persist=false}={}){
  const theme=normalizeTheme(value);
  document.documentElement.dataset.hlrnTheme=theme;
  document.documentElement.style.colorScheme=theme;
  if(persist){
    try{localStorage.setItem(HLRN_THEME_KEY,theme);}catch(e){}
  }
  try{ syncThemeIntoFrames(document,theme); }catch(e){}
  window.dispatchEvent(new CustomEvent("hlrn-theme-change",{detail:{theme}}));
  return theme;
}

applyTheme(readTheme());

window.HLRNTheme=Object.freeze({
  get:readTheme,
  set(theme){return applyTheme(theme,{persist:true});},
  toggle(){return applyTheme(readTheme()==="dark"?"light":"dark",{persist:true});},
  reset(){
    try{localStorage.removeItem(HLRN_THEME_KEY);}catch(e){}
    return applyTheme("light");
  }
});

window.addEventListener("storage",e=>{
  if(e.key===HLRN_THEME_KEY)applyTheme(e.newValue||"light");
});


function installThemeReadabilityLayer(){
  let style=document.getElementById("hlrn-theme-runtime-readability");
  if(!style){
    style=document.createElement("style");
    style.id="hlrn-theme-runtime-readability";
    (document.head||document.documentElement).appendChild(style);
  }
  style.textContent=`
    html[data-hlrn-theme="light"] body{
      background:#fff!important;
      color:#12171d!important;
    }
    html[data-hlrn-theme="light"] body :where(
      .shell,.page,.page-wrap,.wrap,.wrapper,.container,.content,.content-wrap,
      .main,.main-content,.app,.hub,.stage,.viewport,.section,.panel,.card,.box,
      .tile,.module,.widget,.toolbar,.subnav,.table-wrap,.table-shell,.table-container,
      .story-card,.intel-card,.detail-wrap,.detail-box,.deep-box,.stat,.stat-card,
      .metric-card,.summary-card,.record-card,.record-box,.leader-card,.driver-card,
      .comparison-card,.race-card,.report-card,.result-card,.news-card,.team-card,
      .admin-card,.broadcast-card,.episode-card,.adventure-card,.profile-card
    ){
      background-color:#fff!important;
      color:#12171d!important;
      border-color:#d9dee5!important;
    }
    html[data-hlrn-theme="light"] body :where(
      h1,h2,h3,h4,h5,h6,.title,.heading,.headline,.name,.driver-name,
      .section-title,.card-title,.story-title,.detail-name,.deep-title,
      .brand-title,.stat-value,.score-num,strong,b
    ){
      color:#11161c!important;
      text-shadow:none!important;
    }
    html[data-hlrn-theme="light"] body :where(
      p,li,dd,dt,label,.sub,.subtitle,.description,.copy,.meta,.muted,
      .card-reason,.card-stat,.story-sub,.detail-category,.stat-label,
      .small,.helper,.caption,.hero-copy,.hero-sub,.hero-meta,.brand-sub,
      .section-kicker,.kicker,.eyebrow,.card-copy,.card-meta,.body-copy,
      .metric-label,.record-label,.driver-meta,.team-meta,.race-meta,.news-meta,
      .story-kicker,.story-stat,.detail-eyebrow,.deep-label,.deep-summary,
      .live-control-label,.cc-command-sub,.cc-meter-head,.footer
    ){
      color:#4f5a66!important;
      text-shadow:none!important;
    }
    html[data-hlrn-theme="light"] body :where(
      table,thead,tbody,tr,th,td
    ){
      color:#12171d!important;
      border-color:#d9dee5!important;
    }
    html[data-hlrn-theme="light"] body thead th{
      background:#f2f4f7!important;
      color:#242a31!important;
    }
    html[data-hlrn-theme="light"] body tbody td{
      background:#fff!important;
      color:#1d232a!important;
    }
    html[data-hlrn-theme="light"] body tbody tr:nth-child(even) td{
      background:#fafbfc!important;
    }
    html[data-hlrn-theme="light"] body :where(input,select,textarea){
      background:#fff!important;
      color:#12171d!important;
      border-color:#cbd2da!important;
    }
    html[data-hlrn-theme="light"] body :where(input,textarea)::placeholder{
      color:#737e8a!important;
    }

    /* Re-apply important HLRN accents after readability overrides. */
    html[data-hlrn-theme] body :where(
      .red,.accent-red,.hlrn-red,.series-red,.status-red,.error,.danger
    ){color:#e31837!important}
    html[data-hlrn-theme] body :where(
      .yellow,.accent-yellow,.hlrn-yellow,.series-yellow
    ){color:#c59c00!important}
    html[data-hlrn-theme] body :where(
      .green,.accent-green,.hlrn-green,.series-green,.success
    ){color:#168742!important}
    html[data-hlrn-theme] body :where(
      .blue,.accent-blue,.hlrn-blue,.series-blue
    ){color:#216ac0!important}

    html[data-hlrn-theme="dark"] body{
      background:#07090d!important;
      color:#f7f8fa!important;
    }
  `;
}

installThemeReadabilityLayer();

function syncThemeIntoFrames(rootDoc=document,theme=readTheme()){
  try{
    rootDoc.querySelectorAll("iframe").forEach(frame=>{
      const apply=()=>{
        try{
          const doc=frame.contentDocument;
          if(!doc||!doc.documentElement)return;
          doc.documentElement.dataset.hlrnTheme=theme;
          let style=doc.getElementById("hlrn-iframe-theme-colors");
          if(!style){
            style=doc.createElement("style");
            style.id="hlrn-iframe-theme-colors";
            (doc.head||doc.documentElement).appendChild(style);
          }
          style.textContent=theme==="dark"
            ? `
              html,body{background:#07090d!important;color:#f7f8fa!important}
              :where(.page,.wrap,.wrapper,.container,.content,.section,.panel,.card,.box,.tile,.table-wrap,.table-shell,.hosted-hub,.hosted-hub-stage){background-color:#0d1117!important;color:#f7f8fa!important;border-color:#2b333e!important}
              :where(h1,h2,h3,h4,h5,h6,.title,.heading,.name,.driver-name,strong,b){color:#f7f8fa!important;text-shadow:none!important}
              :where(p,li,label,.sub,.subtitle,.description,.copy,.meta,.muted,.small,.caption){color:#aeb8c4!important}
              table,tbody td{background:#0d1117!important;color:#f4f6f8!important;border-color:#2b333e!important}
              thead th{background:#171d25!important;color:#f7f8fa!important;border-color:#34404d!important}
              tbody tr:nth-child(even) td{background:#11171f!important}
            `
            : `
              html,body{background:#fff!important;color:#12171d!important}
              :where(.page,.wrap,.wrapper,.container,.content,.section,.panel,.card,.box,.tile,.table-wrap,.table-shell,.hosted-hub,.hosted-hub-stage){background-color:#fff!important;color:#12171d!important;border-color:#d9dee5!important}
              :where(h1,h2,h3,h4,h5,h6,.title,.heading,.name,.driver-name,strong,b){color:#11161c!important;text-shadow:none!important}
              :where(p,li,label,.sub,.subtitle,.description,.copy,.meta,.muted,.small,.caption){color:#4f5a66!important}
              table,tbody td{background:#fff!important;color:#1d232a!important;border-color:#d9dee5!important}
              thead th{background:#f2f4f7!important;color:#242a31!important;border-color:#d9dee5!important}
              tbody tr:nth-child(even) td{background:#fafbfc!important}
            `;
          syncThemeIntoFrames(doc,theme);
        }catch(e){}
      };
      if(!frame.__hlrnThemeBound){
        frame.__hlrnThemeBound=true;
        frame.addEventListener("load",()=>setTimeout(apply,0));
      }
      apply();
    });
  }catch(e){}
}

function start(){
  if(!document.body){document.addEventListener("DOMContentLoaded",start,{once:true});return;}

  // Load the unified driver identity layer on every HLRN page before any early return.
  // This keeps permanent driver profiles working even on pages that render their own nav.
  if(!document.querySelector("script[data-hlrn-driver-system]")){
    const shellSelf=[...document.scripts].slice().reverse().find(s=>/(?:^|\/)site-shell\.js(?:\?|$)/i.test(s.src||""));
    let driverRoot;
    try{driverRoot=new URL("../",shellSelf&&shellSelf.src?shellSelf.src:location.href);}catch(e){driverRoot=new URL("/",location.origin);}
    const driverScript=document.createElement("script");
    driverScript.src=new URL("assets/driver-system.js?v=20260930v7",driverRoot).href;
    driverScript.defer=true;
    driverScript.setAttribute("data-hlrn-driver-system","");
    document.head.appendChild(driverScript);
  }

  // Keep only one shared HLRN navigation instance.
  document.querySelectorAll("#hlrn-global-nav").forEach((el,i)=>{if(i>0)el.remove();});
  if(document.getElementById("hlrn-global-nav")) return;

  const scripts=[...document.scripts];
  const shellScript=scripts.slice().reverse().find(s=>/(?:^|\/)site-shell\.js(?:\?|$)/i.test(s.src||""));
  let root;
  try{if(shellScript&&shellScript.src)root=new URL("../",shellScript.src);}catch(e){}
  if(!root){
    const pathname=location.pathname||"/";
    const repoMarkers=["/HLRN-Website/","/HLRN-App/"];
    const marker=repoMarkers.find(m=>pathname.toLowerCase().includes(m.toLowerCase()));
    if(marker){
      const idx=pathname.toLowerCase().indexOf(marker.toLowerCase());
      root=new URL(pathname.slice(0,idx+marker.length),location.origin);
    }else root=new URL("/",location.origin);
  }
  const url=(path="")=>new URL(path,root).href;

  // Always use the current shared shell stylesheet. This gives every page
  // the same global mobile layer without requiring page-by-page CSS edits.
  const SHELL_CSS_VERSION="20260930theme2";
  let shellCss=[...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>/\/site-shell\.css(?:\?|$)/i.test(link.getAttribute("href")||""));
  if(!shellCss){
    shellCss=document.createElement("link");
    shellCss.rel="stylesheet";
    shellCss.setAttribute("data-hlrn-shell-css","");
    document.head.appendChild(shellCss);
  }
  const freshShellCss=url("assets/site-shell.css?v="+SHELL_CSS_VERSION);
  if(shellCss.href!==freshShellCss)shellCss.href=freshShellCss;

  function hgnDriverSlug(name){
    let text=String(name||"").trim();
    if(text.includes(",")){const parts=text.split(",");const last=(parts.shift()||"").trim();const first=parts.join(" ").trim();text=(first+" "+last).trim();}
    return text.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"driver";
  }

  const path=(location.pathname||"").toLowerCase();

  // Page classification lets the shared phone layer protect pages that
  // already have purpose-built mobile layouts.
  let relPath=path;
  try{
    const rootPath=(root.pathname||"/").toLowerCase();
    if(relPath.startsWith(rootPath)) relPath=relPath.slice(rootPath.length);
  }catch(e){}
  const route=(relPath.split("/").filter(Boolean)[0]||"home").replace(/[^a-z0-9-]/g,"");
  document.documentElement.dataset.hlrnRoute=route||"home";
  document.documentElement.classList.add("hlrn-global-mobile-ready");

  const driverDirectory=/^drivers\/?(?:index\.html)?$/.test(relPath);
  const specializedMobile=
    route==="home" ||
    /^news\//.test(relPath) ||
    /^live\//.test(relPath) ||
    /^standings\//.test(relPath) ||
    /^results\//.test(relPath) ||
    /^my-hlrn\//.test(relPath) ||
    driverDirectory;
  document.documentElement.classList.toggle("hlrn-mobile-specialized",specializedMobile);
  document.documentElement.classList.toggle("hlrn-mobile-global",!specializedMobile);

  let active="home";
  if(path.includes("/live/")) active="live";
  else if(path.includes("/standings/")) active="standings";
  else if(path.includes("/intelligence/")||path.includes("/race-intelligence/")) active="intelligence";
  else if(path.includes("/results/")||path.includes("/schedule/")) active="results";
  else if(path.includes("/my-hlrn/")) active="my-hlrn";
  else if(path.includes("/drivers/")) active="drivers";
  else if(path.includes("/teams/")) active="teams";
  else if(path.includes("/news/")) active="news";
  else if(path.includes("/adventures/")) active="adventures";
  else if(path.includes("/meet-the-admins/")) active="admins";
  else if(path.includes("/rules/")) active="rules";
  else if(path.includes("/broadcast/")||path.includes("/broadcasters/")) active="broadcast";
  else if(path.includes("/store/")) active="store";

  const primary=[
    ["home","Home",""],
    ["live","Live","live/"],
    ["standings","Standings","standings/"],
    ["intelligence","Intelligence","race-intelligence/"],
    ["results","Results","results/"],
    ["drivers","Drivers","drivers/"],
    ["teams","Teams","teams/"],
    ["news","News","news/"]
  ];
  const more=[
    ["adventures","Adventures","adventures/"],
    ["admins","Meet the Admins","meet-the-admins/"],
    ["rules","Rules","rules/"],
    ["broadcast","Watch HLRN","broadcasters/"],
    ["store","Store","store/"]
  ];

  const nav=document.createElement("nav");
  nav.id="hlrn-global-nav";
  nav.setAttribute("aria-label","HLRN primary navigation");

  const primaryLinks=primary.map(([key,label,target])=>`<a class="hgn-link ${active===key?"active":""}" ${active===key?'aria-current="page"':''} href="${url(target)}">${label}</a>`).join("");
  const moreLinks=more.map(([key,label,target])=>`<a class="hgn-more-item ${active===key?"active":""}" ${active===key?'aria-current="page"':''} href="${url(target)}">${label}</a>`).join("");
  const mobilePrimary=primary.map(([key,label,target])=>`<a class="${active===key?"active":""}" ${active===key?'aria-current="page"':''} href="${url(target)}">${label}</a>`).join("");
  const mobileMore=more.map(([key,label,target])=>`<a class="${active===key?"active":""}" ${active===key?'aria-current="page"':''} href="${url(target)}">${label}</a>`).join("");

  nav.innerHTML=`
    <div class="hgn-inner">
      <a class="hgn-brand" href="${url("")}" aria-label="High Line Racing Network home">
        <span class="hgn-mark">HL</span>
        <span class="hgn-name">HIGH LINE RACING NETWORK<small>HLRN // OFFICIAL NETWORK</small></span>
      </a>
      <div class="hgn-links">
        ${primaryLinks}
        <div class="hgn-more-wrap ${more.some(x=>x[0]===active)?"active":""}">
          <button class="hgn-link hgn-more-btn" type="button" aria-expanded="false">MORE <span class="hgn-arrow">▾</span></button>
          <div class="hgn-more-menu">${moreLinks}</div>
        </div>
      </div>
      <button class="hgn-login" type="button" aria-label="HLRN Driver Login">DRIVER LOGIN</button>
      <button class="hgn-theme-toggle" type="button" aria-label="Switch HLRN theme"><span class="hgn-theme-icon">☾</span><span class="hgn-theme-label">NIGHT</span></button>
      <a class="hgn-live" href="${url("live/")}"><i></i> RACE CENTER</a>
      <button class="hgn-menu" type="button" aria-expanded="false" aria-label="Open HLRN navigation">☰</button>
      <div class="hgn-account-panel" hidden>
        <div class="hgn-account-title">DRIVER ACCOUNT</div>
        <div class="hgn-account-name"></div>
        <div class="hgn-account-discord"></div>
        <button type="button" class="hgn-account-dashboard">MY HLRN</button>
        <button type="button" class="hgn-account-profile">MY PROFILE</button>
        <button type="button" class="hgn-account-signout">SIGN OUT</button>
      </div>
    </div>
    <div class="hgn-mobile">
      ${mobilePrimary}
      <button class="hgn-mobile-login" type="button">DRIVER LOGIN</button>
      <button class="hgn-mobile-theme" type="button"><span class="hgn-theme-icon">☾</span><span class="hgn-theme-label">NIGHT MODE</span></button>
      <button class="hgn-mobile-more" type="button" aria-expanded="false">MORE <span>▾</span></button>
      <div class="hgn-mobile-more-menu">${mobileMore}</div>
    </div>`;

  document.body.insertBefore(nav,document.body.firstChild);


  // -----------------------------
  // Site theme toggle
  // -----------------------------
  const themeButtons=[...nav.querySelectorAll(".hgn-theme-toggle,.hgn-mobile-theme")];

  function syncThemeButtons(){
    const theme=readTheme();
    themeButtons.forEach(btn=>{
      const icon=btn.querySelector(".hgn-theme-icon");
      const label=btn.querySelector(".hgn-theme-label");
      if(icon) icon.textContent=theme==="dark"?"☀":"☾";
      if(label) label.textContent=theme==="dark"?(btn.classList.contains("hgn-mobile-theme")?"LIGHT MODE":"LIGHT"):(btn.classList.contains("hgn-mobile-theme")?"NIGHT MODE":"NIGHT");
      btn.setAttribute("aria-pressed",String(theme==="dark"));
      btn.setAttribute("aria-label",theme==="dark"?"Switch to light mode":"Switch to night mode");
    });
  }

  themeButtons.forEach(btn=>btn.addEventListener("click",()=>{
    window.HLRNTheme.toggle();
    syncThemeButtons();
  }));
  window.addEventListener("hlrn-theme-change",syncThemeButtons);
  window.addEventListener("pageshow",syncThemeButtons);
  syncThemeButtons();

  // -----------------------------
  // Persistent driver login display
  // -----------------------------
  const LOGIN_KEY="hlrn_driver_login_device_v1";
  const loginButtons=[...nav.querySelectorAll(".hgn-login,.hgn-mobile-login")];
  const accountPanel=nav.querySelector(".hgn-account-panel");
  let accountMenuOpen=false;

  function readLogin(){
    try{
      const d=JSON.parse(localStorage.getItem(LOGIN_KEY)||"null");
      return d&&typeof d.driver==="string"&&d.driver.trim()?d:null;
    }catch(e){return null;}
  }
  function closeAccount(){
    accountMenuOpen=false;
    accountPanel.hidden=true;
    loginButtons.forEach(b=>b.setAttribute("aria-expanded","false"));
  }
  function syncDriverLogin(){
    const data=readLogin();
    const old=document.getElementById("hlrnHeaderDriverLogin");
    const label=data?.driver?.trim()||old?.textContent?.trim()||"DRIVER LOGIN";
    loginButtons.forEach(btn=>{
      btn.textContent=label.toUpperCase();
      btn.setAttribute("aria-label",data?"Open HLRN driver account for "+label:"HLRN Driver Login");
      btn.setAttribute("aria-expanded",String(accountMenuOpen&&!!data));
    });
    if(!data){closeAccount();return;}
    accountPanel.querySelector(".hgn-account-name").textContent=data.driver;
    accountPanel.querySelector(".hgn-account-discord").textContent=data.discordUsername?"Discord: @"+data.discordUsername:data.discordDisplayName?"Discord: "+data.discordDisplayName:"Discord account connected";
  }

  loginButtons.forEach(btn=>btn.addEventListener("click",e=>{
    e.stopPropagation();
    const data=readLogin();
    if(data){
      accountMenuOpen=!accountMenuOpen;
      accountPanel.hidden=!accountMenuOpen;
      syncDriverLogin();
      return;
    }
    const old=document.getElementById("hlrnHeaderDriverLogin");
    if(old){old.click();return;}
    location.href=url("")+"#hlrnDriverSignIn";
  }));
  accountPanel.addEventListener("click",e=>e.stopPropagation());
  accountPanel.querySelector(".hgn-account-dashboard").addEventListener("click",()=>{
    const d=readLogin();
    closeAccount();
    if(d) location.href=url("my-hlrn/");
    else location.href=url("")+"#hlrnDriverSignIn";
  });
  accountPanel.querySelector(".hgn-account-profile").addEventListener("click",async()=>{
    const d=readLogin();
    closeAccount();
    if(!d){location.href=url("drivers/");return;}
    try{
      await window.HLRNDrivers?.load?.();
      const profile=window.HLRNDrivers?.profileUrl?.(d.driver);
      if(profile){location.href=profile;return;}
    }catch(e){}
    location.href=url("drivers/"+hgnDriverSlug(d.driver)+"/");
  });
  accountPanel.querySelector(".hgn-account-signout").addEventListener("click",()=>{
    closeAccount();
    const homeSignout=document.getElementById("hlrnDriverSignOut");
    if(homeSignout){homeSignout.click();setTimeout(syncDriverLogin,50);return;}
    sessionStorage.setItem("hlrn_pending_signout","1");
    location.href=url("");
  });
  document.addEventListener("click",e=>{if(!accountPanel.contains(e.target)&&!loginButtons.includes(e.target))closeAccount();});
  window.addEventListener("storage",e=>{if(e.key===LOGIN_KEY)syncDriverLogin();});
  window.addEventListener("pageshow",syncDriverLogin);
  syncDriverLogin();

  const originalLogin=document.getElementById("hlrnHeaderDriverLogin");
  if(originalLogin)new MutationObserver(syncDriverLogin).observe(originalLogin,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["aria-label"]});

  // Finish a sign-out requested from another page once homepage login code exists.
  if(sessionStorage.getItem("hlrn_pending_signout")==="1"){
    let attempts=0;
    const finishSignout=setInterval(()=>{
      const button=document.getElementById("hlrnDriverSignOut");
      if(button&&attempts>=2){
        clearInterval(finishSignout);
        sessionStorage.removeItem("hlrn_pending_signout");
        button.click();
        syncDriverLogin();
      }else if(++attempts>50)clearInterval(finishSignout);
    },100);
  }

  // -----------------------------
  // Menus
  // -----------------------------
  const moreWrap=nav.querySelector(".hgn-more-wrap");
  const moreBtn=nav.querySelector(".hgn-more-btn");
  const menuBtn=nav.querySelector(".hgn-menu");
  const mobile=nav.querySelector(".hgn-mobile");
  const mobileMoreBtn=nav.querySelector(".hgn-mobile-more");
  const mobileMoreMenu=nav.querySelector(".hgn-mobile-more-menu");

  function closeMore(){moreWrap?.classList.remove("open");moreBtn?.setAttribute("aria-expanded","false");}
  function closeMobile(){
    mobile?.classList.remove("open");
    mobileMoreMenu?.classList.remove("open");
    mobileMoreBtn?.setAttribute("aria-expanded","false");
    if(menuBtn){menuBtn.textContent="☰";menuBtn.setAttribute("aria-expanded","false");}
  }
  moreBtn?.addEventListener("click",e=>{
    e.stopPropagation();
    const open=!moreWrap.classList.contains("open");
    moreWrap.classList.toggle("open",open);
    moreBtn.setAttribute("aria-expanded",String(open));
  });
  document.addEventListener("click",e=>{if(moreWrap&&!moreWrap.contains(e.target))closeMore();});
  menuBtn?.addEventListener("click",()=>{
    const open=mobile.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded",String(open));
    menuBtn.textContent=open?"×":"☰";
  });
  mobileMoreBtn?.addEventListener("click",()=>{
    const open=mobileMoreMenu.classList.toggle("open");
    mobileMoreBtn.setAttribute("aria-expanded",String(open));
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){closeMore();closeMobile();closeAccount();}
  });

  // -----------------------------
  // Clean old internal/Google Sites links when clicked
  // -----------------------------
  document.addEventListener("click",e=>{
    const a=e.target.closest?.("a[href]");
    if(!a)return;
    let u;try{u=new URL(a.href,location.href);}catch{return;}
    const lp=u.pathname.toLowerCase();

    if(u.hostname===location.hostname){
      let dest=null;
      if(lp.includes("/race-intelligence/"))dest="race-intelligence/";
      else if(lp.includes("/broadcast/"))dest="broadcasters/";
      else if(lp.includes("/schedule/"))dest="results/";
      if(dest){e.preventDefault();location.href=url(dest);return;}
    }

    if(u.hostname.toLowerCase()==="sites.google.com"&&lp.includes("/view/highlineracingnetwork")){
      let dest="";
      if(lp.includes("meet-our-team")||lp.includes("meet-the-admin")||lp.includes("team-members"))dest="meet-the-admins/";
      else if(lp.includes("race-intelligence")||lp.includes("intelligence"))dest="race-intelligence/";
      else if(lp.includes("standings"))dest="standings/";
      else if(lp.includes("schedule")||lp.includes("results"))dest="results/";
      else if(lp.includes("news"))dest="news/";
      else if(lp.includes("rules"))dest="rules/";
      else if(lp.includes("broadcast"))dest="broadcasters/";
      else if(lp.includes("store"))dest="store/";
      else if(lp.includes("driver"))dest="drivers/";
      else if(lp.includes("adventure"))dest="adventures/";
      e.preventDefault();location.href=url(dest);
    }
  },true);

  // -----------------------------
  // Global phone safety pass
  // -----------------------------
  function applyGlobalMobileSafety(){
    const phone=window.matchMedia("(max-width:620px)").matches;
    if(!phone || document.documentElement.classList.contains("hlrn-mobile-specialized")) return;

    // Preserve table semantics; make only the existing parent scroll when a
    // table is genuinely wider than the phone.
    document.querySelectorAll("table").forEach(table=>{
      if(table.closest("#hlrn-global-nav,#hlrn-global-footer")) return;
      const host=table.parentElement;
      if(!host) return;
      const available=Math.max(1,host.clientWidth||document.documentElement.clientWidth);
      if(table.scrollWidth>available+2) host.classList.add("hlrn-mobile-table-host");
    });

    // Save bandwidth on long content pages without delaying visible hero art.
    document.querySelectorAll("img:not([loading])").forEach(img=>{
      const rect=img.getBoundingClientRect();
      if(rect.top>window.innerHeight*1.25){
        img.loading="lazy";
        img.decoding="async";
      }
    });
  }
  requestAnimationFrame(applyGlobalMobileSafety);
  setTimeout(applyGlobalMobileSafety,250);
  setTimeout(applyGlobalMobileSafety,900);
  window.addEventListener("load",applyGlobalMobileSafety,{once:true});
  let mobileSafetyTimer=0;
  window.addEventListener("resize",()=>{
    clearTimeout(mobileSafetyTimer);
    mobileSafetyTimer=setTimeout(applyGlobalMobileSafety,120);
  });

  // -----------------------------
  // Footer: preserve page-specific footer content if present; otherwise add shared footer.
  // -----------------------------
  const existingFooter=[...document.querySelectorAll("body > footer, footer")].find(f=>!f.closest("#hlrn-global-nav"));
  if(existingFooter){
    existingFooter.classList.add("hlrn-shared-footer-existing");
  }else{
    const footer=document.createElement("footer");
    footer.id="hlrn-global-footer";
    const year=new Date().getFullYear();
    footer.innerHTML=`
      <div class="hgf-inner">
        <div class="hgf-brand"><span class="hgf-mark">HL</span><span><strong>High Line Racing Network</strong><small>Where the racing never stops</small></span></div>
        <nav class="hgf-links" aria-label="HLRN footer navigation">
          <a href="${url("live/")}">Live</a><a href="${url("standings/")}">Standings</a><a href="${url("drivers/")}">Drivers</a><a href="${url("news/")}">News</a><a href="${url("adventures/")}">Adventures</a><a href="${url("broadcasters/")}">Broadcasts</a>
        </nav>
        <div class="hgf-copy">© ${year} HLRN<br>High Line Racing Network</div>
      </div>`;
    document.body.appendChild(footer);
  }

  // Global site search assets
  if(!document.querySelector('link[data-hlrn-site-search]')){
    const searchCss=document.createElement("link");
    searchCss.rel="stylesheet";
    searchCss.href=url("assets/site-search.css?v=20260928p1");
    searchCss.setAttribute("data-hlrn-site-search","");
    document.head.appendChild(searchCss);
  }
  if(!document.querySelector('script[data-hlrn-site-search]')){
    const searchScript=document.createElement("script");
    searchScript.src=url("assets/site-search.js?v=20260928p1");
    searchScript.defer=true;
    searchScript.setAttribute("data-hlrn-site-search","");
    document.head.appendChild(searchScript);
  }

  document.documentElement.classList.add("hlrn-shell-ready");
}

start();
})();
