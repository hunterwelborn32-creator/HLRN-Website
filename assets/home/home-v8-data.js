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
  const setExactDriverPhoto=(id,value)=>{
    const el=$(id);
    if(!el)return;
    el.hidden=true;

    const system=window.HLRNDrivers;
    const rawId=String(
      value&&typeof value==="object"
        ? (value.slug||value.id||value.driverId||"")
        : (value||"")
    ).trim();

    const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(rawId)
      ? rawId.toLowerCase()
      : "";

    const rec=system?.resolve?.(value)||null;
    const manifestSrc=system?.photoUrl?.(value,"cutout")||"";
    const directSrc=slug
      ? url("assets/driver-photos/cutout/"+encodeURIComponent(slug)+".webp")
      : "";
    const src=directSrc||manifestSrc;

    if(!src)return;

    const nextAlt=(rec?.displayName||pretty(
      value&&typeof value==="object"
        ? (value.driver||value.name||value.slug||value.id||"Driver")
        : value
    ))+" driver photo";

    const show=source=>{
      el.src=source;
      el.alt=nextAlt;
      el.hidden=false;
    };

    const probe=new Image();
    probe.onload=()=>show(src);
    probe.onerror=()=>{
      if(directSrc&&manifestSrc&&manifestSrc!==directSrc){
        const fallback=new Image();
        fallback.onload=()=>show(manifestSrc);
        fallback.onerror=()=>{
          el.removeAttribute("src");
          el.alt="";
          el.hidden=true;
        };
        fallback.src=manifestSrc;
        return;
      }
      el.removeAttribute("src");
      el.alt="";
      el.hidden=true;
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
    const raw=String(date).trim();
    const isoDay=raw.match(/^(\d{4}-\d{2}-\d{2})/);
    const d=isoDay?new Date(isoDay[1]+"T12:00:00-04:00"):new Date(raw);
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
    renderPitNext(schedule);
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

    const latestHosted=snapshot?.hosted?.latest||null;
    const hostedWinner=pretty(latestHosted?.winner||"");
    const hostedTrack=String(latestHosted?.track||"").trim();
    const hostedDate=String(latestHosted?.date||"").trim();

    put("pitHostedWinner",hostedWinner,"CONNECTING");

    const hostedDetail=[];
    if(hostedTrack)hostedDetail.push(hostedTrack);
    if(hostedDate)hostedDetail.push(longDate(hostedDate));
    put("pitHostedWinnerDetail",hostedDetail.join(" • "),"Latest Hosted result");

    if(hostedWinner){
      const rec=window.HLRNDrivers?.resolve?.(hostedWinner)||null;
      const identity={
        id:String(rec?.slug||"").trim(),
        name:hostedWinner
      };
      setExactDriverPhoto("pitHostedWinnerPhoto",identity);
      setDriverLink("pitHostedWinnerLink",hostedWinner,"standings/hosted.html");
    }
  }
  function renderLatest(report,schedule,recapIndex){
    if(!report)return;
    const winner=pretty(report.winner?.name||report.winnerName||"");
    const winnerKey=String(report.winner?.id||"").trim()||winner;
    const track=String(report.track||"LATEST HLRN RESULT").trim();
    const drivers=Number(report.classified||report.driverCount||0);

    const resultRows=Array.isArray(report.results)&&report.results.length
      ? report.results
      : (Array.isArray(report.top10)?report.top10:[]);
    const winnerRow=resultRows.find(r=>Number(r?.finish)===1)
      || resultRows.find(r=>String(r?.id||"")===String(report.winner?.id||""))
      || resultRows[0]
      || null;
    const winnerLapsLed=winnerRow&&Number.isFinite(Number(winnerRow.lapsLed))
      ? Number(winnerRow.lapsLed)
      : null;
    const winnerIncidents=winnerRow&&Number.isFinite(Number(winnerRow.incidents))
      ? Number(winnerRow.incidents)
      : null;

    put("rdLatestWinner",winner,"HLRN");
    put("rdLastWinner",winner,"--");
    put("pitLastWinner",winner,"HLRN");
    put("pitLastWinnerDetail",(track||"LATEST RESULT")+(report.date?" • "+longDate(report.date):""));

    if(winner){
      setDriverPhoto("rdLatestWinnerPhoto",winnerKey);
      setDriverLink("rdLatestWinnerLink",winnerKey,"results/");
      setExactDriverPhoto("rdLastWinnerPhoto",{
        id:String(report.winner?.id||"").trim(),
        name:winner
      });
      setDriverPhoto("pitLastWinnerPhoto",winnerKey);
      setDriverLink("pitLastWinnerLink",winnerKey,"results/");
    }

    put("rdLastTrack",track,"LATEST HLRN RESULT");
    put("rdLastDate",longDate(report.date));
    put("rdLastDrivers",drivers>0?String(drivers):"--");
    put("rdLastLaps",winnerLapsLed!=null?String(winnerLapsLed):"--");
    put("rdLastCautions",winnerIncidents!=null?String(winnerIncidents):"--");

    put("rdLeadHeadline",winner?winner+" WINS AT "+track:"HIGH LINE RACING NETWORK");
    const bits=[];
    if(report.date)bits.push(longDate(report.date));
    if(drivers>0)bits.push(drivers+" drivers");
    if(winnerLapsLed!=null)bits.push(winnerLapsLed+" laps led");
    if(winnerRow?.carNumber)bits.push("#"+winnerRow.carNumber);
    put("rdLeadSub",bits.join(" • "),"Sunday and Monday night competition. Hosted racing. Live broadcasts.");
  }
  function relinkDrivers(){
    if(!window.HLRNDrivers?.load)return;
    window.HLRNDrivers.load().then(()=>window.HLRNDrivers.scan?.(document.getElementById("hlrnRaceDayHome")||document.body)).catch(()=>{});
  }

  let liveSocket=null;
  let liveReconnectTimer=null;
  let pitNextInstant=null;
  let pitNextEvent=null;

  function easternOffsetMinutes(date){
    const zone=new Intl.DateTimeFormat("en-US",{
      timeZone:"America/New_York",timeZoneName:"shortOffset",hour:"2-digit"
    }).formatToParts(date).find(p=>p.type==="timeZoneName")?.value||"GMT-4";
    const m=zone.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if(!m)return -240;
    const mins=Number(m[2])*60+Number(m[3]||0);
    return m[1]==="+"?mins:-mins;
  }
  function easternRaceInstant(date,hour=20,minute=30){
    const m=String(date||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
    let utc=Date.UTC(y,mo-1,d,hour,minute,0,0);
    for(let i=0;i<2;i++){
      const off=easternOffsetMinutes(new Date(utc));
      utc=Date.UTC(y,mo-1,d,hour,minute,0,0)-off*60000;
    }
    return new Date(utc);
  }
  function updatePitCountdown(){
    if(!pitNextInstant)return;
    const diff=Math.max(0,pitNextInstant.getTime()-Date.now());
    const totalMinutes=Math.floor(diff/60000);
    const days=Math.floor(totalMinutes/1440);
    const hours=Math.floor((totalMinutes%1440)/60);
    const minutes=totalMinutes%60;
    put("pitDays",String(days).padStart(2,"0"));
    put("pitHours",String(hours).padStart(2,"0"));
    put("pitMinutes",String(minutes).padStart(2,"0"));
    put("pitCountdownLabel",diff>0?"TO GREEN FLAG":"GREEN FLAG");
  }
  function renderPitNext(schedule){
    const now=Date.now();
    const choices=[];
    for(const key of ["sunday","monday"]){
      for(const event of schedule?.leagues?.[key]||[]){
        if(event?.off||!event?.date)continue;
        const when=easternRaceInstant(event.date);
        if(when&&when.getTime()>now)choices.push({key,event,when});
      }
    }
    choices.sort((a,b)=>a.when-b.when);
    const next=choices[0]||null;
    if(!next)return;
    pitNextInstant=next.when;
    pitNextEvent=next;
    put("pitNextLeague",next.key==="sunday"?"SUNDAY NIGHT":"MONDAY NIGHT");
    put("pitNextTrack",next.event.track||"HLRN RACE WEEK");
    const details=[
      longDate(next.event.date),
      "8:30 PM ET",
      next.event.car,
      next.event.laps!=null?next.event.laps+" LAPS":""
    ].filter(Boolean);
    put("pitNextDate",details.join(" • "));
    const link=$("pitNextLink");
    if(link)link.href="race-preview/?league="+encodeURIComponent(next.key);
    updatePitCountdown();
  }
  function renderPitTicker(snapshot,report){
    const items=[];
    if(pitNextEvent){
      items.push("NEXT: "+(pitNextEvent.key==="sunday"?"SUNDAY":"MONDAY")+" • "+String(pitNextEvent.event.track||"")+" • "+longDate(pitNextEvent.event.date));
    }
    const hostedWinner=pretty(snapshot?.hosted?.latest?.winner||"");
    const hostedTrack=String(snapshot?.hosted?.latest?.track||"").trim();
    if(hostedWinner)items.push("HOSTED: "+hostedWinner+" WINS"+(hostedTrack?" AT "+hostedTrack:""));
    const latestWinner=pretty(report?.winner?.name||report?.winnerName||"");
    if(latestWinner)items.push("LATEST HLRN WINNER: "+latestWinner+(report?.track?" • "+report.track:""));
    items.push("RACE INTELLIGENCE UPDATED");
    const message=items.join("  •  ");
    put("pitTickerText",message+"  •  "+message);
  }

  function setNetworkLive(isLive){
    const label=$("h9NetworkStatus");
    const dot=$("h9NetworkDot");
    const state=$("h9NetworkState");
    const pitState=$("pitWallStatus");
    if(label) label.textContent=isLive?"LIVE NOW":"OFF AIR";
    if(dot) dot.classList.toggle("is-live",!!isLive);
    if(state) state.classList.toggle("is-live",!!isLive);
    if(pitState){
      pitState.classList.toggle("is-live",!!isLive);
      pitState.innerHTML="<i></i> "+(isLive?"RACE LIVE":"LIVE DATA");
    }
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
      const latest=latestReport(reports);
      renderLatest(latest,schedule,recaps);
      renderPitTicker(snapshot,latest);
      relinkDrivers();
    }catch(err){
      console.warn("HLRN homepage data unavailable",err);
    }
  }
  function start(){
    setNetworkLive(false);
    connectLiveStatus();
    refresh();
    setInterval(updatePitCountdown,30000);
    setInterval(()=>{if(document.visibilityState==="visible")refresh()},300000);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh()});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();