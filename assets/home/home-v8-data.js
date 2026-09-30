/* HLRN Home V8 data bridge
   Feeds the visible homepage directly from the shared HLRN snapshot,
   published reports, and schedule. No legacy homepage DOM required. */
(function(){
  "use strict";

  const self=document.currentScript;
  let root;
  try{root=new URL("../../",self&&self.src?self.src:location.href);}catch(_){root=new URL("/",location.origin);}
  const url=path=>new URL(path,root).href;
  const $=id=>document.getElementById(id);
  const put=(id,value,fallback="--")=>{
    const el=$(id);
    if(!el)return;
    const v=String(value==null?"":value).trim();
    el.textContent=v||fallback;
  };
  const setDriverPhoto=(id,value)=>{
    const el=$(id);
    if(!el)return;

    // Keep the server-rendered fallback photo visible unless a replacement
    // image has successfully loaded. Never erase a valid homepage photo just
    // because the driver manifest is late or temporarily unavailable.
    const system=window.HLRNDrivers;
    const src=system?.photoUrl?.(value,"cutout")||"";
    if(!src){
      el.hidden=false;
      return;
    }

    const rec=system?.resolve?.(value);
    const nextAlt=(rec?.displayName||pretty(value?.driver||value?.name||value||"Driver"))+" driver photo";
    const probe=new Image();
    probe.onload=()=>{
      el.src=src;
      el.alt=nextAlt;
      el.hidden=false;
    };
    probe.onerror=()=>{
      // Leave the already-rendered local fallback untouched.
      el.hidden=false;
    };
    probe.src=src;
  };
  const setDriverLink=(id,value,fallback)=>{
    const el=$(id);if(!el)return;
    el.href=window.HLRNDrivers?.profileUrl?.(value)||fallback||"drivers/";
  };
  const pretty=name=>{
    const raw=String(name||"").trim();
    if(!raw)return "";
    if(raw.includes(",")){
      const parts=raw.split(",");
      const last=(parts.shift()||"").trim().replace(/\d+$/,"");
      const first=parts.join(" ").trim();
      return (first+" "+last).trim();
    }
    return raw.replace(/([A-Za-z])\d+$/,"$1").trim();
  };
  const json=async path=>{
    const r=await fetch(url(path)+(path.includes("?")?"&":"?")+"v="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw new Error(path+" HTTP "+r.status);
    return r.json();
  };
  const etDateKey=()=>{
    const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"})
      .formatToParts(new Date()).reduce((o,x)=>(o[x.type]=x.value,o),{});
    return p.year+"-"+p.month+"-"+p.day;
  };
  const shortDate=date=>{
    if(!date)return "--";
    const d=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+"T12:00:00-04:00"):new Date(date);
    if(!Number.isFinite(d.getTime()))return "--";
    return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric"}).format(d).toUpperCase();
  };
  const longDate=date=>{
    if(!date)return "--";
    const d=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+"T12:00:00-04:00"):new Date(date);
    if(!Number.isFinite(d.getTime()))return "--";
    return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",year:"numeric"}).format(d).toUpperCase();
  };
  const nextEvent=(schedule,key)=>{
    const today=etDateKey();
    const rows=schedule?.leagues?.[key]||[];
    return rows.find(x=>!x.off&&x.date>=today)||rows.filter(x=>!x.off).slice(-1)[0]||null;
  };
  const latestReport=reports=>{
    const rows=Array.isArray(reports?.reports)?reports.reports.slice():[];
    rows.sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));
    return rows[0]||null;
  };
  const matchingRecap=(report,index)=>{
    if(!report)return null;
    const rows=Array.isArray(index?.recaps)?index.recaps:[];
    const track=String(report.track||"").trim().toLowerCase();
    const series=String(report.series||"").trim().toLowerCase();
    const reportDate=report.date?new Date(report.date):null;
    return rows.find(r=>{
      const sameSeries=!series||String(r.series||"").toLowerCase().includes(series);
      const sameTrack=!track||String(r.track||"").trim().toLowerCase()===track;
      if(!sameSeries||!sameTrack)return false;
      if(!reportDate||!r.raceFrozenAt)return true;
      const recapDate=new Date(r.raceFrozenAt);
      return Number.isFinite(recapDate.getTime())&&Math.abs(recapDate-reportDate)<48*60*60*1000;
    })||null;
  };
  const reportLaps=(report,schedule)=>{
    if(!report||!report.series||report.raceNumber==null)return null;
    const rows=schedule?.leagues?.[report.series]||[];
    const event=rows.find(x=>!x.off&&Number(x.week)===Number(report.raceNumber));
    return event?.laps??null;
  };
  function renderSchedule(schedule){
    [["sunday","Sunday"],["monday","Monday"]].forEach(([key,prefix])=>{
      const event=nextEvent(schedule,key);
      if(!event)return;
      const date=shortDate(event.date);
      const track=String(event.track||"").trim();
      put("rd"+prefix,date);
      put("v7"+prefix+"Date",date+(track?" • "+track:""));
      put("v7"+prefix+"Mirror",date);
    });
  }
  function renderSnapshot(snapshot){
    const hosted=Array.isArray(snapshot?.hosted?.rankings)?snapshot.hosted.rankings:[];
    const top=hosted[0];
    const topName=pretty(top?.driver||top?.name||top?.driverName);
    put("rdTopDriver",topName,"CONNECTING");
    put("v7TopDriverMirror",topName,"CONNECTING");
    if(topName){
      setDriverPhoto("rdTopDriverPhoto",topName);
      setDriverLink("rdTopDriverLink",topName,"standings/");
    }
  }
  function renderLatest(report,schedule,recapIndex){
    if(!report)return;
    const winner=pretty(report.winner?.name||report.winnerName||"");
    const track=String(report.track||"LATEST HLRN RESULT").trim();
    const laps=reportLaps(report,schedule);
    const drivers=Number(report.classified||report.driverCount||0);
    put("rdLatestWinner",winner,"HLRN");
    put("rdLastWinner",winner,"--");
    if(winner){
      setDriverPhoto("rdLatestWinnerPhoto",winner);
      setDriverLink("rdLatestWinnerLink",winner,"results/");
      setDriverPhoto("rdLastWinnerPhoto",winner);
    }
    put("rdLastTrack",track,"LATEST HLRN RESULT");
    put("rdLastDate",longDate(report.date));
    put("rdLastDrivers",drivers>0?String(drivers):"--");
    put("rdLastLaps",laps!=null?String(laps):"--");
    const recap=matchingRecap(report,recapIndex);
    const cautionValue =
      Number.isFinite(Number(report?.cautions)) ? Number(report.cautions) :
      Number.isFinite(Number(recap?.cautions)) ? Number(recap.cautions) :
      null;
    put("rdLastCautions",cautionValue!=null?String(cautionValue):"N/A");
    put("rdLeadHeadline",winner?winner+" WINS AT "+track:"HIGH LINE RACING NETWORK");
    const bits=[];
    if(report.date)bits.push(longDate(report.date));
    if(drivers>0)bits.push(drivers+" drivers");
    if(laps!=null)bits.push(laps+" laps");
    put("rdLeadSub",bits.join(" • "),"Sunday and Monday night competition. Hosted racing. Live broadcasts.");
  }
  function relinkDrivers(){
    if(!window.HLRNDrivers?.load)return;
    window.HLRNDrivers.load().then(()=>window.HLRNDrivers.scan?.(document.getElementById("hlrnRaceDayHome")||document.body)).catch(()=>{});
  }

  let liveSocket=null;
  let liveReconnectTimer=null;

  function setNetworkLive(isLive){
    const label=$("h9NetworkStatus");
    const dot=$("h9NetworkDot");
    if(label) label.textContent=isLive?"HLRN LIVE":"HLRN NETWORK";
    if(dot) dot.classList.toggle("is-live",!!isLive);
  }

  function connectLiveStatus(){
    clearTimeout(liveReconnectTimer);
    if(liveSocket){
      try{liveSocket.close()}catch(_){}
      liveSocket=null;
    }
    setNetworkLive(false);
    try{
      const ws=new WebSocket("wss://hlrn-live-feed.onrender.com/ws?role=viewer");
      liveSocket=ws;
      ws.onmessage=event=>{
        try{
          const msg=JSON.parse(event.data);
          if(msg?.type==="state"){
            setNetworkLive(msg?.data?.online===true);
          }
        }catch(_){}
      };
      ws.onerror=()=>setNetworkLive(false);
      ws.onclose=()=>{
        if(liveSocket===ws)liveSocket=null;
        setNetworkLive(false);
        liveReconnectTimer=setTimeout(connectLiveStatus,15000);
      };
    }catch(_){
      setNetworkLive(false);
      liveReconnectTimer=setTimeout(connectLiveStatus,15000);
    }
  }

  async function refresh(){
    try{
      if(window.HLRNDrivers?.load)await window.HLRNDrivers.load();
      const snapshot=window.HLRNData?await window.HLRNData.load():await json("data/hlrn.json");
      renderSnapshot(snapshot);
      const [schedule,reports,recaps]=await Promise.all([
        json("data/schedules-2026.json"),
        json("data/derived/reports.json"),
        json("data/race-recaps/index.json").catch(()=>({recaps:[]}))
      ]);
      renderSchedule(schedule);
      renderLatest(latestReport(reports),schedule,recaps);
      relinkDrivers();
    }catch(err){
      console.warn("HLRN homepage data unavailable",err);
    }
  }
  function start(){
    setNetworkLive(false);
    connectLiveStatus();
    refresh();
    setInterval(()=>{if(document.visibilityState==="visible")refresh()},300000);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh()});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();