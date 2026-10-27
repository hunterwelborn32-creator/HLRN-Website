/*
 * HLRN Cinematic Edition — progressive visual enhancement only.
 * Does not alter race data, links, driver photos, the theme manager,
 * the navigation canvas, or any Live route.
 */
(()=>{
"use strict";
const path=(location.pathname||"/").toLowerCase();
const isLive=/(?:^|\/)live\/(?:index\.html)?$/.test(path)||/(?:^|\/)live\/index\.html$/.test(path);
if(isLive||document.documentElement.dataset.hlrnRoute==="live")return;
if(document.documentElement.dataset.hlrnCinematicReady==="1")return;
document.documentElement.dataset.hlrnCinematicReady="1";

const coarse=matchMedia("(pointer:coarse)").matches;
const reduced=matchMedia("(prefers-reduced-motion:reduce)").matches;
const route=document.documentElement.dataset.hlrnRoute||"home";
const mastSelectors={
 "home":".home10 .h10-hero",
 "drivers":".driver-heading,body > main .hero",
 "standings":".page-wrap > .hero,.nascar-hosted-page .hosted-hub-stage",
 "results":".race-header",
 "broadcasters":".bc-mast",
 "race-preview":".pv-mast",
 "race-intelligence":".shell > .hero,.hero",
 "race-strategy":".strategy .top",
 "race-reports":".page>.hero",
 "team-pages":".intro,.page > .hero",
 "meet-the-admins":".team-hero",
 "my-hlrn":".myh-hero",
 "rules":".page > .hero",
 "store":".hlrn-shop-hero,.page > .hero",
 "news":".page > .hero",
 "adventures":".series-intro",
 "fantasy":".brandbar",
 "control-center":".cc-top",
 "track-map":".heading",
 "racing":"body > header"
};
const cardSelectors={
 "home":".h10-week-card,.h20-panel,.h20-results-panel,.h10-link-card",
 "drivers":".driver-grid .driver-card,.profile-insight,.series-card",
 "standings":".summary-card,.cc-card,.podium-card,.cc-spotlight-card",
 "results":".race-card,.league-column,.race-preview-launch",
 "broadcasters":".bc-replay-card,.bc-person,.bc-sidecard",
 "race-preview":".pv-race-hero,.pv-section",
 "race-intelligence":".cc-meter-card,.intel-card,.story-card",
 "race-strategy":".panel",
 "race-reports":".report-card",
 "team-pages":".cards .team,.page .driver",
 "meet-the-admins":".team-grid > *",
 "my-hlrn":".myh-section,.myh-champ",
 "rules":".quick-card",
 "store":".product,.mh-dash-card",
 "news":".hlrn-recap-card",
 "adventures":".episode-tile",
 "fantasy":".driver-card,.statbox",
 "control-center":".cc-panel"
};
const sectionSelectors={
 "home":".h10-section",
 "drivers":".roster-tools,.driver-card",
 "standings":".summary-card,.cc-card",
 "results":".league-column,.race-card",
 "broadcasters":".bc-section",
 "race-preview":".pv-section",
 "race-intelligence":".cc-meter-band,.intel-grid",
 "team-pages":".cards,.page .drivers",
 "meet-the-admins":".team-summary,.team-tools",
 "my-hlrn":".myh-section",
 "rules":".quick,.section-header",
 "store":".hlrn-shop-cats,.product",
 "adventures":".series-intro,.episode-tile",
 "news":".hlrn-recap-section",
 "fantasy":".section",
 "control-center":".cc-panel"
};
let mast;
function setupMast(){
 mast=document.querySelector(mastSelectors[route]||".page > .hero");
 if(!mast||mast.classList.contains("cx-mast"))return;
 mast.classList.add("cx-mast");
 const light=document.createElement("span");
 light.className="cx-mast-light";
 light.setAttribute("aria-hidden","true");
 mast.appendChild(light);
}
function decorateCards(){
 const selector=cardSelectors[route];if(!selector)return;
 let i=0;
 document.querySelectorAll(selector).forEach(el=>{
   if(i++>=64||el.classList.contains("cx-card")||el.closest("[hidden],[aria-hidden='true']"))return;
   el.classList.add("cx-card");
   const light=document.createElement("span");
   light.className="cx-card-light";
   light.setAttribute("aria-hidden","true");
   el.appendChild(light);
 });
}
function setupScroll(){
 if(reduced||typeof IntersectionObserver==="undefined")return;
 const selector=sectionSelectors[route];if(!selector)return;
 const seen=new WeakSet();
 const io=new IntersectionObserver((entries)=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   const el=entry.target;
   el.style.setProperty("--cx-delay",Math.min(Number(el.dataset.cxSequence||0)*45,225)+"ms");
   el.classList.add("cx-enter");
   io.unobserve(el);
  }
 },{threshold:.09,rootMargin:"0px 0px -20px 0px"});
 function observe(){
  let count=0;
  document.querySelectorAll(selector).forEach(el=>{
   if(count++>=28||seen.has(el)||el.closest("[hidden],[aria-hidden='true']"))return;
   seen.add(el);
   el.dataset.cxSequence=String((count-1)%5);
   io.observe(el);
  });
 }
 observe();
 // The driver and results cards may render asynchronously.
 setTimeout(observe,1400);
 setTimeout(observe,4200);
}
let frame=0;
function handlePointer(event){
 if(coarse||reduced||frame)return;
 const el=event.target.closest?.(".cx-card,.cx-mast");
 if(!el)return;
 frame=requestAnimationFrame(()=>{
  frame=0;
  const r=el.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const x=Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100));
  const y=Math.max(0,Math.min(100,(event.clientY-r.top)/r.height*100));
  el.style.setProperty("--cx-pointer-x",x.toFixed(1)+"%");
  el.style.setProperty("--cx-pointer-y",y.toFixed(1)+"%");
 });
}
function start(){
 setupMast();
 decorateCards();
 setupScroll();
 setTimeout(decorateCards,1200);
 setTimeout(decorateCards,3900);
 if(!coarse&&!reduced)document.addEventListener("pointermove",handlePointer,{passive:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();
