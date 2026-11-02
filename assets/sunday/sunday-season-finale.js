/* Season 2 Sunday finale. Existing champion art, live data and Monday are untouched. */
(function(){
 "use strict";
 const finale="2026-11-01",script=document.currentScript;
 const url=new URL("../../data/schedules-2026.json",script.src);
 const byId=id=>document.getElementById(id);
 function todayET(){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",
   year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const obj={};parts.forEach(p=>{obj[p.type]=p.value});
  return obj.year+"-"+obj.month+"-"+obj.day;
 }
 function text(el,value){if(el&&el.textContent!==value)el.textContent=value}
 function home(show,hasNextSeason){
  const feature=byId("hlrnSundayFinaleHome");if(feature)feature.hidden=!show;
  if(!show)return;
  text(document.querySelector(".h20-panel.sunday .h20-live-label"),"FINAL STANDINGS");
  if(hasNextSeason)return; // Real published Season 3 dates take priority in upcoming cards.
  const card=document.querySelector(".h10-upcoming-card.sunday");
  const week=document.querySelector(".h10-week-card.sunday");
  if(card)card.classList.add("hlrn-sunday-card-done");
  if(week)week.classList.add("hlrn-sunday-card-done");
  function refresh(){
   text(byId("h10UpcomingSundayTrack"),"SUNDAY SEASON COMPLETE");
   text(byId("h10UpcomingSundayDate"),"Season 2 • Championship decided");
   const time=byId("h10UpcomingSundayTime");if(time)time.hidden=true;
   const link=card&&card.querySelector("a");
   if(link){link.href="standings/sunday.html";text(link,"Sunday Final Standings →")}
   text(byId("v7SundayTrack"),"THE CHECKERED FLAG HAS FALLEN");
   text(byId("v7SundayDate"),"Season 2 • Talladega finale • November 1");
   const detail=byId("v7SundayDetails");if(detail)detail.hidden=true;
   if(week){week.href="standings/sunday.html";text(week.querySelector("b"),"View Final Standings →")}
  }
  refresh();
  // Async race-week data must not replace a finished Sunday race with "schedule pending".
  for(const node of [card,week]){
   if(!node)continue;
   let pending=false;
   new MutationObserver(function(){
    if(pending)return;pending=true;
    requestAnimationFrame(function(){pending=false;refresh()});
   }).observe(node,{childList:true,characterData:true,subtree:true});
  }
 }
 function standings(show,newSeasonStarted){
  const stripe=byId("hlrnSundaySeasonFinished");if(stripe)stripe.hidden=!show;
  document.body.classList.toggle("hlrn-sunday-season-done",show);
  const oldBanner=byId("hlrnSundayS2Takeover");
  if(oldBanner&&newSeasonStarted)oldBanner.style.setProperty("display","none","important");
  if(!show)return;
  const heading=document.querySelector(".cc-hero-main .cc-title");
  if(heading)heading.innerHTML='Championship <span>Final Results</span>';
  text(document.querySelector(".cc-hero-main .cc-kicker"),"High Line Racing Network • Sunday Night League • Season 2 Complete");
  text(document.querySelector(".cc-hero-main .cc-sub"),"The Sunday season is in the books. Explore final driver standings, team rankings and the season finale below.");
  text(document.querySelector(".cc-hero-side .cc-leader-label"),"Final Points Leader");
  text(document.querySelector(".cc-live-row .cc-pill.red"),"FINAL RACE • NOVEMBER 1");
 }
 async function start(){
  let rows;
  try{
   const res=await fetch(url,{cache:"no-store"});if(!res.ok)throw Error("Schedule unavailable");
   const data=await res.json();
   rows=Array.isArray(data&&data.leagues&&data.leagues.sunday)?data.leagues.sunday:[];
  }catch(err){console.warn("Sunday finale: keeping previous display; schedule could not load.",err);return}
  const later=rows.filter(r=>r&&!r.off&&r.track&&/^\d{4}-\d{2}-\d{2}$/.test(r.date||"")&&r.date>finale)
   .sort((a,b)=>a.date.localeCompare(b.date));
  const today=todayET();
  const season3Started=!!(later.length&&later[0].date<=today);
  const finished=today>finale&&!season3Started;
  home(finished,later.length>0);
  standings(finished,season3Started);
  const result=byId("sundayComplete");if(result)result.classList.toggle("hlrn-sunday-results-done",finished);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
 else start();
})();