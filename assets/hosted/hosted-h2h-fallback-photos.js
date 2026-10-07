/* HLRN Hosted Head-to-Head driver photos — safe post-load enhancer v1 */
(function(){
  "use strict";

  const FRAME_ID="hostedFrame-h2h";
  const STYLE_ID="hlrn-h2h-driver-photo-addon-style-v1";
  const PROFILE_API="https://script.google.com/macros/s/AKfycbzlheXb7obxCKXtQZKFRvo9FMvKU0qDiuEbnCV3KLM4GDP2-VcM10BOu_j1_dNwO1gPNw/exec";
  const script=document.currentScript;
  const root=new URL("../../",script&&script.src?script.src:location.href);
  const MANIFEST_URL=new URL("data/driver-pages.json",root).href;
  const DATA_URL=new URL("data/hlrn.json",root).href;
  const CUTOUT_BASE=new URL("assets/driver-photos/cutout/",root).href;
  const FALLBACK_BASE=new URL("assets/driver-photos/fallback/",root).href;
  const CACHE_KEY="hlrn_hosted_irating_cache_v1";

  let manifestMap=new Map();
  let ratingMap=new Map();
  let ratingPromises=new Map();
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

  function positiveRating(value){
    const n=Number(value);
    return Number.isFinite(n)&&n>0?Math.round(n):0;
  }

  function fallbackUrl(rating){
    const n=positiveRating(rating);
    if(!n)return "";
    const color=n>=2000?"red":n>=1500?"blue":n>=1000?"green":"yellow";
    return FALLBACK_BASE+color+".webp";
  }

  function tierName(rating){
    const n=positiveRating(rating);
    if(!n)return "unknown";
    return n>=2000?"red":n>=1500?"blue":n>=1000?"green":"yellow";
  }

  function rememberRating(name,value){
    const k=key(name),rating=positiveRating(value);
    if(!k||!rating)return 0;
    ratingMap.set(k,rating);
    try{
      const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");
      saved[k]=rating;
      localStorage.setItem(CACHE_KEY,JSON.stringify(saved));
    }catch(e){}
    return rating;
  }

  function loadCachedRatings(){
    try{
      const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");
      for(const [k,v] of Object.entries(saved||{})){
        const rating=positiveRating(v);
        if(k&&rating)ratingMap.set(k,rating);
      }
    }catch(e){}
  }

  function profileRatingCandidates(profile){
    const out=[];
    const seen=new Set();

    function walk(value,depth){
      if(!value||typeof value!=="object"||depth>5||seen.has(value))return;
      seen.add(value);

      if(Array.isArray(value)){
        value.forEach(item=>walk(item,depth+1));
        return;
      }

      const rating=positiveRating(
        value.iRating??value.irating??value.i_rating??
        value.currentIRating??value.current_irating
      );

      if(rating){
        const stamp=Date.parse(
          value.date??value.raceDate??value.race_date??
          value.timestamp??value.createdAt??value.created_at??""
        )||0;
        out.push({rating,stamp});
      }

      Object.values(value).forEach(item=>walk(item,depth+1));
    }

    walk(profile,0);
    out.sort((a,b)=>b.stamp-a.stamp);
    return out;
  }

  async function fetchProfileRating(name){
    const k=key(name);
    if(!k)return 0;
    if(ratingMap.has(k))return ratingMap.get(k);
    if(ratingPromises.has(k))return ratingPromises.get(k);

    const promise=(async()=>{
      try{
        const url=PROFILE_API+"?action=profile&driver="+encodeURIComponent(String(name||"").trim())+"&_="+Date.now();
        const response=await fetch(url,{cache:"no-store"});
        if(!response.ok)return 0;
        const profile=await response.json();
        const rating=profileRatingCandidates(profile)[0]?.rating||0;
        if(rating)return rememberRating(name,rating);
      }catch(e){
        console.warn("HLRN H2H iRating lookup failed for",name,e);
      }
      return 0;
    })();

    ratingPromises.set(k,promise);
    try{return await promise}
    finally{ratingPromises.delete(k)}
  }

  async function loadData(){
    if(dataPromise)return dataPromise;
    dataPromise=(async()=>{
      loadCachedRatings();

      try{
        const [manifestResponse,dataResponse]=await Promise.all([
          fetch(MANIFEST_URL+"?v="+Date.now(),{cache:"no-store"}),
          fetch(DATA_URL+"?v="+Date.now(),{cache:"no-store"})
        ]);

        if(manifestResponse.ok){
          const manifest=await manifestResponse.json();
          for(const rec of (manifest?.drivers||[])){
            const names=[rec.name,rec.rawName,rec.displayName,...(rec.aliases||[])];
            for(const name of names){
              const k=key(name);
              if(k&&!manifestMap.has(k))manifestMap.set(k,rec);
            }
            const rating=positiveRating(rec?.iRating??rec?.irating);
            if(rating)rememberRating(rec.name,rating);
          }
        }

        if(dataResponse.ok){
          const snapshot=await dataResponse.json();

          for(const item of Object.values(snapshot?.hosted?.driverRatings||{})){
            const rating=positiveRating(item?.iRating??item?.irating);
            if(rating)rememberRating(item?.driver,rating);
          }

          for(const row of (snapshot?.hosted?.latest?.results||[])){
            const rating=positiveRating(row?.iRating??row?.irating);
            if(rating)rememberRating(row?.driver,rating);
          }
        }
      }catch(e){
        console.warn("HLRN H2H photo data unavailable",e);
      }
    })();
    return dataPromise;
  }

  function injectStyle(doc){
    if(!doc?.head||doc.getElementById(STYLE_ID))return;
    const style=doc.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .fighter .hlrn-h2h-driver-photo{
        display:block!important;
        width:150px!important;
        height:150px!important;
        max-width:42vw!important;
        margin:0 auto 10px!important;
        object-fit:contain!important;
        object-position:center bottom!important;
        background:transparent!important;
        border:0!important;
        outline:0!important;
        filter:drop-shadow(0 8px 12px rgba(0,0,0,.34))!important;
        position:relative!important;
        z-index:2!important;
      }
      .fighter .hlrn-h2h-photo-tier{
        position:absolute!important;
        top:8px!important;
        right:9px!important;
        z-index:3!important;
        padding:3px 5px!important;
        border:1px solid rgba(255,255,255,.16)!important;
        background:rgba(0,0,0,.68)!important;
        color:#aeb5bd!important;
        font:900 7px/1 Arial,sans-serif!important;
        letter-spacing:.08em!important;
        text-transform:uppercase!important;
        pointer-events:none!important;
      }
      @media(max-width:900px){
        .fighter .hlrn-h2h-driver-photo{
          width:125px!important;
          height:125px!important;
        }
      }
      @media(max-width:520px){
        .fighter .hlrn-h2h-driver-photo{
          width:100px!important;
          height:100px!important;
          margin-bottom:7px!important;
        }
      }
    `;
    doc.head.appendChild(style);
  }

  function recordFor(name){
    return manifestMap.get(key(name))||null;
  }

  function realPhotoFor(rec){
    return rec?.hasPhoto&&String(rec?.photoSlug||"").trim()
      ?CUTOUT_BASE+encodeURIComponent(rec.photoSlug)+".webp"
      :"";
  }

  function existingLoadedImage(fighter){
    const images=[...fighter.querySelectorAll("img")].filter(img=>!img.classList.contains("hlrn-h2h-driver-photo"));
    let pending=false;

    for(const img of images){
      if(img.complete){
        if(img.naturalWidth>0&&img.naturalHeight>0)return "loaded";
        img.remove();
      }else{
        pending=true;
        if(!img.dataset.hlrnH2HPhotoWatch){
          img.dataset.hlrnH2HPhotoWatch="1";
          const retry=()=>{
            fighter.dataset.hlrnH2HPhoto="";
            setTimeout(()=>decorateFighter(fighter).catch(()=>{}),0);
          };
          img.addEventListener("load",retry,{once:true});
          img.addEventListener("error",retry,{once:true});
        }
      }
    }

    return pending?"pending":"none";
  }

  function insertPhoto(fighter,name,src,rating,isFallback){
    if(!src||fighter.querySelector("img.hlrn-h2h-driver-photo"))return;

    const nameEl=fighter.querySelector(".driver-name");
    if(!nameEl)return;

    const img=fighter.ownerDocument.createElement("img");
    img.className="hlrn-h2h-driver-photo";
    img.src=src;
    img.alt="";
    img.loading="lazy";
    img.decoding="async";
    img.dataset.hlrnIRating=String(rating||"");
    img.dataset.hlrnTier=tierName(rating);

    if(!isFallback){
      const fallback=fallbackUrl(rating);
      img.onerror=()=>{
        if(fallback&&img.src!==fallback){
          img.onerror=null;
          img.src=fallback;
        }else{
          img.remove();
        }
      };
    }

    fighter.insertBefore(img,nameEl);
    fighter.dataset.hlrnH2HPhoto="1";
  }

  async function decorateFighter(fighter){
    if(!fighter||fighter.dataset.hlrnH2HPhoto==="1"||fighter.dataset.hlrnH2HPhoto==="pending")return;

    const nameEl=fighter.querySelector(".driver-name");
    const name=String(nameEl?.textContent||"").trim();
    if(!name)return;

    const state=existingLoadedImage(fighter);
    if(state==="loaded"){
      fighter.dataset.hlrnH2HPhoto="1";
      return;
    }
    if(state==="pending")return;

    const rec=recordFor(name);
    let rating=ratingMap.get(key(name))||positiveRating(rec?.iRating??rec?.irating);
    const real=realPhotoFor(rec);

    if(real){
      insertPhoto(fighter,name,real,rating,false);
      return;
    }

    if(!rating){
      fighter.dataset.hlrnH2HPhoto="pending";
      rating=await fetchProfileRating(name);
      fighter.dataset.hlrnH2HPhoto="";
    }

    // Unknown iRating is NOT yellow. Leave it unclassified until verified.
    if(!rating)return;

    insertPhoto(fighter,name,fallbackUrl(rating),rating,true);
  }

  function scanDoc(doc){
    doc.querySelectorAll(".matchup-card .fighter,.fight-head .fighter").forEach(fighter=>{
      decorateFighter(fighter).catch(()=>{});
    });
  }

  async function scan(){
    await loadData();

    const frame=document.getElementById(FRAME_ID);
    if(!frame)return;

    let doc;
    try{doc=frame.contentDocument}catch(e){return}
    if(!doc?.body)return;

    injectStyle(doc);
    scanDoc(doc);

    if(!frame.__hlrnH2HPhotoObserver&&"MutationObserver" in window){
      const observer=new MutationObserver(()=>{
        clearTimeout(scanTimer);
        scanTimer=setTimeout(()=>{
          try{
            injectStyle(doc);
            doc.querySelectorAll(".fighter").forEach(fighter=>{
              const current=String(fighter.querySelector(".driver-name")?.textContent||"").trim();
              const previous=fighter.dataset.hlrnH2HDriver||"";
              if(current!==previous){
                fighter.dataset.hlrnH2HPhoto="";
                fighter.querySelectorAll("img.hlrn-h2h-driver-photo").forEach(img=>img.remove());
                fighter.dataset.hlrnH2HDriver=current;
              }
            });
            scanDoc(doc);
          }catch(e){}
        },40);
      });
      observer.observe(doc.body,{childList:true,subtree:true,characterData:true});
      frame.__hlrnH2HPhotoObserver=observer;
    }
  }

  function bind(){
    const frame=document.getElementById(FRAME_ID);
    if(!frame){
      setTimeout(bind,200);
      return;
    }

    if(!frame.__hlrnH2HPhotoBound){
      frame.__hlrnH2HPhotoBound=true;
      frame.addEventListener("load",()=>{
        [50,250,700,1500,3000].forEach(ms=>setTimeout(()=>scan().catch(()=>{}),ms));
      });
    }

    [0,300,900,1800,3500].forEach(ms=>setTimeout(()=>scan().catch(()=>{}),ms));
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bind,{once:true});
  }else{
    bind();
  }
})();