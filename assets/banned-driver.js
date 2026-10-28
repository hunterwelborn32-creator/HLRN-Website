/* HLRN banned-driver visual: keep original results; remove him only from Race Intelligence. */
(function(){
"use strict";
if(/\/race-intelligence(?:\/|$)/.test(location.pathname)||window.__HLRN_BANNED_VISUAL_V1__)return;
window.__HLRN_BANNED_VISUAL_V1__=true;
const BADGE="/assets/banned-driver.png?v=20261028banned1";
const PATTERN=/\b(?:Matthew\s+Brown(?:49)?|Brown49\s*,\s*Matthew)\b/gi;
function hasName(s){return /\b(?:matthew\s+brown(?:49)?|brown49\s*,\s*matthew)\b/i.test(String(s||""));}
function normalize(s){
  s=String(s||"").trim().toLowerCase();
  if(s.includes(",")){const [last,...first]=s.split(",");s=first.join(",").trim()+" "+last.trim();}
  return s.replace(/\d+$/,"").replace(/[^a-z]/g,"");
}
function bannedPhoto(img){
  const src=String(img.getAttribute("src")||"").toLowerCase();
  if(/matthew[-_]?brown/.test(src)||hasName(img.alt)||normalize(img.dataset.hlrnDriverName||img.dataset.driverName)==="matthewbrown")return true;
  const named=img.closest("[data-hlrn-driver-name],[data-driver-name],[data-driver-id]");
  if(named&&(String(named.dataset.driverId)==="116507"||normalize(named.dataset.hlrnDriverName||named.dataset.driverName)==="matthewbrown"))return true;
  const card=img.closest(".driver-card,.driver-stat-card,.driver-tile,.driver-row,.driver-profile,.driver-directory-item,.hlrn-driver-card,.leader-card,.hx-podium-card,.hero,.profile-header,tbody tr");
  return !!card&&card.querySelectorAll("img:not(.hlrn-banned-overlay)").length<=2&&hasName(card.textContent);
}
function overlay(img){
  if(img.classList.contains("hlrn-banned-overlay")||img.dataset.hlrnBannedPhoto==="1"||!bannedPhoto(img))return;
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
  document.querySelectorAll("img:not(.hlrn-banned-overlay):not([data-hlrn-banned-photo='1'])").forEach(overlay);
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