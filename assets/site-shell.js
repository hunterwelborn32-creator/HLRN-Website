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
      <a class="hgn-live" href="${url("live/")}"><i></i> RACE CENTER</a>
      <button class="hgn-menu" type="button" aria-expanded="false" aria-label="Open navigation">☰</button>
    </div>
    <div class="hgn-mobile">${mobilePrimary}<button class="hgn-mobile-more" type="button" aria-expanded="false">MORE <span>▾</span></button><div class="hgn-mobile-more-menu">${mobileMore}</div></div>`;
  document.body.insertBefore(nav,document.body.firstChild);
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
