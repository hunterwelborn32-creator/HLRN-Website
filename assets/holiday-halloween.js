/* Navigation-only Halloween. Shared site-shell loads this on every page using it. */
(function(){
 "use strict";
 const d=new Date();
 if(!(d.getFullYear()===2026&&d.getMonth()===9&&d.getDate()>=23&&d.getDate()<=31))return;
 document.documentElement.classList.add("hlrn-halloween");
 function apply(){
   document.querySelectorAll("#hlrn-global-nav").forEach(nav=>{
     if(nav.querySelector(".hgn-halloween-trim"))return;
     const ornament=document.createElement("span");
     ornament.className="hgn-halloween-trim";
     ornament.setAttribute("aria-hidden","true");
     nav.appendChild(ornament);
   });
   document.querySelectorAll(".hlrn-haunt-stage,.hlrn-haunt-seal,.hlrn-haunt-banner,.hlrn-halloween-corners").forEach(el=>el.remove());
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
 const observer=new MutationObserver(()=>{if(document.querySelector("#hlrn-global-nav:not(:has(.hgn-halloween-trim))"))apply();});
 observer.observe(document.documentElement,{childList:true,subtree:true});
})();
