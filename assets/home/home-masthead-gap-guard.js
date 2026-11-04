/* HLRN: keep the single homepage logo directly below global navigation.
   Some legacy theme/navigation styles are applied after initial paint and add
   empty space above the masthead. Measure the real rendered gap instead of
   guessing a fixed negative offset. No change to racing data or night takeover. */
(()=>{
"use strict";
const masthead=document.getElementById("hlrnCleanMasthead");
const home=document.getElementById("hlrnRaceDayHome");
if(!masthead||!home)return;
let applied=0,queued=false,observing=true;
const nav=()=>document.getElementById("hlrn-global-nav");
function correct(){
 queued=false;
 if(document.body.classList.contains("rn-active")){
  masthead.style.removeProperty("margin-top");applied=0;return;
 }
 // Do not alter the page while somebody is looking farther down it.
 if(window.scrollY>150)return;
 const header=nav();
 const boundary=header?header.getBoundingClientRect().bottom:0;
 const baseline=masthead.getBoundingClientRect().top-applied;
 const desired=boundary+8;
 let offset=Math.min(0,desired-baseline);
 if(!Number.isFinite(offset))return;
 // Clamp to avoid accidentally pulling content over the site navigation.
 offset=Math.max(-650,Math.round(offset));
 if(Math.abs(offset-applied)<2)return;
 masthead.style.setProperty("margin-top",offset+"px","important");
 applied=offset;
}
function queue(){
 if(queued)return;queued=true;
 requestAnimationFrame(correct);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",queue,{once:true});
else queue();
window.addEventListener("load",queue);
const check=setInterval(()=>{queue()},500);
setTimeout(()=>{clearInterval(check);observing=false},18000);
const observer=new MutationObserver(queue);
observer.observe(document.body,{attributes:true,attributeFilter:["class","style"]});
observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-hlrn-theme"]});
window.addEventListener("resize",queue,{passive:true});
})();