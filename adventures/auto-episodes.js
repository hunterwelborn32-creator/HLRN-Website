/* HLRN Adventures progressive enhancement.
   Published episodes are pre-rendered by tools/publish.py for crawlers and no-JS visitors.
   This script only mirrors in-progress Discord stories between publisher runs. */
(async () => {
  const shelf=document.querySelector(".episode-shelf");
  if(!shelf)return;

  const get=async file=>{
    const r=await fetch(file,{cache:"no-store"});
    if(!r.ok)return [];
    const data=await r.json();
    return Array.isArray(data)?data:[];
  };
  const clean=e=>e&&typeof e.id==="string"&&/^[-a-z0-9]+$/.test(e.id)&&typeof e.title==="string";
  const escText=v=>String(v??"");

  try{
    const [published,progress]=await Promise.all([get("episodes.json"),get("episode-status.json")]);
    const ready=published.filter(clean);
    const readyIds=new Set(["episode-01",...ready.map(e=>e.id)]);
    const pending=progress.filter(clean).filter(e=>!readyIds.has(e.id));

    shelf.querySelectorAll('[data-adventure-progress="true"]').forEach(n=>n.remove());

    pending
      .sort((a,b)=>(a.kind==="special")-(b.kind==="special")||((a.number??999)-(b.number??999)))
      .forEach(e=>{
        const el=document.createElement("article");
        el.className="episode-tile coming";
        el.dataset.adventureProgress="true";
        el.dataset.adventureId=e.id;

        const art=document.createElement("div");
        art.className="episode-art placeholder-art";
        const ghost=document.createElement("span");
        ghost.className="ghost-number";
        ghost.textContent=e.kind==="special"?"★":String(e.number??"?").padStart(2,"0");
        const badge=document.createElement("span");
        badge.className="episode-numeral";
        badge.textContent=e.kind==="special"?"SPECIAL":String(e.number??"").padStart(2,"0");
        art.append(ghost,badge);

        const info=document.createElement("div");
        info.className="episode-details";
        const status=document.createElement("span");
        status.className="episode-status";
        status.textContent="🟢 IN PROGRESS";
        const h=document.createElement("h3");
        h.textContent=escText(e.title);
        const p=document.createElement("p");
        p.textContent="A new HLRN adventure is underway. The complete story will appear after the final installment is approved.";
        const bottom=document.createElement("div");
        bottom.className="episode-bottom";
        bottom.innerHTML="<span>STORY IN PROGRESS</span><b>COMING SOON</b>";
        info.append(status,h,p,bottom);
        el.append(art,info);
        shelf.append(el);
      });

    const count=document.querySelector(".episode-total");
    if(count){
      const main=1+ready.filter(e=>e.kind==="main"&&e.id!=="episode-01").length;
      const specials=ready.filter(e=>e.kind==="special").length;
      count.textContent=main+" MAIN EPISODES · "+specials+" SPECIAL"+(specials===1?"":"S")+(pending.length?" · "+pending.length+" IN PROGRESS":"");
    }
  }catch(err){
    console.warn("HLRN Adventures status sync unavailable:",err);
  }
})();