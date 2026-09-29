/* =========================================================
   DRIVER SPOTLIGHT — INDEPENDENT / FAIL-SAFE LOADER

   Why this exists:
   The original spotlight was inside loadHLRNData(). If an
   unrelated homepage request failed before that block ran,
   all three cards remained stuck on LOADING....

   This loader runs independently and uses:
   1) DRIVER RANKINGS first
   2) DRIVER DATA as a fallback
========================================================= */

(function(){

    function spotlightText(id, value){
        const el = document.getElementById(id);
        if(el){
            el.textContent =
                value === "" ||
                value === null ||
                value === undefined
                ? "--"
                : String(value);
        }
    }


    function wireSpotlightDriver(el, driverName){

        if(!el || !driverName){
            return;
        }

        el.textContent = driverName;
        el.classList.add("home-driver-profile-link");
        el.setAttribute("role","button");
        el.setAttribute("tabindex","0");
        el.title = "View driver profile";

        el.onclick = function(){
            if(typeof openHomeDriverProfile === "function"){
                openHomeDriverProfile(driverName);
            }
        };

        el.onkeydown = function(event){
            if(
                event.key === "Enter" ||
                event.key === " "
            ){
                event.preventDefault();

                if(typeof openHomeDriverProfile === "function"){
                    openHomeDriverProfile(driverName);
                }
            }
        };
    }


    function renderSpotlight(drivers){

        if(!Array.isArray(drivers) || !drivers.length){
            return false;
        }

        for(let i = 0; i < 3; i++){

            const place = i + 1;
            const driver = drivers[i] || {};

            const driverElement =
                document.getElementById(
                    "spotlightDriver" + place
                );

            if(driverElement){
                wireSpotlightDriver(
                    driverElement,
                    driver.driver || "Unknown Driver"
                );
            }

            spotlightText(
                "spotlightRaces" + place,
                driver.races
            );

            spotlightText(
                "spotlightWins" + place,
                driver.wins
            );

            spotlightText(
                "spotlightTop5" + place,
                driver.top5
            );

            spotlightText(
                "spotlightTop10" + place,
                driver.top10
            );

            spotlightText(
                "spotlightAverage" + place,
                driver.average
            );
        }

        return true;
    }


    async function loadSpotlightFromRankings(){

        if(typeof getHLRNRange !== "function"){
            throw new Error(
                "getHLRNRange is unavailable."
            );
        }

        /*
         * Pull extra rows rather than only A2:G4.
         * This makes the loader tolerant of blank spacer rows.
         */
        const rows =
            await getHLRNRange(
                "DRIVER RANKINGS",
                "A2:G25"
            );

        const valid = rows
            .filter(function(row){

                const driver =
                    String(
                        row?.[1] || ""
                    ).trim();

                return !!driver;

            })
            .map(function(row){

                return {
                    rank:
                        String(row?.[0] || "").trim(),

                    driver:
                        String(row?.[1] || "").trim(),

                    races:
                        String(row?.[2] || "").trim(),

                    wins:
                        String(row?.[3] || "").trim(),

                    top5:
                        String(row?.[4] || "").trim(),

                    top10:
                        String(row?.[5] || "").trim(),

                    average:
                        String(row?.[6] || "").trim()
                };

            });

        /*
         * If numeric ranks exist, sort by them.
         * Otherwise preserve the sheet order.
         */
        const hasNumericRanks =
            valid.some(function(row){
                return Number.isFinite(
                    Number(row.rank)
                );
            });

        if(hasNumericRanks){
            valid.sort(function(a,b){

                const ar = Number(a.rank);
                const br = Number(b.rank);

                if(
                    Number.isFinite(ar) &&
                    Number.isFinite(br)
                ){
                    return ar - br;
                }

                if(Number.isFinite(ar)){
                    return -1;
                }

                if(Number.isFinite(br)){
                    return 1;
                }

                return 0;
            });
        }

        if(valid.length < 3){
            throw new Error(
                "Not enough DRIVER RANKINGS rows."
            );
        }

        return valid.slice(0,3);
    }


    function numberFromCell(value){

        const cleaned =
            String(value ?? "")
            .replace(/,/g,"")
            .trim();

        const match =
            cleaned.match(/-?\d+(?:\.\d+)?/);

        if(!match){
            return NaN;
        }

        return Number(match[0]);
    }


    async function loadSpotlightFromDriverData(){

        if(typeof getHLRNRange !== "function"){
            throw new Error(
                "getHLRNRange is unavailable."
            );
        }

        /*
         * DRIVER DATA columns used by this homepage:
         * A Race ID
         * B Race Date
         * C Track
         * D Driver
         * E Finish Position
         * F Car #
         * G Start Position
         * H Laps
         * I Laps Led
         * J Incidents
         * K Best Lap
         * L Average Lap
         * M iRating
         */
        const rows =
            await getHLRNRange(
                "DRIVER DATA",
                "A2:M"
            );

        const stats = new Map();

        rows.forEach(function(row){

            const raceId =
                String(
                    row?.[0] || ""
                ).trim();

            const driver =
                String(
                    row?.[3] || ""
                ).trim();

            const finish =
                numberFromCell(
                    row?.[4]
                );

            if(
                !driver ||
                !Number.isFinite(finish)
            ){
                return;
            }

            if(!stats.has(driver)){

                stats.set(
                    driver,
                    {
                        driver:driver,
                        raceIds:new Set(),
                        starts:0,
                        wins:0,
                        top5:0,
                        top10:0,
                        finishTotal:0
                    }
                );
            }

            const item =
                stats.get(driver);

            /*
             * Count a row as a start. Race IDs are kept too
             * so duplicated rows can be protected against.
             */
            const raceKey =
                raceId ||
                driver + "|" + item.starts;

            if(item.raceIds.has(raceKey)){
                return;
            }

            item.raceIds.add(raceKey);
            item.starts += 1;
            item.finishTotal += finish;

            if(finish === 1){
                item.wins += 1;
            }

            if(finish <= 5){
                item.top5 += 1;
            }

            if(finish <= 10){
                item.top10 += 1;
            }

        });


        const drivers =
            Array.from(
                stats.values()
            )
            .filter(function(item){
                return item.starts > 0;
            })
            .map(function(item){

                const average =
                    item.finishTotal /
                    item.starts;

                return {
                    driver:item.driver,
                    races:item.starts,
                    wins:item.wins,
                    top5:item.top5,
                    top10:item.top10,
                    average:
                        Number.isFinite(average)
                        ? average.toFixed(1)
                        : "--"
                };
            });


        /*
         * Fallback ranking order:
         * wins → Top 5 → Top 10 → average finish → starts.
         * DRIVER RANKINGS remains the primary source above.
         */
        drivers.sort(function(a,b){

            if(b.wins !== a.wins){
                return b.wins - a.wins;
            }

            if(b.top5 !== a.top5){
                return b.top5 - a.top5;
            }

            if(b.top10 !== a.top10){
                return b.top10 - a.top10;
            }

            const avgA = Number(a.average);
            const avgB = Number(b.average);

            if(avgA !== avgB){
                return avgA - avgB;
            }

            return b.races - a.races;
        });

        if(drivers.length < 3){
            throw new Error(
                "Not enough DRIVER DATA for spotlight."
            );
        }

        return drivers.slice(0,3);
    }


    async function loadIndependentDriverSpotlight(){

        try{

            const rankingDrivers =
                await loadSpotlightFromRankings();

            renderSpotlight(
                rankingDrivers
            );

            console.log(
                "HLRN DRIVER SPOTLIGHT LOADED FROM DRIVER RANKINGS",
                rankingDrivers
            );

            return;

        }catch(rankingError){

            console.warn(
                "HLRN DRIVER RANKINGS SPOTLIGHT FAILED. USING DRIVER DATA FALLBACK.",
                rankingError
            );
        }


        try{

            const fallbackDrivers =
                await loadSpotlightFromDriverData();

            renderSpotlight(
                fallbackDrivers
            );

            console.log(
                "HLRN DRIVER SPOTLIGHT LOADED FROM DRIVER DATA",
                fallbackDrivers
            );

        }catch(fallbackError){

            console.error(
                "HLRN DRIVER SPOTLIGHT FAILED:",
                fallbackError
            );

            for(let place = 1; place <= 3; place++){

                const driverElement =
                    document.getElementById(
                        "spotlightDriver" + place
                    );

                if(
                    driverElement &&
                    /loading/i.test(
                        driverElement.textContent
                    )
                ){
                    driverElement.textContent =
                        "DATA UNAVAILABLE";
                }
            }
        }
    }


    function startSpotlightLoader(){

        /*
         * Load immediately, then again shortly after the
         * rest of the homepage initializes.
         */
        loadIndependentDriverSpotlight();

        setTimeout(
            loadIndependentDriverSpotlight,
            2200
        );

        /*
         * Keep it current as new race data is added.
         */
        setInterval(
            loadIndependentDriverSpotlight,
            300000
        );
    }


    if(document.readyState === "loading"){

        document.addEventListener(
            "DOMContentLoaded",
            startSpotlightLoader,
            {once:true}
        );

    }else{

        startSpotlightLoader();
    }

})();

(function(){
  const targets = document.querySelectorAll(
    '.hlrn-section-title, .hlrn-race-card, .hlrn-racing-card, .hlrn-driver-card, .hlrn-social-card, .hlrn-raceweek-card'
  );
  targets.forEach((el,i)=>{
    el.classList.add('hlrn-reveal');
    el.style.transitionDelay=((i%4)*70)+'ms';
  });
  if(!('IntersectionObserver' in window)){
    targets.forEach(el=>el.classList.add('hlrn-inview'));
    return;
  }
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('hlrn-inview');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.12,rootMargin:'0px 0px -35px 0px'});
  targets.forEach(el=>observer.observe(el));
})();

(function(){
  function clock(){
    const el=document.getElementById('hqClock'); if(!el)return;
    el.textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true}).format(new Date());
  }
  clock(); setInterval(clock,1000);
  const cursor=document.getElementById('hqCursor');
  if(cursor && matchMedia('(pointer:fine)').matches){document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'})}
  function sync(){
    const top=document.getElementById('spotlightDriver1');
    const dest=document.getElementById('hqTopDriver');
    if(top&&dest){const v=(top.textContent||'').trim();if(v&&v!=='--')dest.textContent=v;}
    const d=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
    const day=d.getDay(), h=d.getHours()+d.getMinutes()/60;
    const rd=document.getElementById('hqRaceDay'), st=document.getElementById('hqRaceStatus');
    let text='RACE WEEK', status='NETWORK ONLINE';
    if((day===0||day===1)&&h>=19.5&&h<20.5){text='LOBBY OPEN';status='RACE NIGHT • LOBBY OPEN'}
    if((day===0||day===1)&&h>=20.5&&h<=23){text='LIVE NOW';status='RACE NIGHT • LIVE WINDOW'}
    if(rd)rd.textContent=text;if(st)st.querySelector('span:last-child').textContent=status;
  }
  sync();setInterval(sync,4000);
  const mo=new MutationObserver(sync);const sp=document.getElementById('spotlightDriver1');if(sp)mo.observe(sp,{childList:true,subtree:true,characterData:true});
  const items=document.querySelectorAll('.hlrn-section-title,.hlrn-race-card,.hlrn-racing-card,.hlrn-driver-card,.hlrn-social-card,.hlrn-raceweek-card,.incident-row,.incident-average-table');
  items.forEach((el,i)=>{el.classList.add('hq-reveal');el.style.transitionDelay=Math.min((i%4)*55,165)+'ms'});
  if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('hq-in');io.unobserve(e.target)}}),{threshold:.07});items.forEach(el=>io.observe(el));}else items.forEach(el=>el.classList.add('hq-in'));
  // scorebug is inserted into the existing hero and does not interfere with its clickable areas
})();

function hqOpenExternal(event, url){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }

  try {
    var popup = window.open(url, "_blank");
    if (popup) {
      try { popup.opener = null; } catch (e) {}
      return false;
    }
  } catch (e) {}

  try {
    var link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return false;
  } catch (e) {}

  try {
    window.location.href = url;
  } catch (e) {}

  return false;
}

function hqNavigateTop(url){
  try {
    if (window.top) {
      window.top.location.href = url;
      return false;
    }
  } catch (e) {}
  try {
    window.open(url, "_top");
    return false;
  } catch (e) {}
  window.location.href = url;
  return false;
}

(function(){
  'use strict';

  const SERIES = [
    {day:0,name:'Sunday Night',cls:'sunday',short:'SUN'},
    {day:1,name:'Monday Night',cls:'monday',short:'MON'}
  ];

  function easternParts(date){
    const parts = new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,weekday:'short'
    }).formatToParts(date).reduce((o,p)=>(o[p.type]=p.value,o),{});
    return parts;
  }

  function easternOffsetMinutes(date){
    const zone = new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',timeZoneName:'shortOffset',hour:'2-digit'
    }).formatToParts(date).find(p=>p.type==='timeZoneName')?.value || 'GMT-4';
    const m = zone.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if(!m) return -240;
    const minutes = Number(m[2])*60 + Number(m[3]||0);
    return m[1] === '+' ? minutes : -minutes;
  }

  function easternInstant(year,month,day,hour,minute){
    let utc = Date.UTC(year,month-1,day,hour,minute,0,0);
    for(let i=0;i<2;i++){
      const offset=easternOffsetMinutes(new Date(utc));
      utc=Date.UTC(year,month-1,day,hour,minute,0,0)-offset*60000;
    }
    return new Date(utc);
  }

  function getNextRaceDate(targetDay, fromDate){
    const now = fromDate || new Date();
    const p = easternParts(now);
    const shadow = new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)));
    const day = shadow.getUTCDay();
    let add = (targetDay - day + 7) % 7;
    const decimalHour = Number(p.hour) + Number(p.minute)/60;
    if(add === 0 && decimalHour >= 20.5) add = 7;
    shadow.setUTCDate(shadow.getUTCDate()+add);
    return easternInstant(shadow.getUTCFullYear(),shadow.getUTCMonth()+1,shadow.getUTCDate(),20,30);
  }

  function fmtRaceDate(date){
    return new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',weekday:'short'}).format(date).toUpperCase();
  }

  function fmtCountdown(target){
    const diff = Math.max(0,target.getTime()-Date.now());
    const totalMinutes = Math.floor(diff/60000);
    const days = Math.floor(totalMinutes/1440);
    const hours = Math.floor((totalMinutes%1440)/60);
    const mins = totalMinutes%60;
    if(diff <= 0) return 'RACE WINDOW OPEN';
    if(days > 0) return days+'D '+String(hours).padStart(2,'0')+'H '+String(mins).padStart(2,'0')+'M TO GREEN';
    return String(hours).padStart(2,'0')+'H '+String(mins).padStart(2,'0')+'M TO GREEN';
  }

  function updateRaceWeek(){
    const sun = getNextRaceDate(0);
    const mon = getNextRaceDate(1);
    const sd=document.getElementById('hqSundayDate'), md=document.getElementById('hqMondayDate');
    const sc=document.getElementById('hqSundayCountdown'), mc=document.getElementById('hqMondayCountdown');
    if(sd) sd.textContent=fmtRaceDate(sun);
    if(md) md.textContent=fmtRaceDate(mon);
    if(sc) sc.textContent=fmtCountdown(sun);
    if(mc) mc.textContent=fmtCountdown(mon);

    const status=document.getElementById('hqBroadcastStatus');
    if(status){
      const next = sun < mon ? sun : mon;
      status.textContent = 'NEXT RACE • '+fmtRaceDate(next)+' • 8:30 PM ET';
    }
  }

  function buildSchedule(){
    const grid=document.getElementById('hqScheduleGrid'); if(!grid) return;
    const now=new Date();
    let dates=[];
    for(const s of SERIES){ dates.push({...s,date:getNextRaceDate(s.day,now)}); }
    for(const s of SERIES){
      const nextWeek=new Date(now.getTime()+7*86400000);
      dates.push({...s,date:getNextRaceDate(s.day,nextWeek)});
    }
    dates.sort((a,b)=>a.date-b.date);
    grid.innerHTML=dates.slice(0,4).map((item,i)=>{
      const dp=easternParts(item.date);
      const month=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short'}).format(item.date).toUpperCase();
      const day=Number(dp.day);
      const year=Number(dp.year);
      return '<article class="hq-schedule-card '+item.cls+'" data-day="'+item.short+'">'+
        '<div class="hq-schedule-round">UPCOMING • '+String(i+1).padStart(2,'0')+'</div>'+
        '<div class="hq-schedule-date">'+month+' '+day+'<small>'+year+'</small></div>'+
        '<div class="hq-schedule-series">'+item.name+'</div>'+
        '<div class="hq-schedule-time"><span>8:30 PM ET</span> • HLRN LEAGUE NIGHT</div>'+
      '</article>';
    }).join('');
  }

  function num(v){
    const n=Number(String(v ?? '').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n)?n:0;
  }

  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}

  function makeProfileButton(id,name){
    const el=document.getElementById(id); if(!el || !name) return;
    el.onclick=function(){ if(typeof openHomeDriverProfile==='function') openHomeDriverProfile(name); };
  }

  function animateNumber(id,value){
    const el=document.getElementById(id); if(!el) return;
    const target=Math.max(0,Math.round(value));
    const duration=700,start=performance.now();
    function frame(t){
      const p=Math.min(1,(t-start)/duration); const eased=1-Math.pow(1-p,3);
      el.textContent=Math.round(target*eased).toLocaleString('en-US');
      if(p<1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  async function loadHQAnalytics(){
    if(typeof getHLRNRange!=='function') return;
    try{
      const [rankRows,dataRows]=await Promise.all([
        getHLRNRange('DRIVER RANKINGS','A2:G'),
        getHLRNRange('DRIVER DATA','A2:J')
      ]);

      const rankings=rankRows.filter(r=>String(r[1]||'').trim()).map(r=>({
        rank:num(r[0]),driver:String(r[1]||'').trim(),races:num(r[2]),wins:num(r[3]),top5:num(r[4]),top10:num(r[5]),avg:num(r[6])
      }));
      const top=rankings.slice().sort((a,b)=>(a.rank||9999)-(b.rank||9999))[0]||null;
      const winsLeader=rankings.slice().sort((a,b)=>b.wins-a.wins || a.rank-b.rank)[0]||null;

      const races=new Set(), drivers=new Set(), winners=new Set();
      let starts=0,totalInc=0;
      const incidentMap={};
      dataRows.forEach(r=>{
        const race=String(r[0]||'').trim();
        const driver=String(r[3]||'').trim();
        const finish=num(r[4]);
        const incidents=num(r[9]);
        if(!driver) return;
        if(race) races.add(race);
        drivers.add(driver); starts++; totalInc+=incidents;
        if(finish===1) winners.add(driver);
        if(!incidentMap[driver]) incidentMap[driver]={races:0,total:0};
        incidentMap[driver].races++; incidentMap[driver].total+=incidents;
      });
      const incidentLeader=Object.entries(incidentMap)
        .filter(([,v])=>v.races>=10)
        .map(([driver,v])=>({driver,races:v.races,avg:v.total/v.races,total:v.total}))
        .sort((a,b)=>b.avg-a.avg || b.total-a.total)[0]||null;

      if(top){
        setText('hqIntelTopDriver',top.driver);
        setText('hqIntelTopDetail','#'+(top.rank||1)+' ranking • '+top.races+' races • '+top.top5+' top 5s');
        makeProfileButton('hqIntelTopCard',top.driver);
        setText('hqHeadlineRanking',top.driver+' holds the No. '+(top.rank||1)+' position in the current HLRN driver ranking.');
      }
      if(winsLeader){
        setText('hqIntelWinsDriver',winsLeader.driver);
        setText('hqIntelWinsDetail',winsLeader.wins+' hosted win'+(winsLeader.wins===1?'':'s'));
        makeProfileButton('hqIntelWinsCard',winsLeader.driver);
        setText('hqHeadlineWins',winsLeader.driver+' leads the current hosted wins column with '+winsLeader.wins+' win'+(winsLeader.wins===1?'':'s')+'.');
      }
      if(incidentLeader){
        setText('hqIntelIncidentDriver',incidentLeader.driver);
        setText('hqIntelIncidentDetail',incidentLeader.avg.toFixed(1)+' incident pts/race • '+incidentLeader.races+' races');
      } else {
        setText('hqIntelIncidentDriver','NO QUALIFIER');
        setText('hqIntelIncidentDetail','Needs 10+ races for average');
      }

      animateNumber('hqStatRaces',races.size);
      animateNumber('hqStatDrivers',drivers.size);
      animateNumber('hqStatWinners',winners.size);
      animateNumber('hqStatStarts',starts);
      animateNumber('hqStatIncidents',totalInc);
      setText('hqHeadlineNetwork',drivers.size+' drivers have combined for '+starts.toLocaleString('en-US')+' recorded starts across '+races.size+' hosted races.');

      syncLatestStory();
    }catch(err){
      console.error('HLRN HQ analytics error:',err);
    }
  }

  function syncLatestStory(){
    const winner=(document.getElementById('lastRaceWinner')?.textContent||'').trim();
    const track=(document.getElementById('lastRaceTrack')?.textContent||'').trim();
    const date=(document.getElementById('lastRaceDate')?.textContent||'').trim();
    if(winner && !/loading|unknown/i.test(winner)){
      setText('hqIntelLatestWinner',winner);
      setText('hqIntelLatestDetail',(track||'Latest HLRN race')+(date?' • '+date:''));
      makeProfileButton('hqIntelLatestCard',winner);
      setText('hqHeadlineFeature',winner+' wins the latest HLRN hosted race'+(track?' at '+track:'')+'.');
      setText('hqHeadlineFeatureSub',(date?date+' • ':'')+'Open the full hosted results for the complete race rundown, finishing order and driver data.');
    }
  }

  function observeLatest(){
    ['lastRaceWinner','lastRaceTrack','lastRaceDate'].forEach(id=>{
      const el=document.getElementById(id); if(!el) return;
      new MutationObserver(syncLatestStory).observe(el,{childList:true,subtree:true,characterData:true});
    });
  }

  function start(){
    updateRaceWeek(); buildSchedule(); observeLatest();
    setInterval(updateRaceWeek,30000);
    // Existing homepage loader is declared earlier. Give it a moment to populate its fields.
    setTimeout(loadHQAnalytics,700);
    setTimeout(syncLatestStory,1100);
    setInterval(loadHQAnalytics,300000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
