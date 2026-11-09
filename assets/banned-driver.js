/* HLRN banned-driver visual: keep original results; remove him only from Race Intelligence. */
(function(){
"use strict";
if(/\/race-intelligence(?:\/|$)/.test(location.pathname)||window.__HLRN_BANNED_VISUAL_V1__)return;
window.__HLRN_BANNED_VISUAL_V1__=true;

// Every standalone team profile gets a return link to its originating HLRN page.
(function installTeamReturnButton(){
  if(!/^\/team-pages\/(?!index(?:\.html)?$)(?:(?:monday|sunday)\/)?[^/]+\.html$/i.test(location.pathname))return;
  function init(){
    if (!document.querySelector("script[data-standalone]")) {
      const layout = document.createElement("script");
      layout.dataset.standalone = "";
      layout.src = "/assets/network-layout.js?v=20261109.1";
      document.head.append(layout);
    }
    if(document.getElementById("hlrn-team-return"))return;
    const params=new URLSearchParams(location.search);
    let destination="/team-pages/";
    const requested=params.get("hlrn_return");
    if(requested){
      try{
        const target=new URL(requested,location.origin);
        if(target.origin===location.origin && /^\/(?!\/)/.test(requested) && !/^\/team-pages\//i.test(target.pathname)){
          destination=target.pathname+target.search+target.hash;
        }
      }catch(e){}
    }else if(document.referrer){
      try{
        const previous=new URL(document.referrer);
        if(previous.origin===location.origin && !/^\/team-pages\//i.test(previous.pathname)){
          destination=previous.pathname+previous.search+previous.hash;
        }
      }catch(e){}
    }
    const css=document.createElement("style");
    css.textContent="#hlrn-team-return{position:fixed;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));z-index:2147483000;display:inline-flex;align-items:center;gap:9px;max-width:calc(100vw - 28px);padding:11px 17px;border:1px solid #8bc9ff;border-radius:9px;background:linear-gradient(125deg,#112b47,#071322);box-shadow:0 5px 22px #000b,0 0 0 1px #ffffff1c inset;color:#fff!important;font:800 12px/1.2 Arial,sans-serif;letter-spacing:.07em;text-decoration:none!important;text-transform:uppercase;transition:transform .15s,background .15s}#hlrn-team-return:hover{transform:translateY(-2px);background:#214b70}#hlrn-team-return:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:600px){#hlrn-team-return{top:max(9px,env(safe-area-inset-top));right:max(9px,env(safe-area-inset-right));padding:9px 11px;font-size:10px;letter-spacing:.025em}}";
    document.head.appendChild(css);
    const back=document.createElement("a");
    back.id="hlrn-team-return";
    back.href=destination;
    back.innerHTML='<span aria-hidden="true">←</span><span>Back to HLRN</span>';
    back.setAttribute("aria-label","Return to the HLRN page you came from");
    const bar = document.querySelector(".network-section-bar .network-related");
    (bar || document.body).appendChild(back);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

const BADGE="/assets/banned-driver.png?v=20261028banned1";
/* Generated from data/driver-status.json (official November 2, 2026 roster).
   Show a single status beside the name and stamp photos wherever present. */
const ENTRIES = [{"name":"Alex Schumacher","aliases":["Schumacher, Alex"],"driverId":null},{"name":"Andrew Schuler2","aliases":["Andrew Schuler","Schuler, Andrew","Schuler2, Andrew"],"driverId":null},{"name":"Andy Bowman","aliases":["Bowman, Andy"],"driverId":null},{"name":"Benjamin Farnham-Johnson","aliases":["Farnham-Johnson, Benjamin","Benjamin Farnham Johnson"],"driverId":null},{"name":"Ben Walker2","aliases":["Ben Walker","Walker, Ben","Walker2, Ben"],"driverId":null},{"name":"Brogan Roberts","aliases":["Roberts, Brogan"],"driverId":null},{"name":"Bryce Hinton","aliases":["Bryce Hinton2","Hinton2, Bryce","Hinton, Bryce"],"driverId":"105882"},{"name":"Christopher Rashaad Craig","aliases":["Craig, Christopher Rashaad"],"driverId":null},{"name":"Dave B. Schutt","aliases":["Schutt, Dave B.","Dave B Schutt","Schutt, Dave B"],"driverId":null},{"name":"Darrel Ceballos","aliases":["Ceballos, Darrel"],"driverId":"126078"},{"name":"Ed Ryan","aliases":["Ryan, Ed"],"driverId":null},{"name":"Ethan Eckert","aliases":["Eckert, Ethan","Ethan Eckert012"],"driverId":"87070"},{"name":"Hunter Funderburke","aliases":["Funderburke, Hunter"],"driverId":null},{"name":"Isaiah Watrous","aliases":["Watrous, Isaiah"],"driverId":null},{"name":"Jackson Barrie","aliases":["Barrie, Jackson"],"driverId":null},{"name":"Jacob Major","aliases":["Major, Jacob"],"driverId":null},{"name":"Jeff Connors","aliases":["Connors, Jeff"],"driverId":null},{"name":"Jeremy Coggin","aliases":["Coggin, Jeremy"],"driverId":null},{"name":"Josh Ryder","aliases":["Ryder, Josh"],"driverId":null},{"name":"Josh Spragg","aliases":["Spragg, Joshua","Spragg, Josh","Joshua Spragg"],"driverId":"109865"},{"name":"Justin Thomas","aliases":["Thomas, Justin"],"driverId":null},{"name":"Larry Eddy","aliases":["Eddy, Larry"],"driverId":null},{"name":"Logan Ramsdell2","aliases":["Logan Ramsdell","Ramsdell, Logan","Ramsdell2, Logan"],"driverId":null},{"name":"Luke Gauthier","aliases":["Gauthier, Luke"],"driverId":null},{"name":"Magnum Tate","aliases":["Tate, Magnum"],"driverId":null},{"name":"Matthew Brown49","aliases":["Brown49, Matthew","Matthew Brown","Brown, Matthew"],"driverId":"116507"},{"name":"Mario Dinatale","aliases":["Dinatale, Mario"],"driverId":null},{"name":"Michael Wiesner2","aliases":["Michael Wiesner","Wiesner, Michael","Wiesner2, Michael"],"driverId":null},{"name":"Mike Donell","aliases":["Donell, Mike"],"driverId":null},{"name":"Nathan Fryer","aliases":["Fryer, Nathan"],"driverId":null},{"name":"Nicholas Gibson","aliases":["Gibson, Nicholas"],"driverId":null},{"name":"Paul Flye2","aliases":["Paul Flye","Flye, Paul","Flye2, Paul"],"driverId":null},{"name":"Payson Lindsay","aliases":["Lindsay, Payson"],"driverId":null},{"name":"Petr Smegma","aliases":["Smegma, Petr"],"driverId":null},{"name":"Peyton Klebba","aliases":["Klebba, Peyton"],"driverId":null},{"name":"Primo Pasqualini","aliases":["Pasqualini, Primo"],"driverId":null},{"name":"Rey Garcia","aliases":["Garcia, Rey"],"driverId":null},{"name":"Ryan Carlson9","aliases":["Ryan Carlson","Carlson, Ryan","Carlson9, Ryan"],"driverId":null},{"name":"Scott D Howell","aliases":["Howell, Scott D","Scott D. Howell","Howell, Scott D."],"driverId":null},{"name":"Sebastien Rogier","aliases":["Rogier, Sebastien"],"driverId":null},{"name":"Shane Harbin","aliases":["Harbin, Shane"],"driverId":null},{"name":"Samarth Rao","aliases":["Rao, Samarth"],"driverId":null},{"name":"Terry Wilson","aliases":["Wilson, Terry"],"driverId":null},{"name":"TJ Lunn","aliases":["Tj Lunn","Lunn, TJ","Lunn, Tj"],"driverId":"118777"},{"name":"Trace McDowell","aliases":["McDowell, Trace"],"driverId":"110198"},{"name":"Travis Dyke","aliases":["Dyke, Travis"],"driverId":null},{"name":"William Trusty","aliases":["Trusty, William"],"driverId":null},{"name":"Zander Haislip","aliases":["Haislip, Zander"],"driverId":null}];
const KNOWN_IDS = new Set(ENTRIES.map(e=>String(e.driverId||"")).filter(Boolean));
function normalize(s){
  s=String(s||"").trim().toLowerCase();
  if(s.includes(",")){
    const parts=s.split(",");s=parts.slice(1).join(" ").trim()+" "+parts[0].trim();
  }
  return s.replace(/([a-z])\d+\b/g,"$1").replace(/[^a-z]/g,"");
}
const KNOWN_NAMES=new Set();
const aliases=[];
for(const entry of ENTRIES){
  for(const label of [entry.name,...entry.aliases]){
    const s=String(label||"").trim();
    if(!s)continue;
    KNOWN_NAMES.add(normalize(s));
    aliases.push(s);
  }
}
const escapePattern=s=>String(s).split("").map(c=>{
  if(/\s/.test(c))return "\\s+";
  if(c==="-")return "[-\\s]+";
  if(c===".")return "\\.?";
  return /[\\^$*+?()[\]{}|]/.test(c)?"\\"+c:c;
}).join("");
const seen=new Set();
const variants=aliases
  .map(s=>s.replace(/\.$/,""))
  .filter(s=>{const k=s.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;})
  .sort((a,b)=>b.length-a.length)
  .map(escapePattern);
const PATTERN=new RegExp("\\b(?:"+variants.join("|")+")\\b","gi");
const LOOKUP=new RegExp(PATTERN.source,"i");
function hasName(s){return LOOKUP.test(String(s||""));}
function bannedPhoto(img){
  const source=String(img.getAttribute("src")||"");
  // Custom team pages embed large photos as data: URLs; only read a filename
  // for regular asset paths so we never process a megabyte of base64 as a name.
  const filename=source.startsWith("data:") ? "" :
    decodeURIComponent(source.split(/[?#]/)[0].split("/").pop()||"")
      .replace(/\.(?:png|jpe?g|webp)$/i,"")
      .replace(/-profile-cutout-\d+$/i,"")
      .replace(/[-_]/g," ");
  const altName=String(img.alt||"").replace(/\s+(?:driver\s+)?(?:portrait|photo|cutout)$/i,"").trim();
  if([img.alt,altName,img.dataset.hlrnDriverName,img.dataset.driverName,filename]
    .some(n=>n&&KNOWN_NAMES.has(normalize(n))))return true;
  const named=img.closest("[data-hlrn-driver-name],[data-driver-name],[data-driver-id]");
  if(named&&(KNOWN_IDS.has(String(named.dataset.driverId||""))||
    [named.dataset.hlrnDriverName,named.dataset.driverName]
      .some(n=>n&&KNOWN_NAMES.has(normalize(n)))))return true;
  const card=img.closest(".driver,.roster-driver,.team-driver,.driver-card,.driver-stat-card,.driver-tile,.driver-row,.driver-profile,.driver-directory-item,.hlrn-driver-card,.leader-card,.hx-podium-card,.hero,.profile-header,tbody tr");
  return !!card&&card.querySelectorAll("img:not(.hlrn-banned-overlay)").length<=2&&hasName(card.textContent);
}
function overlay(img){
  if(img.classList.contains("hlrn-banned-overlay")||img.classList.contains("hlrn-ban-stamp")||img.dataset.hlrnBannedPhoto==="1"||/(?:^|\/)banned-driver\.png(?:[?#]|$)/i.test(img.getAttribute("src")||"")||!bannedPhoto(img))return;
  const parent=img.parentElement;if(!parent)return;
  img.dataset.hlrnBannedPhoto="1";
  if(getComputedStyle(parent).position==="static")parent.style.position="relative";
  const badge=document.createElement("img");
  badge.className="hlrn-banned-overlay";badge.src=BADGE;badge.alt="";
  badge.setAttribute("aria-hidden","true");badge.decoding="async";
  parent.appendChild(badge);
  function position(){
    if(!img.isConnected||!badge.isConnected)return;
    const p=parent.getBoundingClientRect(),r=img.getBoundingClientRect();
    if(r.width<1||r.height<1)return;
    badge.style.left=(r.left-p.left+parent.scrollLeft)+"px";
    badge.style.top=(r.top-p.top+parent.scrollTop)+"px";
    badge.style.width=r.width+"px";badge.style.height=r.height+"px";
  }
  position();img.addEventListener("load",position,{passive:true});
  if("ResizeObserver" in window){const resize=new ResizeObserver(position);resize.observe(img);resize.observe(parent);}
  window.addEventListener("resize",position,{passive:true});
}
function markNames(){
  if(!document.body)return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),targets=[];
  while(walker.nextNode()){
    const text=walker.currentNode,el=text.parentElement;
    if(!el||!hasName(text.nodeValue))continue;
    if(el.closest("script,style,textarea,select,option,.hlrn-banned-name,.hlrn-banned-label,.hlrn-banned-banner,[contenteditable=true]"))continue;
    targets.push(text);
  }
  for(const node of targets){
    if(!node.isConnected)continue;
    const s=node.nodeValue,f=document.createDocumentFragment();
    let match,start=0;PATTERN.lastIndex=0;
    while((match=PATTERN.exec(s))){
      f.appendChild(document.createTextNode(s.slice(start,match.index)));
      const wrap=document.createElement("span");
      wrap.className="hlrn-banned-name";wrap.textContent=match[0];
      wrap.setAttribute("title","Driver status: BANNED");
      f.appendChild(wrap);start=match.index+match[0].length;
    }
    f.appendChild(document.createTextNode(s.slice(start)));node.replaceWith(f);
  }
}
function scan(){
  markNames();
  document.querySelectorAll("img:not(.hlrn-banned-overlay):not(.hlrn-ban-stamp):not([data-hlrn-banned-photo='1'])").forEach(overlay);
}
const style=document.createElement("style");style.id="hlrn-banned-driver-styles";
style.textContent=[
".hlrn-banned-name{display:inline;white-space:normal}",
".hlrn-banned-name::after{content:'BANNED';display:inline-block;vertical-align:middle;margin:0 .3em;padding:.15em .5em;border-radius:3px;border:1px solid #ff6666;background:#b00000;color:#fff!important;font-family:Arial,sans-serif;font-size:.66em;font-weight:900;line-height:1.35;letter-spacing:.06em;white-space:nowrap;text-shadow:none;box-shadow:0 1px 4px #0005}",
".hero h1 .hlrn-banned-name::after{font:900 clamp(12px,1.2vw,17px)/1.2 Arial,sans-serif!important;letter-spacing:.08em!important;padding:7px 11px;margin-left:12px;vertical-align:middle;transform:translateY(-4px)}",
".hlrn-banned-overlay{position:absolute!important;max-width:none!important;min-width:0!important;object-fit:contain!important;z-index:25!important;pointer-events:none!important;display:block!important;opacity:1!important;filter:drop-shadow(0 2px 4px #0009)}",
".hlrn-banned-banner{display:block;width:max-content;max-width:100%;margin:0 0 14px;padding:10px 16px;background:linear-gradient(120deg,#750000,#ef1313);border:2px solid #fa7777;border-radius:4px;color:#fff!important;font:900 clamp(14px,2.5vw,23px)/1.25 Arial,sans-serif;letter-spacing:.12em;box-shadow:0 6px 22px #f0000052}"
].join("");
document.head.appendChild(style);
let scheduled=false;
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan();});}
function begin(){scan();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",begin,{once:true});else begin();
})();