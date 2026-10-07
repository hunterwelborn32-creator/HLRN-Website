/* HLRN Hosted fallback photos — independent post-load enhancer v2
   Never touches the Hosted loader. It scans completed table rows and inserts
   a real HLRN cutout or iRating-tier fallback when the cell has no image. */
(function(){
  "use strict";

  const FRAME_ID="hostedFrame-racing";
  const STYLE_ID="hlrn-hosted-fallback-photo-addon-style-v2";
  const script=document.currentScript;
  const root=new URL("../../",script&&script.src?script.src:location.href);
  const MANIFEST_URL=new URL("data/driver-pages.json",root).href;
  const DATA_URL=new URL("data/hlrn.json",root).href;
  const CUTOUT_BASE=new URL("assets/driver-photos/cutout/",root).href;
  const FALLBACK_BASE=new URL("assets/driver-photos/fallback/",root).href;

  let manifestMap=new Map();
  let latestRatingMap=new Map();
  let dataPromise=null;
  let scanTimer=null;

  const cleanName=value=>{
    let s=String(value||"").trim();
    if(s.includes(",")){
      const parts=s.split(",");
      const last=(parts.shift()||"").trim().replace(/\d+$/,"");
      const first=parts.join(" ").trim();
      s=(first+" "+last).trim();
    }
    return s.replace(/([A-Za-z])\d+$/,"$1").trim();
  };

  const key=value=>cleanName(value).toLowerCase().replace(/[^a-z0-9]/g,"");

  function fallbackUrl(rating){
    const n=Number(rating)||0;
    const color=n>=2000?"red":n>=1500?"blue":n>=1000?"green":"yellow";
    return FALLBACK_BASE+color+".webp";
  }

  async function loadData(){
    if(dataPromise)return dataPromise;
    dataPromise=(async()=>{
      try{
        const [manifestResponse,dataResponse]=await Promise.all([
          fetch(MANIFEST_URL+"?v="+Date.now(),{cache:"no-store"}),
          fetch(DATA_URL+"?v="+Date.now(),{cache:"no-store"})
        ]);

        if(manifestResponse.ok){
          const payload=await manifestResponse.json();
          for(const rec of (payload?.drivers||[])){
            const names=[rec.name,rec.displayName,rec.rawName,...(rec.aliases||[])];
            for(const name of names){
              const k=key(name);
              if(k&&!manifestMap.has(k))manifestMap.set(k,rec);
            }
          }
        }

        if(dataResponse.ok){
          const snapshot=await dataResponse.json();
          for(const row of (snapshot?.hosted?.latest?.results||[])){
            const k=key(row?.driver);
            const rating=Number(row?.iRating??row?.irating);
            if(k&&Number.isFinite(rating)&&rating>0)latestRatingMap.set(k,Math.round(rating));
          }
        }
      }catch(err){
        console.warn("HLRN Hosted fallback photo data unavailable",err);
      }
    })();
    return dataPromise;
  }

  function injectStyle(doc){
    if(!doc?.head||doc.getElementById(STYLE_ID))return;
    const style=doc.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .hlrn-hosted-photo-v2-wrap{
        display:inline-flex!important;
        align-items:center!important;
        gap:9px!important;
        min-width:0!important;
        vertical-align:middle!important;
      }
      .hlrn-hosted-photo-v2{
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
      #rankingsResults .hlrn-hosted-photo-v2{
        width:50px!important;
        height:58px!important;
        flex-basis:50px!important;
      }
      @media(max-width:700px){
        .hlrn-hosted-photo-v2{
          width:36px!important;
          height:42px!important;
          flex-basis:36px!important;
        }
      }
    `;
    doc.head.appendChild(style);
  }

  function driverInfo(name){
    const k=key(name);
    const rec=manifestMap.get(k)||null;
    const latest=latestRatingMap.get(k);
    const rating=latest || Number(rec?.iRating??rec?.irating) || 0;
    const hasReal=!!(rec?.hasPhoto && String(rec?.photoSlug||"").trim());
    const real=hasReal?CUTOUT_BASE+encodeURIComponent(rec.photoSlug)+".webp":"";
    return {
      display:cleanName(rec?.name||name),
      rating,
      real,
      fallback:fallbackUrl(rating)
    };
  }

  function existingImageState(cell){
    const images=[...cell.querySelectorAll("img")].filter(img=>!img.classList.contains("hlrn-hosted-photo-v2"));
    if(!images.length)return "none";

    let pending=false;
    for(const img of images){
      if(img.complete){
        if(img.naturalWidth>0&&img.naturalHeight>0)return "loaded";
        // Broken legacy Hosted image: remove it so the fallback can take over.
        img.remove();
        continue;
      }

      pending=true;
      if(!img.dataset.hlrnFallbackWatch){
        img.dataset.hlrnFallbackWatch="1";
        const retry=()=>{
          try{
            const cellNow=img.closest("td");
            if(cellNow){
              cellNow.dataset.hlrnHostedPhotoV2="";
              decorateCell(cellNow);
            }
          }catch(e){}
        };
        img.addEventListener("load",retry,{once:true});
        img.addEventListener("error",retry,{once:true});
      }
    }

    return pending?"pending":"none";
  }

  function decorateCell(cell){
    if(!cell||cell.dataset.hlrnHostedPhotoV2==="1")return;

    const imageState=existingImageState(cell);
    if(imageState==="loaded"){
      cell.dataset.hlrnHostedPhotoV2="1";
      return;
    }
    if(imageState==="pending"){
      // Do not mark this row complete. The image's load/error handler or the
      // mutation observer will retry after the legacy Hosted image resolves.
      return;
    }

    const link=cell.querySelector("a.driver-link,a.hlrn-driver-link,a");
    const raw=String((link||cell).textContent||"").trim();
    if(!raw)return;

    const info=driverInfo(raw);
    const doc=cell.ownerDocument;
    const img=doc.createElement("img");
    img.className="hlrn-hosted-photo-v2";
    img.alt="";
    img.loading="lazy";
    img.decoding="async";
    img.dataset.hlrnIRating=String(info.rating);
    img.dataset.hlrnTier=info.rating>=2000?"red":info.rating>=1500?"blue":info.rating>=1000?"green":"yellow";
    img.src=info.real||info.fallback;
    img.onerror=()=>{
      if(img.src!==info.fallback){
        img.onerror=null;
        img.src=info.fallback;
      }else{
        img.remove();
      }
    };

    if(link){
      link.classList.add("hlrn-hosted-photo-v2-wrap");
      link.prepend(img);
    }else{
      const wrap=doc.createElement("span");
      wrap.className="hlrn-hosted-photo-v2-wrap";
      const text=doc.createElement("span");
      text.textContent=raw;
      cell.textContent="";
      wrap.append(img,text);
      cell.appendChild(wrap);
    }

    cell.dataset.hlrnHostedPhotoV2="1";
  }

  function scanRows(doc){
    // Driver column: Rankings=2, Latest Results=2, Sessions=4.
    doc.querySelectorAll("#rankingsResults tr").forEach(row=>decorateCell(row.cells?.[1]));
    doc.querySelectorAll("#latestResults tr").forEach(row=>decorateCell(row.cells?.[1]));
    doc.querySelectorAll("#sessionsResults tr").forEach(row=>decorateCell(row.cells?.[3]));
  }

  async function scan(){
    await loadData();
    const frame=document.getElementById(FRAME_ID);
    if(!frame)return;
    let doc;
    try{doc=frame.contentDocument;}catch(e){return}
    if(!doc?.body)return;

    injectStyle(doc);
    scanRows(doc);

    if(!frame.__hlrnHostedPhotoV2Observer&&"MutationObserver" in window){
      const observer=new MutationObserver(()=>{
        clearTimeout(scanTimer);
        scanTimer=setTimeout(()=>{
          try{injectStyle(doc);scanRows(doc)}catch(e){}
        },30);
      });
      observer.observe(doc.body,{childList:true,subtree:true});
      frame.__hlrnHostedPhotoV2Observer=observer;
    }
  }

  function bind(){
    const frame=document.getElementById(FRAME_ID);
    if(!frame){
      setTimeout(bind,200);
      return;
    }

    if(!frame.__hlrnHostedPhotoV2Bound){
      frame.__hlrnHostedPhotoV2Bound=true;
      frame.addEventListener("load",()=>{
        [50,250,700,1500,3000].forEach(ms=>setTimeout(()=>scan().catch(()=>{}),ms));
      });
    }

    [0,300,900,1800,3500,6000].forEach(ms=>setTimeout(()=>scan().catch(()=>{}),ms));
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bind,{once:true});
  }else{
    bind();
  }
})();