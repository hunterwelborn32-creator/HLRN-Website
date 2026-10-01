(function(){
"use strict";
if(window.HLRNData) return;

const CACHE_KEY="hlrn_standings_snapshot_v1";
const listeners=new Set();
let snapshot=null;
let state="idle";
let error=null;
let pending=null;

function getStatus(){
  return {
    state,
    error:error ? String(error.message||error) : "",
    generatedAt:snapshot && snapshot.generatedAt ? snapshot.generatedAt : null
  };
}
function emit(){
  const detail={snapshot,status:getStatus()};
  listeners.forEach(fn=>{try{fn(detail)}catch(e){}});
}
function readCache(){
  try{
    const raw=localStorage.getItem(CACHE_KEY);
    if(!raw) return null;
    const parsed=JSON.parse(raw);
    return parsed && parsed.leagues ? parsed : null;
  }catch(e){return null}
}
function writeCache(value){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(value))}catch(e){}
}
async function load(){
  if(snapshot && state==="current") return snapshot;
  if(pending) return pending;

  state="loading";
  error=null;
  emit();

  const url=new URL("../data/hlrn.json",window.location.href);
  url.searchParams.set("v","20261001directpages1");

  pending=fetch(url,{cache:"no-store"})
    .then(r=>{
      if(!r.ok) throw new Error("HLRN data HTTP "+r.status);
      return r.json();
    })
    .then(data=>{
      if(!data || !data.leagues) throw new Error("Invalid HLRN standings snapshot");
      snapshot=data;
      state="current";
      error=null;
      writeCache(data);
      emit();
      return data;
    })
    .catch(err=>{
      error=err;
      const cached=readCache();
      if(cached){
        snapshot=cached;
        state="cached";
        emit();
        return cached;
      }
      state="unavailable";
      emit();
      throw err;
    })
    .finally(()=>{pending=null});

  return pending;
}

const cached=readCache();
if(cached){
  snapshot=cached;
  state="cached";
}

window.HLRNData=Object.freeze({
  load,
  get(){return snapshot},
  getStatus,
  subscribe(fn){
    if(typeof fn!=="function") return function(){};
    listeners.add(fn);
    try{fn({snapshot,status:getStatus()})}catch(e){}
    return function(){listeners.delete(fn)};
  }
});

load().catch(()=>{});
})();