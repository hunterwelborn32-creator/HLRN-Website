
(function(){
"use strict";

var state={snapshot:null,reports:[],officialReports:[],schedule:null,recaps:[],recapArchives:[],filter:"all",selected:null};
var qs=new URLSearchParams(location.search);
if(["all","sunday","monday"].indexOf((qs.get("league")||"").toLowerCase())>=0)state.filter=(qs.get("league")||"").toLowerCase();

function $(s){return document.querySelector(s)}
function $$(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function num(v){var n=Number(v);return Number.isFinite(n)?n:0}
function finite(v){var n=Number(v);return Number.isFinite(n)?n:null}
function fmt(v,d){if(d==null)d=1;var n=Number(v);if(!Number.isFinite(n))return "—";return Math.abs(n-Math.round(n))<.0001?String(Math.round(n)):n.toFixed(d)}
function dateValue(v){var t=Date.parse(v||"");return Number.isFinite(t)?t:0}
function displayDate(v){
  var d=new Date(v);if(Number.isNaN(d.getTime()))return "Date unavailable";
  return d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
}
function shortDate(v){
  var d=new Date(v+"T12:00:00");if(Number.isNaN(d.getTime()))return v||"";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}
function seriesKey(v){
  var s=String(v||"").toLowerCase();
  if(s.indexOf("monday")>=0)return "monday";
  if(s.indexOf("sunday")>=0)return "sunday";
  return "";
}
function seriesLabel(v){return v==="monday"?"Monday Night League":"Sunday Night League"}
function trackKey(v){
  return String(v||"").toLowerCase()
    .replace(/\b(international|motor|speedway|raceway|motorspeedway|the)\b/g," ")
    .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function sameTrack(a,b){
  var x=trackKey(a),y=trackKey(b);
  if(!x||!y)return false;
  return x===y||x.indexOf(y)>=0||y.indexOf(x)>=0;
}
function identity(row){
  if(!row)return "";
  if(row.carIdx!=null)return "idx:"+String(row.carIdx);
  if(row.id!=null)return "id:"+String(row.id);
  return "n:"+String(row.number||"")+"|"+String(row.name||"").toLowerCase();
}
function filteredReports(){
  var list=state.reports.slice().sort(function(a,b){return dateValue(b.date)-dateValue(a.date)||num(b.raceNumber)-num(a.raceNumber)});
  return state.filter==="all"?list:list.filter(function(r){return r.series===state.filter})
}
function driverUrl(series,row){
  return "../drivers/?league="+encodeURIComponent(series)+"&driverId="+encodeURIComponent(row&&row.id||"")+"&driver="+encodeURIComponent(row&&row.name||"");
}

function reportStats(r){
  var rows=Array.isArray(r&&r.results)?r.results:[];
  var withStart=rows.filter(function(x){return finite(x.start)!=null});
  var pole=withStart.slice().sort(function(a,b){return num(a.start)-num(b.start)})[0]||null;
  var biggest=(Array.isArray(r&&r.biggestGainers)&&r.biggestGainers[0])||rows.filter(function(x){return finite(x.gain)!=null}).slice().sort(function(a,b){return num(b.gain)-num(a.gain)})[0]||null;
  var lapsLed=rows.reduce(function(s,x){return s+num(x.lapsLed)},0);
  var incidents=rows.reduce(function(s,x){return s+num(x.incidents)},0);
  var running=rows.filter(function(x){
    var s=String(x.status||"").toLowerCase();
    return s==="running"||s==="active"||s==="final";
  }).length;
  return{pole:pole,biggest:biggest,lapsLed:lapsLed,incidents:incidents,running:running}
}
function scheduleEvent(series,raceNumber){
  var list=state.schedule&&state.schedule.leagues&&state.schedule.leagues[series]||[];
  return list.find(function(e){return !e.off&&num(e.week)===num(raceNumber)})||null
}
function scheduleEventForRecorder(series,track,date){
  var list=state.schedule&&state.schedule.leagues&&state.schedule.leagues[series]||[];
  var target=dateValue(date);
  var candidates=list.filter(function(e){return !e.off&&sameTrack(e.track,track)});
  candidates.sort(function(a,b){
    return Math.abs(dateValue(a.date+"T20:30:00")-target)-Math.abs(dateValue(b.date+"T20:30:00")-target);
  });
  if(candidates[0]&&Math.abs(dateValue(candidates[0].date+"T20:30:00")-target)<=48*60*60*1000)return candidates[0];
  return candidates[0]||null
}
function setTabs(){
  $$(".rc-tab").forEach(function(b){b.classList.toggle("active",b.dataset.filter===state.filter)})
}
function updateUrl(selected){
  var p=new URLSearchParams();
  if(state.filter!=="all")p.set("league",state.filter);
  if(selected&&selected.recapSlug)p.set("recap",selected.recapSlug);
  else if(selected&&selected.key)p.set("race",selected.key);
  var next=location.pathname+(p.toString()?"?"+p.toString():"");
  history.pushState({filter:state.filter,race:selected&&selected.key||null,recap:selected&&selected.recapSlug||null},"",next)
}

function recapFinalOrder(recap){
  recap=recap||{};
  var race=recap.race||{},snaps=Array.isArray(recap.lapSnapshots)?recap.lapSnapshots:[];
  var last=null;
  snaps.forEach(function(s){if(!last||num(s.lap)>num(last.lap))last=s});
  var snapOrder=last&&Array.isArray(last.order)?last.order:[];
  var live=Array.isArray(race.drivers)?race.drivers:[];
  var byId=new Map(),byLabel=new Map();
  live.forEach(function(d){
    if(d.carIdx!=null)byId.set(String(d.carIdx),d);
    byLabel.set(String(d.number||"")+"|"+String(d.name||""),d);
  });
  var base=snapOrder.length?snapOrder:live;
  return base.map(function(item){
    var extra=null;
    if(item.carIdx!=null)extra=byId.get(String(item.carIdx));
    if(!extra)extra=byLabel.get(String(item.number||"")+"|"+String(item.name||""));
    return Object.assign({},extra||{},item||{});
  }).sort(function(a,b){return num(a.position||9999)-num(b.position||9999)})
}
function recapFirstOrder(recap){
  var snaps=Array.isArray(recap&&recap.lapSnapshots)?recap.lapSnapshots:[];
  var first=null;
  snaps.forEach(function(s){if(!first||num(s.lap)<num(first.lap))first=s});
  return first&&Array.isArray(first.order)?first.order.slice().sort(function(a,b){return num(a.position||9999)-num(b.position||9999)}):[]
}
function recapLeaderCounts(recap){
  var counts=new Map(),prev="",changes=0;
  var snaps=(recap&&recap.lapSnapshots||[]).slice().sort(function(a,b){return num(a.lap)-num(b.lap)});
  snaps.forEach(function(s){
    var order=Array.isArray(s.order)?s.order.slice().sort(function(a,b){return num(a.position||9999)-num(b.position||9999)}):[];
    if(!order.length)return;
    var leader=order.find(function(x){return num(x.position)===1})||order[0],id=identity(leader);
    counts.set(id,(counts.get(id)||0)+1);
    if(prev&&id!==prev)changes++;prev=id;
  });
  return{counts:counts,changes:changes}
}
function recapResults(recap){
  var order=recapFinalOrder(recap),first=recapFirstOrder(recap),leaders=recapLeaderCounts(recap);
  var firstMap=new Map();first.forEach(function(x){firstMap.set(identity(x),num(x.position)||null)});
  return order.map(function(x){
    var start=firstMap.get(identity(x))||null,finish=finite(x.position);
    return{
      id:x.userId||x.driverId||x.customerId||x.carIdx||"",
      carIdx:x.carIdx,
      number:x.number||"",
      name:x.name||"Unknown Driver",
      start:start,
      finish:finish,
      gain:start!=null&&finish!=null?start-finish:null,
      points:null,
      lapsLed:leaders.counts.get(identity(x))||0,
      incidents:finite(x.incidents),
      lapsCompleted:finite(x.lapsCompleted),
      lapsDown:finite(x.lapsDown),
      status:x.status||(x.disqualified?"DQ":"FINAL")
    }
  })
}
function normalizeRecapArchive(summary,archive){
  var article=archive&&archive.article||{},recap=archive&&archive.recorder||{};
  if(!recap||!recap.raceFrozen)return null;
  var series=seriesKey(summary&&summary.series||article.series||recap.race&&recap.race.series);
  if(!series)return null;
  var track=article.track||summary&&summary.track||recap.race&&recap.race.track||"HLRN Race";
  var date=article.raceFrozenAt||summary&&summary.raceFrozenAt||article.publishedAt||summary&&summary.publishedAt||new Date().toISOString();
  var event=scheduleEventForRecorder(series,track,date);
  var rows=recapResults(recap),winner=article.winner||summary&&summary.winner||{};
  if(!winner.name&&rows[0])winner={name:rows[0].name,id:rows[0].id,number:rows[0].number};
  var biggest=rows.filter(function(x){return finite(x.gain)!=null}).slice().sort(function(a,b){return num(b.gain)-num(a.gain)}).slice(0,3);
  return{
    key:"recap:"+(summary&&summary.slug||article.slug||String(dateValue(date))),
    recapSlug:summary&&summary.slug||article.slug||"",
    recorderOnly:true,
    permanent:true,
    series:series,
    raceId:article.subSessionId||article.sessionId||summary&&summary.subSessionId||summary&&summary.sessionId||"",
    raceNumber:event&&event.week||null,
    track:track,
    date:date,
    winner:winner,
    classified:rows.length||article.driverCount||0,
    top10:rows.slice(0,10),
    results:rows,
    biggestGainers:biggest,
    recorder:recap,
    cautions:Array.isArray(article.cautions)?article.cautions:(recap.cautionHistory||[]),
    penalties:Array.isArray(article.penalties)?article.penalties:(recap.penaltyHistory||[]),
    leadChanges:finite(article.leadChanges)!=null?num(article.leadChanges):recapLeaderCounts(recap).changes,
    fastestLap:article.fastestLap||null,
    completedLapsCaptured:article.completedLapsCaptured||((recap.lapSnapshots||[]).length),
    storyUrl:summary&&summary.url||"",
    rawUrl:summary&&summary.rawUrl||"",
    resultsUrl:summary&&summary.resultsUrl||"",
    publishedAt:summary&&summary.publishedAt||article.publishedAt||null
  }
}
function reportsMatch(official,recorded){
  if(!official||!recorded||official.series!==recorded.series)return false;
  if(!sameTrack(official.track,recorded.track))return false;
  var diff=Math.abs(dateValue(official.date)-dateValue(recorded.date));
  return !diff||diff<=48*60*60*1000
}
function mergeReports(official,recorded){
  var used=new Set();
  var out=(official||[]).map(function(o){
    var idx=recorded.findIndex(function(r,i){return !used.has(i)&&reportsMatch(o,r)});
    if(idx<0)return o;
    used.add(idx);var rr=recorded[idx];
    return Object.assign({},o,{
      permanent:true,
      recapSlug:rr.recapSlug,
      recorder:rr.recorder,
      cautions:rr.cautions,
      penalties:rr.penalties,
      leadChanges:rr.leadChanges,
      fastestLap:rr.fastestLap,
      completedLapsCaptured:rr.completedLapsCaptured,
      storyUrl:rr.storyUrl,
      rawUrl:rr.rawUrl,
      resultsUrl:rr.resultsUrl,
      recorderRaceKey:rr.key
    })
  });
  recorded.forEach(function(r,i){if(!used.has(i))out.push(r)});
  return out
}

function hero(r){
  var el=$("#rcHero");
  if(!r){el.innerHTML='<div class="rc-empty">No completed races are available for this filter.</div>';return}
  var st=reportStats(r),event=scheduleEvent(r.series,r.raceNumber),winner=r.winner||{},pole=st.pole||{},big=st.biggest||{};
  var permanent=r.permanent?"PERMANENT CHECKERED RECORD":"LATEST COMPLETED RACE";
  var newsroom=r.storyUrl||"../news/";
  var storyText=r.storyUrl?"POST-RACE STORY →":"NEWSROOM →";
  el.innerHTML=
  '<article class="rc-hero-main">'+
    '<div><div class="rc-hero-label"><i></i> '+esc(permanent)+'</div>'+
    '<div class="rc-hero-track">'+esc(r.track||"HLRN Race")+'</div>'+
    '<div class="rc-hero-series">'+esc(seriesLabel(r.series))+(r.raceNumber?" • WEEK "+esc(r.raceNumber):"")+' • '+esc(displayDate(r.date))+'</div></div>'+
    '<div class="rc-hero-winner"><small>RACE WINNER</small><strong>'+esc(winner.name||"—")+'</strong><span>'+esc(event&&event.car||"HLRN")+" • "+esc(r.classified||0)+' CLASSIFIED</span></div>'+
    '<div class="rc-hero-actions"><button class="rc-btn primary" type="button" id="rcOpenLatest">FULL RESULTS →</button>'+
    '<a class="rc-btn" href="../broadcasters/?league='+encodeURIComponent(r.series)+'">WATCH HLRN →</a>'+
    '<a class="rc-btn" href="'+esc(newsroom)+'">'+esc(storyText)+'</a></div>'+
  '</article>'+
  '<aside class="rc-hero-side">'+
    '<div class="rc-stat feature"><small>POLE / FIRST RECORDED</small><b>'+esc(pole.name||"—")+'</b><span>'+(pole.start!=null?"Started P"+esc(pole.start):"Starting position unavailable")+'</span></div>'+
    '<div class="rc-stat feature"><small>BIGGEST MOVER</small><b>'+esc(big.name||"—")+'</b><span>'+(big.name?((num(big.gain)>=0?"+":"")+fmt(big.gain)+" positions"):"Movement unavailable")+'</span></div>'+
    '<div class="rc-stat"><small>LAPS LED RECORDED</small><b>'+fmt(st.lapsLed)+'</b><span>Published / captured race rows</span></div>'+
    '<div class="rc-stat"><small>CAUTIONS PRESERVED</small><b>'+fmt((r.cautions||[]).length)+'</b><span>'+((r.permanent&&r.recorder)?"Frozen recorder":"When available")+'</span></div>'+
    '<div class="rc-stat"><small>BLACK FLAGS / PENALTIES</small><b>'+fmt((r.penalties||[]).length)+'</b><span>'+((r.permanent&&r.recorder)?"Frozen recorder":"When available")+'</span></div>'+
  '</aside>';
  var open=$("#rcOpenLatest");if(open)open.addEventListener("click",function(){openReport(r,true)})
}

function raceCard(r){
  var st=reportStats(r),big=st.biggest||{},winner=r.winner||{};
  return '<button class="rc-race-card '+esc(r.series)+'" type="button" data-race="'+esc(r.key)+'">'+
    '<div class="rc-race-band"></div><div class="rc-race-body">'+
      '<div class="rc-race-top"><span class="rc-race-series">'+esc(seriesLabel(r.series))+(r.permanent?" • FROZEN":"")+'</span><b class="rc-race-week">'+(r.raceNumber?"W"+esc(r.raceNumber):"FINAL")+'</b></div>'+
      '<div class="rc-race-track">'+esc(r.track||"HLRN Race")+'</div><div class="rc-race-date">'+esc(displayDate(r.date))+'</div>'+
      '<div class="rc-race-winner"><small>WINNER</small><strong>'+esc(winner.name||"—")+'</strong></div>'+
      '<div class="rc-race-mini"><div><b>'+fmt(r.classified)+'</b><span>Drivers</span></div><div><b>'+fmt((r.cautions||[]).length)+'</b><span>Cautions</span></div><div><b>'+(big.name?((num(big.gain)>=0?"+":"")+fmt(big.gain)):"—")+'</b><span>Big Move</span></div></div>'+
    '</div></button>'
}
function archive(){
  var list=filteredReports();
  $("#rcArchiveCount").textContent=list.length+" COMPLETED RACE"+(list.length===1?"":"S");
  $("#rcRaceGrid").innerHTML=list.length?list.map(raceCard).join(""):'<div class="rc-empty">No completed races are available for this filter.</div>'
}

function scheduleRows(series){
  var list=state.schedule&&state.schedule.leagues&&state.schedule.leagues[series]||[];
  if(!list.length)return '<div class="rc-empty">Schedule unavailable.</div>';
  var now=Date.now(),real=list.filter(function(e){return !e.off});
  var nextIndex=real.findIndex(function(e){return dateValue(e.date+"T23:59:59")>=now});
  if(nextIndex<0)nextIndex=real.length;
  var start=Math.max(0,nextIndex-3),items=real.slice(start,nextIndex+4);
  return items.map(function(e,i){
    var t=dateValue(e.date+"T23:59:59"),done=t<now,next=(start+i)===nextIndex;
    return '<div class="rc-schedule-row '+(done?"done ":"")+(next?"next":"")+'">'+
      '<div class="wk">W'+esc(e.week)+'</div><div><strong>'+esc(e.track||"")+'</strong><small>'+esc(shortDate(e.date))+' • '+esc(e.car||"")+' • '+esc(e.laps||"—")+' LAPS</small></div>'+
      '<b>'+(done?"COMPLETE":next?"NEXT":"UPCOMING")+'</b></div>'
  }).join("")
}
function schedule(){
  $("#rcSundaySchedule").innerHTML=scheduleRows("sunday");$("#rcMondaySchedule").innerHTML=scheduleRows("monday");
  var next=[];
  ["sunday","monday"].forEach(function(series){
    var list=state.schedule&&state.schedule.leagues&&state.schedule.leagues[series]||[];
    list.filter(function(e){return !e.off&&dateValue(e.date+"T23:59:59")>=Date.now()}).forEach(function(e){next.push({series:series,event:e,time:dateValue(e.date+"T20:30:00")})})
  });
  next.sort(function(a,b){return a.time-b.time});var n=next[0];
  if(n){
    $("#rcNextSeries").textContent=seriesLabel(n.series);$("#rcNextTrack").textContent=n.event.track||"Next HLRN Event";
    $("#rcNextMeta").textContent=shortDate(n.event.date)+" • "+(n.event.car||"")+" • "+(n.event.laps||"—")+" LAPS • 8:30 PM ET";
    $("#rcNextPreview").href="../race-preview/?league="+encodeURIComponent(n.series)
  }else{$("#rcNextSeries").textContent="SEASON STATUS";$("#rcNextTrack").textContent="SCHEDULE COMPLETE";$("#rcNextMeta").textContent="No future event is listed."}
}

function statBox(label,value){return '<div class="rc-report-stat"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>'}
function highlights(r){
  var st=reportStats(r),rows=[];
  if(st.biggest)rows.push({tag:"MOVE",name:st.biggest.name,meta:(st.biggest.start!=null?"Started P"+st.biggest.start+" • ":"")+"Finished P"+st.biggest.finish,val:(num(st.biggest.gain)>=0?"+":"")+fmt(st.biggest.gain)});
  if(st.pole)rows.push({tag:"POLE",name:st.pole.name,meta:"First recorded / starting P1",val:"P"+fmt(st.pole.finish)});
  var led=(r.results||[]).slice().sort(function(a,b){return num(b.lapsLed)-num(a.lapsLed)})[0];
  if(led&&num(led.lapsLed)>0)rows.push({tag:"LED",name:led.name,meta:"Most recorded laps led",val:fmt(led.lapsLed)});
  return rows.length?'<div class="rc-highlight-list">'+rows.map(function(x){return '<div class="rc-highlight"><div class="tag">'+esc(x.tag)+'</div><div><strong>'+esc(x.name||"—")+'</strong><small>'+esc(x.meta||"")+'</small></div><b>'+esc(x.val||"—")+'</b></div>'}).join("")+'</div>':'<div class="rc-empty">No race highlights are available.</div>'
}
function recorderMoments(r){
  var cautions=Array.isArray(r.cautions)?r.cautions:[],penalties=Array.isArray(r.penalties)?r.penalties:[];
  if(!cautions.length&&!penalties.length)return "";
  var html='<div class="rc-panel-head" style="margin-top:18px"><h3>Race Control Log</h3><span>FROZEN AT CHECKERED</span></div><div class="rc-highlight-list">';
  cautions.forEach(function(c){
    var lap=c.startLap!=null?c.startLap:c.lap,reason=c.reason||"iRacing did not expose an exact caution cause";
    var meta="Lap "+(lap==null?"—":lap)+(c.restartLap!=null?" • Restart lap "+c.restartLap:"");
    html+='<div class="rc-highlight"><div class="tag">YEL</div><div><strong>CAUTION #'+esc(c.number||"—")+'</strong><small>'+esc(meta)+'</small><div style="margin-top:4px;color:#a8b1bd;font-size:8px">'+esc(reason)+'</div></div><b>'+esc(c.reasonSource||"")+'</b></div>'
  });
  penalties.forEach(function(p){
    var name=p.driverName||p.name||"Driver",reason=p.reason||p.penaltyReason||p.description||"iRacing did not expose an exact black-flag reason";
    var lap=p.lap!=null?p.lap:p.raceLap;
    html+='<div class="rc-highlight"><div class="tag">PEN</div><div><strong>'+esc(name)+'</strong><small>'+(lap!=null?"LAP "+esc(lap):"PENALTY")+'</small><div style="margin-top:4px;color:#a8b1bd;font-size:8px">'+esc(reason)+'</div></div><b>'+esc(p.reasonSource||p.source||"")+'</b></div>'
  });
  return html+'</div>'
}
function optionalData(r){
  if(r.permanent&&r.recorder){
    var c=(r.cautions||[]).length,p=(r.penalties||[]).length,l=finite(r.leadChanges)!=null?num(r.leadChanges):0,s=finite(r.completedLapsCaptured)!=null?num(r.completedLapsCaptured):((r.recorder.lapSnapshots||[]).length);
    return '<div class="rc-data-note"><i></i><div><strong>Permanent Recorder Data Preserved</strong><p>'+c+' caution'+(c===1?'':'s')+' • '+p+' penalty / black-flag event'+(p===1?'':'s')+' • '+l+' recorded lead change'+(l===1?'':'s')+' • '+s+' completed-lap snapshots. Exact causes are shown only when the bridge/iRacing provided them.</p></div></div>'
  }
  return '<div class="rc-data-note"><i></i><div><strong>Official Results Source</strong><p>Finishing order and championship points are published from HLRN league results. Recorder-only cautions, black flags and incident causes appear here after a frozen checkered record is published.</p></div></div>'
}
function resultRows(r){
  var rows=(r.results||[]).slice().sort(function(a,b){return num(a.finish)-num(b.finish)});
  if(!rows.length)return '<tr><td colspan="8">No finishing order is available.</td></tr>';
  return rows.map(function(x){
    var gain=finite(x.gain),gainClass=gain>0?"posgain":gain<0?"neg":"";
    var name=esc(x.name||"Unknown Driver"),driverCell=x.id?'<a href="'+driverUrl(r.series,x)+'">'+name+'</a>':name;
    return '<tr><td class="pos">P'+esc(x.finish==null?"—":x.finish)+'</td><td>'+driverCell+'</td><td>'+(x.start==null?"—":"P"+esc(x.start))+'</td><td class="gain '+gainClass+'">'+(gain==null?"—":((gain>0?"+":"")+fmt(gain)))+'</td><td>'+fmt(x.points)+'</td><td>'+fmt(x.lapsLed)+'</td><td>'+fmt(x.incidents)+'</td><td>'+esc(x.status||"—")+'</td></tr>'
  }).join("")
}
function openReport(r,push){
  if(!r)return;state.selected=r;
  var st=reportStats(r),event=scheduleEvent(r.series,r.raceNumber),winner=r.winner||{},pole=st.pole||{},big=st.biggest||{};
  var newsroom=r.storyUrl||"../news/",storyText=r.storyUrl?"POST-RACE STORY →":"NEWSROOM →";
  $("#rcReportContent").innerHTML=
    '<div class="rc-report-hero '+esc(r.series)+'"><div class="rc-report-kicker">'+esc(seriesLabel(r.series))+(r.raceNumber?" // WEEK "+esc(r.raceNumber):"")+' // '+(r.permanent?"PERMANENT CHECKERED RECORD":"FINAL RESULTS")+'</div>'+
    '<h2>'+esc(r.track||"HLRN Race")+'</h2><p>'+esc(displayDate(r.date))+' • Winner: '+esc(winner.name||"—")+'</p>'+
    '<div class="rc-report-stats">'+
      statBox("Winner",winner.name||"—")+statBox("Pole",pole.name||"—")+statBox("Classified",fmt(r.classified))+statBox("Biggest Mover",big.name?((num(big.gain)>=0?"+":"")+fmt(big.gain)):"—")+statBox("Cautions",fmt((r.cautions||[]).length))+statBox("Penalties",fmt((r.penalties||[]).length))+
    '</div></div>'+
    '<div class="rc-report-grid"><section class="rc-panel"><div class="rc-panel-head"><h3>Full Finishing Order</h3><span>'+fmt(r.classified)+' CLASSIFIED</span></div>'+
      '<div class="rc-table-shell"><table class="rc-table"><thead><tr><th>Finish</th><th>Driver</th><th>Start</th><th>+/-</th><th>Points</th><th>Laps Led</th><th>Inc</th><th>Status</th></tr></thead><tbody>'+resultRows(r)+'</tbody></table></div></section>'+
    '<aside class="rc-panel"><div class="rc-panel-head"><h3>Race Highlights</h3><span>'+(r.permanent?"OFFICIAL + RECORDER":"PUBLISHED RESULTS")+'</span></div>'+highlights(r)+recorderMoments(r)+optionalData(r)+
      '<div class="rc-hero-actions"><a class="rc-btn primary" href="../broadcasters/?league='+encodeURIComponent(r.series)+'">WATCH HLRN →</a><a class="rc-btn" href="'+esc(newsroom)+'">'+esc(storyText)+'</a></div></aside></div>';
  $("#rcDirectory").style.display="none";$("#rcReport").style.display="block";window.scrollTo({top:0,behavior:"smooth"});
  if(push!==false)updateUrl(r)
}
function closeReport(push){
  state.selected=null;$("#rcReport").style.display="none";$("#rcDirectory").style.display="block";hero(filteredReports()[0]);window.scrollTo({top:0,behavior:"smooth"});
  if(push!==false)updateUrl(null)
}

function recorderCard(item){
  var winner=item&&item.winner||{},resultsUrl=item&&item.resultsUrl||("../results/?recap="+encodeURIComponent(item&&item.slug||"")),story=item&&item.url||"";
  return '<article class="rc-recorder-card"><small>'+esc(item&&item.series||"HLRN")+' • FINAL • FROZEN</small><strong>'+esc(item&&item.track||"Recorded Race")+'</strong>'+
    '<div style="margin-top:7px;font-size:8px;color:#909baa">Winner: '+esc(winner.name||"—")+' • '+fmt(item&&item.cautions)+' cautions • '+fmt(item&&item.penalties)+' penalties</div>'+
    '<a href="'+esc(resultsUrl)+'">PERMANENT RESULTS →</a>'+(story?' <a href="'+esc(story)+'">STORY →</a>':'')+'</article>'
}
function recorder(){
  var list=state.recaps||[];
  $("#rcRecorderState").textContent=list.length?list.length+" FROZEN RECORD"+(list.length===1?"":"S"):"RECORDER READY";
  $("#rcRecorderList").innerHTML=list.length?list.map(recorderCard).join(""):'<div class="rc-empty">No frozen race records have been published yet. When the Live Race Center recorder freezes a real race at checkered, it will be published here automatically.</div>'
}
function setFilter(v,push){
  state.filter=v;setTabs();hero(filteredReports()[0]);archive();closeReport(false);
  if(push!==false)updateUrl(null)
}
function findSelectedFromUrl(){
  var p=new URLSearchParams(location.search),slug=p.get("recap"),key=p.get("race");
  if(slug)return state.reports.find(function(x){return x.recapSlug===slug})||null;
  if(key)return state.reports.find(function(x){return x.key===key})||null;
  return null
}
function bind(){
  $$(".rc-tab").forEach(function(b){b.addEventListener("click",function(){setFilter(b.dataset.filter,true)})});
  $("#rcRaceGrid").addEventListener("click",function(e){var c=e.target.closest(".rc-race-card");if(!c)return;var r=state.reports.find(function(x){return x.key===c.dataset.race});openReport(r,true)});
  $("#rcBack").addEventListener("click",function(){closeReport(true)});
  window.addEventListener("popstate",function(){
    var p=new URLSearchParams(location.search),f=(p.get("league")||"all").toLowerCase();state.filter=["all","sunday","monday"].indexOf(f)>=0?f:"all";setTabs();hero(filteredReports()[0]);archive();
    var r=findSelectedFromUrl();if(r)openReport(r,false);else closeReport(false)
  })
}

function withCacheBust(url){
  return url+(url.indexOf("?")>=0?"&":"?")+"v="+Date.now()
}
async function loadJson(url){
  var res=await fetch(withCacheBust(url),{cache:"no-store"});if(!res.ok)throw new Error(url+" "+res.status);return res.json()
}
function localDataUrl(summary){
  var raw=summary&&summary.rawUrl;
  if(raw&&raw.charAt(0)==="/")return ".."+raw;
  if(raw)return raw;
  return "../data/race-recaps/"+encodeURIComponent(summary&&summary.slug||"")+".json"
}
async function loadRecapArchives(items){
  var list=(items||[]).filter(function(x){return x&&x.slug}).slice(0,16);
  var settled=await Promise.all(list.map(async function(summary){
    try{
      var archive=await loadJson(localDataUrl(summary));
      return{summary:summary,archive:archive}
    }catch(err){
      console.warn("HLRN recap archive unavailable",summary&&summary.slug,err);
      return null
    }
  }));
  return settled.filter(Boolean)
}

async function init(){
  bind();setTabs();
  try{
    var loaded=await Promise.all([
      HLRNData.load(),
      loadJson("../data/derived/reports.json"),
      loadJson("../data/schedules-2026.json"),
      loadJson("../data/race-recaps/index.json").catch(function(){return{recaps:[]}})
    ]);
    state.snapshot=loaded[0];state.officialReports=loaded[1]&&loaded[1].reports||[];state.schedule=loaded[2]||null;state.recaps=loaded[3]&&loaded[3].recaps||[];
    state.recapArchives=await loadRecapArchives(state.recaps);
    var recorded=state.recapArchives.map(function(x){return normalizeRecapArchive(x.summary,x.archive)}).filter(Boolean);
    state.reports=mergeReports(state.officialReports,recorded);
    $("#rcUpdated").textContent=state.snapshot&&state.snapshot.generatedAt?"DATA "+new Date(state.snapshot.generatedAt).toLocaleString():"LIVE HLRN DATA";
    hero(filteredReports()[0]);archive();schedule();recorder();
    var selected=findSelectedFromUrl();if(selected)openReport(selected,false)
  }catch(err){
    console.error(err);$("#rcRaceGrid").innerHTML='<div class="rc-empty">HLRN result data is temporarily unavailable.</div>';$("#rcUpdated").textContent="DATA TEMPORARILY UNAVAILABLE"
  }
}
document.addEventListener("DOMContentLoaded",init);
})();
