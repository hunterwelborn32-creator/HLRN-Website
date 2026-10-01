/* HLRN Results schedule UI */
(function(){
  const root=document.querySelector('.hlrn-race-center');
  if(!root || typeof sundaySchedule==='undefined' || typeof mondaySchedule==='undefined') return;
  const app=document.createElement('div');
  app.className='ns-schedule-app';
  app.innerHTML=`
    <header class="ns-top">
      <div class="ns-brand"><div class="ns-mark">HLR<span>N</span></div><div class="ns-brand-copy">Results &amp; Schedule Center</div></div>
      <nav class="ns-top-links"><a href="../standings/">Standings</a><a href="https://www.youtube.com/@High_Line_Racing" target="_blank" rel="noopener">Watch HLRN</a></nav>
    </header>
    <div class="ns-subnav"><button class="ns-league-tab active" data-league="sunday">Sunday League</button><button class="ns-league-tab" data-league="monday">Monday League</button></div>
    <main class="ns-wrap">
      <section class="ns-titlebar"><div class="ns-eyebrow">HLRN • RESULTS CENTER • 2026</div><h1>Results <span>&amp; Schedule</span></h1><p>Previous winners, race dates, next-event details and the complete High Line Racing Network Sunday and Monday schedule.</p></section>
      <section class="ns-race-summary">
        <article class="ns-summary-card previous"><div class="ns-summary-head">Previous Race</div><div class="ns-summary-body" id="nsPrevious"></div></article>
        <article class="ns-summary-card next" id="nsNextCard"><div class="ns-summary-head">Next Race</div><div class="ns-summary-body" id="nsNext"></div></article>
      </section>
      <section class="ns-feature" id="nsFeature"></section>
      <section class="ns-controls"><div class="ns-season"><span class="ns-season-label">Season</span><select class="ns-select" aria-label="Season"><option selected>2026</option></select></div><label class="ns-toggle"><input type="checkbox" id="nsShowPast"><span class="ns-switch"></span><span class="ns-toggle-text">Show Past Races</span></label></section>
      <section class="ns-schedule" id="nsSchedule"></section>
    </main>
    <footer class="ns-footer"><div><b>HIGH LINE RACING NETWORK</b> • 2026 SCHEDULE</div><div>SUNDAY <span>•</span> MONDAY <span>•</span> 8:30 PM EASTERN</div></footer>`;
  root.appendChild(app);

  // Bring the completed-race archive into the modern Results/Schedule shell.
  // These nodes already exist in the page and are populated by results-archive-v1.js.
  const nsWrap=app.querySelector('.ns-wrap');
  const raceArchive=document.getElementById('raceArchive');
  const recorderArchive=document.getElementById('recorderArchive');
  const raceReportView=document.getElementById('raceReportView');
  if(nsWrap&&raceArchive) nsWrap.appendChild(raceArchive);
  if(nsWrap&&recorderArchive) nsWrap.appendChild(recorderArchive);
  if(nsWrap&&raceReportView) nsWrap.appendChild(raceReportView);

  let league='sunday';
  const showPast=document.getElementById('nsShowPast');
  const raceEnd=(start)=>typeof getLocalRaceEnd==='function'?getLocalRaceEnd(start):new Date(start.getTime()+4*60*60*1000);
  const scheduleOf=()=>league==='sunday'?sundaySchedule:mondaySchedule;
  const youtubeOf=()=>league==='sunday'?(typeof SUNDAY_YOUTUBE!=='undefined'?SUNDAY_YOUTUBE:'#'):(typeof MONDAY_YOUTUBE!=='undefined'?MONDAY_YOUTUBE:'#');

  /* =========================================================
     CORRECT LEAGUE WINNER FEED
     Sunday winners come ONLY from Sunday Results + Sunday Drivers.
     Monday winners come ONLY from Monday Results + Monday Drivers.
     Finish = 1 and Race # = schedule week.
  ========================================================= */
  const HLRN_RESULTS_SHEET_ID='1yWa2-nHM4VnUXDS8EQwB0G2k0ockpAU55Xuj9MPccJo';
  const HLRN_RESULTS_REFRESH_MS=60000;

  const HLRN_DRIVER_NAME_OVERRIDES={
    '77498':'Ethan Fonseca Moreno',
    '13461':'Dylan C Jones'
  };

  /* Correct league-result fallbacks, used only until the live sheet loads. */
  const HLRN_RACE_WINNERS={
    sunday:{
      1:'Ethan Fonseca Moreno',
      2:'Nicholas Baumann',
      3:'Ethan Fonseca Moreno',
      4:'Craig Rowe',
      5:'Nicholas Baumann',
      6:'Nicholas Baumann',
      7:'Nicholas Baumann',
      8:'Craig Rowe',
      9:'Dylan C Jones'
    },
    monday:{
      1:'Ethan Eckert',
      2:'Ethan Eckert',
      3:'Ethan Eckert',
      4:'Ethan Eckert'
    }
  };

  let winnerFeedLoaded=false;
  let winnerSyncing=false;

  /* Completed-race detail feed.
     Uses the published HLRN snapshot so the existing Results layout can show
     useful race facts without changing the page structure. */
  const HLRN_RESULT_DETAILS={sunday:{},monday:{}};
  let resultDetailsLoaded=false;
  let resultDetailsSyncing=false;

  function googleTableToObjects(table){
    const headers=(table.cols||[]).map((col,index)=>{
      const label=String(col&&col.label!=null?col.label:'').trim();
      return label||('COLUMN_'+index);
    });
    return (table.rows||[]).map(row=>{
      const obj={};
      headers.forEach((header,index)=>{
        const cell=row.c&&row.c[index]?row.c[index]:null;
        obj[header]=cell?(cell.v!=null?cell.v:(cell.f!=null?cell.f:'')):'';
      });
      return obj;
    });
  }

  function loadGoogleSheetTable(sheetName){
    return new Promise((resolve,reject)=>{
      const callback='__hlrnLeagueWinner_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      const timer=setTimeout(()=>{cleanup();reject(new Error('Timed out loading '+sheetName));},12000);
      function cleanup(){
        clearTimeout(timer);
        if(script.parentNode) script.parentNode.removeChild(script);
        try{delete window[callback]}catch(e){window[callback]=undefined}
      }
      window[callback]=response=>{
        if(!response||response.status==='error'||!response.table){cleanup();reject(new Error('Google Sheets error: '+sheetName));return;}
        const rows=googleTableToObjects(response.table);
        cleanup();resolve(rows);
      };
      script.onerror=()=>{cleanup();reject(new Error('Could not load '+sheetName));};
      const tqx='responseHandler:'+callback;
      script.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(HLRN_RESULTS_SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(sheetName)+'&headers=1&tqx='+encodeURIComponent(tqx)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }

  function numberValue(value){
    if(value===null||value===undefined||value==='') return null;
    const n=Number(value);return Number.isFinite(n)?n:null;
  }

  function cleanDriverId(value){
    if(value===null||value===undefined) return '';
    const n=Number(value);
    return Number.isFinite(n)?String(Math.trunc(n)):String(value).trim();
  }

  function formatDriverName(rawName,driverId){
    const id=cleanDriverId(driverId);
    if(HLRN_DRIVER_NAME_OVERRIDES[id]) return HLRN_DRIVER_NAME_OVERRIDES[id];
    const name=String(rawName||'').trim();
    if(!name) return '';
    if(name.includes(',')){
      const parts=name.split(',');
      const last=String(parts.shift()||'').trim();
      const first=parts.join(' ').trim();
      if(first&&last) return first+' '+last;
    }
    return name;
  }

  function buildDriverMap(rows){
    const map={};
    rows.forEach(row=>{
      const id=cleanDriverId(row['Driver ID']);
      if(id) map[id]=formatDriverName(row['Driver'],id);
    });
    return map;
  }

  function buildWinnerMap(resultRows,driverMap){
    const winners={};
    resultRows.forEach(row=>{
      const finish=numberValue(row['Finish']);
      if(finish!==1) return;
      const raceNumber=numberValue(row['Race #']);
      if(!raceNumber) return;
      const driverId=cleanDriverId(row['Driver ID']);
      const driverName=driverMap[driverId]||HLRN_DRIVER_NAME_OVERRIDES[driverId]||(driverId?('Driver '+driverId):'');
      if(driverName) winners[Math.trunc(raceNumber)]=driverName;
    });
    return winners;
  }

  function snapshotDriverName(rawName,driverId){
    const id=cleanDriverId(driverId);
    if(HLRN_DRIVER_NAME_OVERRIDES[id]) return HLRN_DRIVER_NAME_OVERRIDES[id];
    return formatDriverName(rawName,id)||(id?('Driver '+id):'Unknown Driver');
  }

  function buildResultDetails(leagueData){
    const details={};
    if(!leagueData) return details;
    const names={};
    (Array.isArray(leagueData.drivers)?leagueData.drivers:[]).forEach(d=>{
      const id=cleanDriverId(d&&d.driverId);
      if(id) names[id]=snapshotDriverName(d&&d.driver,id);
    });
    const byRace={};
    (Array.isArray(leagueData.results)?leagueData.results:[]).forEach(row=>{
      const raceNo=numberValue(row&&row.raceNumber);
      if(!raceNo) return;
      const key=Math.trunc(raceNo);
      (byRace[key]??=[]).push(row);
    });
    Object.keys(byRace).forEach(key=>{
      const rows=byRace[key].slice().sort((a,b)=>(numberValue(a.finish)||999)-(numberValue(b.finish)||999));
      const nameOf=row=>{
        const id=cleanDriverId(row&&row.driverId);
        return names[id]||HLRN_DRIVER_NAME_OVERRIDES[id]||(id?('Driver '+id):'Unknown Driver');
      };
      const winner=rows.find(r=>numberValue(r.finish)===1)||rows[0]||null;
      const pole=rows.find(r=>numberValue(r.start)===1)||null;
      const mostLed=rows.slice().sort((a,b)=>(numberValue(b.lapsLed)||0)-(numberValue(a.lapsLed)||0))[0]||null;
      const biggestMover=rows.slice().sort((a,b)=>(numberValue(b.positionGain)||0)-(numberValue(a.positionGain)||0))[0]||null;
      const top3=rows.filter(r=>{
        const fin=numberValue(r.finish);
        return fin!==null&&fin>=1&&fin<=3;
      }).slice(0,3).map(r=>({finish:numberValue(r.finish),name:nameOf(r)}));
      const totalIncidents=rows.reduce((sum,r)=>sum+(numberValue(r.incidents)||0),0);
      details[key]={
        raceNumber:Number(key),
        raceId:String((winner&&winner.raceId)||''),
        fieldSize:rows.length,
        winnerName:winner?nameOf(winner):'',
        poleName:pole?nameOf(pole):'',
        mostLedName:mostLed?nameOf(mostLed):'',
        mostLedLaps:mostLed?(numberValue(mostLed.lapsLed)||0):0,
        moverName:biggestMover?nameOf(biggestMover):'',
        moverGain:biggestMover?(numberValue(biggestMover.positionGain)||0):0,
        totalIncidents,
        top3
      };
    });
    return details;
  }

  async function loadResultDetails(){
    if(resultDetailsSyncing) return;
    resultDetailsSyncing=true;
    try{
      const res=await fetch('../data/hlrn.json?v='+Date.now(),{cache:'no-store'});
      if(!res.ok) throw new Error('HLRN results snapshot unavailable');
      const data=await res.json();
      HLRN_RESULT_DETAILS.sunday=buildResultDetails(data&&data.leagues&&data.leagues.sunday);
      HLRN_RESULT_DETAILS.monday=buildResultDetails(data&&data.leagues&&data.leagues.monday);
      resultDetailsLoaded=true;
      document.documentElement.setAttribute('data-hlrn-result-details','online');
      render();
    }catch(err){
      console.warn('HLRN completed race details:',err);
      resultDetailsLoaded=true;
      document.documentElement.setAttribute('data-hlrn-result-details','unavailable');
    }finally{
      resultDetailsSyncing=false;
    }
  }

  async function loadPastWinners(){
    if(winnerSyncing) return;
    winnerSyncing=true;
    try{
      const [sundayResults,sundayDrivers,mondayResults,mondayDrivers]=await Promise.all([
        loadGoogleSheetTable('Sunday Results'),
        loadGoogleSheetTable('Sunday Drivers'),
        loadGoogleSheetTable('Monday Results'),
        loadGoogleSheetTable('Monday Drivers')
      ]);
      Object.assign(HLRN_RACE_WINNERS.sunday,buildWinnerMap(sundayResults,buildDriverMap(sundayDrivers)));
      Object.assign(HLRN_RACE_WINNERS.monday,buildWinnerMap(mondayResults,buildDriverMap(mondayDrivers)));
      winnerFeedLoaded=true;
      document.documentElement.setAttribute('data-hlrn-league-winners','online');
      render();
    }catch(err){
      console.warn('HLRN league winner feed:',err);
      winnerFeedLoaded=true;
      document.documentElement.setAttribute('data-hlrn-league-winners','fallback');
      render();
    }finally{
      winnerSyncing=false;
    }
  }


  /* Driver cutouts for completed-race winners */
  const HLRN_WINNER_PHOTO_BASE="https://hunterwelborn32-creator.github.io/HLRN-App/driver-photos/cutout/";
  const HLRN_WINNER_PHOTOS={"aarontruebig":"aaron-truebig.webp","alexleebaw":"alex-leebaw.webp","benjaminrichards":"benjamin-richards.webp","billdaniels":"bill-daniels.webp","brandonbeyke":"brandon-beyke.webp","brandonshowers":"brandon-showers.webp","brianhayes":"brian-hayes.webp","brianhebbard":"brian-hebbard.webp","brianhennings":"brian-hennings.webp","brockpiper":"brock-piper.webp","brycehinton":"bryce-hinton.webp","carsonfreeman":"carson-freeman.webp","charlesfletcher":"charles-fletcher.webp","chrisjames":"chris-james.webp","coricooke":"cori-cooke.webp","craigrowe":"craig-rowe.webp","darrelceballos":"darrel-ceballos.webp","daviddurand":"david-durand.webp","derekjacobs":"derek-jacobs.webp","donnybeach":"donny-beach.webp","dylanjones":"dylan-jones.webp","erichayden":"eric-hayden.webp","ethaneckert":"ethan-eckert.webp","ethanmoreno":"ethan-moreno.webp","evanfuqua":"evan-fuqua.webp","evankarlbon":"evan-karlbon.webp","evanparry":"evan-parry.webp","gerrybergeron":"gerry-bergeron.webp","grantwessley":"grant-wessley.webp","hunterwelborn":"hunter-welborn.webp","jaredphilpott":"jared-philpott.webp","jasonbranch":"jason-branch.webp","javonethompson":"javone-thompson.webp","jeremyjeffries":"jeremy-jeffries.webp","jerryfassett":"jerry-fassett.webp","jimsegredo":"jim-segredo.webp","joekonen":"joe-konen.webp","johnmiles":"john-miles.webp","joshmckinney":"josh-mckinney.webp","joshuaspragg":"joshua-spragg.webp","juanescamilla":"juan-escamilla.webp","justincrowe":"justin-crowe.webp","keatoncox":"keaton-cox.webp","kennyreel":"kenny-reel.webp","kenwoodramsey":"kenwood-ramsey.webp","kodyneagles":"kody-neagles.webp","kylekammeron":"kyle-kammeron.webp","larkinboyer":"larkin-boyer.webp","matthewbrown":"matthew-brown.webp","matthewgraham":"matthew-graham.webp","nicholasbaumann":"nicholas-baumann.webp","nicholasmoody":"nicholas-moody.webp","randyschweitzer":"randy-schweitzer.webp","randyshowers":"randy-showers.webp","rickymiles":"ricky-miles.webp","rosscampoli":"ross-campoli.webp","ryanwilson":"ryan-wilson.webp","scottwise":"scott-wise.webp","sebastianmichaels":"sebastian-michaels.webp","shanehatfield":"shane-hatfield.webp","shawnstamper":"shawn-stamper.webp","timothytyler":"timothy-tyler.webp","tjlunn":"tj-lunn.webp","tommyrogers":"tommy-rogers.webp","trevoraswarnauth":"trevor-aswarnauth.webp","trevorhaley":"trevor-haley.webp","vincenteguerrero":"vincente-guerrero.webp","zackharry":"zack-harry.webp"};
  const HLRN_WINNER_PHOTO_ALIASES={"sebastianmicheals":"sebastianmichaels","ericpedleyhayden":"erichayden","randyschweitzerrsi":"randyschweitzer","dyalnjones":"dylanjones","nicholasbaumann2":"nicholasbaumann","dylancjones":"dylanjones","ethanfonsecamoreno":"ethanmoreno","joshuamckinney":"joshmckinney","joshuamckinney2":"joshmckinney","jeremysjeffries":"jeremyjeffries","vicenteguerrero2":"vincenteguerrero","brianhebbard2":"brianhebbard","brianhayes4":"brianhayes","ryanwilson21":"ryanwilson","timothytyler3":"timothytyler","matthewbrown49":"matthewbrown","matthewgraham20":"matthewgraham"};

  function winnerPhotoKey(name){
    let s=String(name||'').trim();
    if(s.includes(',')){
      const p=s.split(',');
      const last=(p.shift()||'').trim().replace(/\d+$/,'');
      const first=p.join(' ').trim();
      s=(first+' '+last).trim();
    }else{
      s=s.replace(/\d+$/,'').trim();
    }
    let k=s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
    if(HLRN_WINNER_PHOTO_ALIASES[k]) k=HLRN_WINNER_PHOTO_ALIASES[k];
    if(!HLRN_WINNER_PHOTOS[k]){
      const stripped=k.replace(/\d+/g,'');
      if(HLRN_WINNER_PHOTO_ALIASES[stripped]) k=HLRN_WINNER_PHOTO_ALIASES[stripped];
      else if(HLRN_WINNER_PHOTOS[stripped]) k=stripped;
    }
    return k;
  }

  function winnerPhotoUrl(name){
    const file=HLRN_WINNER_PHOTOS[winnerPhotoKey(name)];
    return file ? HLRN_WINNER_PHOTO_BASE+file : '';
  }

  function winnerFor(r){
    if(!r||!r.week) return '';
    return (HLRN_RACE_WINNERS[league]&&HLRN_RACE_WINNERS[league][Number(r.week)])||'';
  }

  function winnerMarkup(r,compact=false){
    const winner=winnerFor(r);
    if(winner){
      if(compact) return `<div class="ns-summary-winner">Race Winner • <span>${esc(winner)}</span></div>`;
      const photo=winnerPhotoUrl(winner);
      return `<div class="ns-winner"><b>Winner</b>${photo?`<img class="ns-winner-photo" src="${esc(photo)}" alt="${esc(winner)}" onerror="this.remove()" loading="lazy" decoding="async" fetchpriority="low">`:''}<span class="ns-winner-name">${esc(winner)}</span></div>`;
    }
    if(!winnerFeedLoaded) return compact
      ? `<div class="ns-summary-winner">Race Winner • <span>Loading league result…</span></div>`
      : `<div class="ns-winner missing">Winner • Loading league result…</div>`;
    return compact
      ? `<div class="ns-summary-winner">Race Winner • <span>Result pending</span></div>`
      : `<div class="ns-winner missing">Winner • Result pending</div>`;
  }

  function resultDetailsFor(r){
    if(!r||!r.week) return null;
    return HLRN_RESULT_DETAILS[league]&&HLRN_RESULT_DETAILS[league][Number(r.week)]||null;
  }

  function fullResultsUrl(r){
    if(!r||!r.week) return './';
    return './?league='+encodeURIComponent(league)+'&race='+encodeURIComponent(r.week)+'#raceReportView';
  }

  function resultMetaMarkup(r,compact=false){
    const d=resultDetailsFor(r);
    if(!d) return '';
    const parts=[];
    if(d.poleName) parts.push('Pole: '+d.poleName);
    if(d.mostLedName) parts.push('Most led: '+d.mostLedName+(d.mostLedLaps?' ('+d.mostLedLaps+')':''));
    if(d.moverName&&d.moverGain>0) parts.push('Mover: '+d.moverName+' (+'+d.moverGain+')');
    if(compact&&d.fieldSize) parts.push('Field: '+d.fieldSize);
    return parts.length?'<div class="ns-result-meta'+(compact?' compact':'')+'">'+parts.map(esc).join(' • ')+'</div>':'';
  }

  function raceStart(r){return typeof getRaceStart==='function'?getRaceStart(r):new Date(r.date+'T20:30:00');}
  function races(){return scheduleOf().filter(r=>!r.off).map(r=>({...r,_start:raceStart(r)})).sort((a,b)=>a._start-b._start)}
  function state(){
    const all=races(),now=new Date();
    let prev=null,next=null,live=null;
    all.forEach(r=>{const end=raceEnd(r._start);if(now>=r._start&&now<end)live=r;if(r._start<now)prev=r;if(!next&&r._start>now)next=r});
    if(live) next=live;
    return {all,now,prev,next,live};
  }
  function fDate(d,long=false){return new Intl.DateTimeFormat('en-US',long?{weekday:'long',month:'long',day:'numeric',year:'numeric'}:{month:'short',day:'numeric',year:'numeric'}).format(d)}
  function fTime(d){return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).format(d)}
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function countdown(r){
    if(!r) return '';
    const diff=Math.max(0,r._start-new Date());
    const days=Math.floor(diff/86400000),hours=Math.floor(diff/3600000)%24,mins=Math.floor(diff/60000)%60,secs=Math.floor(diff/1000)%60;
    return `<div class="ns-countdown"><div><strong>${String(days).padStart(2,'0')}</strong><span>Days</span></div><div><strong>${String(hours).padStart(2,'0')}</strong><span>Hours</span></div><div><strong>${String(mins).padStart(2,'0')}</strong><span>Min</span></div><div><strong>${String(secs).padStart(2,'0')}</strong><span>Sec</span></div></div>`;
  }
  function summary(r,type,isLive){
    if(!r) return `<div class="ns-race-name">Season Complete</div><div class="ns-race-meta">No additional races are scheduled.</div>`;
    const status=isLive?'Live Now':type==='previous'?'Final':'Upcoming';
    const action=type==='next'
      ? `<div class="ns-race-actions"><a class="ns-btn primary" href="${youtubeOf()}" target="_blank" rel="noopener">${isLive?'Watch Live':'Watch HLRN'}</a><a class="ns-btn" href="#nsSchedule">Full Schedule</a></div>`
      : type==='previous'
        ? `<div class="ns-race-actions"><a class="ns-btn ns-full-results ${league}" href="${fullResultsUrl(r)}">View Full Results</a></div>`
        : '';
    return `<span class="ns-status">${status}</span><div class="ns-race-name">${esc(r.track)}</div><div class="ns-race-meta">Week ${esc(r.week)} • ${fDate(r._start,true)} • ${fTime(r._start)}<br>${esc(r.car)} • ${esc(r.laps)} laps • ${esc(r.tires)}</div>${type==='previous'?winnerMarkup(r,true)+resultMetaMarkup(r,true):''}${type==='next'&&!isLive?countdown(r):''}${action}`;
  }
  function feature(r,isLive){
    if(!r) return `<div class="ns-feature-main"><div class="ns-feature-kicker">2026 Season</div><div class="ns-feature-track">Season Complete</div><div class="ns-feature-desc">Thank you for racing with High Line Racing Network.</div></div>`;
    return `<div class="ns-feature-main"><div class="ns-feature-kicker">${isLive?'Live Race':'Next Race'} • ${league==='sunday'?'Sunday Night League':'Monday Night League'}</div><div class="ns-feature-track">${esc(r.track)}</div><div class="ns-feature-date">${fDate(r._start,true)} • ${fTime(r._start)}</div><div class="ns-feature-desc">${esc(r.description||'High Line Racing Network league event.')}</div><div class="ns-race-actions"><a class="ns-btn primary" href="${youtubeOf()}" target="_blank" rel="noopener">${isLive?'Watch Live':'Watch HLRN'}</a></div></div><div class="ns-feature-info"><div class="ns-detail"><small>Location</small><strong>${esc(r.location||'—')}</strong></div><div class="ns-detail"><small>Track Length</small><strong>${esc(r.miles||'—')} mi</strong></div><div class="ns-detail"><small>Track Type</small><strong>${esc(r.type||'—')}</strong></div><div class="ns-detail"><small>Banking</small><strong>${esc(r.banking||'—')}</strong></div><div class="ns-detail"><small>Race Car</small><strong>${esc(r.car||'—')}</strong></div><div class="ns-detail"><small>Race Distance</small><strong>${esc(r.laps||'—')} laps</strong></div><div class="ns-detail wide"><small>Tire Allocation</small><strong>${esc(r.tires||'—')}</strong></div></div>`;
  }
  function renderSchedule(st){
    const show=showPast.checked;
    let list=st.all.filter(r=>show || raceEnd(r._start)>=st.now);
    const groups={};
    list.forEach(r=>{const month=new Intl.DateTimeFormat('en-US',{month:'long'}).format(r._start).toUpperCase();(groups[month]??=[]).push(r)});
    const months=Object.keys(groups);
    document.getElementById('nsSchedule').innerHTML=months.length?months.map(month=>`<section class="ns-month"><h2 class="ns-month-title">${month}</h2><div class="ns-races">${groups[month].map(r=>{
      const end=raceEnd(r._start),past=end<st.now,live=st.now>=r._start&&st.now<end,isNext=st.next===r&&!live;
      const day=new Intl.DateTimeFormat('en-US',{day:'2-digit'}).format(r._start),dow=new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(r._start).toUpperCase();
      return `<article class="ns-race-row ${past?'past':''} ${isNext?'next':''}"><div class="ns-date"><b>${day}</b><span>${dow}</span></div><div><div class="ns-row-week">Week ${esc(r.week)} • ${league==='sunday'?'Sunday':'Monday'} League</div><div class="ns-row-track">${esc(r.track)}</div><div class="ns-row-location">${esc(r.location||'')} • ${fTime(r._start)}</div>${past?winnerMarkup(r,false)+resultMetaMarkup(r,false):''}</div><div class="ns-row-spec">${esc(r.car)}<br>${esc(r.laps)} Laps • ${esc(r.tires)}</div><div class="ns-row-status"><span class="ns-chip ${live?'live':isNext?'next':''} ${league}">${live?'Live':past?'Final':isNext?'Next Race':'Upcoming'}</span>${past?`<a class="ns-row-results ${league}" href="${fullResultsUrl(r)}">Full Results →</a>`:''}</div></article>`;
    }).join('')}</div></section>`).join(''):`<div class="ns-empty">No upcoming races found.</div>`;
  }
  function render(){
    const st=state();
    document.getElementById('nsPrevious').innerHTML=summary(st.prev,'previous',false);
    const nextCard=document.getElementById('nsNextCard');nextCard.classList.toggle('live',!!st.live);
    document.getElementById('nsNext').innerHTML=summary(st.next,'next',!!st.live);
    document.getElementById('nsFeature').innerHTML=feature(st.next,!!st.live);
    renderSchedule(st);
  }
  document.querySelectorAll('.ns-league-tab').forEach(btn=>btn.addEventListener('click',()=>{
    league=btn.dataset.league;document.querySelectorAll('.ns-league-tab').forEach(b=>b.classList.toggle('active',b===btn));render();
  }));
  showPast.addEventListener('change',render);
  render();
  loadPastWinners();
  loadResultDetails();
  setInterval(render,1000);
  setInterval(loadPastWinners,HLRN_RESULTS_REFRESH_MS);
  setInterval(loadResultDetails,HLRN_RESULTS_REFRESH_MS);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){loadPastWinners();loadResultDetails();}});
})();
