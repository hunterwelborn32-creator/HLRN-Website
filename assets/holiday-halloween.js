/* HLRN Haunted Speedway — October 23–31, 2026. Global decorative-only layer. */
(function(){
 "use strict";
 const d=new Date(), active=d.getFullYear()===2026&&d.getMonth()===9&&d.getDate()>=23&&d.getDate()<=31;
 if(!active)return;
 document.documentElement.classList.add("hlrn-halloween");
 function mount(){
  if(document.querySelector(".hlrn-haunt-stage"))return;
  const stage=document.createElement("div");stage.className="hlrn-haunt-stage";stage.setAttribute("aria-hidden","true");
  const bat='<svg class="hlrn-haunt-bat" viewBox="0 0 120 48" aria-hidden="true"><path d="M59 14 Q51 1 44 7 L43 20 Q27 5 12 17 L0 12 Q6 24 8 38 Q23 29 37 40 Q42 29 55 33 L60 41 L65 33 Q77 29 83 40 Q97 29 112 38 Q114 24 120 12 L108 17 Q93 5 77 20 L76 7 Q69 1 61 14 Z"/></svg>';
  stage.innerHTML='<div class="hlrn-haunt-mist"></div><div class="hlrn-haunt-moon"></div>'+bat+bat.replace('class="hlrn-haunt-bat"','class="hlrn-haunt-bat bat-2"')+'<div class="hlrn-haunt-corner left"></div><div class="hlrn-haunt-corner right"></div>';
  if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
   for(let i=0;i<13;i++){const e=document.createElement("i");e.className="hlrn-haunt-ember";e.style.setProperty("--ember-left",(8+(i*37)%86)+"%");e.style.setProperty("--ember-speed",(10+(i%5)*2)+"s");e.style.setProperty("--ember-delay",(-i*1.7)+"s");stage.appendChild(e);}
  }
  document.body.appendChild(stage);
  const seal=document.createElement("div");seal.className="hlrn-haunt-seal";seal.setAttribute("aria-hidden","true");seal.textContent="🎃";document.body.appendChild(seal);
  if(!document.querySelector(".hlrn-haunt-banner")){
   const banner=document.createElement("div");banner.className="hlrn-haunt-banner";banner.innerHTML='<span class="haunt-light" aria-hidden="true"></span><span class="haunt-mark" aria-hidden="true">🏁</span><span class="haunt-title">HLRN · Haunted Speedway</span><span class="haunt-detail">October 23–31 · Where the racing never rests</span><span class="haunt-mark" aria-hidden="true">🎃</span>';
   const nav=document.querySelector("#hlrn-global-nav");
   if(nav)nav.insertAdjacentElement("afterend",banner);else document.body.insertBefore(banner,document.body.firstChild);
  }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
