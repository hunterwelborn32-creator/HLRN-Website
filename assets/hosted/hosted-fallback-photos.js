/* HLRN Hosted fallback photos — independent post-load enhancer v4
   Never touches the Hosted loader.
   Color tiers use a VERIFIED iRating only:
   red 2000+, blue 1500-1999, green 1000-1499, yellow <=999.
   Missing/unknown iRating is never treated as 0/yellow. */
(function(){
  "use strict";

  const FRAME_ID="hostedFrame-racing";
  const STYLE_ID="hlrn-hosted-fallback-photo-addon-style-v4";
  const PROFILE_API="https://script.google.com/macros/s/AKfycbzlheXb7obxCKXtQZKFRvo9FMvKU0qDiuEbnCV3KLM4GDP2-VcM10BOu_j1_dNwO1gPNw/exec";
  const script=document.currentScript;
  const root=new URL("../../",script&&script.src?script.src:location.href);
  const MANIFEST_URL=new URL("data/driver-pages.json",root).href;
  const DATA_URL=new URL("data/hlrn.json",root).href;
  const CUTOUT_BASE=new URL("assets/driver-photos/cutout/",root).href;
  const FALLBACK_BASE=new URL("assets/driver-photos/fallback/",root).href;
  const RATING_CACHE_KEY="hlrn_hosted_irating_cache_v1";

  let manifestMap=new Map();
  let verifiedRatingMap=new Map();
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

  function loadSavedRatings(){
    try{
      const saved=JSON.parse(localStorage.getItem(RATING_CACHE_KEY)||"{}");
      for(const [k,v] of Object.entries(saved||{})){
        const rating=positiveRating(v);
        if(k&&rating)verifiedRatingMap.set(k,rating);
      }
    }catch(e){}
  }

  function saveRatings(){
    try{
      const out={};
      verifiedRatingMap.forEach((v,k)=>{if(positiveRating(v))out[k]=positiveRating(v)});
      localStorage.setItem(RATING_CACHE_KEY,JSON.stringify(out));
    }catch(e){}
  }

  function rememberRating(name,value){
    const k=key(name),rating=positiveRating(value);
    if(!k||!rating)return 0;
    verifiedRatingMap.set(k,rating);
    saveRatings();
    return rating;
  }

  function ratingCandidatesFromProfile(profile){
    const found=[];
    const exactKeys=new Set(["irating","i_rating","currentirating","current_i_rating"]);
    const seen=new Set();

    function walk(value,depth){
      if(depth>5||value==null)return;
      if(typeof value!=="object")return;
      if(seen.has(value))return;
      seen.add(value);

      if(Array.isArray(value)){
        value.forEach(item=>walk(item,depth+1));
        return;
      }

      let localRating=0;
      for(const [prop,val] of Object.entries(value)){
        const normalized=String(prop||"").toLowerCase().replace(/[^a-z0-9_]/g,"");
        if(exactKeys.has(normalized)){
          const r=positiveRating(val);
          if(r)localRating=r;
        }
      }

      if(localRating){
        const rawDate=value.date??value.raceDate??value.race_date??value.timestamp??value.createdAt??"";
        const stamp=Date.parse(rawDate)||0;
        found.push({rating:localRating,stamp});
      }

      for(const val of Object.values(value))walk(val,depth+1);
    }

    walk(profile,0);
    found.sort((a,b)=>(b.stamp||0)-(a.stamp||0));
    return found;
  }

  async function profileRating(name){
    const k=key(name);
    if(!k)return 0;
    if(verifiedRatingMap.has(k))return verifiedRatingMap.get(k);
    if(ratingPromises.has(k))return ratingPromises.get(k);

    const task=(async()=>{
      try{
        const url=PROFILE_API+"?action=profile&driver="+encodeURIComponent(String(name||"").trim())+"&_="+Date.now();
        const response=await fetch(url,{cache:"no-store"});
        if(!response.ok)return 0;
        const profile=await response.json();
        const candidates=ratingCandidatesFromProfile(profile);
        const rating=candidates[0]?.rating||0;
        if(rating)return rememberRating(name,rating);
      }catch(err){
        console.warn("HLRN Hosted iRating lookup failed for",name,err);
      }
      return 0;
    })();

    ratingPromises.set(k,task);
    try{return await task}
    finally{ratingPromises.delete(k)}
  }

  async function loadData(){
    if(dataPromise)return dataPromise;
    dataPromise=(async()=>{
      loadSavedRatings();
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
            const manifestRating=positiveRating(rec?.iRating??rec?.irating);
            if(manifestRating)rememberRating(rec.name,manifestRating);
          }
        }

        if(dataResponse.ok){
          const snapshot=await dataResponse.json();
          for(const row of (snapshot?.hosted?.latest?.results||[])){
            const rating=positiveRating(row?.iRating??row?.irating);
            if(rating)rememberRating(row?.driver,rating);
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
      .hlrn-hosted-photo-v4-wrap{
        display:inline-flex!important;
        align-items:center!important;
        gap:9px!important;
        min-width:0!important;
        vertical-align:middle!important;
      }
      .hlrn-hosted-photo-v4{
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
      #rankingsResults .hlrn-hosted-photo-v4{
        width:50px!important;
        height:58px!important;
        flex-basis:50px!important;
      }
      @media(max-width:700px){
        .hlrn-hosted-photo-v4{
          width:36px!important;
          height:42px!important;
          flex-basis:36px!important;
        }
      }
    `;
    doc.head.appendChild(style);
  }

  function recordFor(name){
    return manifestMap.get(key(name))
      ||manifestMap.get(key(cleanName(name)))
      ||null;
  }

  function realPhotoFor(rec){
    return rec?.hasPhoto&&String(rec?.photoSlug||"").trim()
      ?CUTOUT_BASE+encodeURIComponent(rec.photoSlug)+".webp"
      :"";
  }

  function existingImageState(cell){
    const images=[...cell.querySelectorAll("img")].filter(img=>!img.classList.contains("hlrn-hosted-photo-v4"));
    if(!images.length)return "none";

    let pending=false;
    for(const img of images){
      if(img.complete){
        if(img.naturalWidth>0&&img.naturalHeight>0)return "loaded";
        img.remove();
        continue;
      }

      pending=true;
      if(!img.dataset.hlrnFallbackWatchV4){
        img.dataset.hlrnFallbackWatchV4="1";
        const retry=()=>{
          try{
            const cellNow=img.closest("td");
            if(cellNow){
              cellNow.dataset.hlrnHostedPhotoV4="";
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

  function insertPhoto(cell,link,src,rating){
    if(!src||!cell)return;
    const doc=cell.ownerDocument;
    if(cell.querySelector("img.hlrn-hosted-photo-v4"))return;

    const img=doc.createElement("img");
    img.className="hlrn-hosted-photo-v4";
    img.alt="";
    img.loading="lazy";
    img.decoding="async";
    img.dataset.hlrnIRating=String(rating||"");
    if(rating){
      img.dataset.hlrnTier=rating>=2000?"red":rating>=1500?"blue":rating>=1000?"green":"yellow";
    }
    img.src=src;

    if(link){
      link.classList.add("hlrn-hosted-photo-v4-wrap");
      link.prepend(img);
    }else{
      const raw=String(cell.textContent||"").trim();
      const wrap=doc.createElement("span");
      wrap.className="hlrn-hosted-photo-v4-wrap";
      const text=doc.createElement("span");
      text.textContent=raw;
      cell.textContent="";
      wrap.append(img,text);
      cell.appendChild(wrap);
    }
    cell.dataset.hlrnHostedPhotoV4="1";
  }

  async function decorateCell(cell){
    if(!cell||cell.dataset.hlrnHostedPhotoV4==="1"||cell.dataset.hlrnHostedPhotoV4==="pending")return;

    const imageState=existingImageState(cell);
    if(imageState==="loaded"){
      cell.dataset.hlrnHostedPhotoV4="1";
      return;
    }
    if(imageState==="pending")return;

    const link=cell.querySelector("a.driver-link,a.hlrn-driver-link,a");
    const raw=String((link||cell).textContent||"").trim();
    if(!raw)return;

    const rec=recordFor(raw);
    const real=realPhotoFor(rec);
    if(real){
      insertPhoto(cell,link,real,positiveRating(rec?.iRating??rec?.irating));
      return;
    }

    // No real photo: require a VERIFIED iRating before assigning a color.
    let rating=verifiedRatingMap.get(key(raw))||positiveRating(rec?.iRating??rec?.irating);
    if(rating){
      insertPhoto(cell,link,fallbackUrl(rating),rating);
      return;
    }

    cell.dataset.hlrnHostedPhotoV4="pending";
    rating=await profileRating(raw);
    cell.dataset.hlrnHostedPhotoV4="";
    if(!rating)return; // Unknown rating != yellow. Leave unclassified.
    insertPhoto(cell,link,fallbackUrl(rating),rating);
  }

  function scanRows(doc){
    const cells=[];
    doc.querySelectorAll("#rankingsResults tr").forEach(row=>{if(row.cells?.[1])cells.push(row.cells[1])});
    doc.querySelectorAll("#latestResults tr").forEach(row=>{
      if(row.cells?.[1]){
        // The latest-results table visibly contains iRating in column 11.
        const rawName=String(row.cells[1].textContent||"").trim();
        const visibleRating=positiveRating(row.cells?.[10]?.textContent);
        if(visibleRating)rememberRating(rawName,visibleRating);
        cells.push(row.cells[1]);
      }
    });
    doc.querySelectorAll("#sessionsResults tr").forEach(row=>{if(row.cells?.[3])cells.push(row.cells[3])});
    cells.forEach(cell=>decorateCell(cell).catch(()=>{}));
  }

  async function scan(){
    await loadData();
    const frame=document.getElementById(FRAME_ID);
    if(!frame)return;
    let doc;
    try{doc=frame.contentDocument}catch(e){return}
    if(!doc?.body)return;

    injectStyle(doc);
    scanRows(doc);

    if(!frame.__hlrnHostedPhotoV4Observer&&"MutationObserver" in window){
      const observer=new MutationObserver(()=>{
        clearTimeout(scanTimer);
        scanTimer=setTimeout(()=>{
          try{injectStyle(doc);scanRows(doc)}catch(e){}
        },40);
      });
      observer.observe(doc.body,{childList:true,subtree:true});
      frame.__hlrnHostedPhotoV4Observer=observer;
    }
  }

  function bind(){
    const frame=document.getElementById(FRAME_ID);
    if(!frame){
      setTimeout(bind,200);
      return;
    }

    if(!frame.__hlrnHostedPhotoV4Bound){
      frame.__hlrnHostedPhotoV4Bound=true;
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