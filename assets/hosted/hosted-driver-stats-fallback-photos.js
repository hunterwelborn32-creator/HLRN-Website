/* HLRN Hosted Driver Statistics fallback photos v1
   Safe enhancer for the Driver Statistics iframe only.
   Uses that iframe's own DRIVER DATA A:M rows, where column M is iRating.
   The core Hosted loader is not modified. */
(function(){
  "use strict";

  const FRAME_ID="hostedFrame-drivers";
  const STYLE_ID="hlrn-hosted-driver-stats-fallback-style-v1";
  let scanTimer=null;

  function getFrame(){
    return document.getElementById(FRAME_ID);
  }

  function installRatingBridge(frame){
    let doc,win;
    try{
      doc=frame.contentDocument;
      win=frame.contentWindow;
    }catch(e){return false}
    if(!doc||!win)return false;
    if(win.__HLRNHostedLatestIRating)return true;

    const script=doc.createElement("script");
    script.textContent=`
      (function(){
        if(window.__HLRNHostedLatestIRating)return;

        function normalizeName(value){
          return String(value||"").trim().toLowerCase();
        }

        function latestRatingFor(name){
          try{
            const target=normalizeName(name);
            const rows=(typeof hlrnDriverRows!=="undefined" && Array.isArray(hlrnDriverRows))
              ? hlrnDriverRows
              : [];

            const matches=rows
              .map(function(row,index){
                if(normalizeName(row && row[3])!==target)return null;
                const rating=Number(row && row[12]);
                if(!Number.isFinite(rating)||rating<=0)return null;
                const rawDate=String((row && row[1])||"").trim();
                const stamp=Date.parse(rawDate);
                return {
                  rating:Math.round(rating),
                  stamp:Number.isFinite(stamp)?stamp:0,
                  index:index
                };
              })
              .filter(Boolean)
              .sort(function(a,b){
                if(b.stamp!==a.stamp)return b.stamp-a.stamp;
                return b.index-a.index;
              });

            return matches.length?matches[0].rating:0;
          }catch(e){
            return 0;
          }
        }

        window.__HLRNHostedLatestIRating=latestRatingFor;
      })();
    `;
    (doc.head||doc.documentElement).appendChild(script);
    script.remove();
    return typeof win.__HLRNHostedLatestIRating==="function";
  }

  function injectStyle(doc){
    if(!doc?.head||doc.getElementById(STYLE_ID))return;
    const style=doc.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .hlrn-hosted-stats-tier-photo{
        display:block!important;
        width:56px!important;
        height:64px!important;
        flex:0 0 56px!important;
        object-fit:contain!important;
        object-position:center bottom!important;
        background:transparent!important;
        border:0!important;
        outline:0!important;
        filter:drop-shadow(0 3px 4px rgba(0,0,0,.22))!important;
      }
      .driver-stat-name .driver-profile-button{
        display:inline-flex!important;
        align-items:center!important;
        gap:10px!important;
      }
      .driver-profile-name{
        display:flex!important;
        align-items:center!important;
        gap:14px!important;
      }
      .driver-profile-name .hlrn-hosted-stats-tier-photo{
        width:100px!important;
        height:114px!important;
        flex-basis:100px!important;
        margin:-18px 0 -14px!important;
      }
      @media(max-width:700px){
        .hlrn-hosted-stats-tier-photo{
          width:44px!important;
          height:52px!important;
          flex-basis:44px!important;
        }
        .driver-profile-name .hlrn-hosted-stats-tier-photo{
          width:76px!important;
          height:88px!important;
          flex-basis:76px!important;
          margin:-10px 0 -8px!important;
        }
      }
    `;
    doc.head.appendChild(style);
  }

  function cleanText(value){
    return String(value||"").replace(/\s+/g," ").trim();
  }

  function nameFromNode(node){
    return cleanText(node?.textContent||"");
  }

  function system(){
    return window.HLRNDrivers||null;
  }

  function ratingFor(frame,name){
    try{
      return Number(frame.contentWindow.__HLRNHostedLatestIRating?.(name))||0;
    }catch(e){
      return 0;
    }
  }

  function realPhotoFor(name){
    const s=system();
    const rec=s?.resolve?.(name);
    if(!rec||rec.hasPhoto===false||!String(rec.photoSlug||"").trim())return "";
    return s.photoUrl?.(rec,"cutout")||"";
  }

  function sourceFor(name,rating){
    const s=system();
    const real=realPhotoFor(name);
    if(real)return real;
    if(rating>0)return s?.iRatingFallbackPhoto?.(rating)||"";
    return "";
  }

  function existingImageState(container){
    const images=[...container.querySelectorAll("img")]
      .filter(img=>!img.classList.contains("hlrn-hosted-stats-tier-photo"));

    if(!images.length)return "none";

    let pending=false;
    for(const img of images){
      if(img.complete){
        if(img.naturalWidth>0&&img.naturalHeight>0)return "loaded";
        img.remove();
        continue;
      }

      pending=true;
      if(!img.dataset.hlrnStatsFallbackWatch){
        img.dataset.hlrnStatsFallbackWatch="1";
        const retry=()=>{
          const host=img.closest(".driver-profile-button,.driver-profile-name");
          if(host){
            host.dataset.hlrnStatsPhoto="";
            setTimeout(()=>decorate(frameRef(),host),0);
          }
        };
        img.addEventListener("load",retry,{once:true});
        img.addEventListener("error",retry,{once:true});
      }
    }
    return pending?"pending":"none";
  }

  function frameRef(){
    return getFrame();
  }

  function decorate(frame,container){
    if(!frame||!container||container.dataset.hlrnStatsPhoto==="1")return;

    const state=existingImageState(container);
    if(state==="loaded"){
      container.dataset.hlrnStatsPhoto="1";
      return;
    }
    if(state==="pending")return;

    const name=nameFromNode(container);
    if(!name)return;

    const rating=ratingFor(frame,name);
    const src=sourceFor(name,rating);
    if(!src)return;

    const img=container.ownerDocument.createElement("img");
    img.className="hlrn-hosted-stats-tier-photo";
    img.src=src;
    img.alt="";
    img.loading="lazy";
    img.decoding="async";
    if(rating>0){
      img.dataset.hlrnIRating=String(rating);
      img.dataset.hlrnTier=rating>=2000?"red":rating>=1500?"blue":rating>=1000?"green":"yellow";
    }

    // Real image paths still get one safe fallback attempt if they fail.
    img.onerror=()=>{
      const fallback=rating>0?system()?.iRatingFallbackPhoto?.(rating):"";
      if(fallback&&img.src!==fallback){
        img.onerror=null;
        img.src=fallback;
      }else{
        img.remove();
      }
    };

    container.prepend(img);
    container.dataset.hlrnStatsPhoto="1";
  }

  function scan(frame){
    let doc;
    try{doc=frame.contentDocument}catch(e){return}
    if(!doc?.body)return;

    injectStyle(doc);
    if(!installRatingBridge(frame))return;

    doc.querySelectorAll(".driver-stat-name .driver-profile-button")
      .forEach(node=>decorate(frame,node));

    const profileName=doc.querySelector(".driver-profile-name");
    if(profileName)decorate(frame,profileName);

    if(!frame.__hlrnDriverStatsPhotoObserver&&"MutationObserver" in window){
      const observer=new MutationObserver(()=>{
        clearTimeout(scanTimer);
        scanTimer=setTimeout(()=>scan(frame),35);
      });
      observer.observe(doc.body,{childList:true,subtree:true});
      frame.__hlrnDriverStatsPhotoObserver=observer;
    }
  }

  function bind(){
    const frame=getFrame();
    if(!frame){
      setTimeout(bind,200);
      return;
    }

    if(!frame.__hlrnDriverStatsPhotoBound){
      frame.__hlrnDriverStatsPhotoBound=true;
      frame.addEventListener("load",()=>{
        [50,250,700,1500,3000].forEach(ms=>setTimeout(()=>scan(frame),ms));
      });

      document.addEventListener("click",event=>{
        try{
          if(event.target.closest?.('[data-hosted-tab="drivers"]')){
            [50,250,700].forEach(ms=>setTimeout(()=>scan(frame),ms));
          }
        }catch(e){}
      },true);
    }

    [0,300,900,1800,3500,6000].forEach(ms=>setTimeout(()=>scan(frame),ms));
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bind,{once:true});
  }else{
    bind();
  }
})();