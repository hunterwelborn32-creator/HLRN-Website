(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const pretty=name=>{
    const raw=String(name||'').trim();
    if(!raw.includes(',')) return raw.replace(/\d+$/,'').trim();
    const parts=raw.split(',');
    const last=(parts.shift()||'').trim().replace(/\d+$/,'');
    const first=parts.join(' ').trim();
    return (first+' '+last).trim();
  };
  const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value};
  const setHref=(id,value)=>{const el=$(id);if(el)el.href=value};
  const setDriverPhoto=(id,value)=>{
    const el=$(id);if(!el)return;
    const src=window.HLRNDrivers?.photoUrl?.(value,"cutout")||"";
    if(!src){el.hidden=true;el.removeAttribute("src");return}
    const rec=window.HLRNDrivers?.resolve?.(value);
    el.dataset.hlrnFallbackTried="";
    el.src=src;
    el.alt=(rec?.displayName||pretty(value?.driver||value?.name||value||"Driver"))+" driver photo";
    el.hidden=false;
    el.onerror=()=>{
      if(!el.dataset.hlrnFallbackTried){
        el.dataset.hlrnFallbackTried="1";
        const rec=window.HLRNDrivers?.resolve?.(value);
        const slug=String(rec?.photoSlug||"").trim();
        if(slug){
          el.src="https://hunterwelborn32-creator.github.io/HLRN-App/driver-photos/cutout/"+encodeURIComponent(slug)+".webp";
          return;
        }
      }
      el.hidden=true;
    };
  };

  function sortedDrivers(league){
    return [...(league?.drivers||[])].sort((a,b)=>num(a.rank)-num(b.rank)||num(b.points)-num(a.points));
  }
  function sortedTeams(league){
    return [...(league?.teams||[])].sort((a,b)=>num(a.rank)-num(b.rank)||num(b.points)-num(a.points));
  }
  function driverMap(league){
    return new Map((league?.drivers||[]).map(d=>[String(d.driverId??''),d]));
  }
  function latestRace(league){
    const rows=league?.results||[];
    if(!rows.length)return [];
    let latest=0;
    rows.forEach(r=>latest=Math.max(latest,num(r.raceNumber)));
    return rows.filter(r=>num(r.raceNumber)===latest).sort((a,b)=>num(a.finish)-num(b.finish));
  }
  function driverLink(leagueKey,d){
    return window.HLRNDrivers?.profileUrl?.({driverId:d?.driverId,driver:pretty(d?.driver)}) || 'drivers/';
  }
  function teamLink(leagueKey,t){
    const p=new URLSearchParams({league:leagueKey,team:String(t?.team||'')});
    return 'teams/?'+p.toString();
  }
  function renderLeague(snapshot,key,prefix){
    const league=snapshot?.leagues?.[key];
    if(!league)return null;
    const drivers=sortedDrivers(league);
    const teams=sortedTeams(league);
    const leader=drivers[0],second=drivers[1],team=teams[0];
    const map=driverMap(league);
    const race=latestRace(league);
    const winnerRow=race.find(r=>num(r.finish)===1)||race[0];
    const winner=winnerRow?map.get(String(winnerRow.driverId)):null;

    if(leader){
      setText('home'+prefix+'Leader',pretty(leader.driver));
      setText('home'+prefix+'Points',Math.round(num(leader.points)).toLocaleString('en-US'));
      setHref('home'+prefix+'LeaderLink',driverLink(key,leader));
      setDriverPhoto('home'+prefix+'LeaderPhoto',{driverId:leader.driverId,driver:pretty(leader.driver)});
    }
    if(second&&leader){
      const gap=Math.max(0,num(leader.points)-num(second.points));
      setText('home'+prefix+'Gap',gap.toLocaleString('en-US')+' PTS');
      setText('home'+prefix+'Second',pretty(second.driver)+' • P2');
    }else{
      setText('home'+prefix+'Gap','--');
      setText('home'+prefix+'Second','No P2 driver available');
    }
    if(team){
      setText('home'+prefix+'Team',team.team||'--');
      setText('home'+prefix+'TeamMini',team.team||'--');
      setHref('home'+prefix+'TeamLink',teamLink(key,team));
    }
    if(winner){
      setText('home'+prefix+'Winner',pretty(winner.driver));
      setHref('home'+prefix+'WinnerLink',driverLink(key,winner));
      setDriverPhoto('home'+prefix+'WinnerPhoto',{driverId:winner.driverId,driver:pretty(winner.driver)});
    }else if(winnerRow){
      setText('home'+prefix+'Winner','Race '+num(winnerRow.raceNumber)+' winner');
    }
    return {league,drivers,teams,leader,second,team,winner};
  }

  function recentDriverCandidates(snapshot){
    const out=[];
    for(const key of ['sunday','monday']){
      const league=snapshot?.leagues?.[key];if(!league)continue;
      const rows=league.results||[];
      for(const d of league.drivers||[]){
        const recent=rows
          .filter(r=>String(r.driverId)===String(d.driverId)&&num(r.finish)>0)
          .sort((a,b)=>num(b.raceNumber)-num(a.raceNumber))
          .slice(0,3);
        if(!recent.length)continue;
        const avg=recent.reduce((t,r)=>t+num(r.finish),0)/recent.length;
        const pts=recent.reduce((t,r)=>t+num(r.points),0);
        out.push({key,d,recent,avg,pts});
      }
    }
    return out;
  }
  function renderHot(snapshot){
    const all=recentDriverCandidates(snapshot);
    if(!all.length)return;
    const maxCount=Math.max(...all.map(x=>x.recent.length));
    const eligible=all.filter(x=>x.recent.length===maxCount);
    const hot=eligible.sort((a,b)=>a.avg-b.avg||b.pts-a.pts)[0];
    if(!hot)return;
    setText('homeHotDriver',pretty(hot.d.driver));
    setText('homeHotDetail',
      (hot.key==='sunday'?'Sunday':'Monday')+' • '+
      hot.recent.map(r=>'P'+num(r.finish)).join(' • ')+' • '+
      hot.avg.toFixed(1)+' avg finish'
    );
    setHref('homeHotLink',driverLink(hot.key,hot.d));
  }

  function easternParts(date){
    return new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',
      year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hour12:false
    }).formatToParts(date).reduce((o,p)=>(o[p.type]=p.value,o),{});
  }
  function easternOffsetMinutes(date){
    const zone=new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',timeZoneName:'shortOffset',hour:'2-digit'
    }).formatToParts(date).find(p=>p.type==='timeZoneName')?.value||'GMT-4';
    const m=zone.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if(!m)return -240;
    const mins=Number(m[2])*60+Number(m[3]||0);
    return m[1]==='+'?mins:-mins;
  }
  function easternInstant(y,m,d,h,min){
    let utc=Date.UTC(y,m-1,d,h,min,0,0);
    for(let i=0;i<2;i++){
      const off=easternOffsetMinutes(new Date(utc));
      utc=Date.UTC(y,m-1,d,h,min,0,0)-off*60000;
    }
    return new Date(utc);
  }
  function nextRaceFor(day){
    const now=new Date(),p=easternParts(now);
    const shadow=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)));
    const current=shadow.getUTCDay();
    let add=(day-current+7)%7;
    const hour=Number(p.hour)+Number(p.minute)/60;
    if(add===0&&hour>=20.5)add=7;
    shadow.setUTCDate(shadow.getUTCDate()+add);
    return easternInstant(shadow.getUTCFullYear(),shadow.getUTCMonth()+1,shadow.getUTCDate(),20,30);
  }
  function renderNextRace(){
    const sunday=nextRaceFor(0),monday=nextRaceFor(1);
    const isSunday=sunday<monday;
    const target=isSunday?sunday:monday;
    const label=isSunday?'SUNDAY NIGHT':'MONDAY NIGHT';
    setText('homeNextRace',label);
    const date=new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'
    }).format(target).toUpperCase();
    setText('homeNextRaceDetail',date+' • 8:30 PM ET');
  }

  async function load(){
    if(!window.HLRNData)return;
    try{
      if(window.HLRNDrivers?.load) await window.HLRNDrivers.load();
      const snapshot=await HLRNData.load();
      renderLeague(snapshot,'sunday','Sunday');
      renderLeague(snapshot,'monday','Monday');
      renderHot(snapshot);
      renderNextRace();
      if(snapshot.generatedAt){
        const when=new Date(snapshot.generatedAt).toLocaleTimeString('en-US',{
          hour:'numeric',minute:'2-digit'
        });
        setText('homeChampUpdated','LIVE DATA • UPDATED '+when);
      }else setText('homeChampUpdated','LIVE HLRN DATA');
    }catch(err){
      console.error('HLRN homepage championship center:',err);
      setText('homeChampUpdated','DATA TEMPORARILY UNAVAILABLE');
    }
  }

  function start(){
    renderNextRace();
    load();
    setInterval(renderNextRace,60000);
    setInterval(()=>{if(document.visibilityState==='visible')load()},300000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
