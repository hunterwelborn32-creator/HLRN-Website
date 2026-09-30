/* HLRN unified driver identity system v1
   - One permanent profile URL per driver
   - Rewrites legacy /drivers/?driverId= links
   - Auto-links recognized driver names anywhere in HLRN content
   - Watches dynamic pages such as Live/Results/Standings
   - Enhances permanent profile pages with best finish + race deep links
*/
(function(global){
  "use strict";
  if(global.HLRNDrivers && global.HLRNDrivers.version) return;

  const VERSION="20260930v6";
  const script=document.currentScript;
  let root;
  try{ root=new URL("../",script&&script.src?script.src:location.href); }
  catch(_){ root=new URL("/",location.origin); }
  const manifestUrl=new URL("data/driver-pages.json?v="+VERSION,root).href;
  const PHOTO_BASE="https://raw.githubusercontent.com/hunterwelborn32-creator/HLRN-App/main/driver-photos/";
  const absolute=(path)=>new URL(String(path||"").replace(/^\//,""),root).href;
  const normalize=(value)=>String(value||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const cleanDisplay=(value)=>String(value||"").trim().replace(/([A-Za-z])\d+$/,"$1");
  const escRe=(value)=>String(value).replace(/[|\\{}()[\]^$+*?.-]/g,"\\$&");

  let readyPromise=null;
  let records=[];
  let byName=new Map();
  let byId=new Map();
  let bySlug=new Map();
  let nameRegex=null;
  let observer=null;
  let scanQueued=false;

  function style(){
    if(document.getElementById("hlrn-driver-system-style")) return;
    const el=document.createElement("style");
    el.id="hlrn-driver-system-style";
    el.textContent=`
      .hlrn-driver-link{color:inherit;text-decoration:none;border-bottom:1px solid transparent;cursor:pointer}
      .hlrn-driver-link:hover,.hlrn-driver-link:focus-visible{color:#e31837;border-bottom-color:currentColor;outline:none}
      .hlrn-driver-hotspot{cursor:pointer}
      .hlrn-driver-hotspot:hover,.hlrn-driver-hotspot:focus-visible{color:#e31837;outline:none}
      .hlrn-profile-race-link{font-size:8px;font-weight:1000;letter-spacing:.07em;text-transform:uppercase;color:#e31837;text-decoration:none;white-space:nowrap}
      .hlrn-profile-race-link:hover{text-decoration:underline}
      .hlrn-race-clickable{cursor:pointer;position:relative}
      .hlrn-race-clickable:hover{box-shadow:inset 3px 0 0 #e31837}
      .hlrn-race-deep-link{display:block;margin-top:4px;color:#e31837;font-size:7px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}
      .hlrn-profile-team-link,.hlrn-profile-rank-link{color:inherit;text-decoration:none}
      .hlrn-profile-team-link:hover,.hlrn-profile-rank-link:hover{color:#e31837}
      .hlrn-profile-frozen-records{margin-top:30px}
      .hlrn-profile-frozen-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .hlrn-profile-frozen-card{display:block;background:#fff;border:1px solid #d9dde2;border-left:4px solid #e31837;padding:14px;color:#101318;text-decoration:none}
      .hlrn-profile-frozen-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.08)}
      .hlrn-profile-frozen-card small{display:block;color:#7d8690;font-size:7px;font-weight:1000;letter-spacing:.09em;text-transform:uppercase}
      .hlrn-profile-frozen-card strong{display:block;margin-top:5px;font-size:13px;line-height:1.2}
      .hlrn-profile-frozen-card span{display:block;margin-top:7px;color:#59616b;font-size:9px;font-weight:800}
      .hlrn-profile-frozen-actions{display:flex;gap:10px;margin-top:8px;color:#e31837;font-size:8px;font-weight:1000;text-transform:uppercase}
      @media(max-width:850px){.hlrn-profile-frozen-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(el);
  }

  function register(driver){
    const raw=String(driver.name||"").trim();
    const display=cleanDisplay(raw);
    const aliases=Array.isArray(driver.aliases)?driver.aliases.map(v=>String(v||"").trim()).filter(Boolean):[];
    const rec={...driver,aliases,rawName:raw,displayName:display,url:absolute(driver.url||("drivers/"+driver.slug+"/"))};
    records.push(rec);
    bySlug.set(String(driver.slug||"").toLowerCase(),rec);
    [raw,display,commaName(raw),commaName(display),...aliases,...aliases.map(commaName)].forEach(n=>{ const k=normalize(n); if(k&&!byName.has(k)) byName.set(k,rec); });
    const photo=String(driver.photoSlug||"").replace(/-/g," ");
    if(photo){const k=normalize(photo); if(k&&!byName.has(k)) byName.set(k,rec);}
    Object.values(driver.ids||{}).forEach(id=>{const k=String(id||"").trim();if(k)byId.set(k,rec);});
  }

  function resolve(value){
    if(value&&typeof value==="object"){
      const id=value.driverId||value.iracingId||value.id;
      if(id!=null&&byId.has(String(id))) return byId.get(String(id));
      const name=value.driver||value.name||value.driverName;
      if(name) return byName.get(normalize(name))||null;
      return null;
    }
    const text=String(value||"").trim();
    return byId.get(text)||byName.get(normalize(text))||bySlug.get(text.toLowerCase())||null;
  }

  function profileUrl(value){
    const rec=resolve(value);
    return rec?rec.url:null;
  }

  function photoUrl(value,type="cutout"){
    const rec=resolve(value);
    const slug=String(rec?.photoSlug||"").trim();
    if(!slug) return "";
    const folder=String(type||"cutout").toLowerCase()==="full"?"full":"cutout";
    return PHOTO_BASE+folder+"/"+encodeURIComponent(slug)+".webp";
  }

  function buildRegex(){
    const names=[];
    records.forEach(r=>{
      if(r.rawName){names.push(r.rawName);names.push(commaName(r.rawName));}
      if(r.displayName&&r.displayName!==r.rawName){names.push(r.displayName);names.push(commaName(r.displayName));}
      (r.aliases||[]).forEach(alias=>{names.push(alias);names.push(commaName(alias));});
    });
    const unique=[...new Set(names)].sort((a,b)=>b.length-a.length);
    nameRegex=unique.length?new RegExp("(^|[^A-Za-z0-9])("+unique.map(escRe).join("|")+")(?![A-Za-z0-9])","gi"):null;
  }

  function currentProfile(){
    const m=(location.pathname||"").match(/\/drivers\/([^/]+)\/?(?:index\.html)?$/i);
    return m?bySlug.get(decodeURIComponent(m[1]).toLowerCase())||null:null;
  }

  function rewriteLegacyAnchors(scope){
    const base=scope||document;
    const anchors=[];
    if(base.nodeType===1&&base.matches?.("a[href]")) anchors.push(base);
    base.querySelectorAll?.("a[href]").forEach(a=>anchors.push(a));
    anchors.forEach(a=>{
      let u;try{u=new URL(a.getAttribute("href"),location.href);}catch(_){return;}
      const sameOrigin=u.origin===location.origin;
      const p=u.pathname.toLowerCase();
      let rec=null;
      if(sameOrigin&&/\/drivers\/?(?:index\.html)?$/.test(p)){
        rec=resolve({driverId:u.searchParams.get("driverId")||u.searchParams.get("id"),driver:u.searchParams.get("driver")});
      }
      if(!rec){
        const exact=String(a.textContent||"").trim();
        const candidate=resolve(exact);
        if(candidate&&(normalize(exact)===normalize(candidate.rawName)||normalize(exact)===normalize(candidate.displayName)||(candidate.aliases||[]).some(alias=>normalize(exact)===normalize(alias)))) rec=candidate;
      }
      if(rec){
        a.href=rec.url;
        a.dataset.hlrnDriverUrl=rec.url;
        a.classList.add("hlrn-driver-link");
        if(String(a.textContent||"").trim()===rec.rawName&&rec.displayName!==rec.rawName) a.textContent=rec.displayName;
        a.title="View "+rec.displayName+"'s HLRN driver profile";
      }
    });
  }

  function shouldSkip(node){
    const p=node.parentElement;
    if(!p||!node.nodeValue||!node.nodeValue.trim()) return true;
    if(p.closest("#hlrn-global-nav,#hlrn-global-footer,script,style,noscript,textarea,input,select,option,code,pre,[contenteditable='true'],[data-hlrn-no-driver-links]")) return true;
    if(p.closest("a.hlrn-driver-link,[data-hlrn-driver-linked]")) return true;
    return false;
  }

  function linkTextNode(node){
    if(!nameRegex||shouldSkip(node)) return;
    const text=node.nodeValue;
    nameRegex.lastIndex=0;
    if(!nameRegex.test(text)) return;
    nameRegex.lastIndex=0;
    const frag=document.createDocumentFragment();
    let last=0,m;
    const self=currentProfile();
    while((m=nameRegex.exec(text))){
      const prefix=m[1]||"";
      const matched=m[2]||"";
      const fullIndex=m.index;
      const nameIndex=fullIndex+prefix.length;
      if(nameIndex>last) frag.appendChild(document.createTextNode(text.slice(last,nameIndex)));
      const rec=resolve(matched);
      if(!rec){frag.appendChild(document.createTextNode(matched));last=nameIndex+matched.length;continue;}
      const label=rec.displayName||matched;
      if(self&&self.slug===rec.slug){
        frag.appendChild(document.createTextNode(label));
      }else if(node.parentElement.closest("button,[role='button']")){
        const span=document.createElement("span");
        span.textContent=label;
        span.className="hlrn-driver-hotspot";
        span.dataset.hlrnDriverUrl=rec.url;
        span.dataset.hlrnDriverLinked="1";
        span.setAttribute("role","link");
        span.tabIndex=0;
        span.title="View "+label+"'s HLRN driver profile";
        frag.appendChild(span);
      }else{
        const a=document.createElement("a");
        a.href=rec.url;
        a.textContent=label;
        a.className="hlrn-driver-link";
        a.dataset.hlrnDriverUrl=rec.url;
        a.dataset.hlrnDriverLinked="1";
        a.title="View "+label+"'s HLRN driver profile";
        frag.appendChild(a);
      }
      last=nameIndex+matched.length;
    }
    if(last===0) return;
    if(last<text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag,node);
  }

  function scan(scope){
    if(!scope||!nameRegex) return;
    rewriteLegacyAnchors(scope.nodeType===1||scope.nodeType===9?scope:document);
    const target=scope.nodeType===3?scope.parentElement:scope;
    if(!target) return;
    const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT,{
      acceptNode:n=>shouldSkip(n)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT
    });
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(linkTextNode);
  }

  const pendingScopes=new Set();
  function queueScan(scope){
    if(scope){
      const el=scope.nodeType===3?scope.parentElement:scope;
      if(el&&el.nodeType===1&&!el.closest?.("#hlrn-global-nav,#hlrn-global-footer")) pendingScopes.add(el);
    }
    if(scanQueued) return;
    scanQueued=true;
    requestAnimationFrame(()=>{
      scanQueued=false;
      const scopes=[...pendingScopes];pendingScopes.clear();
      if(!scopes.length) scopes.push(document.body);
      // If a parent scope is already queued, skip its descendants.
      const roots=scopes.filter((el,i,arr)=>!arr.some((other,j)=>j!==i&&other.contains?.(el)));
      roots.slice(0,40).forEach(scan);
      enhanceProfile();
    });
  }

  function installObserver(){
    if(observer||!document.body) return;
    observer=new MutationObserver(muts=>{
      muts.forEach(m=>{
        if(m.type==="characterData"){queueScan(m.target);return;}
        [...(m.addedNodes||[])].forEach(node=>{
          if(node.nodeType===1||node.nodeType===3) queueScan(node);
        });
      });
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  function rowRaceInfo(tr){
    const cells=[...tr.children];
    if(cells.length<6) return null;
    const series=String(cells[0].textContent||"").trim().toLowerCase().includes("monday")?"monday":"sunday";
    const race=String(cells[1].textContent||"").match(/\d+/)?.[0];
    const date=String(cells[2].textContent||"").trim();
    const track=String(cells[3].textContent||"").trim();
    const finish=Number(String(cells[5].textContent||"").match(/\d+/)?.[0]||0);
    return race?{series,race,date,track,finish,url:absolute("results/?league="+encodeURIComponent(series)+"&race="+encodeURIComponent(race))}:null;
  }

  function replaceStatWithBest(container,best){
    if(!container||!Number.isFinite(best)||best<=0) return;
    const stats=[...container.querySelectorAll(".career-stat,.stat")];
    let target=stats.find(s=>/^incidents?$/i.test(String(s.querySelector("small")?.textContent||"").trim()));
    if(!target) target=stats[stats.length-1];
    if(!target||target.dataset.hlrnBestFinish) return;
    const label=target.querySelector("small"),value=target.querySelector("strong");
    if(label&&value){label.textContent="Best Finish";value.textContent="P"+best;target.dataset.hlrnBestFinish="1";}
  }

  async function enhanceFrozenProfileRecords(rec){
    if(!rec||document.querySelector("[data-hlrn-frozen-records]")) return;
    try{
      const res=await fetch(absolute("data/race-recaps/index.json?v="+VERSION),{cache:"no-store"});
      if(!res.ok)return;
      const data=await res.json();
      const items=Array.isArray(data?.recaps)?data.recaps:[];
      if(!items.length)return;

      const names=new Set(
        [rec.rawName,rec.displayName,rec.name,...(rec.aliases||[])]
          .map(normalize).filter(Boolean)
      );
      const matches=[];
      for(const item of items){
        const participants=Array.isArray(item?.drivers)?item.drivers:[];
        let hit=participants.find(d=>names.has(normalize(typeof d==="string"?d:d?.name)));
        if(!hit&&item?.winner&&names.has(normalize(item.winner.name))) hit={...item.winner,position:1};
        if(!hit)continue;
        matches.push({item,hit:typeof hit==="string"?{name:hit}:hit});
        if(matches.length>=6)break;
      }
      if(!matches.length)return;

      const section=document.createElement("section");
      section.className="hlrn-profile-frozen-records";
      section.dataset.hlrnFrozenRecords="1";

      const head=document.createElement("div");
      head.className="section-head";
      head.innerHTML='<div><small>LIVE RECORDER ARCHIVE</small><h2>Frozen Race Records</h2></div><span>'+matches.length+' PERMANENT RECORD'+(matches.length===1?'':'S')+'</span>';

      const grid=document.createElement("div");
      grid.className="hlrn-profile-frozen-grid";
      matches.forEach(({item,hit})=>{
        const a=document.createElement("a");
        a.className="hlrn-profile-frozen-card";
        a.href=item.resultsUrl||absolute("results/?recap="+encodeURIComponent(item.slug||""));
        const pos=Number(hit?.position);
        const result=Number.isFinite(pos)&&pos>0?"P"+pos:"RECORDED";
        const when=String(item.displayDate||"").trim();
        const series=String(item.series||"HLRN").replace(/ Night Series$/i,"");
        a.innerHTML='<small>'+escapeHtml(series)+(when?' • '+escapeHtml(when):'')+'</small>'+
          '<strong>'+escapeHtml(item.track||"HLRN Race")+'</strong>'+
          '<span>'+escapeHtml(result)+' • '+escapeHtml(item.winner?.name?"Winner: "+item.winner.name:"Frozen at checkered")+'</span>'+
          '<div class="hlrn-profile-frozen-actions"><b>PERMANENT RESULTS →</b>'+(item.url?'<b>STORY AVAILABLE</b>':'')+'</div>';
        grid.appendChild(a);
      });

      section.append(head,grid);
      const actions=document.querySelector(".actions");
      const main=document.querySelector("main.page")||document.querySelector("main")||document.body;
      if(actions&&actions.parentNode)actions.parentNode.insertBefore(section,actions);
      else main.appendChild(section);
    }catch(err){
      console.warn("HLRN frozen driver records unavailable",err);
    }
  }

  function escapeHtml(value){
    return String(value??"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function enhanceProfile(){
    const rec=currentProfile();
    if(!rec||!document.body||document.body.dataset.hlrnProfileEnhanced==="1") return;
    const historyRows=[...document.querySelectorAll(".history-wrap tbody tr")];
    if(!historyRows.length) return;

    document.body.dataset.hlrnProfileEnhanced="1";
    document.title=document.title.replace(rec.rawName,rec.displayName);
    document.querySelectorAll(".hero h1,.crumb").forEach(el=>{el.childNodes.forEach(n=>{if(n.nodeType===3)n.nodeValue=n.nodeValue.replace(rec.rawName,rec.displayName);});});
    const heroImg=document.querySelector(".hero-photo");if(heroImg)heroImg.alt=rec.displayName;

    const info=historyRows.map(rowRaceInfo).filter(Boolean);
    const bestList=info.filter(x=>x.finish>0).map(x=>x.finish);
    if(bestList.length) replaceStatWithBest(document.querySelector(".career-strip"),Math.min(...bestList));

    ["sunday","monday"].forEach(series=>{
      const finishes=info.filter(x=>x.series===series&&x.finish>0).map(x=>x.finish);
      if(finishes.length) replaceStatWithBest(document.querySelector(".series-card."+series),Math.min(...finishes));
    });

    const head=document.querySelector(".history-wrap thead tr");
    if(head&&!head.querySelector("[data-hlrn-race-link-head]")){
      const th=document.createElement("th");th.textContent="Race Page";th.dataset.hlrnRaceLinkHead="1";head.appendChild(th);
    }

    historyRows.forEach((tr,i)=>{
      const d=info[i]||rowRaceInfo(tr);
      if(!d||tr.dataset.hlrnRaceDeepLink) return;
      tr.dataset.hlrnRaceDeepLink=d.url;
      tr.classList.add("hlrn-race-clickable");
      const td=document.createElement("td");
      td.innerHTML='<a class="hlrn-profile-race-link" href="'+d.url+'">VIEW →</a>';
      tr.appendChild(td);
    });

    document.querySelectorAll(".form-item").forEach(card=>{
      if(card.dataset.hlrnRaceDeepLink) return;
      const track=String(card.querySelector("span")?.textContent||"").trim();
      const meta=String(card.querySelector("small")?.textContent||"");
      const series=/monday/i.test(meta)?"monday":/sunday/i.test(meta)?"sunday":null;
      const date=(meta.split("•")[1]||"").trim();
      const hit=info.find(x=>x.series===series&&x.track===track&&(!date||x.date===date));
      if(!hit) return;
      card.dataset.hlrnRaceDeepLink=hit.url;
      card.classList.add("hlrn-race-clickable");
      const deep=document.createElement("em");deep.className="hlrn-race-deep-link";deep.textContent="VIEW RACE →";card.appendChild(deep);
    });

    document.querySelectorAll(".series-card").forEach(card=>{
      const series=card.classList.contains("monday")?"monday":"sunday";
      const team=card.querySelector(".team-badge strong");
      if(team&&team.textContent.trim()&&team.textContent.trim()!=="Not listed"&&!team.querySelector("a")){
        const a=document.createElement("a");
        a.className="hlrn-profile-team-link";
        a.href=absolute("teams/?league="+encodeURIComponent(series)+"&team="+encodeURIComponent(team.textContent.trim()));
        a.textContent=team.textContent.trim();
        team.textContent="";team.appendChild(a);
      }
      const rankStat=[...card.querySelectorAll(".stat")].find(s=>/^rank$/i.test(String(s.querySelector("small")?.textContent||"").trim()));
      const rank=rankStat?.querySelector("strong");
      if(rank&&!rank.querySelector("a")){
        const a=document.createElement("a");a.className="hlrn-profile-rank-link";a.href=absolute("standings/?league="+encodeURIComponent(series));a.textContent=rank.textContent;
        rank.textContent="";rank.appendChild(a);
      }
    });

    scan(document.body);
    enhanceFrozenProfileRecords(rec);
  }

  function activateInteractions(){
    document.addEventListener("click",e=>{
      const hot=e.target.closest?.(".hlrn-driver-hotspot[data-hlrn-driver-url]");
      if(hot){e.preventDefault();e.stopPropagation();location.href=hot.dataset.hlrnDriverUrl;return;}
      const race=e.target.closest?.(".hlrn-race-clickable[data-hlrn-race-deep-link]");
      if(race&&!e.target.closest("a,button,input,select,textarea")) location.href=race.dataset.hlrnRaceDeepLink;
    },true);
    document.addEventListener("keydown",e=>{
      const hot=e.target.closest?.(".hlrn-driver-hotspot[data-hlrn-driver-url]");
      if(hot&&(e.key==="Enter"||e.key===" ")){e.preventDefault();e.stopPropagation();location.href=hot.dataset.hlrnDriverUrl;}
    },true);
  }

  async function load(){
    if(readyPromise) return readyPromise;
    readyPromise=(async()=>{
      style();
      const response=await fetch(manifestUrl,{cache:"no-store"});
      if(!response.ok) throw new Error("Driver directory HTTP "+response.status);
      const data=await response.json();
      records=[];byName=new Map();byId=new Map();bySlug=new Map();
      (data.drivers||[]).forEach(register);
      buildRegex();
      rewriteLegacyAnchors(document);
      scan(document.body);
      enhanceProfile();
      installObserver();
      return records;
    })().catch(err=>{console.warn("HLRN driver system unavailable",err);return[];});
    return readyPromise;
  }

  global.HLRNDrivers=Object.freeze({
    version:VERSION,
    load,
    resolve,
    profileUrl,
    photoUrl,
    go(value){const u=profileUrl(value);if(u)location.href=u;return !!u;},
    scan,
    getAll(){return records.slice();}
  });

  activateInteractions();
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>load(),{once:true});
  else load();
})(window);
