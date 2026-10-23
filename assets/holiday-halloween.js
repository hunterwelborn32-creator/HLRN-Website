/* HLRN Halloween 2026. Sitewide via the shared site-shell loader. */
(function(){
 "use strict";
 const now=new Date();
 const enabled=now.getFullYear()===2026 && now.getMonth()===9 && now.getDate()>=23 && now.getDate()<=31;
 if(!enabled)return;
 document.documentElement.classList.add("hlrn-halloween");
 function mount(){
  if(document.querySelector(".hlrn-halloween-corners"))return;
  const layer=document.createElement("div");
  layer.className="hlrn-halloween-corners";
  layer.setAttribute("aria-hidden","true");
  layer.innerHTML='<span class="hlrn-halloween-web left"></span><span class="hlrn-halloween-web right"></span><span class="hlrn-halloween-bat">🦇</span><span class="hlrn-halloween-bat second">🦇</span><span class="hlrn-halloween-pumpkin">🎃</span>';
  document.body.appendChild(layer);
 }
 if(document.body)mount();else document.addEventListener("DOMContentLoaded",mount,{once:true});
})();
