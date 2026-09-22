(function(){
"use strict";
function start(){
  if(!document.body){document.addEventListener("DOMContentLoaded",start,{once:true});return;}
  document.querySelectorAll("#hlrn-global-nav").forEach((el,i)=>{if(i>0)el.remove();});
  if(document.getElementById("hlrn-global-nav"))return;
  const scripts=[...document.scripts];
  const shellScript=scripts.slice().reverse().find(s=>/(?:^|\/)site-shell\.js(?:\?|$)/i.test(s.src||""));
  let root;
  try{if(shellScript&&shellScript.src)root=new URL("../",shellScript.src);}catch(e){}
  if(!root){const marker="/HLRN-Website/",pathname=location.pathname||"/",lower=pathname.toLowerCase(),idx=lower.indexOf(marker.toLowerCase());root=new URL(idx>=0?pathname.slice(0,idx+marker.length):"/",location.origin);}
  const url=(path="")=>new URL(path,root).href;
  const path=(location.pathname||"").toLowerCase();
  let active="home";
  if(path.includes("/live/"))active="live";
  else if(path.includes("/standings/"))active="standings";
  else if(path.includes("/race-intelligence/"))active="intelligence";
  else if(path.includes("/results/")||path.includes("/schedule/"))active="results";
  else if(path.includes("/drivers/"))active="drivers";
  else if(path.includes("/fantasy/"))active="fantasy";
  else if(path.includes("/news/"))active="news";
  else if(path.includes("/meet-the-admins/")||path.endsWith("/meet-the-admins"))active="admins";
  else if(path.includes("/rules/"))active="rules";
  else if(path.includes("/broadcasters/"))active="broadcasters";
  else if(path.includes("/store/"))active="store";
  const primary=[
    ["home","Home",""],["live","Live","live/"],["standings","Standings","standings/"],
    ["intelligence","Intelligence","race-intelligence/"],["results","Results","results/"],
    ["drivers","Drivers","drivers/"],["fantasy","Fantasy","fantasy/"],["news","News","news/"],
    ["admins","Meet the Admins","meet-the-admins/"]
  ];
  const more=[["rules","Rules","rules/"],["broadcasters","Broadcasters","broadcasters/"],["store","Store","store/"]];
  const nav=document.createElement("nav");
  nav.id="hlrn-global-nav";
  nav.setAttribute("aria-label","HLRN primary navigation");
  const primaryLinks=primary.map(([key,label,target])=>`<a class="hgn-link ${active===key?"active":""}" href="${url(target)}">${label}</a>`).join("");
  const moreLinks=more.map(([key,label,target])=>`<a class="hgn-more-item ${active===key?"active":""}" href="${url(target)}">${label}</a>`).join("");
  const mobilePrimary=primary.map(([key,label,target])=>`<a class="${active===key?"active":""}" href="${url(target)}">${label}</a>`).join("");
  const mobileMore=more.map(([key,label,target])=>`<a class="${active===key?"active":""}" href="${url(target)}">${label}</a>`).join("");
  nav.innerHTML=`
    <div class="hgn-inner">
      <a class="hgn-brand" href="${url("")}"><span class="hgn-mark">HL</span><span class="hgn-name">HIGH LINE RACING NETWORK<small>HLRN // OFFICIAL NETWORK</small></span></a>
      <div class="hgn-links">${primaryLinks}
        <div class="hgn-more-wrap ${more.some(x=>x[0]===active)?"active":""}">
          <button class="hgn-link hgn-more-btn" type="button" aria-expanded="false">MORE <span class="hgn-arrow">▾</span></button>
          <div class="hgn-more-menu">${moreLinks}</div>
        </div>
      </div>
      <button class="hgn-login" type="button" aria-label="HLRN Driver Login">DRIVER LOGIN</button>
      <a class="hgn-live" href="${url("live/")}"><i></i> RACE CENTER</a>
      <button class="hgn-menu" type="button" aria-expanded="false" aria-label="Open navigation">☰</button>
    </div>
    <div class="hgn-mobile">${mobilePrimary}<button class="hgn-mobile-login" type="button">DRIVER LOGIN</button><button class="hgn-mobile-more" type="button" aria-expanded="false">MORE <span>▾</span></button><div class="hgn-mobile-more-menu">${mobileMore}</div></div>`;
  document.body.insertBefore(nav,document.body.firstChild);

  // HLRN shared appearance setting. Default remains the existing light design.
  const THEME_KEY="hlrn_site_theme_v1";
  const themeLink=document.createElement("link");
  themeLink.rel="stylesheet";themeLink.href=url("assets/hlrn-theme.css");themeLink.id="hlrn-main-theme-css";
  if(!document.getElementById(themeLink.id))document.head.appendChild(themeLink);
  const themeButton=document.createElement("button");
  themeButton.type="button";
  themeButton.className="hgn-theme-toggle";
  themeButton.setAttribute("aria-label","Switch website appearance");
  themeButton.title="Switch light / dark mode";
  const themeStyle=document.createElement("style");
  themeStyle.id="hlrn-theme-shared-style";
  themeStyle.textContent=`
    #hlrn-global-nav .hgn-theme-toggle{flex:0 0 auto!important;min-width:74px!important;min-height:36px!important;padding:0 10px!important;border:1px solid #46515e!important;border-radius:5px!important;background:#151a21!important;color:#fff!important;font:900 10px Arial,sans-serif!important;cursor:pointer!important;white-space:nowrap!important}
    #hlrn-global-nav .hgn-theme-toggle:hover{border-color:#e31837!important}
    @media(max-width:1180px){#hlrn-global-nav .hgn-theme-toggle{margin-left:auto!important}#hlrn-global-nav .hgn-menu{margin-left:0!important}}
    @media(max-width:600px){#hlrn-global-nav .hgn-theme-toggle{min-width:64px!important;padding:0 6px!important;font-size:9px!important}}
  `;
  nav.appendChild(themeStyle);
  nav.querySelector(".hgn-inner").insertBefore(themeButton,nav.querySelector(".hgn-menu"));
  function storedTheme(){try{return localStorage.getItem(THEME_KEY)==="dark"?"dark":"light"}catch(e){return "light"}}
  function themeInDocument(doc,theme){
    try{
      doc.documentElement.setAttribute("data-hlrn-theme",theme);
      // srcdoc frames have their own document and do not inherit the parent's CSS.
      if(doc!==document){
        let link=doc.getElementById("hlrn-frame-theme-css");
        if(!link){link=doc.createElement("link");link.id="hlrn-frame-theme-css";link.rel="stylesheet";link.href=url("assets/hlrn-theme.css");(doc.head||doc.documentElement).appendChild(link)}
      }
      doc.querySelectorAll("iframe").forEach(frame=>{
        try{if(frame.contentDocument)themeInDocument(frame.contentDocument,theme)}catch(e){} // External frames cannot be restyled.
      });
    }catch(e){}
  }
  function applyTheme(theme){
    theme=theme==="dark"?"dark":"light";
    themeInDocument(document,theme);
    themeButton.textContent=theme==="dark"?"☀ LIGHT":"☾ DARK";
    themeButton.setAttribute("aria-pressed",String(theme==="dark"));
    themeButton.setAttribute("aria-label",theme==="dark"?"Switch to light mode":"Switch to dark mode");
  }
  themeButton.addEventListener("click",()=>{const next=storedTheme()==="dark"?"light":"dark";try{localStorage.setItem(THEME_KEY,next)}catch(e){}applyTheme(next)});
  document.addEventListener("load",e=>{if(e.target?.tagName==="IFRAME")applyTheme(storedTheme())},true);
  const themeObserver=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.tagName==="IFRAME"||n.querySelector?.("iframe")))))applyTheme(storedTheme())});
  themeObserver.observe(document.body,{childList:true,subtree:true});
  window.addEventListener("storage",e=>{if(e.key===THEME_KEY)applyTheme(storedTheme())});
  applyTheme(storedTheme());

  // Login remains owned by the homepage's existing Discord/device session code.
  // This shared-nav button delegates to that existing control, never to a new login URL.
  const loginStyle=document.createElement("style");
  loginStyle.textContent=`
    #hlrn-global-nav .hgn-login{flex:0 0 auto!important;min-height:36px!important;padding:0 12px!important;border:1px solid #46515e!important;border-left:3px solid #e31837!important;background:#151a21!important;color:#fff!important;font:900 9px Arial,sans-serif!important;letter-spacing:.06em!important;white-space:nowrap!important;cursor:pointer!important}
    #hlrn-global-nav .hgn-login:hover{background:#e31837!important}
    #hlrn-global-nav .hgn-mobile-login{min-height:42px!important;border:1px solid #46515e!important;background:#151a21!important;color:#fff!important;font:900 9px Arial,sans-serif!important;cursor:pointer!important}
    @media(max-width:1180px){#hlrn-global-nav .hgn-login{display:none!important}}
  `;
  nav.appendChild(loginStyle);
  // Share the homepage's existing saved Discord identity across all GitHub pages.
  // The homepage remains responsible for authenticating and verifying the device session.
  const LOGIN_KEY="hlrn_driver_login_device_v1";
  let accountMenuOpen=false;
  const loginButtons=[...nav.querySelectorAll(".hgn-login,.hgn-mobile-login")];
  const accountPanel=document.createElement("div");
  accountPanel.className="hgn-account-panel";
  accountPanel.hidden=true;
  accountPanel.innerHTML=`<div class="hgn-account-title">DRIVER ACCOUNT</div><div class="hgn-account-name"></div><div class="hgn-account-discord"></div><button type="button" class="hgn-account-profile">MY PROFILE</button><button type="button" class="hgn-account-signout">SIGN OUT</button>`;
  nav.querySelector(".hgn-inner").appendChild(accountPanel);
  loginStyle.textContent+=`
    #hlrn-global-nav .hgn-account-panel{position:absolute!important;right:120px!important;top:calc(100% - 1px)!important;width:245px!important;padding:15px!important;background:#101318!important;border:1px solid #343b45!important;border-top:3px solid #e31837!important;box-shadow:0 16px 40px #0009!important;z-index:2147483640!important;color:#fff!important}
    #hlrn-global-nav .hgn-account-panel[hidden]{display:none!important}
    #hlrn-global-nav .hgn-account-title{font:900 9px Arial,sans-serif!important;color:#8b95a3!important;letter-spacing:.1em!important}
    #hlrn-global-nav .hgn-account-name{font:900 14px Arial,sans-serif!important;margin:8px 0 4px!important;overflow-wrap:anywhere!important}
    #hlrn-global-nav .hgn-account-discord{font:11px Arial,sans-serif!important;color:#aeb8c5!important;overflow-wrap:anywhere!important;margin-bottom:12px!important}
    #hlrn-global-nav .hgn-account-panel button{display:block!important;width:100%!important;padding:11px!important;margin-top:7px!important;background:#1c232c!important;border:1px solid #3a4653!important;color:#fff!important;font:900 10px Arial,sans-serif!important;cursor:pointer!important}
    #hlrn-global-nav .hgn-account-panel .hgn-account-signout:hover{background:#e31837!important}
    @media(max-width:1180px){#hlrn-global-nav .hgn-account-panel{right:10px!important;top:100%!important}}
  `;
  function readLogin(){
    try{const d=JSON.parse(localStorage.getItem(LOGIN_KEY)||"null");return d&&typeof d.driver==="string"&&d.driver.trim()?d:null;}catch(e){return null;}
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
    if(!data){accountMenuOpen=false;accountPanel.hidden=true;return;}
    accountPanel.querySelector(".hgn-account-name").textContent=data.driver;
    accountPanel.querySelector(".hgn-account-discord").textContent=data.discordUsername?"Discord: @"+data.discordUsername:data.discordDisplayName?"Discord: "+data.discordDisplayName:"Discord account connected";
  }
  function closeAccount(){accountMenuOpen=false;accountPanel.hidden=true;loginButtons.forEach(b=>b.setAttribute("aria-expanded","false"));}
  loginButtons.forEach(btn=>btn.addEventListener("click",e=>{
    e.stopPropagation();
    const data=readLogin();
    if(data){accountMenuOpen=!accountMenuOpen;accountPanel.hidden=!accountMenuOpen;syncDriverLogin();return;}
    const old=document.getElementById("hlrnHeaderDriverLogin");
    if(old){old.click();return;}
    location.href=url("")+"#hlrnDriverSignIn";
  }));
  accountPanel.addEventListener("click",e=>e.stopPropagation());
  accountPanel.querySelector(".hgn-account-profile").addEventListener("click",()=>{
    closeAccount();
    if(typeof window.openHomeDriverProfile==="function"){
      const d=readLogin();if(d)window.openHomeDriverProfile(d.driver);
    }else location.href=url("drivers/");
  });
  accountPanel.querySelector(".hgn-account-signout").addEventListener("click",()=>{
    closeAccount();
    // Use the homepage's existing logout handler, which also revokes the server device session.
    const homeSignout=document.getElementById("hlrnDriverSignOut");
    if(homeSignout){homeSignout.click();syncDriverLogin();return;}
    sessionStorage.setItem("hlrn_pending_signout","1");
    location.href=url("");
  });
  document.addEventListener("click",e=>{if(!accountPanel.contains(e.target)&&!loginButtons.includes(e.target))closeAccount();});
  window.addEventListener("storage",e=>{if(e.key===LOGIN_KEY)syncDriverLogin();});
  window.addEventListener("pageshow",syncDriverLogin);
  syncDriverLogin();
  const originalLogin=document.getElementById("hlrnHeaderDriverLogin");
  if(originalLogin)new MutationObserver(syncDriverLogin).observe(originalLogin,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["aria-label"]});
  // Complete a sign-out requested from another page once homepage login code is initialized.
  if(sessionStorage.getItem("hlrn_pending_signout")==="1"){
    let attempts=0;
    const finishSignout=setInterval(()=>{
      const button=document.getElementById("hlrnDriverSignOut");
      if(button&&typeof button.onclick!=="undefined"&&attempts>=2){
        clearInterval(finishSignout);sessionStorage.removeItem("hlrn_pending_signout");
        button.click();syncDriverLogin();
      }else if(++attempts>50)clearInterval(finishSignout);
    },100);
  }
  const moreWrap=nav.querySelector(".hgn-more-wrap"),moreBtn=nav.querySelector(".hgn-more-btn"),menuBtn=nav.querySelector(".hgn-menu"),mobile=nav.querySelector(".hgn-mobile"),mobileMoreBtn=nav.querySelector(".hgn-mobile-more"),mobileMoreMenu=nav.querySelector(".hgn-mobile-more-menu");
  function closeMore(){moreWrap?.classList.remove("open");moreBtn?.setAttribute("aria-expanded","false");}
  moreBtn?.addEventListener("click",e=>{e.stopPropagation();const open=!moreWrap.classList.contains("open");moreWrap.classList.toggle("open",open);moreBtn.setAttribute("aria-expanded",String(open));});
  moreWrap?.addEventListener("mouseenter",()=>{moreWrap.classList.add("open");moreBtn?.setAttribute("aria-expanded","true");});
  moreWrap?.addEventListener("mouseleave",closeMore);
  document.addEventListener("click",e=>{if(moreWrap&&!moreWrap.contains(e.target))closeMore();});
  menuBtn?.addEventListener("click",()=>{const open=mobile.classList.toggle("open");menuBtn.setAttribute("aria-expanded",String(open));menuBtn.textContent=open?"×":"☰";});
  mobileMoreBtn?.addEventListener("click",()=>{const open=mobileMoreMenu.classList.toggle("open");mobileMoreBtn.classList.toggle("open",open);mobileMoreBtn.setAttribute("aria-expanded",String(open));});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeMore();mobile?.classList.remove("open");mobileMoreMenu?.classList.remove("open");if(menuBtn){menuBtn.textContent="☰";menuBtn.setAttribute("aria-expanded","false");}}});
  document.addEventListener("click",e=>{
    const a=e.target.closest?.("a[href]");if(!a)return;
    let u;try{u=new URL(a.href,location.href);}catch{return;}
    if(u.hostname===location.hostname&&u.pathname.toLowerCase().includes("/hlrn-website/schedule/")){e.preventDefault();location.href=url("results/");return;}
    if(u.hostname.toLowerCase()==="sites.google.com"&&u.pathname.toLowerCase().includes("/view/highlineracingnetwork")){
      const p=u.pathname.toLowerCase();let dest="";
      if(p.includes("meet-our-team")||p.includes("meet-the-admin")||p.includes("team-members"))dest="meet-the-admins/";
      else if(p.includes("race-intelligence"))dest="race-intelligence/";
      else if(p.includes("standings"))dest="standings/";
      else if(p.includes("schedule"))dest="results/";
      else if(p.includes("news"))dest="news/";
      else if(p.includes("rules"))dest="rules/";
      else if(p.includes("broadcast"))dest="broadcasters/";
      else if(p.includes("store"))dest="store/";
      else if(p.includes("driver"))dest="drivers/";
      e.preventDefault();location.href=url(dest);
    }
  },true);
}
start();
})();
