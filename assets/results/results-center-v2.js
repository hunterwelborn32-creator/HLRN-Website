
(function(){
"use strict";

var state={snapshot:null,reports:[],schedule:null,recaps:[],filter:"all",selected:null};
var qs=new URLSearchParams(location.search);
if(["all","sunday","monday"].indexOf((qs.get("league")||"").toLowerCase())>=0)state.filter=(qs.get("league")||"").toLowerCase();

function $(s){return document.querySelector(s)}
function $$(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function num(v){var n=Number(v);return Number.isFinite(n)?n:0}
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
function seriesLabel(v){return v==="monday"?"Monday Night League":"Sunday Night League"}
function filteredReports(){
  var list=state.reports.slice().sort(function(a,b){return dateValue(b.date)-dateValue(a.date)||num(b.raceNumber)-num(a.raceNumber)});
  return state.filter==="all"?list:list.filter(function(r){return r.series===state.filter})
}
function driverUrl(series,row){
  return "../drivers/?league="+encodeURIComponent(series)+"&driverId="+encodeURIComponent(row&&row.id||"")+"&driver="+encodeURIComponent(row&&row.name||"");
}
function reportStats(r){
  var rows=Array.isArray(r&&r.results)?r.results:[];
  var pole=rows.slice().sort(function(a,b){return num(a.start)-num(b.start)})[0]||null;
  var biggest=(Array.isArray(r&&r.biggestGainers)&&r.biggestGainers[0])||rows.slice().sort(function(a,b){return num(b.gain)-num(a.gain)})[0]||null;
  var lapsLed=rows.reduce(function(s,x){return s+num(x.lapsLed)},0);
  var incidents=rows.reduce(function(s,x){return s+num(x.incidents)},0);
  var running=rows.filter(function(x){return String(x.status||"").toLowerCase()==="running"}).length;
  return{pole:pole,biggest:biggest,lapsLed:lapsLed,incidents:incidents,running:running}
}
function scheduleEvent(series,raceNumber){
  var list=state.schedule&&state.schedule.leagues&&state.schedule.leagues[series]||[];
  return list.find(function(e){return !e.off&&num(e.week)===num(raceNumber)})||null
}
function setTabs(){
  $$(".rc-tab").forEach(function(b){b.classList.toggle("active",b.dataset.filter===state.filter)})
}
function updateUrl(selected){
  var p=new URLSearchParams();
  if(state.filter!=="all")p.set("league",state.filter);
  if(selected&&selected.key)p.set("race",selected.key);
  var next=location.pathname+(p.toString()?"?"+p.toString():"");
  history.pushState({filter:state.filter,race:selected&&selected.key||null},"",next)
}

function hero(r){
  var el=$("#rcHero");
  if(!r){
    el.innerHTML='<div class="rc-empty">No completed races are available for this filter.</div>';
    return;
  }
  var st=reportStats(r),event=scheduleEvent(r.series,r.raceNumber),winner=r.winner||{},pole=st.pole||{},big=st.biggest||{};
  el.innerHTML=
  '<article class="rc-hero-main">'+
    '<div><div class="rc-hero-label"><i></i> LATEST COMPLETED RACE</div>'+
    '<div class="rc-hero-track">'+esc(r.track||"HLRN Race")+'</div>'+
    '<div class="rc-hero-series">'+esc(seriesLabel(r.series))+' • WEEK '+esc(r.raceNumber)+' • '+esc(displayDate(r.date))+'</div></div>'+
    '<div class="rc-hero-winner"><small>RACE WINNER</small><strong>'+esc(winner.name||"—")+'</strong><span>'+esc(event&&event.car||"HLRN")+" • "+esc(r.classified||0)+' CLASSIFIED</span></div>'+
    '<div class="rc-hero-actions"><button class="rc-btn primary" type="button" id="rcOpenLatest">FULL RESULTS →</button>'+
    '<a class="rc-btn" href="../broadcasters/?league='+encodeURIComponent(r.series)+'">WATCH HLRN →</a>'+
    '<a class="rc-btn" href="../news/">NEWSROOM →</a></div>'+
  '</article>'+
  '<aside class="rc-hero-side">'+
    '<div class="rc-stat feature"><small>POLE SITTER</small><b>'+esc(pole.name||"—")+'</b><span>Started P'+esc(pole.start==null?"—":pole.start)+'</span></div>'+
    '<div class="rc-stat feature"><small>BIGGEST MOVER</small><b>'+esc(big.name||"—")+'</b><span>'+(num(big.gain)>=0?"+":"")+fmt(big.gain)+' positions</span></div>'+
    '<div class="rc-stat"><small>LAPS LED RECORDED</small><b>'+fmt(st.lapsLed)+'</b><span>Across classified results</span></div>'+
    '<div class="rc-stat"><small>INCIDENT POINTS</small><b>'+fmt(st.incidents)+'</b><span>Published race rows</span></div>'+
    '<div class="rc-stat"><small>RUNNING AT FINISH</small><b>'+fmt(st.running)+'</b><span>Drivers marked Running</span></div>'+
  '</aside>';
  var open=$("#rcOpenLatest");if(open)open.addEventListener("click",function(){openReport(r,true)})
}

function raceCard(r){
  var st=reportStats(r),big=st.biggest||{},winner=r.winner||{};
  return '<button class="rc-race-card '+esc(r.series)+'" type="button" data-race="'+esc(r.key)+'">'+
    '<div class="rc-race-band"></div><div class="rc-race-body">'+
      '<div class="rc-race-top"><span class="rc-race-series">'+esc(seriesLabel(r.series))+'</span><b class="rc-race-week">W'+esc(r.raceNumber)+'</b></div>'+
      '<div class="rc-race-track">'+esc(r.track||"HLRN Race")+'</div><div class="rc-race-date">'+esc(displayDate(r.date))+'</div>'+
      '<div class="rc-race-winner"><small>WINNER</small><strong>'+esc(winner.name||"—")+'</strong></div>'+
      '<div class="rc-race-mini"><div><b>'+fmt(r.classified)+'</b><span>Drivers</span></div><div><b>'+fmt(st.lapsLed)+'</b><span>Laps Led</span></div><div><b>'+(big.name?((num(big.gain)>=0?"+":"")+fmt(big.gain)):"—")+'</b><span>Big Move</span></div></div>'+
    '</div></button>'
}
function archive(){
  var list=filteredReports();
  $("#rcArchiveCount").textContent=list.length+" COMPLETED RACE"+(list.length===1?"":"S");
  $("#rcRaceGrid").innerHTML=list.length?list.map(raceCard).join(""):'<div class="rc-empty">No completed races are available for this filter.</div>';
}

function scheduleRows(series){
  var list=state.schedule&&state.schedule.leagues&&state.schedule.leagues[series]||[];
  if(!list.length)return '<div class="rc-empty">Schedule unavailable.</div>';
  var now=Date.now();
  var real=list.filter(function(e){return !e.off});
  var nextIndex=real.findIndex(function(e){return dateValue(e.date+"T23:59:59")>=now});
  if(nextIndex<0)nextIndex=real.length;
  var start=Math.max(0,nextIndex-3),items=real.slice(start,nextIndex+4);
  return items.map(function(e,i){
    var t=dateValue(e.date+"T23:59:59"),done=t<now, next=(start+i)===nextIndex;
    return '<div class="rc-schedule-row '+(done?"done ":"")+(next?"next":"")+'">'+
      '<div class="wk">W'+esc(e.week)+'</div><div><strong>'+esc(e.track||"")+'</strong><small>'+esc(shortDate(e.date))+' • '+esc(e.car||"")+' • '+esc(e.laps||"—")+' LAPS</small></div>'+
      '<b>'+(done?"COMPLETE":next?"NEXT":"UPCOMING")+'</b></div>'
  }).join("")
}
function schedule(){
  $("#rcSundaySchedule").innerHTML=scheduleRows("sunday");
  $("#rcMondaySchedule").innerHTML=scheduleRows("monday");
  var next=[];
  ["sunday","monday"].forEach(function(series){
    var list=state.schedule&&state.schedule.leagues&&state.schedule.leagues[series]||[];
    list.filter(function(e){return !e.off&&dateValue(e.date+"T23:59:59")>=Date.now()}).forEach(function(e){next.push({series:series,event:e,time:dateValue(e.date+"T20:30:00")})})
  });
  next.sort(function(a,b){return a.time-b.time});
  var n=next[0];
  if(n){
    $("#rcNextSeries").textContent=seriesLabel(n.series);
    $("#rcNextTrack").textContent=n.event.track||"Next HLRN Event";
    $("#rcNextMeta").textContent=shortDate(n.event.date)+" • "+(n.event.car||"")+" • "+(n.event.laps||"—")+" LAPS • 8:30 PM ET";
    $("#rcNextPreview").href="../race-preview/?league="+encodeURIComponent(n.series)
  }else{
    $("#rcNextSeries").textContent="SEASON STATUS";$("#rcNextTrack").textContent="SCHEDULE COMPLETE";$("#rcNextMeta").textContent="No future event is listed."
  }
}

function statBox(label,value){return '<div class="rc-report-stat"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>'}
function highlights(r){
  var st=reportStats(r),rows=[];
  if(st.biggest)rows.push({tag:"MOVE",name:st.biggest.name,meta:"Started P"+st.biggest.start+" • Finished P"+st.biggest.finish,val:(num(st.biggest.gain)>=0?"+":"")+fmt(st.biggest.gain)});
  if(st.pole)rows.push({tag:"POLE",name:st.pole.name,meta:"Started from P1",val:"P"+fmt(st.pole.finish)});
  var led=(r.results||[]).slice().sort(function(a,b){return num(b.lapsLed)-num(a.lapsLed)})[0];
  if(led)rows.push({tag:"LED",name:led.name,meta:"Most laps led",val:fmt(led.lapsLed)});
  return rows.length?'<div class="rc-highlight-list">'+rows.map(function(x){return '<div class="rc-highlight"><div class="tag">'+esc(x.tag)+'</div><div><strong>'+esc(x.name||"—")+'</strong><small>'+esc(x.meta||"")+'</small></div><b>'+esc(x.val||"—")+'</b></div>'}).join("")+'</div>':'<div class="rc-empty">No race highlights are available.</div>'
}
function optionalData(r){
  var blocks=[];
  if(Array.isArray(r.stageResults)&&r.stageResults.length)blocks.push("Stage results published");
  if(Array.isArray(r.cautions)&&r.cautions.length)blocks.push(r.cautions.length+" cautions recorded");
  if(Array.isArray(r.penalties)&&r.penalties.length)blocks.push(r.penalties.length+" penalties recorded");
  var msg=blocks.length?blocks.join(" • "):"Stage results, caution count, lead changes, penalties and incident causes are not available in the current published results source.";
  return '<div class="rc-data-note"><i></i><div><strong>Race Data Availability</strong><p>'+esc(msg)+'</p></div></div>'
}
function resultRows(r){
  var rows=(r.results||[]).slice().sort(function(a,b){return num(a.finish)-num(b.finish)});
  if(!rows.length)return '<tr><td colspan="9">No finishing order is available.</td></tr>';
  return rows.map(function(x){
    var gain=num(x.gain),gainClass=gain>0?"posgain":gain<0?"neg":"";
    return '<tr><td class="pos">P'+esc(x.finish==null?"—":x.finish)+'</td><td><a href="'+driverUrl(r.series,x)+'">'+esc(x.name||"Unknown Driver")+'</a></td><td>P'+esc(x.start==null?"—":x.start)+'</td><td class="gain '+gainClass+'">'+(gain>0?"+":"")+fmt(gain)+'</td><td>'+fmt(x.points)+'</td><td>'+fmt(x.lapsLed)+'</td><td>'+fmt(x.incidents)+'</td><td>'+esc(x.status||"—")+'</td></tr>'
  }).join("")
}
function openReport(r,push){
  if(!r)return;state.selected=r;
  var st=reportStats(r),event=scheduleEvent(r.series,r.raceNumber),winner=r.winner||{},pole=st.pole||{},big=st.biggest||{};
  $("#rcReportContent").innerHTML=
    '<div class="rc-report-hero '+esc(r.series)+'"><div class="rc-report-kicker">'+esc(seriesLabel(r.series))+' // WEEK '+esc(r.raceNumber)+' // FINAL RESULTS</div>'+
    '<h2>'+esc(r.track||"HLRN Race")+'</h2><p>'+esc(displayDate(r.date))+' • Winner: '+esc(winner.name||"—")+'</p>'+
    '<div class="rc-report-stats">'+
      statBox("Winner",winner.name||"—")+statBox("Pole",pole.name||"—")+statBox("Classified",fmt(r.classified))+statBox("Biggest Mover",big.name?((num(big.gain)>=0?"+":"")+fmt(big.gain)):"—")+statBox("Laps Led",fmt(st.lapsLed))+statBox("Car",event&&event.car||"—")+
    '</div></div>'+
    '<div class="rc-report-grid"><section class="rc-panel"><div class="rc-panel-head"><h3>Full Finishing Order</h3><span>'+fmt(r.classified)+' CLASSIFIED</span></div>'+
      '<div class="rc-table-shell"><table class="rc-table"><thead><tr><th>Finish</th><th>Driver</th><th>Start</th><th>+/-</th><th>Points</th><th>Laps Led</th><th>Inc</th><th>Status</th></tr></thead><tbody>'+resultRows(r)+'</tbody></table></div></section>'+
    '<aside class="rc-panel"><div class="rc-panel-head"><h3>Race Highlights</h3><span>PUBLISHED RESULTS</span></div>'+highlights(r)+optionalData(r)+
      '<div class="rc-hero-actions"><a class="rc-btn primary" href="../broadcasters/?league='+encodeURIComponent(r.series)+'">WATCH HLRN →</a><a class="rc-btn" href="../news/">NEWSROOM →</a></div></aside></div>';
  $("#rcDirectory").style.display="none";$("#rcReport").style.display="block";window.scrollTo({top:0,behavior:"smooth"});
  if(push!==false)updateUrl(r)
}
function closeReport(push){
  state.selected=null;$("#rcReport").style.display="none";$("#rcDirectory").style.display="block";hero(filteredReports()[0]);window.scrollTo({top:0,behavior:"smooth"});
  if(push!==false)updateUrl(null)
}

function recorderCard(item){
  var winner=item&&item.winner||{},raw=item&&item.rawUrl||item&&item.url||"";
  return '<article class="rc-recorder-card"><small>'+esc(item&&item.series||"HLRN")+' • FROZEN FINAL</small><strong>'+esc(item&&item.track||item&&item.sessionName||"Recorded Race")+'</strong><div style="margin-top:7px;font-size:8px;color:#909baa">Winner: '+esc(winner.name||"—")+'</div>'+(raw?'<a href="'+esc(raw)+'">OPEN RECORD →</a>':'')+'</article>'
}
function recorder(){
  var list=state.recaps||[];
  $("#rcRecorderState").textContent=list.length?list.length+" FROZEN RECORD"+(list.length===1?"":"S"):"RECORDER READY";
  $("#rcRecorderList").innerHTML=list.length?list.map(recorderCard).join(""):'<div class="rc-empty">No frozen race records have been published yet. When the Live Race Center recorder freezes a real race at checkered, it can appear here.</div>'
}
function setFilter(v,push){
  state.filter=v;setTabs();hero(filteredReports()[0]);archive();closeReport(false);
  if(push!==false)updateUrl(null)
}
function bind(){
  $$(".rc-tab").forEach(function(b){b.addEventListener("click",function(){setFilter(b.dataset.filter,true)})});
  $("#rcRaceGrid").addEventListener("click",function(e){var c=e.target.closest(".rc-race-card");if(!c)return;var r=state.reports.find(function(x){return x.key===c.dataset.race});openReport(r,true)});
  $("#rcBack").addEventListener("click",function(){closeReport(true)});
  window.addEventListener("popstate",function(){
    var p=new URLSearchParams(location.search),f=(p.get("league")||"all").toLowerCase();state.filter=["all","sunday","monday"].indexOf(f)>=0?f:"all";setTabs();hero(filteredReports()[0]);archive();
    var key=p.get("race"),r=key&&state.reports.find(function(x){return x.key===key});if(r)openReport(r,false);else closeReport(false)
  })
}

async function loadJson(url){
  var res=await fetch(url+"?v="+Date.now(),{cache:"no-store"});if(!res.ok)throw new Error(url+" "+res.status);return res.json()
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
    state.snapshot=loaded[0];state.reports=loaded[1]&&loaded[1].reports||[];state.schedule=loaded[2]||null;state.recaps=loaded[3]&&loaded[3].recaps||[];
    $("#rcUpdated").textContent=state.snapshot&&state.snapshot.generatedAt?"DATA "+new Date(state.snapshot.generatedAt).toLocaleString():"LIVE HLRN DATA";
    hero(filteredReports()[0]);archive();schedule();recorder();
    var raceKey=qs.get("race"),r=raceKey&&state.reports.find(function(x){return x.key===raceKey});if(r)openReport(r,false)
  }catch(err){
    console.error(err);$("#rcRaceGrid").innerHTML='<div class="rc-empty">HLRN result data is temporarily unavailable.</div>';$("#rcUpdated").textContent="DATA TEMPORARILY UNAVAILABLE"
  }
}
document.addEventListener("DOMContentLoaded",init);
})();