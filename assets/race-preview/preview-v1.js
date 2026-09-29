(function(){
'use strict';

const SCHEDULES={
  sunday:[
    {week:1,date:'2026-06-14',track:'DAYTONA',car:'GEN 7',laps:100,tires:'4 SETS',miles:'2.50',banking:'31°',location:'DAYTONA BEACH, FL',type:'TRI-OVAL',description:'Daytona International Speedway is one of the most famous superspeedways in racing. High-speed drafting and pack racing make this a major HLRN event.'},
    {week:2,date:'2026-06-28',track:'IOWA',car:'TRUCKS',laps:200,tires:'5 SETS',miles:'0.875',banking:'12°',location:'NEWTON, IA',type:'SHORT OVAL',description:'Iowa Speedway is a tight short oval where tire management, braking and multiple racing grooves are critical.'},
    {week:3,date:'2026-07-12',track:'CHICAGOLAND',car:'ARCA',laps:175,tires:'5 SETS',miles:'1.50',banking:'18°',location:'JOLIET, IL',type:'TRI-OVAL',description:'Chicagoland Speedway is a fast 1.5-mile tri-oval where tire wear and multiple racing lanes can play a major role.'},
    {week:4,date:'2026-07-19',track:'ECHOPARK',car:'GEN 6',laps:175,tires:'5 SETS',miles:'1.50',banking:'24°',location:'HAMPTON, GA',type:'OVAL',description:'EchoPark Speedway provides a fast oval racing environment where drivers must manage speed, tires and traffic throughout the race.'},
    {week:5,date:'2026-08-09',track:'CHARLOTTE',car:'GEN 7',laps:175,tires:'5 SETS',miles:'1.50',banking:'24°',location:'CONCORD, NC',type:'QUAD-OVAL',description:'Charlotte Motor Speedway is a 1.5-mile quad-oval and one of NASCAR\'s most recognizable racing venues.'},
    {week:6,date:'2026-08-16',track:'TEXAS',car:'TRUCKS',laps:175,tires:'5 SETS',miles:'1.50',banking:'20°-24°',location:'FORT WORTH, TX',type:'QUAD-OVAL',description:'Texas Motor Speedway is a high-speed 1.5-mile quad-oval known for intense side-by-side racing and multiple racing grooves.'},
    {week:7,date:'2026-08-23',track:'AUTO CLUB',car:'ARCA',laps:125,tires:'5 SETS',miles:'2.00',banking:'18°',location:'FONTANA, CA',type:'D-SHAPED OVAL',description:'Auto Club Speedway is a wide, fast oval that rewards momentum and allows drivers to use multiple racing lanes.'},
    {week:8,date:'2026-08-30',track:'TALLADEGA',car:'GEN 6',laps:100,tires:'5 SETS',miles:'2.66',banking:'33°',location:'TALLADEGA, AL',type:'SUPERSPEEDWAY',description:'Talladega Superspeedway is one of the fastest tracks on the schedule and features intense drafting and pack racing.'},
    {week:9,date:'2026-09-13',track:'HOMESTEAD-MIAMI',car:'GEN 7',laps:175,tires:'5 SETS',miles:'1.50',banking:'18°-20°',location:'HOMESTEAD, FL',type:'OVAL',description:'Homestead-Miami Speedway features progressive banking and rewards drivers who manage their tires throughout a run.'},
    {week:10,date:'2026-09-20',track:'MICHIGAN',car:'TRUCKS',laps:125,tires:'5 SETS',miles:'2.00',banking:'18°',location:'BROOKLYN, MI',type:'D-SHAPED OVAL',description:'Michigan International Speedway is a wide, high-speed two-mile oval featuring multiple racing grooves and long green-flag runs.'},
    {week:11,date:'2026-09-27',track:'INDIANAPOLIS',car:'ARCA',laps:100,tires:'5 SETS',miles:'2.50',banking:'9°',location:'INDIANAPOLIS, IN',type:'OVAL',description:'Indianapolis Motor Speedway is one of the most historic racing venues in the world and features a flat, demanding oval.'},
    {week:12,date:'2026-10-04',track:'IRACING SUPERSPEEDWAY',car:'GEN 6',laps:100,tires:'5 SETS',miles:'2.50',banking:'31°',location:'IRACING',type:'SUPERSPEEDWAY',description:'iRacing Superspeedway provides high-speed pack racing where drafting, positioning and pit strategy are critical.'},
    {week:13,date:'2026-10-11',track:'KANSAS',car:'GEN 7',laps:175,tires:'5 SETS',miles:'1.50',banking:'15°',location:'KANSAS CITY, KS',type:'TRI-OVAL',description:'Kansas Speedway is a fast 1.5-mile tri-oval where tire wear and changing track conditions can determine the outcome.'},
    {week:14,date:'2026-10-18',track:'LAS VEGAS',car:'TRUCKS',laps:175,tires:'5 SETS',miles:'1.50',banking:'20°',location:'LAS VEGAS, NV',type:'TRI-OVAL',description:'Las Vegas Motor Speedway is a high-speed tri-oval known for long green-flag runs and multiple racing lanes.'},
    {week:15,date:'2026-10-25',track:'DAYTONA',car:'ARCA',laps:100,tires:'5 SETS',miles:'2.50',banking:'31°',location:'DAYTONA BEACH, FL',type:'TRI-OVAL',description:'Daytona returns for another high-speed superspeedway race where drafting and strategy are critical.'},
    {week:16,date:'2026-11-01',track:'TALLADEGA',car:'GEN 6',laps:100,tires:'5 SETS',miles:'2.66',banking:'33°',location:'TALLADEGA, AL',type:'SUPERSPEEDWAY',description:'Talladega closes the Sunday season with a high-speed season finale where drafting and pack positioning can decide the winner.',finale:true}
  ],
  monday:[
    {week:1,date:'2026-08-17',track:'DAYTONA',car:'GEN 7',laps:100,tires:'4 SETS',miles:'2.50',banking:'31°',location:'DAYTONA BEACH, FL',type:'TRI-OVAL',description:'Daytona International Speedway is one of NASCAR\'s most famous superspeedways, featuring high speeds, drafting and close pack racing.'},
    {week:2,date:'2026-08-24',track:'IOWA',car:'TRUCKS',laps:200,tires:'5 SETS',miles:'0.875',banking:'12°',location:'NEWTON, IA',type:'SHORT OVAL',description:'Iowa Speedway is a short oval known for progressive banking, multiple lanes and demanding tire management.'},
    {week:3,date:'2026-08-31',track:'CHICAGOLAND',car:'ARCA',laps:175,tires:'5 SETS',miles:'1.50',banking:'18°',location:'JOLIET, IL',type:'TRI-OVAL',description:'Chicagoland Speedway is a fast 1.5-mile tri-oval featuring multiple racing grooves and long green-flag runs.'},
    {week:4,date:'2026-09-14',track:'ECHOPARK',car:'GEN 7',laps:175,tires:'5 SETS',miles:'1.50',banking:'24°',location:'HAMPTON, GA',type:'OVAL',description:'EchoPark Speedway provides a fast oval racing environment where drivers must manage speed, tires and traffic throughout the race.'},
    {week:5,date:'2026-09-21',track:'CHARLOTTE',car:'GEN 7',laps:175,tires:'5 SETS',miles:'1.50',banking:'24°',location:'CONCORD, NC',type:'QUAD-OVAL',description:'Charlotte Motor Speedway is a 1.5-mile quad-oval and one of NASCAR\'s most recognizable racing facilities.'},
    {week:6,date:'2026-09-28',track:'TEXAS',car:'TRUCKS',laps:175,tires:'5 SETS',miles:'1.50',banking:'20°-24°',location:'FORT WORTH, TX',type:'QUAD-OVAL',description:'Texas Motor Speedway is a high-speed 1.5-mile quad-oval known for intense side-by-side racing.'},
    {week:7,date:'2026-10-05',track:'AUTO CLUB',car:'ARCA',laps:100,tires:'5 SETS',miles:'2.00',banking:'18°',location:'FONTANA, CA',type:'D-SHAPED OVAL',description:'Auto Club Speedway is a wide, fast oval that rewards momentum and allows drivers to use multiple racing lanes.'},
    {week:8,date:'2026-10-12',track:'TALLADEGA',car:'TRUCKS',laps:100,tires:'5 SETS',miles:'2.66',banking:'33°',location:'TALLADEGA, AL',type:'SUPERSPEEDWAY',description:'Talladega Superspeedway is one of the fastest tracks on the schedule and features intense drafting and pack racing.'},
    {week:9,date:'2026-10-19',track:'HOMESTEAD-MIAMI',car:'GEN 7',laps:175,tires:'5 SETS',miles:'1.50',banking:'18°-20°',location:'HOMESTEAD, FL',type:'OVAL',description:'Homestead-Miami Speedway features progressive banking and rewards drivers who manage their tires throughout a run.'},
    {week:10,date:'2026-10-26',track:'MICHIGAN',car:'TRUCKS',laps:125,tires:'5 SETS',miles:'2.00',banking:'18°',location:'BROOKLYN, MI',type:'D-SHAPED OVAL',description:'Michigan International Speedway is a wide, high-speed two-mile oval featuring multiple racing grooves.'},
    {week:11,date:'2026-11-02',track:'MARTINSVILLE',car:'ARCA',laps:100,tires:'5 SETS',miles:'0.526',banking:'12°',location:'RIDGEWAY, VA',type:'SHORT OVAL',description:'Martinsville Speedway is a historic short track famous for tight corners, heavy braking and intense short-track racing.'},
    {week:12,date:'2026-11-09',track:'IRACING SUPERSPEEDWAY',car:'TRUCKS',laps:100,tires:'5 SETS',miles:'2.50',banking:'31°',location:'IRACING',type:'SUPERSPEEDWAY',description:'iRacing Superspeedway provides high-speed pack racing with drafting and close side-by-side competition.'},
    {week:13,date:'2026-11-16',track:'KANSAS',car:'GEN 7',laps:175,tires:'5 SETS',miles:'1.50',banking:'15°',location:'KANSAS CITY, KS',type:'TRI-OVAL',description:'Kansas Speedway is a fast 1.5-mile tri-oval where tire wear and changing track conditions can determine the outcome.'},
    {week:14,date:'2026-11-23',track:'LAS VEGAS',car:'TRUCKS',laps:175,tires:'5 SETS',miles:'1.50',banking:'20°',location:'LAS VEGAS, NV',type:'TRI-OVAL',description:'Las Vegas Motor Speedway is a high-speed tri-oval known for long green-flag runs and multiple racing lanes.'},
    {week:15,date:'2026-11-30',track:'DAYTONA',car:'ARCA',laps:100,tires:'5 SETS',miles:'2.50',banking:'31°',location:'DAYTONA BEACH, FL',type:'TRI-OVAL',description:'Daytona returns for another high-speed superspeedway race where drafting and strategy are critical.'},
    {week:16,date:'2026-12-07',track:'TALLADEGA',car:'GEN 7',laps:100,tires:'5 SETS',miles:'2.66',banking:'33°',location:'TALLADEGA, AL',type:'SUPERSPEEDWAY',description:'Talladega closes the Monday season with a high-speed season finale where drafting and pack positioning can decide the winner.',finale:true}
  ]
};

const $=id=>document.getElementById(id);
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const pretty=name=>{
  const raw=String(name||'').trim();
  if(!raw.includes(','))return raw.replace(/\d+$/,'').trim();
  const p=raw.split(','),last=(p.shift()||'').trim().replace(/\d+$/,''),first=p.join(' ').trim();
  return (first+' '+last).trim();
};
let snapshot=null;
let activeLeague='sunday';
let activeRace=null;
let countdownTimer=null;

function easternOffsetMinutes(date){
  const zone=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset',hour:'2-digit'}).formatToParts(date).find(p=>p.type==='timeZoneName')?.value||'GMT-4';
  const m=zone.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if(!m)return -240;
  const mins=Number(m[2])*60+Number(m[3]||0);
  return m[1]==='+'?mins:-mins;
}
function easternInstant(dateString,hour=20,minute=30){
  const [y,m,d]=dateString.split('-').map(Number);
  let utc=Date.UTC(y,m-1,d,hour,minute);
  for(let i=0;i<2;i++)utc=Date.UTC(y,m-1,d,hour,minute)-easternOffsetMinutes(new Date(utc))*60000;
  return new Date(utc);
}
function raceWindowEnd(race){return new Date(easternInstant(race.date).getTime()+5*60*60*1000)}
function nextRace(key,now=new Date()){
  const list=SCHEDULES[key]||[];
  return list.find(r=>raceWindowEnd(r)>now)||null;
}
function nearestLeague(){
  const qs=new URLSearchParams(location.search).get('league');
  if(qs==='sunday'||qs==='monday')return qs;
  const s=nextRace('sunday'),m=nextRace('monday');
  if(!s)return m?'monday':'sunday';
  if(!m)return 'sunday';
  return easternInstant(s.date)<=easternInstant(m.date)?'sunday':'monday';
}
function leagueData(key){return snapshot?.leagues?.[key]||{drivers:[],results:[],teams:[]}}
function driverMap(key){return new Map((leagueData(key).drivers||[]).map(d=>[String(d.driverId),d]))}
function driverName(key,id){return pretty(driverMap(key).get(String(id))?.driver||('Driver '+id))}
function driverUrl(key,d){
  const p=new URLSearchParams({league:key});
  if(d?.driverId!==undefined)p.set('driverId',String(d.driverId));
  if(d?.driver)p.set('driver',pretty(d.driver));
  return '../drivers/?'+p.toString();
}
function teamUrl(key,name){return '../teams/?'+new URLSearchParams({league:key,team:String(name||'')}).toString()}
function resultUrl(key,raceNumber){return '../results/?'+new URLSearchParams({league:key,race:String(raceNumber)}).toString()}
function canonicalTrack(value){
  const s=String(value||'').toUpperCase().replace(/&/g,' AND ').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  if(s.includes('DAYTONA'))return 'DAYTONA';
  if(s.includes('TALLADEGA'))return 'TALLADEGA';
  if(s.includes('TEXAS'))return 'TEXAS';
  if(s.includes('CHARLOTTE'))return 'CHARLOTTE';
  if(s.includes('AUTO CLUB'))return 'AUTO CLUB';
  if(s.includes('CHICAGOLAND'))return 'CHICAGOLAND';
  if(s.includes('IOWA'))return 'IOWA';
  if(s.includes('HOMESTEAD'))return 'HOMESTEAD MIAMI';
  if(s.includes('MICHIGAN'))return 'MICHIGAN';
  if(s.includes('INDIANAPOLIS'))return 'INDIANAPOLIS';
  if(s.includes('MARTINSVILLE'))return 'MARTINSVILLE';
  if(s.includes('KANSAS'))return 'KANSAS';
  if(s.includes('LAS VEGAS'))return 'LAS VEGAS';
  if(s.includes('IRACING')&&s.includes('SUPER'))return 'IRACING SUPERSPEEDWAY';
  if(s.includes('ECHOPARK')||s.includes('ATLANTA'))return 'ECHOPARK';
  return s.replace(/ INTERNATIONAL SPEEDWAY| MOTOR SPEEDWAY| SPEEDWAY/g,'').trim();
}
function priorRows(key,race){
  const cutoff=easternInstant(race.date).getTime();
  return (leagueData(key).results||[]).filter(r=>{
    const d=new Date(r.date).getTime();
    return Number.isFinite(d)&&d<cutoff;
  });
}
function recentFor(key,race,driverId,limit=3){
  return priorRows(key,race)
    .filter(r=>String(r.driverId)===String(driverId)&&num(r.finish)>0)
    .sort((a,b)=>num(b.raceNumber)-num(a.raceNumber))
    .slice(0,limit);
}
function streaks(rows){
  const sorted=[...rows].sort((a,b)=>num(b.raceNumber)-num(a.raceNumber));
  let wins=0,top5=0;
  for(const r of sorted){if(num(r.finish)===1)wins++;else break}
  for(const r of sorted){if(num(r.finish)<=5&&num(r.finish)>0)top5++;else break}
  return {wins,top5};
}
function allTrackRaces(race){
  const target=canonicalTrack(race.track),cutoff=easternInstant(race.date).getTime(),out=[];
  for(const key of ['sunday','monday']){
    const groups=new Map();
    for(const row of leagueData(key).results||[]){
      const d=new Date(row.date).getTime();
      if(!Number.isFinite(d)||d>=cutoff||canonicalTrack(row.track)!==target)continue;
      const rk=String(row.raceId||row.raceNumber);
      if(!groups.has(rk))groups.set(rk,[]);
      groups.get(rk).push(row);
    }
    for(const [raceId,rows] of groups){
      rows.sort((a,b)=>num(a.finish)-num(b.finish));
      out.push({league:key,raceId,raceNumber:num(rows[0]?.raceNumber),date:rows[0]?.date,track:rows[0]?.track||race.track,rows});
    }
  }
  out.sort((a,b)=>new Date(b.date)-new Date(a.date));
  return out;
}
function trackDriverStats(race){
  const races=allTrackRaces(race),stats=new Map();
  for(const rr of races){
    for(const row of rr.rows){
      const id=String(row.driverId),key=rr.league+'|'+id;
      if(!stats.has(key))stats.set(key,{league:rr.league,driverId:id,starts:0,finishTotal:0,lapsLed:0,wins:0,best:999});
      const s=stats.get(key);s.starts++;s.finishTotal+=num(row.finish);s.lapsLed+=num(row.lapsLed);s.wins+=num(row.finish)===1?1:0;s.best=Math.min(s.best,num(row.finish)||999);
    }
  }
  return [...stats.values()].map(s=>({...s,avg:s.starts?s.finishTotal/s.starts:999,name:driverName(s.league,s.driverId)}));
}
function dateLabel(race){
  return new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(easternInstant(race.date)).toUpperCase();
}
function shortDate(v){
  const d=new Date(v);
  return Number.isNaN(d.getTime())?'DATE UNAVAILABLE':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d).toUpperCase();
}
function setText(id,value){const el=$(id);if(el)el.textContent=value}

function renderHero(key,race){
  document.body.classList.toggle('rp-monday',key==='monday');
  setText('rpKicker','HLRN // '+(key==='sunday'?'SUNDAY':'MONDAY')+' RACE WEEK');
  setText('rpTrack',race?race.track:'SEASON COMPLETE');
  setText('rpDescription',race?race.description:'The selected HLRN league has completed its published schedule.');
  setText('rpSeries',key==='sunday'?'SUNDAY NIGHT':'MONDAY NIGHT');
  setText('rpWeek',race?'WEEK '+race.week:'--');
  setText('rpDate',race?dateLabel(race):'--');
  setText('rpCar',race?.car||'--');
  setText('rpLaps',race?String(race.laps):'--');
  setText('rpTrackType',race?.type||'--');
  setText('rpLocation',race?.location||'--');
  setText('rpMiles',race?race.miles+' MI':'--');
  setText('rpBanking',race?.banking||'--');
  setText('rpTires',race?.tires||'--');
  const standings=$('rpStandingsLink');
  if(standings)standings.href='../standings/';
}

function startCountdown(race){
  if(countdownTimer)clearInterval(countdownTimer);
  const tick=()=>{
    if(!race){['rpDays','rpHours','rpMinutes','rpSeconds'].forEach(id=>setText(id,'--'));return}
    const start=easternInstant(race.date),now=new Date(),end=raceWindowEnd(race);
    let diff=start-now;
    if(now>=start&&now<=end){
      setText('rpCountdownLabel','RACE WINDOW');
      setText('rpCountdownStatus','GREEN FLAG WINDOW OPEN');
      ['rpDays','rpHours','rpMinutes','rpSeconds'].forEach(id=>setText(id,'00'));
      return;
    }
    if(diff<0)diff=0;
    const sec=Math.floor(diff/1000);
    setText('rpDays',String(Math.floor(sec/86400)).padStart(2,'0'));
    setText('rpHours',String(Math.floor((sec%86400)/3600)).padStart(2,'0'));
    setText('rpMinutes',String(Math.floor((sec%3600)/60)).padStart(2,'0'));
    setText('rpSeconds',String(sec%60).padStart(2,'0'));
    setText('rpCountdownLabel','TIME TO GREEN');
    setText('rpCountdownStatus',race.finale?'SEASON FINALE':'RACE WEEK');
  };
  tick();countdownTimer=setInterval(tick,1000);
}

function renderChamp(key){
  const drivers=[...(leagueData(key).drivers||[])].sort((a,b)=>num(a.rank)-num(b.rank)||num(b.points)-num(a.points)).slice(0,5);
  const leader=drivers[0],second=drivers[1],gap=leader&&second?num(leader.points)-num(second.points):0;
  setText('rpChampGap',leader&&second?pretty(leader.driver)+' +'+gap+' OVER P2':'LIVE STANDINGS');
  $('rpChampGrid').innerHTML=drivers.length?drivers.map((d,i)=>{
    const behind=leader?num(leader.points)-num(d.points):0;
    return '<article class="rp-champ-card '+key+' '+(i===0?'leader':'')+'">'+
      '<div class="rp-champ-pos">P'+(i+1)+'</div>'+
      '<a href="'+esc(driverUrl(key,d))+'"><div class="rp-champ-name">'+esc(pretty(d.driver))+'</div></a>'+
      '<div class="rp-champ-points">'+num(d.points).toLocaleString('en-US')+' PTS</div>'+
      '<div class="rp-champ-gap">'+(i===0?'CHAMPIONSHIP LEADER':behind+' BEHIND LEADER')+'</div>'+
    '</article>';
  }).join(''):'<div class="rp-loading">NO CHAMPIONSHIP DATA AVAILABLE.</div>';
}

function selectedTrackStats(key,race){
  const target=canonicalTrack(race.track),map=new Map();
  for(const row of priorRows(key,race).filter(r=>canonicalTrack(r.track)===target)){
    const id=String(row.driverId);
    if(!map.has(id))map.set(id,{starts:0,total:0,lapsLed:0,best:999});
    const s=map.get(id);s.starts++;s.total+=num(row.finish);s.lapsLed+=num(row.lapsLed);s.best=Math.min(s.best,num(row.finish)||999);
  }
  return map;
}

function renderWatch(key,race){
  const drivers=leagueData(key).drivers||[],trackStats=selectedTrackStats(key,race);
  const candidates=drivers.map(d=>{
    const recent=recentFor(key,race,d.driverId,3);
    if(!recent.length)return null;
    const recentAvg=recent.reduce((t,r)=>t+num(r.finish),0)/recent.length;
    const ts=trackStats.get(String(d.driverId));
    const trackAvg=ts?ts.total/ts.starts:null;
    const rankPart=Math.max(0,40-(Math.max(1,num(d.rank))-1)*1.35);
    const formPart=Math.max(0,40-(recentAvg-1)*1.65);
    const trackPart=trackAvg===null?10:Math.max(0,20-(trackAvg-1)*.9);
    const index=Math.round(Math.max(0,Math.min(100,rankPart+formPart+trackPart)));
    return {d,recent,recentAvg,trackAvg,trackStarts:ts?.starts||0,index};
  }).filter(Boolean).sort((a,b)=>b.index-a.index||a.recentAvg-b.recentAvg||num(a.d.rank)-num(b.d.rank)).slice(0,3);

  $('rpWatchGrid').innerHTML=candidates.length?candidates.map((x,i)=>{
    const form=x.recent.map(r=>'P'+num(r.finish)).join(' • ');
    const track=x.trackAvg===null?'NO PRIOR START':x.trackAvg.toFixed(1)+' AVG / '+x.trackStarts+' START'+(x.trackStarts===1?'':'S');
    return '<article class="rp-watch-card '+key+'">'+
      '<div class="rp-watch-rank">WATCH LIST // '+String(i+1).padStart(2,'0')+'</div>'+
      '<div class="rp-watch-name">'+esc(pretty(x.d.driver))+'</div>'+
      '<div class="rp-watch-score"><div>'+x.index+'<span>INDEX</span></div></div>'+
      '<div class="rp-watch-reasons">'+
        '<div><span>CHAMP RANK</span><strong>P'+esc(x.d.rank)+'</strong></div>'+
        '<div><span>LAST '+x.recent.length+'</span><strong>'+esc(x.recentAvg.toFixed(1))+' AVG</strong></div>'+
        '<div><span>TRACK</span><strong>'+esc(x.trackAvg===null?'NEW':x.trackAvg.toFixed(1))+'</strong></div>'+
      '</div>'+
      '<div class="rp-watch-note">Recent form: '+esc(form)+' • Track read: '+esc(track)+'. Watch Index combines championship position, recent finishes and prior HLRN results at this track; it is not a win prediction.</div>'+
      '<a class="rp-watch-link" href="'+esc(driverUrl(key,x.d))+'">OPEN DRIVER PROFILE →</a>'+
    '</article>';
  }).join(''):'<div class="rp-loading">NOT ENOUGH COMPLETED RESULTS TO BUILD A WATCH LIST.</div>';
  return candidates[0]||null;
}

function renderHistory(race){
  const races=allTrackRaces(race),stats=trackDriverStats(race);
  setText('rpHistoryTitle','HLRN AT '+race.track);
  const last=races[0],winner=last?.rows.find(r=>num(r.finish)===1);
  const bestAvg=[...stats].filter(s=>s.starts>=1).sort((a,b)=>a.avg-b.avg||b.starts-a.starts)[0];
  const mostLed=[...stats].sort((a,b)=>b.lapsLed-a.lapsLed||a.avg-b.avg)[0];

  if(last&&winner){
    $('rpHistoryHero').className='rp-history-hero';
    $('rpHistoryHero').innerHTML='<small>MOST RECENT HLRN WINNER HERE</small><strong>'+esc(driverName(last.league,winner.driverId))+'</strong><span>'+esc(leagueShort(last.league))+' • RACE '+last.raceNumber+' • '+esc(shortDate(last.date))+'</span>';
  }else{
    $('rpHistoryHero').className='rp-history-hero empty';
    $('rpHistoryHero').innerHTML='<small>TRACK HISTORY</small><strong>NO PRIOR HLRN RACE FOUND</strong><span>This preview will begin building track history after the first stored race here.</span>';
  }
  $('rpHistoryGrid').innerHTML=
    '<div><span>HLRN RACES</span><strong>'+races.length+'</strong></div>'+
    '<div><span>BEST AVG FINISH</span><strong>'+(bestAvg?esc(bestAvg.name)+' • '+bestAvg.avg.toFixed(1):'--')+'</strong></div>'+
    '<div><span>MOST LAPS LED</span><strong>'+(mostLed?esc(mostLed.name)+' • '+num(mostLed.lapsLed):'--')+'</strong></div>';

  $('rpPastGrid').innerHTML=races.length?races.slice(0,6).map(rr=>{
    const w=rr.rows.find(r=>num(r.finish)===1);
    return '<a class="rp-past-card '+rr.league+'" href="'+esc(resultUrl(rr.league,rr.raceNumber))+'">'+
      '<small>'+leagueShort(rr.league)+' • RACE '+rr.raceNumber+' • '+esc(shortDate(rr.date))+'</small>'+
      '<strong>'+esc(driverName(rr.league,w?.driverId))+'</strong>'+
      '<span>Winner • '+esc(rr.track)+' →</span>'+
    '</a>';
  }).join(''):'<div class="rp-loading">NO PRIOR HLRN RACES AT THIS TRACK YET.</div>';
}

function leagueShort(key){return key==='sunday'?'SUNDAY':'MONDAY'}

function renderForm(key,race){
  const drivers=leagueData(key).drivers||[];
  const rows=drivers.map(d=>{
    const recent=recentFor(key,race,d.driverId,3);if(!recent.length)return null;
    const avg=recent.reduce((t,r)=>t+num(r.finish),0)/recent.length;
    const st=streaks(recentFor(key,race,d.driverId,99));
    return {d,recent,avg,st};
  }).filter(Boolean).sort((a,b)=>a.avg-b.avg||b.st.wins-a.st.wins||b.st.top5-a.st.top5||num(a.d.rank)-num(b.d.rank)).slice(0,6);

  $('rpFormList').innerHTML=rows.length?rows.map((x,i)=>{
    const streak=x.st.wins?x.st.wins+'-RACE WIN STREAK':x.st.top5?x.st.top5+'-RACE TOP-5 STREAK':'RECENT FORM';
    return '<div class="rp-form-row">'+
      '<div class="rp-form-pos">'+(i+1)+'</div>'+
      '<div class="rp-form-copy"><a href="'+esc(driverUrl(key,x.d))+'">'+esc(pretty(x.d.driver))+'</a><small>'+esc(x.recent.map(r=>'P'+num(r.finish)).join(' • '))+' • '+esc(streak)+'</small></div>'+
      '<div class="rp-form-stat"><strong>'+x.avg.toFixed(1)+'</strong><span>LAST '+x.recent.length+' AVG</span></div>'+
    '</div>';
  }).join(''):'<div class="rp-loading">NO RECENT FORM DATA.</div>';
  return rows[0]||null;
}

function renderTeams(key){
  const teams=[...(leagueData(key).teams||[])].sort((a,b)=>num(a.rank)-num(b.rank)||num(b.points)-num(a.points)).slice(0,5);
  $('rpTeamList').innerHTML=teams.length?teams.map((t,i)=>{
    const leader=teams[0],behind=leader?num(leader.points)-num(t.points):0;
    return '<div class="rp-team-row">'+
      '<div class="rp-team-pos">P'+(i+1)+'</div>'+
      '<div class="rp-team-copy"><a href="'+esc(teamUrl(key,t.team))+'">'+esc(t.team)+'</a><small>'+(i===0?'TEAM CHAMPIONSHIP LEADER':behind.toFixed(1)+' PTS BEHIND')+'</small></div>'+
      '<div class="rp-team-stat"><strong>'+num(t.points).toFixed(1)+'</strong><span>POINTS</span></div>'+
    '</div>';
  }).join(''):'<div class="rp-loading">NO TEAM DATA AVAILABLE.</div>';
  return teams;
}

function renderNotes(key,race,hot,teams){
  const drivers=[...(leagueData(key).drivers||[])].sort((a,b)=>num(a.rank)-num(b.rank)||num(b.points)-num(a.points));
  const leader=drivers[0],second=drivers[1],gap=leader&&second?num(leader.points)-num(second.points):null;
  const history=allTrackRaces(race),last=history[0],lastWinner=last?.rows.find(r=>num(r.finish)===1);
  const notes=[
    {title:race.type+' • '+race.car,body:race.laps+' laps at '+race.miles+' miles with '+race.banking+' banking. '+race.tires+' are listed for this event.'},
    leader&&second?{title:'Championship margin: '+gap+' points',body:pretty(leader.driver)+' enters the week ahead of '+pretty(second.driver)+' in the current '+leagueShort(key)+' standings.'}:null,
    lastWinner?{title:'Most recent HLRN winner here: '+driverName(last.league,lastWinner.driverId),body:'The most recent stored HLRN race at this track was '+leagueShort(last.league)+' Race '+last.raceNumber+'.'}:{title:'Fresh track history',body:'No earlier stored HLRN result at this venue was found before this race week.'},
    hot?{title:'Recent form: '+pretty(hot.d.driver),body:'Best last-three average among the current form board at '+hot.avg.toFixed(1)+'.'}:null,
    teams&&teams.length>1?{title:'Team battle: '+teams[0].team+' leads',body:teams[0].team+' leads '+teams[1].team+' by '+(num(teams[0].points)-num(teams[1].points)).toFixed(1)+' points in the published team standings.'}:null
  ].filter(Boolean);
  $('rpNotes').innerHTML=notes.map((n,i)=>'<div class="rp-note"><div class="rp-note-index">'+String(i+1).padStart(2,'0')+'</div><div><strong>'+esc(n.title)+'</strong><p>'+esc(n.body)+'</p></div></div>').join('');
}

function renderLeague(key){
  activeLeague=key;
  activeRace=nextRace(key);
  document.querySelectorAll('.rp-tab').forEach(b=>b.classList.toggle('active',b.dataset.league===key));
  const url=new URL(location.href);url.searchParams.set('league',key);history.replaceState({},'',url.pathname+'?'+url.searchParams.toString());
  renderHero(key,activeRace);startCountdown(activeRace);
  if(!activeRace){
    ['rpChampGrid','rpWatchGrid','rpHistoryHero','rpHistoryGrid','rpFormList','rpTeamList','rpNotes','rpPastGrid'].forEach(id=>{if($(id))$(id).innerHTML='<div class="rp-loading">SEASON COMPLETE.</div>'});
    return;
  }
  renderChamp(key);
  const hot=renderWatch(key,activeRace);
  renderHistory(activeRace);
  const formHot=renderForm(key,activeRace);
  const teams=renderTeams(key);
  renderNotes(key,activeRace,formHot||hot,teams);
}

async function load(){
  if(!window.HLRNData)return;
  try{
    snapshot=await HLRNData.load();
    if(snapshot.generatedAt){
      const d=new Date(snapshot.generatedAt);
      setText('rpUpdated',d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).toUpperCase());
    }else setText('rpUpdated','HLRN DATA ONLINE');
    renderLeague(nearestLeague());
  }catch(err){
    console.error('HLRN race preview:',err);
    setText('rpUpdated','DATA UNAVAILABLE');
    ['rpChampGrid','rpWatchGrid','rpFormList','rpTeamList','rpPastGrid'].forEach(id=>{if($(id))$(id).innerHTML='<div class="rp-loading">PREVIEW DATA IS TEMPORARILY UNAVAILABLE.</div>'});
  }
}

document.querySelectorAll('.rp-tab').forEach(btn=>btn.addEventListener('click',()=>renderLeague(btn.dataset.league)));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&snapshot)renderLeague(activeLeague)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();

})();