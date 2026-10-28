/* HLRN Gridlight: presentation-only motion. No race data or theme state writes. */
(function(){
  "use strict";
  function init(){
    var home=document.querySelector(".home10");
    if(!home)return;
    var reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var main=home.querySelector("main");
    if(!reduced&&main&&"IntersectionObserver" in window){
      var targets=main.querySelectorAll(".h10-section-head,.h10-week-card,.h10-story-art,.hlrn-recap-grid,.h20-panel,.h20-results-panel,.h20-utility a,.h10-link-card");
      targets.forEach(function(el){el.classList.add("h29-reveal")});
      var observer=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add("h29-visible");
            observer.unobserve(entry.target);
          }
        });
      },{threshold:0.07,rootMargin:"0px 0px -24px 0px"});
      main.classList.add("h29-motion-ready");
      targets.forEach(function(el){observer.observe(el)});
    }
    var hero=home.querySelector(".h10-hero");
    var fine=window.matchMedia&&window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if(!reduced&&hero&&fine){
      var frame=0,px=0,py=0;
      function paint(){
        hero.style.setProperty("--h29-mouse-x",(px*12).toFixed(1)+"px");
        hero.style.setProperty("--h29-mouse-y",(py*8).toFixed(1)+"px");
        frame=0;
      }
      hero.addEventListener("pointermove",function(event){
        var rect=hero.getBoundingClientRect();
        if(!rect.width||!rect.height)return;
        px=(event.clientX-rect.left)/rect.width*2-1;
        py=(event.clientY-rect.top)/rect.height*2-1;
        if(!frame)frame=requestAnimationFrame(paint);
      },{passive:true});
      hero.addEventListener("pointerleave",function(){
        px=0;py=0;
        if(!frame)frame=requestAnimationFrame(paint);
      },{passive:true});
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
