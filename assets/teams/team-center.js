(function(){
"use strict";

var PHOTO_BASE="https://hunterwelborn32-creator.github.io/HLRN-App/driver-photos/cutout/";
var PHOTO_ALIASES={ethanfonsecamoreno:"ethan-moreno",dylancjones:"dylan-jones",joshuamckinney:"josh-mckinney",jeremysjeffries:"jeremy-jeffries",ericpedleyhayden:"eric-hayden",randyschweitzerrsi:"randy-schweitzer",sebastianmicheals:"sebastian-michaels",vicenteguerrero:"vincente-guerrero",vicenteguerrero2:"vincente-guerrero",brianhebbard2:"brian-hebbard",brianhayes4:"brian-hayes",ryanwilson21:"ryan-wilson",timothytyler3:"timothy-tyler",matthewbrown49:"matthew-brown",matthewgraham20:"matthew-graham",nicholasbaumann2:"nicholas-baumann",grantwessley2:"grant-wessley",brycehinton2:"bryce-hinton"};
var params=new URLSearchParams(location.search);
var activeLeague=["sunday","monday"].indexOf((params.get("league")||"").toLowerCase())>=0?params.get("league").toLowerCase():"sunday";
var requestedTeam=params.get("team")||"";
var snapshot=null;

function q(s){return document.querySelector(s)}
function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function num(v){var n=Number(v);return Number.isFinite(n)?n:0}
function fmt(v,d){if(d==null)d=1;var n=Number(v);if(!Number.isFinite(n))return "—";return Math.abs(n-Math.round(n))<.0001?String(Math.round(n)):n.toFixed(d)}
function pretty(name){var s=String(name||"").trim();if(s.indexOf(",")>=0){var p=s.split(","),last=(p.shift()||"").trim().replace(/\d+$/,""),first=p.join(" ").trim();return(first+" "+last).trim()}return s.replace(/\d+$/,"").trim()}
function slug(v){return String(v||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function photo(name){var system=window.HLRNDrivers,rating=system&&system.verifiedIRating?system.verifiedIRating(name):0,shared=system&&system.displayPhotoUrl?system.displayPhotoUrl(name,rating,"cutout"):"";if(shared)return shared;var p=pretty(name),key=p.toLowerCase().replace(/[^a-z0-9]/g,""),s=PHOTO_ALIASES[key]||slug(p);return s?PHOTO_BASE+s+".webp":""}

function league(){return snapshot&&snapshot.leagues&&snapshot.leagues[activeLeague]||{drivers:[],teams:[],results:[],teamRosters:{}}}
function teams(){return (league().teams||[]).slice().sort(function(a,b){return num(a.rank)-num(b.rank)||num(b.points)-num(a.points)})}
function teamByName(name){var k=slug(name);return teams().find(function(t){return slug(t.team)===k})}
function drivers(){return league().drivers||[]}
function driverMap(){var m=new Map();drivers().forEach(function(d){m.set(String(d.driverId),d)});return m}
function roster(teamName){
  var rosters=league().teamRosters||{},keys=Object.keys(rosters),exact=keys.find(function(k){return slug(k)===slug(teamName)});
  if(exact&&Array.isArray(rosters[exact])&&rosters[exact].length)return rosters[exact];
  return drivers().filter(function(d){return slug(d.team)===slug(teamName)}).map(function(d){return{driverId:d.driverId,driver:d.driver}})
}
function rosterDrivers(teamName){
  var map=driverMap();
  return roster(teamName).map(function(r){
    return map.get(String(r.driverId))||drivers().find(function(d){return slug(pretty(d.driver))===slug(pretty(r.driver))})||{driverId:r.driverId,driver:r.driver}
  }).filter(Boolean)
}
function avgFinish(teamName){
  var ds=rosterDrivers(teamName).filter(function(d){return num(d.starts)>0&&Number.isFinite(Number(d.avgFinish))});
  var starts=ds.reduce(function(s,d){return s+num(d.starts)},0);if(!starts)return null;
  return ds.reduce(function(s,d){return s+num(d.avgFinish)*num(d.starts)},0)/starts
}
function bestDriver(teamName){return rosterDrivers(teamName).sort(function(a,b){return num(a.rank)-num(b.rank)||num(b.points)-num(a.points)})[0]||null}
function teamResults(teamName){
  var ids=new Set(rosterDrivers(teamName).map(function(d){return String(d.driverId)}));
  return (league().results||[]).filter(function(r){return ids.has(String(r.driverId))})
}
function recentForm(teamName,limit){
  if(limit==null)limit=4;
  var all=teamResults(teamName),raceNums=[];
  all.forEach(function(r){var n=num(r.raceNumber);if(n&&raceNums.indexOf(n)<0)raceNums.push(n)});
  raceNums.sort(function(a,b){return b-a});raceNums=raceNums.slice(0,limit);
  var dm=driverMap();
  return raceNums.map(function(raceNumber){
    var rows=all.filter(function(r){return num(r.raceNumber)===raceNumber}).sort(function(a,b){return num(a.finish)-num(b.finish)});
    var best=rows[0]||{},d=dm.get(String(best.driverId));
    return{raceNumber:raceNumber,track:best.track||("Race "+raceNumber),finish:num(best.finish)||null,driver:pretty(d&&d.driver||best.driver||"")}
  })
}
function formAvg(teamName){
  var f=recentForm(teamName,3).filter(function(x){return x.finish});if(!f.length)return null;
  return f.reduce(function(s,x){return s+x.finish},0)/f.length
}
function setLeagueUi(){
  document.body.classList.toggle("tc-monday",activeLeague==="monday");
  qa(".tc-tab").forEach(function(b){b.classList.toggle("active",b.dataset.league===activeLeague)})
}
function gapText(t,leader){var gap=num(leader&&leader.points)-num(t.points);return gap<=0?"LEADER":"-"+fmt(gap)}
function updateSummary(){
  var ts=teams(),leader=ts[0],ds=drivers(),allWins=ts.reduce(function(s,t){return s+num(t.wins)},0);
  q("#tcSummaryLeague").textContent=activeLeague==="sunday"?"SUNDAY NIGHT":"MONDAY NIGHT";
  q("#tcSummaryLeader").textContent=leader?leader.team:"NO DATA";
  q("#tcSummaryCopy").textContent=leader?fmt(leader.points)+" points • "+fmt(leader.wins)+" wins • championship P1":"Waiting for team standings data.";
  q("#tcSummaryTeams").textContent=ts.length;
  q("#tcSummaryDrivers").textContent=ds.filter(function(d){return d.team}).length;
  q("#tcSummaryWins").textContent=fmt(allWins);
  q("#tcUpdated").textContent=snapshot&&snapshot.generatedAt?"UPDATED "+new Date(snapshot.generatedAt).toLocaleString():"LIVE DATA"
}
function renderBoard(){
  var ts=teams(),leader=ts[0],best=leader?bestDriver(leader.team):null;
  q("#tcLeaderName").textContent=leader?leader.team:"NO TEAM DATA";
  q("#tcLeaderPoints").textContent=leader?fmt(leader.points)+" PTS":"—";
  q("#tcLeaderBest").textContent=best?pretty(best.driver):"—";
  q("#tcLeaderWins").textContent=leader?fmt(leader.wins):"—";
  q("#tcLeaderAvg").textContent=leader&&avgFinish(leader.team)!=null?fmt(avgFinish(leader.team),2):"—";
  q("#tcLeaderDrivers").textContent=leader?rosterDrivers(leader.team).length:"—";
  q("#tcTotalTeams").textContent=ts.length;
  q("#tcTotalDrivers").textContent=drivers().filter(function(d){return d.team}).length;
  var mostWins=ts.slice().sort(function(a,b){return num(b.wins)-num(a.wins)})[0];
  q("#tcMostWins").textContent=mostWins?mostWins.team:"—";
  var hot=ts.map(function(t){return{team:t,form:formAvg(t.team)}}).filter(function(x){return x.form!=null}).sort(function(a,b){return a.form-b.form})[0];
  q("#tcHotTeam").textContent=hot?hot.team.team:"—"
}
function teamCard(t,leader){
  var best=bestDriver(t.team),avg=avgFinish(t.team),form=formAvg(t.team),count=rosterDrivers(t.team).length;
  var bestName=best?pretty(best.driver):"—",bestMeta=best?("P"+esc(best.rank)+" • "+fmt(best.points)+" pts"):"Roster syncing";
  return '<button class="tc-team-card" type="button" data-team="'+esc(t.team)+'">'+
    '<div class="tc-team-band"></div><div class="tc-team-body">'+
    '<div class="tc-team-top"><div class="tc-team-rank">P'+esc(t.rank)+'</div><div class="tc-team-gap">TO LEADER<b>'+esc(gapText(t,leader))+'</b></div></div>'+
    '<div class="tc-team-name">'+esc(t.team)+'</div>'+
    '<div class="tc-team-points"><b>'+fmt(t.points)+'</b> TEAM POINTS</div>'+
    '<div class="tc-team-feature"><small>BEST-PERFORMING DRIVER</small><strong>'+esc(bestName)+'</strong><span>'+bestMeta+'</span></div>'+
    '<div class="tc-team-mini"><div><b>'+fmt(t.wins)+'</b><span>Wins</span></div><div><b>'+(avg==null?"—":fmt(avg,1))+'</b><span>Avg Fin</span></div><div><b>'+(form==null?"—":fmt(form,1))+'</b><span>Form</span></div><div><b>'+count+'</b><span>Drivers</span></div></div>'+
    '</div></button>'
}
function renderDirectory(){
  setLeagueUi();updateSummary();renderBoard();
  var ts=teams(),leader=ts[0];
  q("#tcStandingsTitle").textContent=(activeLeague==="sunday"?"Sunday":"Monday")+" Team Championship";
  q("#tcTeamGrid").innerHTML=ts.length?ts.map(function(t){return teamCard(t,leader)}).join(""):'<div class="tc-empty">No team championship data is available yet.</div>';
  q("#tcDirectory").style.display="block";q("#tcProfile").style.display="none";fillCompare()
}
function compareOptions(selected){
  return teams().map(function(t){return '<option value="'+esc(t.team)+'"'+(t.team===selected?' selected':'')+'>'+esc(t.team)+'</option>'}).join("")
}
function fillCompare(){
  var ts=teams();if(!ts.length)return;
  var a=q("#tcCompareA"),b=q("#tcCompareB"),oldA=a.value||ts[0].team,oldB=b.value||(ts[1]?ts[1].team:ts[0].team);
  a.innerHTML=compareOptions(oldA);b.innerHTML=compareOptions(oldB);
  if(!a.value)a.value=ts[0].team;if(!b.value)b.value=ts[1]?ts[1].team:ts[0].team;renderCompare()
}
function compareSide(t){
  if(!t)return '<div class="tc-compare-side"><h3>No Team</h3></div>';
  var best=bestDriver(t.team),avg=avgFinish(t.team),form=formAvg(t.team);
  var rows=[["Championship","P"+fmt(t.rank)],["Points",fmt(t.points)],["Wins",fmt(t.wins)],["Top 5",fmt(t.top5)],["Avg Finish",avg==null?"—":fmt(avg,2)],["Recent Form",form==null?"—":fmt(form,2)],["Stage Points",fmt(t.stagePoints)],["Laps Led",fmt(t.lapsLed)],["Best Driver",best?pretty(best.driver):"—"]];
  return '<div class="tc-compare-side"><h3>'+esc(t.team)+'</h3>'+rows.map(function(r){return '<div class="tc-compare-line"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>'}).join("")+'</div>'
}
function renderCompare(){q("#tcCompareGrid").innerHTML=compareSide(teamByName(q("#tcCompareA").value))+compareSide(teamByName(q("#tcCompareB").value))}
function driverCard(d){
  var name=pretty(d.driver),url=window.HLRNDrivers&&window.HLRNDrivers.profileUrl?window.HLRNDrivers.profileUrl({driverId:d.driverId,driver:name}):null;
  if(!url)url="../drivers/";
  return '<a class="tc-driver" href="'+esc(url)+'"><img src="'+esc(photo(name))+'" alt="" onerror="this.remove()"><div><strong>'+esc(name)+'</strong><span>P'+esc(d.rank==null?"—":d.rank)+' • <b>'+fmt(d.points)+' PTS</b> • '+fmt(d.wins)+' WINS</span></div></a>'
}
function profileForm(teamName){
  var f=recentForm(teamName,5);if(!f.length)return '<div class="tc-empty">Recent linked team results are not available yet.</div>';
  return '<div class="tc-form-list">'+f.map(function(x){return '<div class="tc-form-race"><div class="race">R'+x.raceNumber+'</div><div><strong>'+esc(x.track)+'</strong><small>'+esc(x.driver||"Best team finisher")+'</small></div><b>'+(x.finish?"P"+x.finish:"—")+'</b></div>'}).join("")+'</div>'
}
function profileRows(teamName){
  var dm=driverMap(),rows=teamResults(teamName).sort(function(a,b){return num(b.raceNumber)-num(a.raceNumber)||num(a.finish)-num(b.finish)}).slice(0,40);
  if(!rows.length)return '<tr><td colspan="8">No linked team race results are available yet.</td></tr>';
  return rows.map(function(r){var d=dm.get(String(r.driverId));return '<tr><td>R'+esc(r.raceNumber==null?"—":r.raceNumber)+'</td><td>'+esc(r.track||"—")+'</td><td>'+esc(pretty(d&&d.driver||r.driver||"Unknown Driver"))+'</td><td class="pos">P'+esc(r.finish==null?"—":r.finish)+'</td><td>'+esc(r.points==null?"—":r.points)+'</td><td>'+esc(r.lapsLed==null?"—":r.lapsLed)+'</td><td>'+esc(r.incidents==null?"—":r.incidents)+'</td><td>'+esc(r.status||"—")+'</td></tr>'}).join("")
}
function renderProfile(t){
  setLeagueUi();updateSummary();
  var rd=rosterDrivers(t.team),best=bestDriver(t.team),avg=avgFinish(t.team),form=formAvg(t.team);
  var rosterHtml=rd.length?rd.map(driverCard).join(""):'<div class="tc-empty">Roster data is still syncing.</div>';
  var html='<section class="tc-profile-hero"><div><div class="tc-profile-kicker">'+(activeLeague==="sunday"?"SUNDAY NIGHT LEAGUE":"MONDAY NIGHT LEAGUE")+' // TEAM PROFILE</div>'+
  '<div class="tc-profile-name">'+esc(t.team)+'</div><div class="tc-profile-copy">Championship <b>P'+esc(t.rank)+'</b> with <b>'+fmt(t.points)+' points</b>. Best-performing driver: <b>'+esc(best?pretty(best.driver):"—")+'</b>.</div></div>'+
  '<div class="tc-profile-stats"><div class="tc-profile-stat"><span>Wins</span><b>'+fmt(t.wins)+'</b></div><div class="tc-profile-stat"><span>Avg Finish</span><b>'+(avg==null?"—":fmt(avg,2))+'</b></div><div class="tc-profile-stat"><span>Recent Form</span><b>'+(form==null?"—":fmt(form,2))+'</b></div><div class="tc-profile-stat"><span>Stage Points</span><b>'+fmt(t.stagePoints)+'</b></div></div></section>'+
  '<section class="tc-section"><div class="tc-profile-columns"><div class="tc-panel"><div class="tc-panel-title"><h3>Driver Lineup</h3><span>'+rd.length+' DRIVERS</span></div><div class="tc-roster">'+rosterHtml+'</div></div>'+
  '<div class="tc-panel"><div class="tc-panel-title"><h3>Recent Form</h3><span>BEST TEAM FINISH</span></div>'+profileForm(t.team)+'</div></div></section>'+
  '<section class="tc-section"><div class="tc-section-head"><div><div class="tc-section-kicker">SEASON LOG</div><h2>Team Results</h2></div><span>'+fmt(t.lapsLed)+' LAPS LED • '+fmt(t.top5)+' TOP-5S • '+fmt(t.top10)+' TOP-10S</span></div>'+
  '<div class="tc-table-shell"><table class="tc-table"><thead><tr><th>Race</th><th>Track</th><th>Driver</th><th>Finish</th><th>Points</th><th>Laps Led</th><th>Inc</th><th>Status</th></tr></thead><tbody>'+profileRows(t.team)+'</tbody></table></div></section>';
  q("#tcProfileContent").innerHTML=html;q("#tcDirectory").style.display="none";q("#tcProfile").style.display="block";window.scrollTo({top:0,behavior:"smooth"})
}
function openTeam(name,push){
  if(push==null)push=true;var t=teamByName(name);if(!t)return;requestedTeam=t.team;renderProfile(t);
  if(push){var p=new URLSearchParams({league:activeLeague,team:t.team});history.pushState({team:true},"","?"+p.toString())}
}
function setLeague(v,push){if(push==null)push=true;activeLeague=v;requestedTeam="";renderDirectory();if(push)history.pushState({team:false},"","?league="+encodeURIComponent(v))}
function bind(){
  qa(".tc-tab").forEach(function(b){b.addEventListener("click",function(){setLeague(b.dataset.league)})});
  q("#tcTeamGrid").addEventListener("click",function(e){var c=e.target.closest(".tc-team-card");if(c)openTeam(c.dataset.team)});
  q("#tcBack").addEventListener("click",function(){setLeague(activeLeague)});
  q("#tcCompareA").addEventListener("change",renderCompare);q("#tcCompareB").addEventListener("change",renderCompare);
  window.addEventListener("popstate",function(){var p=new URLSearchParams(location.search);activeLeague=["sunday","monday"].indexOf(p.get("league"))>=0?p.get("league"):"sunday";requestedTeam=p.get("team")||"";var t=requestedTeam&&teamByName(requestedTeam);if(t)renderProfile(t);else renderDirectory()})
}
async function init(){
  bind();
  try{if(window.HLRNDrivers?.load)await window.HLRNDrivers.load();snapshot=await HLRNData.load();setLeagueUi();updateSummary();var t=requestedTeam&&teamByName(requestedTeam);if(t)renderProfile(t);else renderDirectory()}
  catch(err){console.error(err);q("#tcTeamGrid").innerHTML='<div class="tc-empty">HLRN team data could not be loaded right now.</div>';q("#tcUpdated").textContent="DATA TEMPORARILY UNAVAILABLE"}
}
document.addEventListener("DOMContentLoaded",init);
})();