(function(){
'use strict';

const $=id=>document.getElementById(id);
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const rawNum=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const pretty=name=>{
  const raw=String(name||'').trim();
  if(!raw.includes(','))return raw.replace(/\d+$/,'').trim();
  const p=raw.split(','),last=(p.shift()||'').trim().replace(/\d+$/,''),first=p.join(' ').trim();
  return (first+' '+last).trim();
};
const slug=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const fmt=(v,d=0)=>{
  const n=Number(v);
  if(!Number.isFinite(n))return '—';
  if(d===0||Math.abs(n-Math.round(n))<.0001)return Math.round(n).toLocaleString('en-US');
  return n.toFixed(d);
};
const first=(obj,keys)=>{
  for(const key of keys){
    if(obj && obj[key]!==undefined && obj[key]!==null && String(obj[key]).trim()!=='')return obj[key];
  }
  return null;
};

let snapshot=null;
let races=[];
let activeFilter='all';
let currentKey='';
let recapItems=[];
let recapArchives=new Map();

function leagueLabel(key){return key==='sunday'?'Sunday Night League':'Monday Night League'}
function leagueShort(key){return key==='sunday'?'SUNDAY':'MONDAY'}
function leagueData(key){return snapshot?.leagues?.[key]||{drivers:[],results:[],teams:[],teamRosters:{}}}
function driverMap(key){return new Map((leagueData(key).drivers||[]).map(d=>[String(d.driverId??''),d]))}
function driverName(key,id){
  const d=driverMap(key).get(String(id));
  return pretty(d?.driver||('Driver '+id));
}
function driverLink(key,id){
  const d=driverMap(key).get(String(id));
  return window.HLRNDrivers?.profileUrl?.({driverId:id,driver:pretty(d?.driver||"")}) || '../drivers/';
}
function teamLink(key,name){
  return '../teams/?'+new URLSearchParams({league:key,team:String(name||'')}).toString();
}
function dateValue(v){
  const d=new Date(v);
  return Number.isNaN(d.getTime())?null:d;
}
function formatDate(v){
  const d=dateValue(v);
  if(!d)return 'DATE UNAVAILABLE';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d).toUpperCase();
}
function raceKey(key,raceNumber,raceId){return key+'|'+String(raceNumber)+'|'+String(raceId||'')}
function raceUrl(r){
  return '?'+new URLSearchParams({league:r.league,race:String(r.raceNumber)}).toString();
}
function recapSeries(value){
  const s=String(value||'').toLowerCase();
  if(s.includes('sunday'))return 'sunday';
  if(s.includes('monday'))return 'monday';
  return '';
}
function trackKey(value){
  return String(value||'').toLowerCase()
    .replace(/\b(international|motor|speedway|raceway|motorspeedway|the|oval)\b/g,' ')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function sameTrack(a,b){
  const x=trackKey(a),y=trackKey(b);
  return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x));
}
function recapRawUrl(item){
  if(item?.rawUrl)return String(item.rawUrl).startsWith('/')?'..'+item.rawUrl:item.rawUrl;
  const s=String(item?.slug||'').replace(/[^a-z0-9-]/gi,'');
  return s?'../data/race-recaps/'+encodeURIComponent(s)+'.json':'';
}
function recapStoryUrl(item){return item?.url||'../news/race-recaps/'}
function recapResultsUrl(item){return item?.resultsUrl||(item?.slug?'./?recap='+encodeURIComponent(item.slug):'./#recorderArchive')}

function buildRaces(){
  const out=[];
  for(const key of ['sunday','monday']){
    const rows=leagueData(key).results||[];
    const groups=new Map();
    for(const row of rows){
      const groupKey=String(row.raceId||row.raceNumber||'');
      if(!groups.has(groupKey))groups.set(groupKey,[]);
      groups.get(groupKey).push(row);
    }
    for(const [id,group] of groups){
      group.sort((a,b)=>num(a.finish)-num(b.finish)||num(a.start)-num(b.start));
      if(!group.length)continue;
      const head=group[0];
      out.push({
        key:raceKey(key,head.raceNumber,id),
        league:key,
        raceId:String(id),
        raceNumber:num(head.raceNumber),
        track:String(head.track||'Unknown Track'),
        date:head.date||'',
        rows:group
      });
    }
  }
  out.sort((a,b)=>{
    const da=dateValue(a.date)?.getTime()||0,db=dateValue(b.date)?.getTime()||0;
    return db-da||b.raceNumber-a.raceNumber;
  });
  races=out;
}

function linkRecapsToRaces(){
  races.forEach(r=>{delete r.recap});
  recapItems.forEach(item=>{
    const archive=recapArchives.get(String(item.slug||'')); if(!archive)return;
    const series=recapSeries(item.series||archive?.article?.series||archive?.recorder?.race?.series);
    const track=item.track||archive?.article?.track||archive?.recorder?.race?.track||'';
    const when=dateValue(item.raceFrozenAt||archive?.article?.raceFrozenAt||item.publishedAt||archive?.article?.publishedAt)?.getTime()||0;
    const candidates=races.filter(r=>r.league===series&&sameTrack(r.track,track)).sort((a,b)=>{
      const da=Math.abs((dateValue(a.date)?.getTime()||0)-when),db=Math.abs((dateValue(b.date)?.getTime()||0)-when);
      return da-db;
    });
    const match=candidates[0];
    if(match){
      const diff=Math.abs((dateValue(match.date)?.getTime()||0)-when);
      if(!when||diff<=48*60*60*1000)match.recap={summary:item,archive};
    }
  });
}

function raceStats(race){
  const rows=race.rows||[];
  const map=driverMap(race.league);
  const winner=rows.find(r=>num(r.finish)===1)||rows[0]||null;
  const pole=rows.find(r=>num(r.start)===1)||null;
  const led=[...rows].sort((a,b)=>num(b.lapsLed)-num(a.lapsLed)||num(a.finish)-num(b.finish))[0]||null;
  const mover=[...rows].sort((a,b)=>
    num(b.positionGain ?? (num(b.start)-num(b.finish)))-
    num(a.positionGain ?? (num(a.start)-num(a.finish))) ||
    num(a.finish)-num(b.finish)
  )[0]||null;
  const totalInc=rows.reduce((t,r)=>t+num(r.incidents),0);
  const avgInc=rows.length?totalInc/rows.length:0;
  const dnf=rows.filter(r=>/(disconnect|disqual|(^|\s)dq($|\s)|retir|wreck|crash|engine|out|tow)/i.test(String(r.status||''))).length;
  const winnerDriver=winner?map.get(String(winner.driverId)):null;
  const poleDriver=pole?map.get(String(pole.driverId)):null;
  const ledDriver=led?map.get(String(led.driverId)):null;
  const moverDriver=mover?map.get(String(mover.driverId)):null;
  const fastestRow=rows.find(r=>first(r,['fastestLap','bestLap','bestLapTime','fastest_lap'])!==null);
  const cautions=first(rows[0],['cautions','cautionCount','yellowFlags','yellow_flags']);
  const penalties=rows.reduce((t,r)=>{
    const p=rawNum(first(r,['penalties','penalty','penaltyCount','penalty_count']));
    return t+(p||0);
  },0);
  const hasPenalties=rows.some(r=>first(r,['penalties','penalty','penaltyCount','penalty_count'])!==null);
  return {
    winner,winnerName:pretty(winnerDriver?.driver||driverName(race.league,winner?.driverId)),
    pole,poleName:pole?pretty(poleDriver?.driver||driverName(race.league,pole.driverId)):'Unavailable',
    led,ledName:led?pretty(ledDriver?.driver||driverName(race.league,led.driverId)):'Unavailable',
    mover,moverName:mover?pretty(moverDriver?.driver||driverName(race.league,mover.driverId)):'Unavailable',
    moverGain:mover?num(mover.positionGain ?? (num(mover.start)-num(mover.finish))):0,
    totalInc,avgInc,dnf,field:rows.length,
    fastestRow,
    fastest:first(fastestRow,['fastestLap','bestLap','bestLapTime','fastest_lap']),
    cautions,
    penalties:hasPenalties?penalties:null
  };
}

function eventPointsProgression(key,targetRaceNumber){
  const data=leagueData(key);
  const drivers=data.drivers||[];
  const ids=new Set(drivers.map(d=>String(d.driverId)));
  (data.results||[]).forEach(r=>ids.add(String(r.driverId)));
  const totalsAfter=new Map(),totalsBefore=new Map();

  for(const id of ids){totalsAfter.set(id,0);totalsBefore.set(id,0)}
  for(const row of data.results||[]){
    const rn=num(row.raceNumber),id=String(row.driverId);
    if(rn<=targetRaceNumber)totalsAfter.set(id,(totalsAfter.get(id)||0)+num(row.points));
    if(rn<targetRaceNumber)totalsBefore.set(id,(totalsBefore.get(id)||0)+num(row.points));
  }
  const rankMap=totals=>{
    const arr=[...totals.entries()]
      .filter(([,pts])=>pts>0)
      .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    const map=new Map();
    arr.forEach(([id,pts],i)=>map.set(id,{rank:i+1,points:pts}));
    return map;
  };
  const before=rankMap(totalsBefore),after=rankMap(totalsAfter);
  return {before,after};
}

function currentRosterTeams(race){
  const data=leagueData(race.league),rosters=data.teamRosters||{},raceIds=new Set(race.rows.map(r=>String(r.driverId)));
  const rowById=new Map(race.rows.map(r=>[String(r.driverId),r]));
  const teams=[];
  for(const [name,members] of Object.entries(rosters)){
    const active=(members||[]).filter(m=>raceIds.has(String(m.driverId)));
    if(!active.length)continue;
    const rows=active.map(m=>rowById.get(String(m.driverId))).filter(Boolean);
    teams.push({
      name,
      drivers:rows.length,
      points:rows.reduce((t,r)=>t+num(r.points),0),
      bestFinish:Math.min(...rows.map(r=>num(r.finish)||9999)),
      lapsLed:rows.reduce((t,r)=>t+num(r.lapsLed),0)
    });
  }
  return teams.sort((a,b)=>b.points-a.points||a.bestFinish-b.bestFinish).slice(0,6);
}

function cardHtml(race){
  const s=raceStats(race);
  const podium=[...race.rows]
    .filter(r=>num(r.finish)>=1&&num(r.finish)<=3)
    .sort((a,b)=>num(a.finish)-num(b.finish));
  const podiumHtml=podium.map(row=>
    '<div class="archive-podium-row p'+num(row.finish)+'">'+
      '<b>P'+esc(row.finish)+'</b>'+
      '<span>'+esc(driverName(race.league,row.driverId))+'</span>'+
    '</div>'
  ).join('');
  return '<button class="archive-card '+race.league+'" type="button" data-race-key="'+esc(race.key)+'">'+
    '<div class="archive-card-top"><span class="archive-series">'+leagueShort(race.league)+' NIGHT</span><span class="archive-date">'+esc(formatDate(race.date))+'</span></div>'+
    '<div class="archive-card-body">'+
      '<div class="archive-race-no">RACE '+esc(race.raceNumber)+' • '+esc(s.field)+' STARTERS</div>'+
      '<div class="archive-track">'+esc(race.track)+'</div>'+
      '<div class="archive-winner"><div class="archive-winner-pos">01</div><div><small>RACE WINNER</small><strong>'+esc(s.winnerName)+'</strong></div></div>'+
      '<div class="archive-podium">'+podiumHtml+'</div>'+
      '<div class="archive-card-stats">'+
        '<div><b>'+esc(s.poleName)+'</b><span>POLE</span></div>'+
        '<div><b>'+fmt(s.led?.lapsLed)+'</b><span>MOST LAPS LED</span></div>'+
        '<div><b>+'+fmt(Math.max(0,s.moverGain))+'</b><span>BIGGEST MOVER</span></div>'+
      '</div>'+
    '</div>'+
    '<div class="archive-open"><span>OPEN FULL RESULTS</span><b>→</b></div>'+
  '</button>';
}

function renderArchive(){
  const filtered=activeFilter==='all'?races:races.filter(r=>r.league===activeFilter);
  $('archiveGrid').innerHTML=filtered.length?filtered.map(cardHtml).join(''):'<div class="archive-empty">NO COMPLETED RACES FOUND FOR THIS FILTER.</div>';
  $('archiveRaceCount').textContent=races.length;
  const winnerIds=new Set(),driverIds=new Set();
  races.forEach(r=>{
    const w=r.rows.find(x=>num(x.finish)===1);
    if(w)winnerIds.add(r.league+'|'+w.driverId);
    r.rows.forEach(row=>driverIds.add(r.league+'|'+row.driverId));
  });
  $('archiveWinnerCount').textContent=winnerIds.size;
  $('archiveDriverCount').textContent=driverIds.size;
}

function feature(label,value,detail,unavailable=false){
  return '<div class="report-feature"><span>'+esc(label)+'</span><strong class="'+(unavailable?'report-unavailable':'')+'">'+esc(value)+'</strong><small>'+esc(detail)+'</small></div>';
}
function rowName(key,row){
  return pretty(row?.displayName||row?.name||driverName(key,row?.driverId));
}
function driverAnchor(key,row){
  const name=rowName(key,row);
  const known=driverMap(key).has(String(row?.driverId??''));
  return known
    ? '<a class="report-driver-link" href="'+esc(driverLink(key,row.driverId))+'">'+esc(name)+'</a>'
    : '<span class="report-driver-link">'+esc(name)+'</span>';
}
function recapLists(race){
  const article=race?.recap?.archive?.article||{},recorder=race?.recap?.archive?.recorder||{};
  const cautions=Array.isArray(article.cautions)?article.cautions:(Array.isArray(recorder.cautionHistory)?recorder.cautionHistory:[]);
  const penalties=Array.isArray(article.penalties)?article.penalties:(Array.isArray(recorder.penaltyHistory)?recorder.penaltyHistory:[]);
  return{
    article,recorder,cautions,penalties,
    leadChanges:rawNum(article.leadChanges),
    snapshots:rawNum(article.completedLapsCaptured)??(Array.isArray(recorder.lapSnapshots)?recorder.lapSnapshots.length:null)
  };
}
function raceControlLog(race){
  const x=recapLists(race); if(!race?.recap)return '';
  if(!x.cautions.length&&!x.penalties.length)return '<div class="report-story"><strong>Recorder note:</strong> The race was frozen at checkered with no caution or penalty records in the published recorder archive.</div>';
  let html='<div class="report-team-grid">';
  x.cautions.forEach(c=>{
    const lap=first(c,['startLap','lap','raceLap']),restart=first(c,['restartLap','greenLap']);
    const reason=first(c,['reason','cause','description'])||'Exact iRacing caution cause was not exposed.';
    html+='<div class="report-team-card"><span>CAUTION #'+esc(c.number??'—')+(lap!==null?' • LAP '+esc(lap):'')+'</span><strong>'+esc(reason)+'</strong><small>'+(restart!==null?'Restart lap '+esc(restart)+' • ':'')+esc(c.reasonSource||c.source||'Recorder')+'</small></div>';
  });
  x.penalties.forEach(p=>{
    const lap=first(p,['lap','raceLap']),name=first(p,['driverName','name'])||'Driver';
    const reason=first(p,['reason','penaltyReason','description'])||'Exact iRacing black-flag reason was not exposed.';
    html+='<div class="report-team-card"><span>BLACK FLAG / PENALTY'+(lap!==null?' • LAP '+esc(lap):'')+'</span><strong>'+esc(name)+'</strong><small>'+esc(reason)+(p.reasonSource?' • '+esc(p.reasonSource):'')+'</small></div>';
  });
  return html+'</div>';
}
function recapButtons(race){
  const item=race?.recap?.summary;if(!item)return '';
  const raw=recapRawUrl(item),story=recapStoryUrl(item);
  return '<div class="recorder-card-actions" style="margin:14px 0 22px">'+
    '<a href="'+esc(story)+'">READ POST-RACE STORY →</a>'+
    (raw?'<a class="secondary" href="'+esc(raw)+'">PERMANENT RECORDER JSON</a>':'')+
    '<a class="secondary" href="../broadcasters/?league='+esc(race.league)+'">WATCH HLRN</a>'+
  '</div>';
}

function reportNarrative(race,s){
  const second=race.rows.find(r=>num(r.finish)===2);
  const third=race.rows.find(r=>num(r.finish)===3);
  let text='<strong>'+esc(s.winnerName)+'</strong> won Race '+esc(race.raceNumber)+' at <strong>'+esc(race.track)+'</strong>';
  if(second)text+=' over '+driverAnchor(race.league,second);
  if(third)text+=' and '+driverAnchor(race.league,third);
  text+='. ';
  if(s.mover&&s.moverGain>0){
    text+='<strong>'+esc(s.moverName)+'</strong> made the biggest charge, gaining '+esc(s.moverGain)+' positions from P'+esc(s.mover.start)+' to P'+esc(s.mover.finish)+'. ';
  }
  if(s.led&&num(s.led.lapsLed)>0){
    text+='<strong>'+esc(s.ledName)+'</strong> led the most laps with '+esc(fmt(s.led.lapsLed))+'. ';
  }
  text+='The '+esc(s.field)+'-driver field recorded '+esc(fmt(s.totalInc))+' total incident points.';
  if(s.dnf)text+=' '+esc(s.dnf)+' driver'+(s.dnf===1?' was':'s were')+' classified with an out/DQ/retirement-type status.';
  return text;
}

function renderReport(race,updateUrl=true){
  const s=raceStats(race),progress=eventPointsProgression(race.league,race.raceNumber);
  const rows=[...race.rows].sort((a,b)=>num(a.finish)-num(b.finish));
  const standingsLeader=[...progress.after.entries()].sort((a,b)=>a[1].rank-b[1].rank)[0];
  const standingsLeaderName=standingsLeader?driverName(race.league,standingsLeader[0]):'Unavailable';
  const standingsLeaderPts=standingsLeader?standingsLeader[1].points:0;

  const table=rows.map(row=>{
    const id=String(row.driverId),after=progress.after.get(id),before=progress.before.get(id);
    const move=after&&before?before.rank-after.rank:null;
    const gain=rawNum(row.positionGain)!==null?num(row.positionGain):num(row.start)-num(row.finish);
    return '<tr class="'+(num(row.finish)===1?'winner':'')+'">'+
      '<td class="finish">P'+esc(row.finish||'—')+'</td>'+
      '<td>'+driverAnchor(race.league,row)+'</td>'+
      '<td>P'+esc(row.start||'—')+'</td>'+
      '<td class="'+(gain>0?'report-positive':gain<0?'report-negative':'')+'">'+(gain>0?'+':'')+esc(gain)+'</td>'+
      '<td>'+esc(row.points??'—')+'</td>'+
      '<td>'+esc(row.lapsLed??'—')+'</td>'+
      '<td>'+esc(row.incidents??'—')+'</td>'+
      '<td>'+esc(row.status||'—')+'</td>'+
      '<td>'+(after?'P'+esc(after.rank):'—')+'</td>'+
      '<td class="'+(move>0?'report-positive':move<0?'report-negative':'')+'">'+(move===null?'NEW':(move>0?'+':'')+move)+'</td>'+
    '</tr>';
  }).join('');

  const mobileFinishCards=rows.map(row=>{
    const id=String(row.driverId),after=progress.after.get(id),before=progress.before.get(id);
    const move=after&&before?before.rank-after.rank:null;
    const gain=rawNum(row.positionGain)!==null?num(row.positionGain):num(row.start)-num(row.finish);
    const gainText=(gain>0?'+':'')+String(gain);
    const moveText=move===null?'NEW':(move>0?'+':'')+String(move);
    return '<article class="report-mobile-driver '+(num(row.finish)===1?'winner':'')+'">'+
      '<div class="report-mobile-main">'+
        '<div class="report-mobile-finish">P'+esc(row.finish||'—')+'</div>'+
        '<div class="report-mobile-driver-copy"><strong>'+driverAnchor(race.league,row)+'</strong><span>START P'+esc(row.start||'—')+' • '+esc(row.status||'—')+'</span></div>'+
        '<div class="report-mobile-gain '+(gain>0?'report-positive':gain<0?'report-negative':'')+'">'+esc(gainText)+'<small>+/-</small></div>'+
      '</div>'+
      '<div class="report-mobile-stats">'+
        '<span><b>'+esc(row.points??'—')+'</b><small>PTS</small></span>'+
        '<span><b>'+esc(row.lapsLed??'—')+'</b><small>LED</small></span>'+
        '<span><b>'+esc(row.incidents??'—')+'</b><small>INC</small></span>'+
        '<span><b>'+(after?'P'+esc(after.rank):'—')+'</b><small>EVT RANK</small></span>'+
        '<span class="'+(move>0?'report-positive':move<0?'report-negative':'')+'"><b>'+esc(moveText)+'</b><small>MOVE</small></span>'+
      '</div>'+
    '</article>';
  }).join('');

  const teamRows=currentRosterTeams(race);
  const teamHtml=teamRows.length?teamRows.map((t,i)=>
    '<a class="report-team-card" href="'+esc(teamLink(race.league,t.name))+'">'+
      '<span>CURRENT-ROSTER TEAM • '+(i===0?'TOP EVENT POINTS':'EVENT POINTS')+'</span>'+
      '<strong>'+esc(t.name)+'</strong>'+
      '<small>'+fmt(t.points)+' pts • '+fmt(t.drivers)+' drivers • best P'+fmt(t.bestFinish)+' • '+fmt(t.lapsLed)+' laps led</small>'+
    '</a>'
  ).join(''):'<div class="report-team-card"><span>TEAM DATA</span><strong class="report-unavailable">ROSTER SYNC UNAVAILABLE</strong><small>Team totals will appear once current roster mappings are available.</small></div>';

  const rx=recapLists(race);
  const fastestText=s.fastest!==null&&s.fastest!==undefined?String(s.fastest):'Not in feed';
  const cautionValue=race.recap?rx.cautions.length:s.cautions;
  const penaltyValue=race.recap?rx.penalties.length:s.penalties;
  const cautionText=cautionValue!==null&&cautionValue!==undefined?String(cautionValue):'Not in feed';
  const penaltyText=penaltyValue!==null&&penaltyValue!==undefined?fmt(penaltyValue):'Not in feed';

  $('raceReportContent').innerHTML=
    '<section class="report-hero '+race.league+'">'+
      '<div class="report-kicker">'+leagueShort(race.league)+' NIGHT LEAGUE • POST-RACE REPORT</div>'+
      '<div class="report-track">'+esc(race.track)+'</div>'+
      '<div class="report-meta">RACE '+esc(race.raceNumber)+' • '+esc(formatDate(race.date))+' • RACE ID '+esc(race.raceId)+'</div>'+
      '<div class="report-hero-grid">'+
        '<div class="report-hero-main"><span>RACE WINNER</span><strong>'+esc(s.winnerName)+'</strong></div>'+
        '<div class="report-hero-stat"><span>FIELD</span><strong>'+fmt(s.field)+'</strong></div>'+
        '<div class="report-hero-stat"><span>TOTAL INC</span><strong>'+fmt(s.totalInc)+'</strong></div>'+
        '<div class="report-hero-stat"><span>DNF / OUT</span><strong>'+fmt(s.dnf)+'</strong></div>'+
      '</div>'+
    '</section>'+
    '<h3 class="report-section-title">Automatic Race Recap</h3>'+
    '<div class="report-story">'+reportNarrative(race,s)+'</div>'+
    '<h3 class="report-section-title">Race Intelligence</h3>'+
    '<div class="report-feature-grid">'+
      feature('Pole Winner',s.poleName,s.pole?'Started P1':'Starting-grid field unavailable',!s.pole)+
      feature('Most Laps Led',s.ledName,s.led?fmt(s.led.lapsLed)+' laps led':'No lap-led data',!s.led)+
      feature('Biggest Mover',s.moverName,s.mover?('P'+fmt(s.mover.start)+' → P'+fmt(s.mover.finish)+' • '+(s.moverGain>=0?'+':'')+fmt(s.moverGain)):'Unavailable',!s.mover)+
      feature('Event-Points Leader',standingsLeaderName,standingsLeader?fmt(standingsLeaderPts)+' cumulative published event pts':'Unavailable',!standingsLeader)+
      feature('Fastest Lap',fastestText,s.fastest!==null&&s.fastest!==undefined?'Published race-feed value':'This field is not currently published',s.fastest===null||s.fastest===undefined)+
      feature('Cautions',cautionText,race.recap?'Permanent frozen recorder':(s.cautions!==null&&s.cautions!==undefined?'Published race-feed value':'This field is not currently published'),cautionValue===null||cautionValue===undefined)+
      feature('Penalties',penaltyText,race.recap?'Permanent frozen recorder':(s.penalties!==null?'Published race-feed total':'This field is not currently published'),penaltyValue===null||penaltyValue===undefined)+
      feature('Lead Changes',race.recap?(rx.leadChanges??'—'):'—',race.recap?'Calculated from completed-lap snapshots':'Available after recorder publication',!race.recap||rx.leadChanges===null)+
      feature('Lap Snapshots',race.recap?(rx.snapshots??'—'):'—',race.recap?'Completed laps preserved at checkered':'Available after recorder publication',!race.recap||rx.snapshots===null)+
      feature('Incidents / Driver',s.avgInc.toFixed(1),fmt(s.totalInc)+' total across '+fmt(s.field)+' starters')+
    '</div>'+
    (race.recap?'<h3 class="report-section-title">Permanent Checkered Record</h3>'+recapButtons(race)+'<h3 class="report-section-title">Race Control Log</h3>'+raceControlLog(race):'')+
    '<h3 class="report-section-title">Finishing Order & Event-Points Movement</h3>'+
    '<div class="report-story">Movement below is reconstructed from the <strong>published points in each completed event</strong>. It is not labeled as an official historical championship snapshot because Sunday season totals can also include stage/bonus components not preserved per event.</div>'+
    '<div class="report-mobile-finishing">'+mobileFinishCards+'</div>'+
    '<div class="report-table-shell"><table class="report-table"><thead><tr>'+
      '<th>FIN</th><th>DRIVER</th><th>START</th><th>+/-</th><th>PTS</th><th>LED</th><th>INC</th><th>STATUS</th><th>EVT PTS RANK</th><th>MOVE</th>'+
    '</tr></thead><tbody>'+table+'</tbody></table></div>'+
    '<h3 class="report-section-title">Team Performance</h3>'+
    '<div class="report-story">Team totals use the <strong>current published team roster mapping</strong> matched to drivers in this race. This avoids inventing historical team assignments that are not stored in the race feed.</div>'+
    '<div class="report-team-grid">'+teamHtml+'</div>';

  $('raceArchive').style.display='none';
  $('raceReportView').classList.add('active');
  currentKey=race.key;
  window.scrollTo({top:$('raceReportView').offsetTop-20,behavior:'smooth'});
  if(updateUrl)history.pushState({race:race.key},'',raceUrl(race));
}

function closeReport(updateUrl=true){
  $('raceReportView').classList.remove('active');
  $('raceArchive').style.display='block';
  currentKey='';
  if(updateUrl)history.pushState({archive:true},'','./#raceArchive');
  setTimeout(()=>$('raceArchive').scrollIntoView({behavior:'smooth',block:'start'}),10);
}

function finalRecorderRows(archive){
  const recorder=archive?.recorder||{},snaps=Array.isArray(recorder.lapSnapshots)?recorder.lapSnapshots:[];
  const last=snaps.slice().sort((a,b)=>num(b.lap)-num(a.lap))[0];
  const live=Array.isArray(recorder?.race?.drivers)?recorder.race.drivers:[];
  const liveByIdx=new Map(live.filter(d=>d.carIdx!==undefined&&d.carIdx!==null).map(d=>[String(d.carIdx),d]));
  const order=Array.isArray(last?.order)&&last.order.length?last.order:live;
  return order.map((o,i)=>{
    const more=o?.carIdx!==undefined&&o?.carIdx!==null?liveByIdx.get(String(o.carIdx)):null;
    const x=Object.assign({},more||{},o||{});
    return{
      driverId:x.userId||x.driverId||x.customerId||x.carIdx||('rec-'+i),
      displayName:x.name||('Driver '+(i+1)),
      start:null,
      finish:rawNum(x.position)??(i+1),
      positionGain:null,
      points:null,
      lapsLed:0,
      incidents:rawNum(x.incidents),
      status:x.status||(x.disqualified?'DQ':'FINAL'),
      lapsCompleted:rawNum(x.lapsCompleted),
      lapsDown:rawNum(x.lapsDown)
    };
  }).sort((a,b)=>num(a.finish)-num(b.finish));
}
function renderFrozenOnlyReport(item,archive){
  const article=archive?.article||{},rows=finalRecorderRows(archive),winner=article.winner||item?.winner||{};
  const fake={
    key:'recap:'+String(item?.slug||''),league:recapSeries(item?.series||article.series)||'sunday',
    raceId:String(article.subSessionId||article.sessionId||item?.subSessionId||item?.sessionId||'RECORDER'),
    raceNumber:rawNum(article.raceNumber)||'—',
    track:article.track||item?.track||archive?.recorder?.race?.track||'HLRN Race',
    date:article.raceFrozenAt||item?.raceFrozenAt||article.publishedAt||item?.publishedAt||new Date().toISOString(),
    rows,recap:{summary:item,archive}
  };
  const rx=recapLists(fake);
  const table=rows.map(row=>'<tr><td class="finish">P'+esc(row.finish||'—')+'</td><td>'+driverAnchor(fake.league,row)+'</td><td>—</td><td>—</td><td>—</td><td>'+esc(row.lapsLed??'—')+'</td><td>'+esc(row.incidents??'—')+'</td><td>'+esc(row.status||'—')+'</td><td>—</td><td>—</td></tr>').join('');
  const mobile=rows.map(row=>'<article class="report-mobile-driver '+(num(row.finish)===1?'winner':'')+'"><div class="report-mobile-main"><div class="report-mobile-finish">P'+esc(row.finish||'—')+'</div><div class="report-mobile-driver-copy"><strong>'+driverAnchor(fake.league,row)+'</strong><span>'+esc(row.status||'FINAL')+'</span></div><div class="report-mobile-gain">—<small>+/-</small></div></div><div class="report-mobile-stats"><span><b>—</b><small>PTS</small></span><span><b>'+esc(row.lapsCompleted??'—')+'</b><small>LAPS</small></span><span><b>'+esc(row.incidents??'—')+'</b><small>INC</small></span></div></article>').join('');
  $('raceReportContent').innerHTML=
    '<section class="report-hero '+fake.league+'"><div class="report-kicker">'+leagueShort(fake.league)+' NIGHT LEAGUE • PERMANENT CHECKERED RECORD</div><div class="report-track">'+esc(fake.track)+'</div><div class="report-meta">'+esc(formatDate(fake.date))+' • '+esc(fake.raceId)+'</div><div class="report-hero-grid"><div class="report-hero-main"><span>RECORDED WINNER</span><strong>'+esc(winner.name||rows[0]?.displayName||'—')+'</strong></div><div class="report-hero-stat"><span>FIELD</span><strong>'+fmt(rows.length)+'</strong></div><div class="report-hero-stat"><span>CAUTIONS</span><strong>'+fmt(rx.cautions.length)+'</strong></div><div class="report-hero-stat"><span>PENALTIES</span><strong>'+fmt(rx.penalties.length)+'</strong></div></div></section>'+
    '<h3 class="report-section-title">Permanent Checkered Record</h3><div class="report-story">This record was frozen by the HLRN Live Race Center at checkered and published before official league scoring was available. Official championship points will replace recorder-only fields when the normal results sync catches up.</div>'+
    recapButtons(fake)+
    '<div class="report-feature-grid">'+
      feature('Cautions',rx.cautions.length,'Permanent frozen recorder')+
      feature('Penalties',rx.penalties.length,'Black flags / penalties preserved')+
      feature('Lead Changes',rx.leadChanges??'—','Calculated from completed-lap snapshots',rx.leadChanges===null)+
      feature('Lap Snapshots',rx.snapshots??'—','Completed laps preserved',rx.snapshots===null)+
    '</div>'+
    '<h3 class="report-section-title">Race Control Log</h3>'+raceControlLog(fake)+
    '<h3 class="report-section-title">Recorded Final Order</h3>'+
    '<div class="report-mobile-finishing">'+mobile+'</div>'+
    '<div class="report-table-shell"><table class="report-table"><thead><tr><th>FIN</th><th>DRIVER</th><th>START</th><th>+/-</th><th>PTS</th><th>LED</th><th>INC</th><th>STATUS</th><th>EVT PTS RANK</th><th>MOVE</th></tr></thead><tbody>'+table+'</tbody></table></div>';
  $('raceArchive').style.display='none';$('raceReportView').classList.add('active');currentKey=fake.key;
  window.scrollTo({top:$('raceReportView').offsetTop-20,behavior:'smooth'});
}
function openFromQuery(){
  const q=new URLSearchParams(location.search),recapSlug=String(q.get('recap')||'').trim();
  if(recapSlug){
    const race=races.find(r=>String(r?.recap?.summary?.slug||'')===recapSlug);
    if(race){renderReport(race,false);return true}
    const item=recapItems.find(x=>String(x?.slug||'')===recapSlug),archive=recapArchives.get(recapSlug);
    if(item&&archive){renderFrozenOnlyReport(item,archive);return true}
    return false;
  }
  const key=String(q.get('league')||'').toLowerCase(),raceNo=num(q.get('race'));
  if(!['sunday','monday'].includes(key)||!raceNo)return false;
  const race=races.find(r=>r.league===key&&r.raceNumber===raceNo);
  if(!race)return false;
  renderReport(race,false);
  return true;
}

function recorderCard(item){
  const winner=item?.winner||{};
  const slug=String(item?.slug||'').replace(/[^a-z0-9-]/gi,'');
  const story=recapStoryUrl(item);
  const raw=recapRawUrl(item)||'../data/race-recaps/index.json';
  const results=recapResultsUrl(item);
  const frozen=item?.raceFrozenAt ? new Date(item.raceFrozenAt) : null;
  const frozenText=frozen&&!Number.isNaN(frozen.getTime())
    ? frozen.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})
    : (item?.displayDate||'Frozen at checkered');
  return '<article class="recorder-card">'+
    '<div class="recorder-card-top"><span>FINAL • FROZEN</span><b>'+esc(item?.series||'HLRN')+'</b></div>'+
    '<div class="recorder-card-body">'+
      '<small>'+esc(frozenText)+'</small>'+
      '<h3>'+esc(item?.track||'HLRN Race')+'</h3>'+
      '<div class="recorder-winner"><span>WINNER</span><strong>#'+esc(winner.number||'—')+' '+esc(winner.name||'Unknown Driver')+'</strong></div>'+
      '<div class="recorder-facts">'+
        '<span><b>'+esc(item?.completedLapsCaptured??'—')+'</b><small>LAPS SAVED</small></span>'+
        '<span><b>'+esc(item?.cautions??'—')+'</b><small>CAUTIONS</small></span>'+
        '<span><b>'+esc(item?.penalties??'—')+'</b><small>PENALTIES</small></span>'+
        '<span><b>'+esc(item?.leadChanges??'—')+'</b><small>LEAD CHANGES</small></span>'+
      '</div>'+
    '</div>'+
    '<div class="recorder-card-actions">'+
      '<a href="'+esc(results)+'">OPEN PERMANENT RESULTS →</a>'+
      '<a class="secondary" href="'+esc(story)+'">POST-RACE STORY</a>'+
      '<a class="secondary" href="'+esc(raw)+'">RAW RECORDER JSON</a>'+
    '</div>'+
  '</article>';
}

async function loadRecorderArchive(){
  const grid=$('recorderArchiveGrid'),status=$('recorderArchiveStatus');
  if(!grid)return;
  try{
    const res=await fetch('../data/race-recaps/index.json?v='+Date.now(),{cache:'no-store'});
    if(!res.ok)throw new Error('recorder archive unavailable');
    const data=await res.json();
    recapItems=Array.isArray(data?.recaps)?data.recaps:[];
    const loaded=await Promise.all(recapItems.map(async item=>{
      const url=recapRawUrl(item);if(!url)return null;
      try{const r=await fetch(url+(url.includes('?')?'&':'?')+'v='+Date.now(),{cache:'no-store'});if(!r.ok)return null;return[item.slug,await r.json()]}catch(_){return null}
    }));
    recapArchives=new Map(loaded.filter(Boolean));
    linkRecapsToRaces();
    renderArchive();
    if(status)status.textContent=recapItems.length
      ? recapItems.length+' FROZEN RACE'+(recapItems.length===1?'':'S')+' PUBLISHED'
      : 'RECORDER READY';
    grid.innerHTML=recapItems.length
      ? recapItems.map(recorderCard).join('')
      : '<div class="recorder-archive-empty">No frozen race records have been published yet. The next real race frozen at checkered will appear here automatically.</div>';
  }catch(err){
    if(status)status.textContent='ARCHIVE TEMPORARILY UNAVAILABLE';
    grid.innerHTML='<div class="recorder-archive-empty">Frozen race records will appear here after the recorder publisher completes its next sync.</div>';
  }
}

async function load(){
  if(!window.HLRNData)return;
  try{
    if(window.HLRNDrivers?.load)await window.HLRNDrivers.load();
    snapshot=await HLRNData.load();
    buildRaces();
    renderArchive();
    await loadRecorderArchive();
    if(snapshot.generatedAt){
      const d=new Date(snapshot.generatedAt);
      $('archiveUpdated').textContent='DATA UPDATED '+d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).toUpperCase();
    }else $('archiveUpdated').textContent='HLRN DATA ONLINE';
    openFromQuery();
  }catch(err){
    console.error('HLRN race archive:',err);
    $('archiveGrid').innerHTML='<div class="archive-empty">RACE ARCHIVE DATA IS TEMPORARILY UNAVAILABLE.</div>';
    $('archiveUpdated').textContent='DATA UNAVAILABLE';
  }
}

document.querySelectorAll('.archive-tab').forEach(btn=>btn.addEventListener('click',()=>{
  activeFilter=btn.dataset.archiveLeague||'all';
  document.querySelectorAll('.archive-tab').forEach(b=>b.classList.toggle('active',b===btn));
  renderArchive();
}));
$('archiveGrid')?.addEventListener('click',e=>{
  const card=e.target.closest('.archive-card');
  if(!card)return;
  const race=races.find(r=>r.key===card.dataset.raceKey);
  if(race)renderReport(race);
});
$('reportBack')?.addEventListener('click',()=>closeReport());
window.addEventListener('popstate',()=>{
  if(openFromQuery())return;
  if($('raceReportView')?.classList.contains('active'))closeReport(false);
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
else load();

})();