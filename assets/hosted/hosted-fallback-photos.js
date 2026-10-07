/* HLRN Hosted fallback photos — safe post-load enhancer
   This file does NOT modify the Hosted loader. It only decorates finished
   Hosted tables after the embedded racing page has rendered. */
(function(){
  "use strict";

  const FRAME_ID="hostedFrame-racing";
  const STYLE_ID="hlrn-hosted-fallback-photo-addon-style";
  const TARGETS="#rankingsResults a.driver-link,#latestResults a.driver-link,#sessionsResults a.driver-link";
  let sharedSnapshot=null;
  let sharedPromise=null;

  const normalize=value=>String(value||"")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g,"");

  function pretty(value){
    let s=String(value||"").trim();
    if(!s)return "";
    if(s.includes(",")){
      const parts=s.split(",");
      const last=(parts.shift()||"").trim().replace(/\d+$/,"");
      const first=parts.join(" ").trim();
      s=(first+" "+last).trim();
    }
    return s.replace(/([A-Za-z])\d+$/,"$1").trim();
  }

  async function loadShared(){
    if(sharedPromise)return sharedPromise;
    sharedPromise=(async()=>{
      try{
        if(window.HLRNDrivers?.load)await window.HLRNDrivers.load();
      }catch(e){}
      try{
        if(window.HLRNData?.load){
          sharedSnapshot=await window.HLRNData.load();
        }else{
          const response=await fetch("../data/hlrn.json?v="+Date.now(),{cache:"no-store"});
          if(response.ok)sharedSnapshot=await response.json();
        }
      }catch(e){}
      return sharedSnapshot;
    })();
    return sharedPromise;
  }

  function latestHostedRating(name){
    const rows=sharedSnapshot?.hosted?.latest?.results||[];
    const key=normalize(pretty(name));
    let found=0;
    for(const row of rows){
      if(normalize(pretty(row?.driver))!==key)continue;
      const rating=Number(row?.iRating??row?.irating);
      if(Number.isFinite(rating)&&rating>0)found=Math.round(rating);
    }
    return found;
  }

  function injectStyle(doc){
    if(!doc?.head||doc.getElementById(STYLE_ID))return;
    const style=doc.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .hlrn-hosted-driver-photo-addon-link{
        display:inline-flex!important;
        align-items:center!important;
        gap:9px!important;
        min-width:0!important;
        vertical-align:middle!important;
      }
      .hlrn-hosted-driver-photo-addon{
        display:block!important;
        width:46px!important;
        height:54px!important;
        flex:0 0 46px!important;
        object-fit:contain!important;
        object-position:center bottom!important;
        background:transparent!important;
        border:0!important;
        outline:0!important;
        filter:drop-shadow(0 3px 4px rgba(0,0,0,.22))!important;
      }
      #rankingsResults .hlrn-hosted-driver-photo-addon{
        width:50px!important;
        height:58px!important;
        flex-basis:50px!important;
      }
      @media(max-width:700px){
        .hlrn-hosted-driver-photo-addon{
          width:36px!important;
          height:42px!important;
          flex-basis:36px!important;
        }
      }
    `;
    doc.head.appendChild(style);
  }

  function recordFor(name){
    return window.HLRNDrivers?.resolve?.(name)
      ||window.HLRNDrivers?.resolve?.(pretty(name))
      ||null;
  }

  function sourceFor(name,rec){
    const latestRating=latestHostedRating(name);
    const rating=latestRating || Number(rec?.iRating??rec?.irating) || 0;
    const system=window.HLRNDrivers;
    const src=system?.displayPhotoUrl?.(rec||name,rating,"cutout")
      ||system?.photoUrl?.(rec||name,"cutout")
      ||system?.iRatingFallbackPhoto?.(rating)
      ||"";
    return {src,rating};
  }

  function enhanceLink(link){
    if(!link||link.dataset.hlrnHostedAddonPhoto==="1")return;
    const raw=String(link.textContent||"").trim();
    if(!raw)return;

    const rec=recordFor(raw);
    if(!rec)return;

    const {src,rating}=sourceFor(raw,rec);
    if(!src)return;

    // A built-in Hosted image may have failed and removed itself. We add our
    // independent image beside the existing name without changing click logic.
    const img=link.ownerDocument.createElement("img");
    img.className="hlrn-hosted-driver-photo-addon";
    img.src=src;
    img.alt="";
    img.loading="lazy";
    img.decoding="async";
    img.dataset.hlrnIRating=String(rating||0);
    img.onerror=()=>{
      const fallback=window.HLRNDrivers?.iRatingFallbackPhoto?.(rating);
      if(fallback&&img.src!==fallback){
        img.onerror=null;
        img.src=fallback;
      }else{
        img.remove();
      }
    };

    link.classList.add("hlrn-hosted-driver-photo-addon-link");
    link.prepend(img);
    link.dataset.hlrnHostedAddonPhoto="1";
  }

  async function enhanceFrame(){
    await loadShared();
    const frame=document.getElementById(FRAME_ID);
    if(!frame)return;

    let doc;
    try{doc=frame.contentDocument;}catch(e){return}
    if(!doc?.body)return;

    injectStyle(doc);
    doc.querySelectorAll(TARGETS).forEach(enhanceLink);

    if(!frame.__hlrnFallbackPhotoObserver&&"MutationObserver" in window){
      const observer=new MutationObserver(()=>{
        try{
          injectStyle(doc);
          doc.querySelectorAll(TARGETS).forEach(enhanceLink);
        }catch(e){}
      });
      observer.observe(doc.body,{childList:true,subtree:true});
      frame.__hlrnFallbackPhotoObserver=observer;
    }
  }

  function bind(){
    const frame=document.getElementById(FRAME_ID);
    if(!frame){
      setTimeout(bind,250);
      return;
    }
    if(!frame.__hlrnFallbackPhotoLoadBound){
      frame.__hlrnFallbackPhotoLoadBound=true;
      frame.addEventListener("load",()=>{
        setTimeout(enhanceFrame,80);
        setTimeout(enhanceFrame,500);
        setTimeout(enhanceFrame,1400);
      });
    }
    enhanceFrame().catch(()=>{});
    setTimeout(()=>enhanceFrame().catch(()=>{}),600);
    setTimeout(()=>enhanceFrame().catch(()=>{}),1800);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bind,{once:true});
  }else{
    bind();
  }
})();