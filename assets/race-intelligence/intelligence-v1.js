/* HLRN Race Intelligence script block 3 */
const INTELLIGENCE_DATA_SOURCE = "HLRN shared snapshot";

let currentLeague = "sunday";
let drivers = [];
let results = [];
let analytics = [];
let categories = [];
let selectedCategoryKey = "favorite";
let loadRequestId = 0;
const AUTO_REFRESH_MS = 60 * 1000;
const raceCompletionState = {
  sunday:{initialized:false,lastCompletedRace:0,signature:""},
  monday:{initialized:false,lastCompletedRace:0,signature:""}
};
let raceUpdateTimer = null;

/* HLRN drivers intentionally excluded from Race Intelligence. */
const EXCLUDED_DRIVERS = [
  "trace mcdowell",
  "benjamin richards", // TEMPORARILY INACTIVE — out for the remainder of the season
  "sebastian micheals" // TEMPORARILY INACTIVE — out for the remainder of the season
];

function normalizeDriverName(name){
  return String(name || "").trim().toLowerCase().replace(/\s+/g," ");
}

function isExcludedDriverName(name){
  const normalized = normalizeDriverName(formatDriverName(name));
  return EXCLUDED_DRIVERS.some(excluded => normalized === normalizeDriverName(formatDriverName(excluded)));
}

const categoryConfig = [
  {key:"favorite", title:"Favorite", icon:"★", tag:"Overall Pick", accent:"rgba(239,37,37,.24)"},
  {key:"hot", title:"Hot Driver", icon:"🔥", tag:"Momentum", accent:"rgba(255,122,39,.24)"},
  {key:"sleeper", title:"Sleeper", icon:"🌙", tag:"Under The Radar", accent:"rgba(86,164,255,.20)"},
  {key:"consistent", title:"Most Consistent", icon:"◎", tag:"Steady Hand", accent:"rgba(56,212,123,.20)"},
  {key:"mover", title:"Biggest Mover", icon:"↗", tag:"Racecraft", accent:"rgba(56,212,123,.20)"},
  {key:"recentWinner", title:"Most Recent Winner", icon:"🏁", tag:"Latest Winner", accent:"rgba(241,200,75,.23)"},
  {key:"trouble", title:"Trouble Watch", icon:"⚠", tag:"Risk Signal", accent:"rgba(239,37,37,.21)"},
  {key:"bounce", title:"Needs A Bounce Back", icon:"↻", tag:"Recovery Watch", accent:"rgba(162,119,255,.20)"},
  {key:"darkHorse", title:"Dark Horse", icon:"♞", tag:"Upset Potential", accent:"rgba(162,119,255,.20)"},
  {key:"watch", title:"Driver To Watch", icon:"👁", tag:"Trending", accent:"rgba(86,164,255,.20)"}
];

function number(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round(v,d=1){
  const m = Math.pow(10,d);
  return Math.round(number(v)*m)/m;
}

function avg(arr){
  const nums = arr.map(number).filter(n=>Number.isFinite(n));
  return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
}

function stddev(arr){
  if(!arr.length) return 0;
  const a = avg(arr);
  return Math.sqrt(avg(arr.map(v=>Math.pow(number(v)-a,2))));
}

function pct(n,d){
  return d > 0 ? (n/d)*100 : 0;
}

function esc(s){
  return String(s ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function formatDriverName(name){
  const raw = String(name || "").trim();
  if(!raw) return "Unknown Driver";

  if(raw.includes(",")){
    const parts = raw.split(",").map(p=>p.trim()).filter(Boolean);
    if(parts.length >= 2){
      return parts.slice(1).join(" ") + " " + parts[0];
    }
  }

  return raw;
}


/* HLRN DRIVER IDENTITY + SHARED DATA */
function hLrnDriverIdentity(driverOrName){
  return window.HLRNDrivers?.resolve?.(driverOrName) || null;
}

function hLrnPhotoSlug(driverOrName){
  const rec=hLrnDriverIdentity(driverOrName);
  let slug=String(
    rec?.photoSlug ||
    (driverOrName && typeof driverOrName==="object" ? driverOrName.photoSlug : "") ||
    ""
  ).trim();

  if(!slug){
    const raw=typeof driverOrName==="string"
      ? formatDriverName(driverOrName)
      : formatDriverName(driverOrName?.name || driverOrName?.driver || "");
    slug=String(raw||"")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }

  const fixes={
    "aaron-treubig":"aaron-truebig",
    "david-durand-jr":"david-durand",
    "zach-harry":"zack-harry"
  };
  return fixes[slug] || slug;
}

function hLrnDriverPhoto(driverOrName,type="full"){
  const slug=hLrnPhotoSlug(driverOrName);
  if(!slug) return "";

  if(String(type||"full").toLowerCase()==="full"){
    return "/assets/driver-photos/full/"+encodeURIComponent(slug)+".webp";
  }

  return "/assets/driver-photos/full/"+encodeURIComponent(slug)+".webp";
}

function hLrnDriverProfileUrl(driverOrName){
  return window.HLRNDrivers?.profileUrl?.(driverOrName) || "../drivers/";
}

function hLrnDriverNameMarkup(driverOrName,label){
  const name=label || (typeof driverOrName==="string"
    ? formatDriverName(driverOrName)
    : formatDriverName(driverOrName?.name || driverOrName?.driver || "Driver"));
  const url=driverOrName?.profileUrl || hLrnDriverProfileUrl(driverOrName);
  return `<a data-hlrn-ri-profile="1" href="${esc(url)}" style="color:inherit;text-decoration:none">${esc(name)}</a>`;
}

function hLrnStoryTitleMarkup(story){
  const name=String(story?.driver?.name||"").trim();
  const title=String(story?.title||"").trim();
  if(!name || !title.startsWith(name)) return esc(title);
  return hLrnDriverNameMarkup(story.driver,name)+esc(title.slice(name.length));
}

function hLrnPhotoMarkup(driverOrName,type,className){
  const src = hLrnDriverPhoto(driverOrName,type);
  if(!src) return "";
  const rec=hLrnDriverIdentity(driverOrName);
  const name = rec?.displayName || (typeof driverOrName === "string"
    ? formatDriverName(driverOrName)
    : formatDriverName(driverOrName?.name || driverOrName?.driver || "Driver"));
  return `<img class="${className}" src="${esc(src)}" alt="${esc(name)}" loading="lazy" decoding="async" onerror="this.style.display='none'">`;
}

function hLrnDriverPhotoMarkup(driverOrName,className){
  return hLrnPhotoMarkup(driverOrName,"full",className);
}

async function sharedLeagueData(league){
  if(!window.HLRNData?.load){
    throw new Error("HLRN shared data system is unavailable.");
  }
  const tasks=[window.HLRNData.load()];
  if(window.HLRNDrivers?.load) tasks.push(window.HLRNDrivers.load());
  const loaded=await Promise.all(tasks);
  const snapshot=loaded[0];
  const block=snapshot?.leagues?.[league];
  if(!block || !Array.isArray(block.drivers) || !Array.isArray(block.results)){
    throw new Error("HLRN "+league+" league data is unavailable.");
  }
  return {
    drivers:block.drivers,
    results:block.results,
    generatedAt:snapshot.generatedAt || null
  };
}

function sharedDataTimeLabel(value){
  if(!value) return "Shared HLRN Data";
  const d=new Date(value);
  if(!Number.isFinite(d.getTime())) return "Shared HLRN Data";
  try{
    return "Updated "+new Intl.DateTimeFormat("en-US",{
      timeZone:"America/New_York",
      month:"short",day:"numeric",hour:"numeric",minute:"2-digit"
    }).format(d)+" ET";
  }catch(_){
    return "Updated "+d.toLocaleString();
  }
}

function latestCompletedRaceInfo(list){
  const finished=(Array.isArray(list)?list:[]).filter(r=>number(r.raceNumber)>0 && number(r.finish)>0);
  if(!finished.length) return {raceNumber:0,winner:null,track:"",fieldSize:0,signature:""};

  const raceNumbers=[...new Set(finished.map(r=>number(r.raceNumber)).filter(Boolean))].sort((a,b)=>b-a);
  for(const raceNumber of raceNumbers){
    const rows=finished.filter(r=>number(r.raceNumber)===raceNumber);
    const winnerRow=rows.find(r=>number(r.finish)===1);
    if(!winnerRow) continue;

    const winnerId=String(winnerRow?.driverId ?? winnerRow?.id ?? "");
    const winnerDriver=analytics.find(d=>String(d.id)===winnerId);
    const winnerName=winnerDriver?.name || formatDriverName(winnerRow?.driver || winnerRow?.name || winnerRow?.displayName || "");
    const track=winnerRow?.track || rows[0]?.track || "";
    return {
      raceNumber,
      winner:winnerName && winnerName!=="Unknown Driver" ? winnerName : null,
      track,
      fieldSize:rows.length,
      signature:[raceNumber,winnerId,winnerName,track,rows.length].join("|")
    };
  }
  return {raceNumber:0,winner:null,track:"",fieldSize:0,signature:""};
}

function processRaceCompletion(league,info){
  const state=raceCompletionState[league] || (raceCompletionState[league]={initialized:false,lastCompletedRace:0,signature:""});
  if(!state.initialized){
    state.initialized=true;
    state.lastCompletedRace=info.raceNumber || 0;
    state.signature=info.signature || "";
    return false;
  }

  const newRace=info.raceNumber>0 && info.raceNumber>state.lastCompletedRace;
  if(info.raceNumber>=state.lastCompletedRace){
    state.lastCompletedRace=Math.max(state.lastCompletedRace,info.raceNumber || 0);
    state.signature=info.signature || state.signature;
  }
  return newRace;
}

function showRaceProcessedNotice(league,info){
  const box=document.getElementById("riRaceUpdate");
  const title=document.getElementById("riRaceUpdateTitle");
  const text=document.getElementById("riRaceUpdateText");
  if(!box || !title || !text) return;

  const leagueName=league==="monday" ? "Monday" : "Sunday";
  const winner=info.winner ? ` Winner: ${info.winner}.` : "";
  const track=info.track ? ` ${info.track}.` : "";
  title.textContent=`${leagueName} Race ${info.raceNumber} Processed`;
  text.textContent=`The new race is final.${winner}${track} Rankings, momentum, risk signals, favorites, deep dives and League Storylines have all been recalculated.`;
  box.classList.add("show");
  clearTimeout(raceUpdateTimer);
  raceUpdateTimer=setTimeout(()=>box.classList.remove("show"),18000);
}

function setAutoSyncStatus(text,state="ok"){
  const box=document.getElementById("riAutoSync");
  const label=document.getElementById("riAutoSyncText");
  if(label) label.textContent=text;
  if(box){
    box.classList.toggle("syncing",state==="syncing");
    box.classList.toggle("warn",state==="warn");
  }
}

function currentTimeLabel(){
  try{return new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});}
  catch(e){return "just now";}
}

async function loadLeague(league,options={}){
  const silent=!!options.silent;
  const requestId=++loadRequestId;
  currentLeague = league;
  if(!silent) setLoading(true);
  hideError();
  if(options.auto) setAutoSyncStatus("Checking Results…","syncing");

  document.querySelectorAll(".league-btn").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.league===league);
  });

  document.getElementById("leagueBadge").textContent =
    league === "monday" ? "Monday League" : "Sunday League";

  try{
    const shared = await sharedLeagueData(league);

    if(requestId!==loadRequestId) return;

    const rawDrivers = Array.isArray(shared.drivers) ? shared.drivers : [];
    const rawResults = Array.isArray(shared.results) ? shared.results : [];

    /* Remove banned / excluded drivers from the intelligence model itself. */
    const excludedDriverIds = new Set(
      rawDrivers
        .filter(d => isExcludedDriverName(d?.driver ?? d?.name ?? d?.displayName ?? d?.display_name ?? ""))
        .map(d => String(d?.driverId ?? d?.id ?? ""))
        .filter(Boolean)
    );

    drivers = rawDrivers.filter(d => !isExcludedDriverName(d?.driver ?? d?.name ?? d?.displayName ?? d?.display_name ?? ""));
    results = rawResults.filter(r => !excludedDriverIds.has(String(r?.driverId ?? r?.id ?? "")));

    buildAnalytics();
    chooseCategories();
    renderBoard();
    renderStorylines();
    if(window.HLRN_V3_SYNC) window.HLRN_V3_SYNC();

    const completion=latestCompletedRaceInfo(results);
    const isNewCompletedRace=processRaceCompletion(league,completion);
    const maxRace = results.reduce((m,r)=>Math.max(m,number(r.raceNumber)),0);
    document.getElementById("raceBadge").textContent =
      maxRace ? "Through Race " + maxRace : "Waiting For Results";

    document.getElementById("liveText").textContent =
      sharedDataTimeLabel(shared.generatedAt) + " • Auto 60s";

    const preferred = categories.find(c=>c.key===selectedCategoryKey) || categories.find(c=>c.key==="favorite") || categories[0];
    if(preferred){
      selectedCategoryKey=preferred.key;
      showDriver(preferred);
      showCategoryDeepDive(preferred);
      const selectedCard=document.querySelector(`.intel-card[data-key="${preferred.key}"]`);
      if(selectedCard) selectedCard.classList.add("selected");
    }

    if(isNewCompletedRace){
      showRaceProcessedNotice(league,completion);
    }
    setAutoSyncStatus("Auto • Checked " + currentTimeLabel(),"ok");

  }catch(err){
    if(options.silent){
      console.warn("HLRN Race Intelligence auto-sync failed:",err);
      setAutoSyncStatus("Auto Sync • Retry Next Minute","warn");
    }else{
      showError(err.message || "Unable to load HLRN data.");
      document.getElementById("intelGrid").innerHTML = "";
      document.getElementById("detailWrap").style.display = "none";
      setAutoSyncStatus("Auto Sync • Waiting","warn");
    }
  }finally{
    if(!silent && requestId===loadRequestId) setLoading(false);
  }
}

function buildAnalytics(){
  const resultsByDriver = {};

  results.forEach(r=>{
    const id = String(r.driverId ?? "");
    if(!id) return;
    if(!resultsByDriver[id]) resultsByDriver[id] = [];
    resultsByDriver[id].push({
      ...r,
      start:number(r.start),
      finish:number(r.finish),
      positionGain:
        r.positionGain !== undefined
          ? number(r.positionGain)
          : ((number(r.start)>0 && number(r.finish)>0) ? number(r.start)-number(r.finish) : 0),
      points:number(r.points),
      lapsLed:number(r.lapsLed),
      incidents:number(r.incidents),
      raceNumber:number(r.raceNumber)
    });
  });

  Object.values(resultsByDriver).forEach(list=>{
    list.sort((a,b)=>a.raceNumber-b.raceNumber);
  });

  function weightedRecent(list,key,fallback=0){
    const vals=list.slice(-5).map(x=>number(x[key])).filter(v=>Number.isFinite(v) && v>=0);
    if(!vals.length) return fallback;
    const base=[.10,.12,.16,.24,.38].slice(-vals.length);
    const sum=base.reduce((a,b)=>a+b,0) || 1;
    return vals.reduce((acc,v,i)=>acc+v*base[i],0)/sum;
  }

  analytics = drivers.map(d=>{
    const id = String(d.driverId ?? "");
    const races = resultsByDriver[id] || [];
    const completed = races.filter(r=>r.finish>0);
    const recent = completed.slice(-3);
    const lastFive = completed.slice(-5);
    const latest = completed[completed.length-1] || null;

    const finishes = completed.map(r=>r.finish);
    const seasonAvgFinish =
      number(d.avgFinish) > 0 ? number(d.avgFinish) : avg(finishes);
    const recentAvgFinish = recent.length ? avg(recent.map(r=>r.finish)) : seasonAvgFinish;
    const weightedRecentFinish = weightedRecent(lastFive,"finish",recentAvgFinish || seasonAvgFinish);
    const avgStart = completed.length ? avg(completed.map(r=>r.start).filter(v=>v>0)) : 0;
    const avgGain = completed.length ? avg(completed.map(r=>r.positionGain)) : 0;
    const recentGain = recent.length ? avg(recent.map(r=>r.positionGain)) : avgGain;
    const weightedGain = weightedRecent(lastFive,"positionGain",recentGain || avgGain);
    const avgInc = completed.length ? avg(completed.map(r=>r.incidents)) : 0;
    const recentInc = recent.length ? avg(recent.map(r=>r.incidents)) : avgInc;
    const weightedInc = weightedRecent(lastFive,"incidents",recentInc || avgInc);
    const consistencyRaw = stddev(lastFive.length>=2 ? lastFive.map(r=>r.finish) : finishes);
    const consistency = Math.max(0,Math.min(100,100-(consistencyRaw*7.25)));

    const starts = Math.max(number(d.starts),number(d.races),completed.length);
    const wins = number(d.wins) || completed.filter(r=>r.finish===1).length;
    const top5 = number(d.top5) || completed.filter(r=>r.finish>0 && r.finish<=5).length;
    const top10 = number(d.top10) || completed.filter(r=>r.finish>0 && r.finish<=10).length;
    const podiums = completed.filter(r=>r.finish>0 && r.finish<=3).length;

    const improvement =
      seasonAvgFinish > 0 && weightedRecentFinish > 0
        ? seasonAvgFinish - weightedRecentFinish
        : 0;

    const rankScore = number(d.rank)>0 ? Math.max(0,100-(number(d.rank)-1)*5.4) : 45;
    const finishScore = seasonAvgFinish>0 ? Math.max(0,100-(seasonAvgFinish-1)*3.6) : 38;
    const recentScore = weightedRecentFinish>0 ? Math.max(0,100-(weightedRecentFinish-1)*4.2) : finishScore;
    const winRate = pct(wins,Math.max(1,starts));
    const top5Rate = pct(top5,Math.max(1,starts));
    const top10Rate = pct(top10,Math.max(1,starts));
    const podiumRate = pct(podiums,Math.max(1,starts));
    const winScore = Math.min(100,winRate*5.0);
    const gainScore = Math.max(0,Math.min(100,50+(weightedGain*8.0)));
    const cleanScore = Math.max(0,Math.min(100,100-(weightedInc*6.2)));

    /* Model V3.8: more weight on current form while stabilizing small samples. */
    const rawOverall =
      rankScore*.12 +
      finishScore*.13 +
      recentScore*.24 +
      winScore*.12 +
      top5Rate*.10 +
      top10Rate*.07 +
      gainScore*.07 +
      cleanScore*.07 +
      consistency*.08;

    const sampleStrength = Math.max(0,Math.min(1,completed.length/7));
    const reliability = .58 + sampleStrength*.42;
    const overall = 50 + (rawOverall-50)*reliability;

    const trendScore =
      improvement*10 +
      weightedGain*5 +
      (lastFive.length ? Math.max(0,14-weightedRecentFinish)*1.25 : 0) +
      (lastFive.some(r=>r.finish===1) ? 16 : 0) +
      (lastFive.filter(r=>r.finish<=5).length*3.5) -
      Math.max(0,weightedInc-avgInc)*2.5;

    const dataCompleteness = Math.min(100,(completed.length/6)*100);
    const modelConfidence = Math.max(25,Math.min(99.5,
      dataCompleteness*.42 + consistency*.20 + cleanScore*.16 + Math.min(100,lastFive.length*20)*.22
    ));

    const displayName=formatDriverName(d.driver || d.name || "Unknown Driver");
    const identity=hLrnDriverIdentity({driverId:id,driver:displayName});
    return {
      ...d,
      id,
      name:identity?.displayName || displayName,
      profileUrl:identity?.url || hLrnDriverProfileUrl({driverId:id,driver:displayName}),
      photoSlug:identity?.photoSlug || d.photoSlug || "",
      rank:number(d.rank),
      starts,
      wins,
      top5,
      top10,
      podiums,
      points:number(d.points),
      races:completed,
      recent,
      latest,
      seasonAvgFinish,
      recentAvgFinish,
      weightedRecentFinish,
      avgStart,
      avgGain,
      recentGain,
      weightedGain,
      avgInc,
      recentInc,
      weightedInc,
      consistency,
      improvement,
      overall,
      rawOverall,
      trendScore,
      modelConfidence,
      sampleStrength,
      top5Rate,
      top10Rate,
      podiumRate,
      winRate,
      /* Compatibility aliases used by the command-deck enhancement. */
      avgFinish:seasonAvgFinish,
      recentAvg:weightedRecentFinish
    };
  }).filter(d => d.name && d.name !== "Unknown Driver" && !isExcludedDriverName(d.name));

  /* Convert raw rating separation into a field-relative model share. */
  if(analytics.length){
    const maxScore=Math.max(...analytics.map(d=>number(d.overall)));
    const exps=analytics.map(d=>Math.exp((number(d.overall)-maxScore)/7.5));
    const total=exps.reduce((a,b)=>a+b,0) || 1;
    analytics.forEach((d,i)=>{
      d.modelShare=(exps[i]/total)*100;
    });
  }
}

function validDrivers(minRaces=1){
  let list = analytics.filter(d=>d.races.length>=minRaces);
  if(!list.length && minRaces>1) list = analytics.filter(d=>d.races.length>=1);
  if(!list.length) list = analytics;
  return list;
}

function maxBy(list,fn){
  return list.reduce((best,x)=>!best || fn(x)>fn(best) ? x : best,null);
}

function minBy(list,fn){
  return list.reduce((best,x)=>!best || fn(x)<fn(best) ? x : best,null);
}

function chooseCategories(){
  const all = validDrivers(1);
  const experienced = validDrivers(3);
  const multiRace = validDrivers(2);

  if(!all.length){
    categories = [];
    return;
  }

  const favorite = maxBy(all,d=>d.overall);

  const hotPool = multiRace.length ? multiRace : all;
  const hot = maxBy(hotPool,d=>
    d.trendScore +
    Math.max(0,15-d.recentAvgFinish)*3 +
    d.winRate*.35
  );

  let sleeperPool = all.filter(d=>d.rank>=6 && d.races.length>=2);
  if(!sleeperPool.length) sleeperPool = all.filter(d=>d.rank>=4);
  if(!sleeperPool.length) sleeperPool = all;
  const sleeper = maxBy(sleeperPool,d=>
    d.improvement*12 +
    d.recentGain*5 +
    d.top10Rate*.35 +
    Math.max(0,18-d.recentAvgFinish)*2
  );

  const consistent = maxBy(experienced.length ? experienced : multiRace,d=>
    d.consistency +
    Math.max(0,18-d.seasonAvgFinish)*2
  );

  const mover = maxBy(multiRace,d=>
    d.recentGain*7 + d.avgGain*4 + d.top10Rate*.15
  );

  const latestRaceNo = results.reduce((m,r)=>Math.max(m,number(r.raceNumber)),0);
  const latestRaceResults = results.filter(r=>number(r.raceNumber)===latestRaceNo && number(r.finish)>0);
  const latestWinnerResult =
    latestRaceResults.find(r=>number(r.finish)===1) ||
    latestRaceResults.slice().sort((a,b)=>number(a.finish)-number(b.finish))[0] ||
    null;
  const recentWinner =
    latestWinnerResult
      ? analytics.find(d=>d.id===String(latestWinnerResult.driverId)) || favorite
      : favorite;

  const trouble = maxBy(multiRace,d=>
    d.recentInc*8 +
    d.avgInc*4 +
    Math.max(0,d.recentAvgFinish-d.seasonAvgFinish)*3
  );

  let bouncePool = all.filter(d=>d.latest && d.latest.finish>0);
  const bounce = maxBy(bouncePool,d=>
    (d.latest.finish-d.seasonAvgFinish)*6 +
    Math.max(0,d.latest.incidents-4)*2 -
    d.overall*.08
  );

  let darkPool = all.filter(d=>d.rank>=6 && d.races.length>=2);
  if(!darkPool.length) darkPool = all.filter(d=>d.rank>=4);
  if(!darkPool.length) darkPool = all;
  const darkHorse = maxBy(darkPool,d=>
    d.top10Rate*.42 +
    d.avgGain*5 +
    d.consistency*.25 +
    Math.max(0,15-d.recentAvgFinish)*2
  );

  const watchPool = all.filter(d=>!hot || d.id!==hot.id);
  const watch = maxBy(watchPool.length ? watchPool : all,d=>
    d.trendScore*1.4 +
    d.recentGain*5 +
    d.consistency*.25 +
    d.overall*.25
  );

  categories = [
    makeCategory("favorite",favorite,
      "Best overall blend of points position, finishing speed, recent form and racecraft.",
      "Rating " + Math.round(favorite?.overall || 0)),
    makeCategory("hot",hot,
      hot?.improvement>0
        ? "Recent finishes are " + round(hot.improvement,1) + " spots better than the season average."
        : "One of the strongest recent performers in the field.",
      "Recent Avg " + formatFinish(hot?.recentAvgFinish)),
    makeCategory("sleeper",sleeper,
      "Running better than the championship position suggests and showing upside in recent races.",
      "Rank #" + (sleeper?.rank || "—")),
    makeCategory("consistent",consistent,
      "The tightest finish spread among established drivers, with reliable week-to-week results.",
      "Consistency " + Math.round(consistent?.consistency || 0)),
    makeCategory("mover",mover,
      "Best average forward progress from starting position to finishing position.",
      signed(mover?.recentGain ?? mover?.avgGain) + " spots"),
    makeCategory("recentWinner",recentWinner,
      latestWinnerResult && number(latestWinnerResult.finish)===1
        ? "Winner of the most recently completed HLRN race."
        : "No winner was found in the latest data, so this shows the best latest finisher.",
      latestWinnerResult ? "Race " + number(latestWinnerResult.raceNumber) : "Latest Result"),
    makeCategory("trouble",trouble,
      "Recent incidents and finishing drop-off put this driver on the risk radar.",
      round(trouble?.recentInc,1) + " avg inc"),
    makeCategory("bounce",bounce,
      bounce?.latest
        ? "Last result was " + round(Math.max(0,bounce.latest.finish-bounce.seasonAvgFinish),1) + " spots worse than the season average."
        : "Recent results suggest a rebound opportunity.",
      bounce?.latest ? "Last: P" + bounce.latest.finish : "Bounce Watch"),
    makeCategory("darkHorse",darkHorse,
      "Outside the obvious favorites but combines top-10 ability, racecraft and consistency.",
      round(darkHorse?.top10Rate,0) + "% Top 10"),
    makeCategory("watch",watch,
      "Momentum, position gain and consistency make this driver one to monitor next race.",
      "Trend " + trendLabel(watch))
  ].filter(c=>c.driver);
}

function makeCategory(key,driver,reason,stat){
  return {key,driver,reason,stat};
}

function formatFinish(v){
  return number(v)>0 ? "P"+round(v,1) : "—";
}

function signed(v){
  const n=round(v,1);
  return (n>0?"+":"") + n;
}

function trendLabel(d){
  if(!d) return "—";
  if(d.improvement>=2 || d.trendScore>=20) return "Heating Up";
  if(d.improvement<=-2) return "Cooling Off";
  return "Steady";
}

function renderBoard(){
  const grid = document.getElementById("intelGrid");

  if(!categories.length){
    grid.innerHTML = '<div class="loading show" style="grid-column:1/-1">No completed race results are available yet.</div>';
    return;
  }

  grid.innerHTML = categories.map(cat=>{
    const cfg = categoryConfig.find(x=>x.key===cat.key);
    return `
      <article class="intel-card" data-key="${esc(cat.key)}" style="--card-accent:${cfg.accent}">
        <div class="card-top">
          ${hLrnPhotoMarkup(cat.driver,"full","hlrn-card-full-photo")}
          <div class="card-icon">${cfg.icon}</div>
          <div class="card-tag">${esc(cfg.tag)}</div>
        </div>
                <div class="card-title">${esc(cfg.title)}</div>
        <div class="card-driver">${hLrnDriverNameMarkup(cat.driver)}</div>
        <div class="card-reason">${esc(cat.reason)}</div>
        <div class="card-stat">${esc(cat.stat)}</div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".intel-card").forEach(card=>{
    card.setAttribute("role","button");
    card.setAttribute("tabindex","0");
    const openCard=()=>{
      const cat=categories.find(c=>c.key===card.dataset.key);
      if(cat){
        selectedCategoryKey=cat.key;
        grid.querySelectorAll(".intel-card").forEach(x=>x.classList.remove("selected"));
        card.classList.add("selected");
        showDriver(cat);
        showCategoryDeepDive(cat);
      }
    };
    card.addEventListener("click",e=>{ if(e.target.closest("a")) return; openCard(); });
    card.addEventListener("keydown",e=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        openCard();
      }
    });
  });
}


function renderStorylines(){
  const grid = document.getElementById("storyGrid");
  const label = document.getElementById("storyLeagueLabel");
  label.textContent = currentLeague === "monday" ? "Monday League" : "Sunday League";

  const all = validDrivers(1);
  if(!all.length){
    grid.innerHTML = '<div class="loading show" style="grid-column:1/-1">Storylines will appear once race results are available.</div>';
    return;
  }

  const sortedRank = all.slice().filter(d=>d.rank>0).sort((a,b)=>a.rank-b.rank);
  const leader = sortedRank[0] || maxBy(all,d=>d.points);
  const second = sortedRank[1] || null;
  const hot = categories.find(c=>c.key==="hot")?.driver || null;
  const mover = categories.find(c=>c.key==="mover")?.driver || null;
  const trouble = categories.find(c=>c.key==="trouble")?.driver || null;
  const bounce = categories.find(c=>c.key==="bounce")?.driver || null;
  const darkHorse = categories.find(c=>c.key==="darkHorse")?.driver || null;
  const recentWinner = categories.find(c=>c.key==="recentWinner")?.driver || null;

  const stories = [];

  if(leader){
    let title = leader.name + " leads the charge";
    let body = "The championship leader is setting the benchmark right now.";
    let stat = leader.rank ? "Championship Rank #"+leader.rank : leader.points+" pts";

    if(second && number(leader.points)>0 && number(second.points)>0){
      const gap = Math.abs(number(leader.points)-number(second.points));
      body = gap <= 20
        ? "The title fight is tight, with only "+round(gap,0)+" points separating the top two."
        : "The current leader has built a "+round(gap,0)+"-point cushion over second place.";
      stat = round(gap,0)+" pt gap";
    }
    stories.push({kicker:"Championship",title,body,stat,driver:leader});
  }

  if(recentWinner){
    const latest = recentWinner.latest;
    stories.push({
      kicker:"Last Race",
      driver:recentWinner,
      title:recentWinner.name + " carries winner momentum",
      body:"The most recent winner enters the next round with the freshest victory in the field.",
      stat: latest ? "Last finish P"+latest.finish : "Recent winner"
    });
  }

  if(hot){
    stories.push({
      kicker:"Momentum",
      driver:hot,
      title:hot.name + " is heating up",
      body: hot.improvement > 0
        ? "Recent finishes are "+round(hot.improvement,1)+" spots better than the season average."
        : "Recent form has this driver trending toward the front.",
      stat:"Recent Avg "+formatFinish(hot.recentAvgFinish)
    });
  }

  if(mover){
    stories.push({
      kicker:"Racecraft",
      driver:mover,
      title:mover.name + " keeps moving forward",
      body:"This driver is gaining more ground from start to finish than nearly anyone else right now.",
      stat:signed(mover.recentGain || mover.avgGain)+" avg gain"
    });
  }

  if(trouble){
    stories.push({
      kicker:"Trouble Watch",
      driver:trouble,
      title:trouble.name + " needs a cleaner run",
      body:"Recent incident numbers and finishing trend make this a key driver to watch for a reset.",
      stat:round(trouble.recentInc,1)+" recent avg inc"
    });
  }

  if(bounce){
    stories.push({
      kicker:"Bounce Back",
      driver:bounce,
      title:bounce.name + " has rebound potential",
      body:bounce.latest
        ? "The last race landed below this driver's normal season pace, creating a bounce-back opportunity."
        : "Recent results suggest a rebound could be coming.",
      stat:bounce.latest ? "Last finish P"+bounce.latest.finish : "Recovery watch"
    });
  }

  if(darkHorse){
    stories.push({
      kicker:"Dark Horse",
      driver:darkHorse,
      title:darkHorse.name + " could surprise",
      body:"Strong top-10 potential, racecraft and consistency make this driver dangerous outside the obvious favorites.",
      stat:round(darkHorse.top10Rate,0)+"% Top 10"
    });
  }

  const unique = [];
  const seen = new Set();

  for(const story of stories){
    const key = story.kicker+"|"+story.title;
    if(!seen.has(key)){
      seen.add(key);
      unique.push(story);
    }
  }

  grid.innerHTML = unique.slice(0,6).map(story=>`
    <article class="story-card ${hLrnDriverPhoto(story.driver,"full") ? "has-driver-photo" : ""}">
      ${hLrnPhotoMarkup(story.driver,"full","hlrn-story-full-photo")}
      <div class="story-kicker">${esc(story.kicker)}</div>
      <h3>${hLrnStoryTitleMarkup(story)}</h3>
      <p>${esc(story.body)}</p>
      <div class="story-stat">${esc(story.stat)}</div>
    </article>
  `).join("");
}


function showCategoryDeepDive(category){
  const d = category.driver;
  if(!d) return;

  const cfg = categoryConfig.find(x=>x.key===category.key) || {};
  const deep = document.getElementById("categoryDeep");
  deep.style.display = "block";

  const recent = d.races.slice(-5).reverse();
  const latest = d.latest;
  const recentFinishes = d.recent.map(r=>r.finish).filter(v=>v>0);
  const recentBest = recentFinishes.length ? Math.min(...recentFinishes) : 0;
  const recentWorst = recentFinishes.length ? Math.max(...recentFinishes) : 0;
  const totalLed = d.races.reduce((s,r)=>s+number(r.lapsLed),0);
  const bestGain = d.races.length ? Math.max(...d.races.map(r=>r.positionGain)) : 0;

  let summary = category.reason;
  let pill = category.stat;
  let reasons = [];
  let action = "";
  let metrics = [
    ["Season Avg", formatFinish(d.seasonAvgFinish)],
    ["Recent Avg", formatFinish(d.recentAvgFinish)],
    ["Avg Gain", signed(d.avgGain)],
    ["Avg Inc", round(d.avgInc,1)]
  ];

  switch(category.key){
    case "favorite":
      summary = d.name + " grades as the strongest all-around pick when championship position, finishing pace, recent results, racecraft and cleanliness are blended together.";
      reasons = [
        ["good","Overall intelligence rating: "+Math.round(d.overall)+" / 100."],
        ["good","Top-10 rate sits at "+round(d.top10Rate,0)+"% across completed starts."],
        [d.improvement>=0?"good":"warn","Recent average is "+formatFinish(d.recentAvgFinish)+" compared with season average "+formatFinish(d.seasonAvgFinish)+"."],
        ["","Average position change is "+signed(d.avgGain)+" spots from start to finish."]
      ];
      action = "What to watch next: whether the favorite can keep the same pace when the next race creates different tire, traffic and restart demands.";
      break;

    case "hot":
      summary = d.name + " is here because the recent three-race window is outperforming the driver's normal season baseline.";
      reasons = [
        ["good","Recent three-race average: "+formatFinish(d.recentAvgFinish)+"."],
        [d.improvement>0?"good":"warn","Recent form is "+Math.abs(round(d.improvement,1))+" spots "+(d.improvement>0?"better":"worse")+" than the season average."],
        ["good","Recent average position gain: "+signed(d.recentGain)+"."],
        ["","Current trend model: "+trendLabel(d)+"."]
      ];
      action = "What confirms the hot streak: another finish near or better than the recent average without a major incident spike.";
      metrics = [
        ["Recent Avg",formatFinish(d.recentAvgFinish)],
        ["Season Avg",formatFinish(d.seasonAvgFinish)],
        ["Improvement",signed(d.improvement)],
        ["Recent Gain",signed(d.recentGain)]
      ];
      break;

    case "sleeper":
      summary = d.name + " is outperforming what the championship rank alone would suggest, which is why the model flags this driver as an under-the-radar threat.";
      reasons = [
        ["good","Championship rank is #"+(d.rank||"—")+" but recent average is "+formatFinish(d.recentAvgFinish)+"."],
        ["good","Top-10 rate: "+round(d.top10Rate,0)+"%."],
        [d.recentGain>0?"good":"","Recent average position gain: "+signed(d.recentGain)+"."],
        ["","Consistency score: "+Math.round(d.consistency)+" / 100."]
      ];
      action = "Sleeper breakout signal: a top-five run or another race with strong forward position gain would strengthen the case.";
      metrics = [
        ["Rank","#"+(d.rank||"—")],
        ["Top 10",round(d.top10Rate,0)+"%"],
        ["Recent Avg",formatFinish(d.recentAvgFinish)],
        ["Recent Gain",signed(d.recentGain)]
      ];
      break;

    case "consistent":
      summary = d.name + " has the smallest week-to-week finish spread among the established drivers considered by the model.";
      reasons = [
        ["good","Consistency rating: "+Math.round(d.consistency)+" / 100."],
        ["","Season average finish: "+formatFinish(d.seasonAvgFinish)+"."],
        ["","Recent average finish: "+formatFinish(d.recentAvgFinish)+"."],
        ["good","Recent finish range: "+(recentBest?"P"+recentBest:"—")+" to "+(recentWorst?"P"+recentWorst:"—")+"."]
      ];
      action = "Consistency watch: the key is limiting one-off bad finishes that widen the season finish spread.";
      metrics = [
        ["Consistency",Math.round(d.consistency)],
        ["Season Avg",formatFinish(d.seasonAvgFinish)],
        ["Recent Best",recentBest?"P"+recentBest:"—"],
        ["Recent Worst",recentWorst?"P"+recentWorst:"—"]
      ];
      break;

    case "mover":
      summary = d.name + " is producing the strongest forward racecraft signal by gaining positions from starting spot to finish.";
      reasons = [
        ["good","Season average gain: "+signed(d.avgGain)+" positions."],
        ["good","Recent average gain: "+signed(d.recentGain)+" positions."],
        ["good","Biggest single-race gain: "+signed(bestGain)+"."],
        ["","Top-10 conversion rate: "+round(d.top10Rate,0)+"%."]
      ];
      action = "Racecraft watch: compare qualifying position with finish again next race. Another large positive delta reinforces this signal.";
      metrics = [
        ["Avg Gain",signed(d.avgGain)],
        ["Recent Gain",signed(d.recentGain)],
        ["Best Gain",signed(bestGain)],
        ["Top 10",round(d.top10Rate,0)+"%"]
      ];
      break;

    case "recentWinner":
      summary = d.name + " owns the freshest victory in the selected league and carries the most immediate winner momentum into the next event.";
      reasons = [
        ["good","Most recent completed race finish: "+(latest?"P"+latest.finish:"—")+"."],
        ["good","Season wins: "+d.wins+"."],
        ["","Total laps led across recorded races: "+totalLed+"."],
        ["","Current intelligence rating: "+Math.round(d.overall)+" / 100."]
      ];
      action = "Winner follow-up: the next question is whether the victory becomes a multi-race form trend or remains a single-event peak.";
      metrics = [
        ["Wins",d.wins],
        ["Latest",latest?"P"+latest.finish:"—"],
        ["Laps Led",totalLed],
        ["Rating",Math.round(d.overall)]
      ];
      break;

    case "trouble":
      summary = d.name + " is on Trouble Watch because recent incidents and/or recent finishes are moving in the wrong direction compared with the driver's normal baseline.";
      reasons = [
        [d.recentInc>d.avgInc?"warn":"","Recent incident average: "+round(d.recentInc,1)+" vs season "+round(d.avgInc,1)+"."],
        [d.recentAvgFinish>d.seasonAvgFinish?"warn":"","Recent average finish: "+formatFinish(d.recentAvgFinish)+" vs season "+formatFinish(d.seasonAvgFinish)+"."],
        ["","Latest finish: "+(latest?"P"+latest.finish:"—")+" with "+(latest?latest.incidents:"—")+" incidents."],
        ["","Consistency score: "+Math.round(d.consistency)+" / 100."]
      ];
      action = "What clears the warning: a clean race with incidents below the recent average and a finish back near the season baseline.";
      metrics = [
        ["Recent Inc",round(d.recentInc,1)],
        ["Season Inc",round(d.avgInc,1)],
        ["Recent Avg",formatFinish(d.recentAvgFinish)],
        ["Latest",latest?"P"+latest.finish:"—"]
      ];
      break;

    case "bounce":
      summary = d.name + " is flagged for rebound potential because the latest result landed well below the driver's normal season pace.";
      reasons = [
        ["warn","Latest finish: "+(latest?"P"+latest.finish:"—")+"."],
        ["good","Season average finish: "+formatFinish(d.seasonAvgFinish)+"."],
        ["","Gap from normal pace: "+(latest?round(latest.finish-d.seasonAvgFinish,1):"—")+" positions."],
        ["","Recent trend: "+trendLabel(d)+"."]
      ];
      action = "Bounce-back benchmark: finish at or better than the season average while avoiding another high-incident result.";
      metrics = [
        ["Latest",latest?"P"+latest.finish:"—"],
        ["Season Avg",formatFinish(d.seasonAvgFinish)],
        ["Recent Avg",formatFinish(d.recentAvgFinish)],
        ["Latest Inc",latest?latest.incidents:"—"]
      ];
      break;

    case "darkHorse":
      summary = d.name + " sits outside the obvious favorite group but combines enough top-10 conversion, position gain and consistency to threaten a surprise result.";
      reasons = [
        ["good","Top-10 rate: "+round(d.top10Rate,0)+"%."],
        ["","Championship rank: #"+(d.rank||"—")+"."],
        [d.avgGain>0?"good":"","Average position gain: "+signed(d.avgGain)+"."],
        ["","Consistency score: "+Math.round(d.consistency)+" / 100."]
      ];
      action = "Upset signal: strong qualifying or early-race track position paired with the driver's existing top-10 conversion rate.";
      metrics = [
        ["Rank","#"+(d.rank||"—")],
        ["Top 10",round(d.top10Rate,0)+"%"],
        ["Avg Gain",signed(d.avgGain)],
        ["Consistency",Math.round(d.consistency)]
      ];
      break;

    case "watch":
      summary = d.name + " is the general Driver To Watch because multiple secondary signals — momentum, racecraft and consistency — are pointing upward together.";
      reasons = [
        ["good","Trend status: "+trendLabel(d)+"."],
        [d.recentGain>0?"good":"","Recent gain: "+signed(d.recentGain)+" spots."],
        ["","Recent average finish: "+formatFinish(d.recentAvgFinish)+"."],
        ["","Consistency: "+Math.round(d.consistency)+" / 100."]
      ];
      action = "Next-race watch: see whether the underlying positive signals translate into a top-five or podium-level result.";
      metrics = [
        ["Trend",trendLabel(d)],
        ["Recent Gain",signed(d.recentGain)],
        ["Recent Avg",formatFinish(d.recentAvgFinish)],
        ["Consistency",Math.round(d.consistency)]
      ];
      break;
  }

  document.getElementById("deepLabel").textContent = (cfg.title || "Situation") + " Deep Dive";
  document.getElementById("deepTitle").innerHTML = hLrnDriverNameMarkup(d);
  document.getElementById("deepDriverPhoto").innerHTML = hLrnPhotoMarkup(d,"full","hlrn-feature-full-photo");
  document.getElementById("deepSummary").textContent = summary;
  document.getElementById("deepPill").textContent = pill || "Live Analysis";

  document.getElementById("deepMetrics").innerHTML = metrics.map(([a,b])=>`
    <div class="deep-metric"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>
  `).join("");

  document.getElementById("deepReasons").innerHTML = reasons.map(([kind,msg])=>`
    <div class="deep-point ${kind}">
      <span class="deep-dot"></span>
      <span>${esc(msg)}</span>
    </div>
  `).join("");

  document.getElementById("deepRaces").innerHTML = recent.length ? recent.map(r=>`
    <div class="deep-race">
      <span>R${number(r.raceNumber)}</span>
      <span class="track">${esc(r.track || "Unknown Track")}</span>
      <b>P${number(r.finish)}</b>
      <b class="${r.positionGain>0?"gain":r.positionGain<0?"loss":""}">${signed(r.positionGain)}</b>
      <b>${number(r.incidents)}x</b>
    </div>
  `).join("") : '<div style="color:#777;font-size:10px">No recent race history available.</div>';

  document.getElementById("deepAction").textContent = action;
}

function showDriver(category){
  const d = category.driver;
  const cfg = categoryConfig.find(x=>x.key===category.key);

  document.getElementById("detailWrap").style.display="block";
  document.getElementById("detailEyebrow").textContent = cfg.title;
  document.getElementById("detailName").innerHTML = hLrnDriverNameMarkup(d);
  document.getElementById("detailDriverPhoto").innerHTML = hLrnPhotoMarkup(d,"full","hlrn-feature-full-photo");
  document.getElementById("detailCategory").textContent = category.reason;
  document.getElementById("detailScore").textContent = Math.round(d.overall);

  setText("dRank",d.rank ? "#"+d.rank : "—");
  setText("dWins",d.wins);
  setText("dAvgFinish",formatFinish(d.seasonAvgFinish));
  setText("dRecentAvg",formatFinish(d.recentAvgFinish));
  setText("dGain",signed(d.avgGain));
  setText("dInc",round(d.avgInc,1));
  setText("dTop5",round(d.top5Rate,0)+"%");
  setText("dConsistency",Math.round(d.consistency));

  const recent = d.races.slice(-5).reverse();
  const raceList=document.getElementById("recentRaceList");

  raceList.innerHTML = recent.length ? recent.map(r=>`
    <div class="race">
      <div class="race-num">R${number(r.raceNumber)}</div>
      <div class="race-track">${esc(r.track || "Unknown Track")}</div>
      <div><div class="mini-label">Finish</div><div class="mini-value">P${number(r.finish)}</div></div>
      <div><div class="mini-label">Gain</div><div class="mini-value ${r.positionGain>0?"positive":r.positionGain<0?"negative":""}">${signed(r.positionGain)}</div></div>
      <div><div class="mini-label">Inc</div><div class="mini-value">${number(r.incidents)}</div></div>
    </div>
  `).join("") : '<div style="color:#7f8998;font-size:12px">No completed races found for this driver.</div>';

  const latest = d.latest;
  const bestFinish = d.races.length ? Math.min(...d.races.map(r=>r.finish)) : 0;
  const biggestGain = d.races.length ? Math.max(...d.races.map(r=>r.positionGain)) : 0;
  const lapsLed = d.races.reduce((s,r)=>s+number(r.lapsLed),0);

  document.getElementById("driverReadout").innerHTML = [
    ["Current Trend",trendLabel(d)],
    ["Season Avg Finish",formatFinish(d.seasonAvgFinish)],
    ["Recent 3 Avg",formatFinish(d.recentAvgFinish)],
    ["Recent vs Season", d.improvement===0 ? "Even" : (d.improvement>0 ? signed(d.improvement)+" better" : Math.abs(round(d.improvement,1))+" worse")],
    ["Best Finish",bestFinish ? "P"+bestFinish : "—"],
    ["Biggest Position Gain",signed(biggestGain)],
    ["Total Laps Led",lapsLed],
    ["Latest Finish",latest ? "P"+latest.finish : "—"],
    ["Latest Incidents",latest ? latest.incidents : "—"]
  ].map(([a,b])=>`
    <div class="trend-row"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>
  `).join("");

  // Keep the detail section in place without forcing the Google Sites embed to jump.
}

function setText(id,value){
  document.getElementById(id).textContent = value;
}

function setLoading(on){
  document.getElementById("loading").classList.toggle("show",on);
}

function showError(msg){
  const box=document.getElementById("errorBox");
  box.textContent=msg;
  box.classList.add("show");
}

function hideError(){
  const box=document.getElementById("errorBox");
  box.textContent="";
  box.classList.remove("show");
}

document.querySelectorAll(".league-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    if(btn.dataset.league!==currentLeague){
      selectedCategoryKey="favorite";
      loadLeague(btn.dataset.league);
    }
  });
});

document.getElementById("refreshBtn").addEventListener("click",()=>loadLeague(currentLeague,{preserveSelection:true}));

loadLeague("sunday");

/* Quiet one-minute result checks. When the results feed exposes a new completed
   race with a P1 finisher, the entire intelligence model and Storylines section
   are rebuilt automatically from the new data. */
setInterval(()=>{
  if(document.visibilityState==="visible"){
    loadLeague(currentLeague,{silent:true,auto:true,preserveSelection:true});
  }
},AUTO_REFRESH_MS);

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"){
    loadLeague(currentLeague,{silent:true,auto:true,preserveSelection:true});
  }
});


/* HLRN Race Intelligence script block 4 */
(function(){
  const targets = document.querySelectorAll(
    '.intel-card,.category-deep,.story-section,.detail-wrap,.toolbar'
  );
  targets.forEach(el => el.classList.add('reveal-race'));
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },{threshold:.08});
    targets.forEach(el=>io.observe(el));
  } else {
    targets.forEach(el=>el.classList.add('in-view'));
  }

  // Observe dynamically generated intelligence/story cards too.
  const parentTargets = ['intelGrid','storyGrid','deepMetrics','deepRaces'];
  const mo = new MutationObserver(()=>{
    document.querySelectorAll('.intel-card,.story-card,.deep-metric,.deep-race').forEach((el,i)=>{
      if(!el.dataset.hlrnMotion){
        el.dataset.hlrnMotion='1';
        el.style.animation='hlrnCardIn .42s ease both';
        el.style.animationDelay=Math.min(i*35,280)+'ms';
      }
    });
  });
  parentTargets.forEach(id=>{
    const node=document.getElementById(id);
    if(node) mo.observe(node,{childList:true,subtree:true});
  });
})();


/* HLRN Race Intelligence script block 5 */
(function(){
  function pad(n){return String(n).padStart(2,"0")}
  function updateClock(){
    var el=document.getElementById("hlrnLiveClock");
    if(!el)return;
    var d=new Date();
    var h=d.getHours(), ap=h>=12?"PM":"AM";
    h=h%12||12;
    el.textContent=h+":"+pad(d.getMinutes())+":"+pad(d.getSeconds())+" "+ap;
  }
  updateClock();
  setInterval(updateClock,1000);

  function syncLeague(){
    var active=document.querySelector(".league-btn.active");
    var league=active ? (active.dataset.league||active.textContent||"Sunday") : "Sunday";
    league=league.charAt(0).toUpperCase()+league.slice(1);
    var el=document.getElementById("hlrnActiveLeague");
    if(el)el.textContent=league+" Intelligence";
  }
  document.addEventListener("click",function(e){
    if(e.target.closest(".league-btn")) setTimeout(syncLeague,20);
  });
  syncLeague();

  var observer=new MutationObserver(function(){
    var loading=document.getElementById("loading");
    var error=document.getElementById("errorBox");
    var feed=document.getElementById("hlrnFeedState");
    if(!feed)return;
    if(error && error.textContent.trim() && getComputedStyle(error).display!=="none"){
      feed.textContent="Feed Warning";
      feed.style.color="#ff5a55";
    }else if(loading && loading.classList.contains("show")){
      feed.textContent="Syncing Data";
      feed.style.color="#f2c84b";
    }else{
      feed.textContent="Live + Synced";
      feed.style.color="#31d466";
    }
  });
  ["loading","errorBox","intelGrid"].forEach(function(id){
    var n=document.getElementById(id);
    if(n)observer.observe(n,{attributes:true,childList:true,subtree:true,characterData:true});
  });

  var revealObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add("hlrn-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },{threshold:.09,rootMargin:"0px 0px -20px 0px"});

  function wireReveal(){
    document.querySelectorAll(".intel-grid > *, .story-grid > *, .category-deep, .detail-wrap").forEach(function(el,i){
      if(el.dataset.hlrnReveal)return;
      el.dataset.hlrnReveal="1";
      el.classList.add("hlrn-reveal");
      el.style.transitionDelay=Math.min((i%5)*55,220)+"ms";
      revealObserver.observe(el);
    });
  }
  wireReveal();
  var contentObserver=new MutationObserver(function(){requestAnimationFrame(wireReveal)});
  ["intelGrid","storyGrid"].forEach(function(id){
    var n=document.getElementById(id);
    if(n)contentObserver.observe(n,{childList:true,subtree:true});
  });

  var refresh=document.getElementById("refreshBtn");
  if(refresh){
    refresh.addEventListener("click",function(){
      refresh.classList.add("hlrn-refreshing");
      var old=refresh.textContent;
      refresh.textContent="↻ Syncing";
      setTimeout(function(){
        refresh.classList.remove("hlrn-refreshing");
        refresh.textContent=old;
      },1100);
    });
  }

  document.addEventListener("mousemove",function(e){
    var card=e.target.closest(".intel-grid > *, .story-grid > *");
    if(!card)return;
    var r=card.getBoundingClientRect();
    card.style.setProperty("--mx",(e.clientX-r.left)+"px");
    card.style.setProperty("--my",(e.clientY-r.top)+"px");
  },{passive:true});
})();


/* HLRN Race Intelligence script block 6 */
(function(){
  const q=id=>document.getElementById(id);
  function pctClamp(v){return Math.max(0,Math.min(100,Number(v)||0));}
  function setMeter(id,textId,val,label){const m=q(id),t=q(textId);if(m)m.style.width=pctClamp(val)+'%';if(t)t.textContent=label;}
  function updateDeck(){
    try{
      const list=Array.isArray(window.analytics)?window.analytics:(typeof analytics!=='undefined'&&Array.isArray(analytics)?analytics:[]);
      const cats=Array.isArray(window.categories)?window.categories:(typeof categories!=='undefined'&&Array.isArray(categories)?categories:[]);
      if(q('ccField')) q('ccField').textContent=list.length||'—';
      const byKey=k=>cats.find(c=>c&&c.key===k)?.driver?.name||'—';
      if(q('ccLeader')) q('ccLeader').textContent=byKey('favorite');
      if(q('ccHot')) q('ccHot').textContent=byKey('hot');
      if(q('ccRisk')) q('ccRisk').textContent=byKey('trouble')!=='—'?byKey('trouble'):byKey('watch');
      const completed=list.filter(d=>d&&Number(d.races)>0);
      const confidence=(window.HLRN_MODEL_METRICS && Number.isFinite(window.HLRN_MODEL_METRICS.top5Capture)) ? window.HLRN_MODEL_METRICS.top5Capture : (completed.length?Math.min(100,55+completed.length*2.2):18);
      const depth=completed.length?Math.min(100,completed.length*4):12;
      const recentVals=completed.map(d=>Number(d.recentAvg)).filter(Number.isFinite);
      const seasonVals=completed.map(d=>Number(d.avgFinish)).filter(Number.isFinite);
      const momentum=(recentVals.length&&seasonVals.length)?Math.min(100,45+Math.abs((seasonVals.reduce((a,b)=>a+b,0)/seasonVals.length)-(recentVals.reduce((a,b)=>a+b,0)/recentVals.length))*7):25;
      const risks=completed.map(d=>Number(d.recentInc)).filter(Number.isFinite);
      const risk=risks.length?Math.min(100,(risks.reduce((a,b)=>a+b,0)/risks.length)*12):15;
      setMeter('ccConfidence','ccConfidenceText',confidence,Math.round(confidence)+'%');
      setMeter('ccDepth','ccDepthText',depth,Math.round(depth)+'%');
      setMeter('ccMomentum','ccMomentumText',momentum,Math.round(momentum)+'%');
      setMeter('ccRiskMeter','ccRiskText',risk,Math.round(risk)+'%');
    }catch(e){}
  }
  const obs=new MutationObserver(()=>requestAnimationFrame(updateDeck));
  ['intelGrid','loading','errorBox'].forEach(id=>{const n=q(id);if(n)obs.observe(n,{childList:true,subtree:true,attributes:true});});
  document.addEventListener('click',e=>{if(e.target.closest('.league-btn')||e.target.closest('#refreshBtn'))setTimeout(updateDeck,350)});
  setInterval(updateDeck,4000);setTimeout(updateDeck,800);
  const cur=q('ccCursor');
  if(cur&&matchMedia('(pointer:fine)').matches){document.addEventListener('mousemove',e=>{cur.style.left=e.clientX+'px';cur.style.top=e.clientY+'px';},{passive:true});}
  document.addEventListener('mousemove',function(e){const c=e.target.closest('.intel-card,.story-card,.deep-box,.detail-box');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px');},{passive:true});
})();


/* HLRN Race Intelligence script block 7 */
document.addEventListener('DOMContentLoaded', function(){
  const header = document.querySelector('.header');
  if(header && !document.querySelector('.x-launch-bar')){
    header.insertAdjacentHTML('afterend', `
      <section class="x-launch-bar" aria-label="HLRN command launch bar">
        <div class="x-launch-card feature">
          <div class="x-launch-kicker">HLRN // Command Center</div>
          <div class="x-launch-title">Race Intelligence Headquarters</div>
          <div class="x-launch-copy">Full-field performance analysis, momentum tracking, risk watch, and automatic deep-dive panels for both HLRN leagues.</div>
          <div class="x-pill">Live race intelligence feed active</div>
        </div>
        <div class="x-launch-card">
          <span class="x-launch-value">Live</span>
          <span class="x-launch-label">Data status</span>
        </div>
        <div class="x-launch-card">
          <span class="x-launch-value">2</span>
          <span class="x-launch-label">Leagues tracked</span>
        </div>
        <div class="x-launch-card">
          <span class="x-launch-value">Deep Dive</span>
          <span class="x-launch-label">Click any card</span>
        </div>
      </section>
    `);
  }

  const storySection = document.querySelector('.story-section');
  if(storySection && !document.querySelector('.x-spotlight-banner')){
    storySection.insertAdjacentHTML('beforebegin', `
      <section class="x-spotlight-banner" aria-label="HLRN spotlight banner">
        <div class="x-spotlight-kicker">Trackside Spotlight</div>
        <div class="x-spotlight-row">
          <div>
            <div class="x-spotlight-copy">Built to feel like a real NASCAR command board.</div>
            <div class="x-spotlight-meta">Driver signals • storylines • recent evidence • race-by-race insight</div>
          </div>
          <div class="x-spotlight-action">Powered by <span>HLRN Results</span></div>
        </div>
      </section>
    `);
  }

  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('hlrn-visible');
      }
    });
  }, {threshold:0.12});

  document.querySelectorAll('.x-launch-bar, .cc-command-deck, .cc-meter-band, .hero, .toolbar, .intel-grid, .x-spotlight-banner, .story-section, .category-deep, .detail-wrap').forEach(el=>{
    el.classList.add('hlrn-reveal');
    observer.observe(el);
  });
});


/* HLRN Race Intelligence script block 8 */
(function(){
  const TARGET=95.8;
  const $=id=>document.getElementById(id);
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  const sd=a=>{if(!a.length)return 0;const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)*(v-m))))};
  const fmt=v=>Number.isFinite(v)?v.toFixed(1)+'%':'—';
  const nameOf=id=>{
    try{const d=analytics.find(x=>String(x.id)===String(id));return d?.name||'Unknown Driver'}catch(e){return 'Unknown Driver'}
  };

  function scoreHistory(hist){
    const h=hist.filter(r=>Number(r.finish)>0).slice().sort((a,b)=>Number(a.raceNumber)-Number(b.raceNumber));
    if(h.length<2)return null;
    const last=h.slice(-5);
    const weights=[.10,.12,.16,.24,.38].slice(-last.length);
    const ws=weights.reduce((a,b)=>a+b,0)||1;
    const wr=(key,fallback=0)=>last.reduce((s,r,i)=>s+(Number(r[key])||0)*weights[i],0)/ws || fallback;
    const avgFinish=mean(h.map(r=>Number(r.finish)).filter(v=>v>0));
    const recFinish=wr('finish',avgFinish);
    const gains=h.map(r=>r.positionGain!==undefined?Number(r.positionGain):(Number(r.start)>0?Number(r.start)-Number(r.finish):0));
    const recGain=last.reduce((s,r,i)=>s+((r.positionGain!==undefined?Number(r.positionGain):(Number(r.start)>0?Number(r.start)-Number(r.finish):0))||0)*weights[i],0)/ws;
    const recInc=wr('incidents',mean(h.map(r=>Number(r.incidents)||0)));
    const wins=h.filter(r=>Number(r.finish)===1).length;
    const top5=h.filter(r=>Number(r.finish)<=5).length;
    const top10=h.filter(r=>Number(r.finish)<=10).length;
    const consistency=clamp(100-sd(last.map(r=>Number(r.finish)))*7.25);
    const seasonScore=clamp(100-(avgFinish-1)*3.6);
    const recentScore=clamp(100-(recFinish-1)*4.2);
    const winScore=clamp((wins/h.length)*500);
    const top5Score=(top5/h.length)*100;
    const top10Score=(top10/h.length)*100;
    const gainScore=clamp(50+recGain*8);
    const cleanScore=clamp(100-recInc*6.2);
    const raw=seasonScore*.17+recentScore*.31+winScore*.12+top5Score*.12+top10Score*.08+gainScore*.08+cleanScore*.06+consistency*.06;
    const sample=Math.min(1,h.length/7);
    return 50+(raw-50)*(.58+sample*.42);
  }

  function backtest(){
    let rr=[];
    try{rr=Array.isArray(results)?results.slice():[]}catch(e){}
    rr=rr.filter(r=>Number(r.finish)>0 && Number(r.raceNumber)>0);
    const raceNos=[...new Set(rr.map(r=>Number(r.raceNumber)))].sort((a,b)=>a-b);
    const history={};
    let tested=0,exact=0,top3=0,top5=0,winnerRankSum=0;
    for(const raceNo of raceNos){
      const race=rr.filter(r=>Number(r.raceNumber)===raceNo && Number(r.finish)>0);
      const scored=race.map(r=>({r,score:scoreHistory(history[String(r.driverId)]||[])})).filter(x=>Number.isFinite(x.score));
      const winner=race.find(r=>Number(r.finish)===1);
      if(winner && scored.length>=3 && scored.some(x=>String(x.r.driverId)===String(winner.driverId))){
        scored.sort((a,b)=>b.score-a.score);
        const rank=scored.findIndex(x=>String(x.r.driverId)===String(winner.driverId))+1;
        if(rank>0){
          tested++;winnerRankSum+=rank;
          if(rank===1)exact++;
          if(rank<=3)top3++;
          if(rank<=5)top5++;
        }
      }
      race.forEach(r=>{
        const id=String(r.driverId);
        if(!history[id])history[id]=[];
        history[id].push({
          ...r,
          finish:Number(r.finish)||0,start:Number(r.start)||0,
          incidents:Number(r.incidents)||0,raceNumber:Number(r.raceNumber)||0,
          positionGain:r.positionGain!==undefined?Number(r.positionGain):((Number(r.start)>0&&Number(r.finish)>0)?Number(r.start)-Number(r.finish):0)
        });
      });
    }
    return {
      tested,
      exactHit:tested?exact/tested*100:NaN,
      top3Capture:tested?top3/tested*100:NaN,
      top5Capture:tested?top5/tested*100:NaN,
      avgWinnerRank:tested?winnerRankSum/tested:NaN
    };
  }

  function ensurePanels(){
    // Safety only: this function NEVER creates panels.
    // The compact layout owns the single static accuracy row and contender block.
    const verifyNodes=Array.from(document.querySelectorAll('.v3-verification'));
    verifyNodes.slice(1).forEach(n=>n.remove());
    const contenderNodes=Array.from(document.querySelectorAll('.v3-contenders'));
    contenderNodes.slice(1).forEach(n=>n.remove());
  }

  function decorateCards(){
    document.querySelectorAll('.intel-card').forEach((card,i)=>{
      card.dataset.v3Index=String(i+1).padStart(2,'0');
      const oldFooter=card.querySelector('.v3-card-footer');
      if(oldFooter) oldFooter.remove();
    });
  }

  function renderContenders(){
    const grid=$('v3ContenderGrid');if(!grid)return;
    let list=[];
    try{list=Array.isArray(analytics)?analytics.slice():[]}catch(e){}
    list=list.filter(d=>d&&Number(d.races?.length||0)>0).sort((a,b)=>Number(b.overall)-Number(a.overall)).slice(0,3);
    grid.innerHTML=list.length?list.map((d,i)=>{
      const rating=clamp(d.overall);
      return `<article class="v3-contender">${hLrnPhotoMarkup(d,"full","hlrn-contender-full-photo")}<div class="v3-contender-label">${i===0?'Performance Leader':'Contender '+(i+1)}</div><div class="v3-contender-name">${hLrnDriverNameMarkup(d)}</div><div class="v3-contender-meta"><span>Rating ${rating.toFixed(0)}</span><span>${Number(d.top5Rate||0).toFixed(0)}% Top 5</span></div><div class="v3-contender-meter"><span style="width:${rating}%"></span></div></article>`;
    }).join(''):'<div style="padding:18px;color:#7f8992;font-size:10px">Waiting for enough race history to build the contender board.</div>';
  }

  function renderVerification(){
    const m=backtest();
    window.HLRN_MODEL_METRICS=m;
    if($('v3Top5'))$('v3Top5') && ($('v3Top5').textContent=fmt(m.top5Capture));
    if($('v3Top3'))$('v3Top3') && ($('v3Top3').textContent=fmt(m.top3Capture));
    if($('v3Exact'))$('v3Exact') && ($('v3Exact').textContent=fmt(m.exactHit));
    if($('v3ValidationBar'))$('v3ValidationBar').style.width=Number.isFinite(m.top5Capture)?clamp(m.top5Capture)+'%':'0%';
    if($('v3VerifyCopy')){
      if(m.tested<3){
        $('v3VerifyCopy').textContent='Calibration is waiting for more races with enough prior driver history. The 95.8% figure is a target, not a fabricated accuracy claim.';
      }else{
        const delta=Number.isFinite(m.top5Capture)?m.top5Capture-TARGET:0;
        $('v3VerifyCopy').textContent=`${m.tested} historical races tested with no future-result leakage • average actual winner model rank ${Number.isFinite(m.avgWinnerRank)?m.avgWinnerRank.toFixed(1):'—'} • ${delta>=0?'coverage target met by '+delta.toFixed(1)+' pts':'currently '+Math.abs(delta).toFixed(1)+' pts below the 95.8% target'}.`;
      }
    }
    const conf=$('ccConfidenceText'),meter=$('ccConfidence');
    if(conf && Number.isFinite(m.top5Capture))conf.textContent=Math.round(m.top5Capture)+'%';
    if(meter && Number.isFinite(m.top5Capture))meter.style.width=clamp(m.top5Capture)+'%';
  }

  function easternClock(){
    const el=$('hlrnLiveClock');if(!el)return;
    try{el.textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true}).format(new Date())+' ET'}catch(e){}
  }

  window.HLRN_V3_SYNC=function(){
    ensurePanels();
    requestAnimationFrame(()=>{
      decorateCards();
      renderContenders();
      renderVerification();
      easternClock();
    });
  };

  document.addEventListener('DOMContentLoaded',()=>{
    easternClock();setInterval(easternClock,1000);
    const roots=['intelGrid','storyGrid','loading','errorBox'];
    const mo=new MutationObserver(()=>requestAnimationFrame(()=>window.HLRN_V3_SYNC()));
    roots.forEach(id=>{const n=$(id);if(n)mo.observe(n,{childList:true,subtree:true})});
    setTimeout(()=>window.HLRN_V3_SYNC(),250);
  });
})();


/* HLRN Race Intelligence script block 9 */
(function(){
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  let built=false;

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function updateOverview(){
    try{
      const a=Array.isArray(analytics)?analytics:[];
      const c=Array.isArray(categories)?categories:[];
      const get=k=>c.find(x=>x&&x.key===k)?.driver?.name||'—';
      const set=(id,v)=>{const n=document.getElementById(id);if(n&&n.textContent!==String(v))n.textContent=String(v)};
      set('compactDrivers',a.length||'—');
      set('compactFavorite',get('favorite'));
      set('compactHot',get('hot'));
      set('compactRisk',get('trouble')!=='—'?get('trouble'):get('watch'));
      let race=0; try{race=results.reduce((m,r)=>Math.max(m,Number(r.raceNumber)||0),0)}catch(e){}
      set('compactRace',race?'R'+race:'—');
    }catch(e){}
  }

  function activate(name){
    $$('.compact-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
    $$('.compact-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===name));
  }

  function moveDynamicPanels(){
    // Static layout: never move or create the accuracy/contender sections.
    Array.from(document.querySelectorAll('.v3-verification')).slice(1).forEach(n=>n.remove());
    Array.from(document.querySelectorAll('.v3-contenders')).slice(1).forEach(n=>n.remove());
  }

  function build(){
    if(built)return;
    // Remove any duplicate panels before compact layout is assembled.
    Array.from(document.querySelectorAll('.v3-verification')).forEach(n=>n.remove());
    Array.from(document.querySelectorAll('.v3-contenders')).forEach(n=>n.remove());
    const hero=$('.hero'), toolbar=$('.toolbar'), grid=document.getElementById('intelGrid'), deep=document.getElementById('categoryDeep'), stories=$('.story-section');
    if(!hero||!toolbar||!grid||!deep||!stories)return;
    built=true;

    hero.insertAdjacentHTML('afterend',`<section class="compact-overview" aria-label="HLRN compact overview">
      <div class="compact-overview-title"><small>HLRN // Race Intelligence</small><strong>Live Command Summary</strong></div>
      <div class="compact-overview-stat"><span>Drivers</span><b id="compactDrivers">—</b></div>
      <div class="compact-overview-stat"><span>Favorite</span><b id="compactFavorite">—</b></div>
      <div class="compact-overview-stat"><span>Hot Driver</span><b id="compactHot">—</b></div>
      <div class="compact-overview-stat"><span>Risk Watch</span><b id="compactRisk">—</b></div>
      <div class="compact-overview-stat"><span>Through</span><b id="compactRace">—</b></div>
    </section>
    <nav class="compact-tabs" aria-label="Race Intelligence sections">
      <button class="compact-tab active" data-panel="board">Intelligence Board</button>
      <button class="compact-tab" data-panel="deep">Selected Driver</button>
      <button class="compact-tab" data-panel="stories">Storylines</button>
    </nav>
    <section class="compact-panel active" data-panel="board" id="compactPanelBoard"><div class="compact-board-head"><strong>Live Intelligence Board</strong><span>Click a card for the deep dive</span></div><section class="v3-contenders" id="v3Contenders"><div class="v3-contenders-head"><strong>Top 3 Projected Contenders</strong><span id="v3ContenderMeta">Live HLRN performance data</span></div><div class="v3-contender-grid" id="v3ContenderGrid"></div></section></section>
    <section class="compact-panel" data-panel="deep" id="compactPanelDeep"></section>
    <section class="compact-panel" data-panel="stories" id="compactPanelStories"></section>`);

    const board=document.getElementById('compactPanelBoard');
    const dp=document.getElementById('compactPanelDeep');
    const sp=document.getElementById('compactPanelStories');
    board.appendChild(toolbar); board.appendChild(document.getElementById('loading')); board.appendChild(document.getElementById('errorBox')); board.appendChild(grid);
    dp.appendChild(deep); sp.appendChild(stories);

    $$('.compact-tab').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.panel)));
    document.addEventListener('click',e=>{
      if(e.target.closest('.intel-card')) setTimeout(()=>activate('deep'),0);
    });

    // Do not observe the entire document; that created a feedback loop on dynamic UI updates.
    const intel=document.getElementById('intelGrid');
    if(intel){
      const mo=new MutationObserver(()=>requestAnimationFrame(()=>{updateOverview(); if(window.HLRN_V3_SYNC) window.HLRN_V3_SYNC();}));
      mo.observe(intel,{childList:true,subtree:true});
    }
    updateOverview();
    if(window.HLRN_V3_SYNC) window.HLRN_V3_SYNC();
    setInterval(updateOverview,2500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(build,450));
  else setTimeout(build,450);
})();


/* HLRN Race Intelligence script block 10 */
(function(){
  function applyEditorialLayout(){
    document.body.classList.add('nascar-cup-news-style');
    const hero=document.querySelector('.hero h1');
    if(hero) hero.innerHTML='HLRN Race Intelligence';
    const kicker=document.querySelector('.hero .kicker');
    if(kicker) kicker.textContent='HIGH LINE RACING NETWORK • RACE INTELLIGENCE';
    const p=document.querySelector('.hero p');
    if(p) p.textContent='Current driver form, projected contenders, momentum, consistency, racecraft and risk signals — updated automatically from HLRN league results.';
    const boardHead=document.querySelector('.compact-board-head strong');
    if(boardHead) boardHead.textContent='Featured Race Intelligence';
    const boardSub=document.querySelector('.compact-board-head span');
    if(boardSub) boardSub.textContent='Sunday and Monday league analysis';
    const sectionLabel=document.querySelector('.section-label');
    if(sectionLabel) sectionLabel.textContent='Latest Intelligence';
    const storyTitle=document.querySelector('.story-title');
    if(storyTitle) storyTitle.textContent='Latest Storylines';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(applyEditorialLayout,850));
  else setTimeout(applyEditorialLayout,850);
  setTimeout(applyEditorialLayout,1800);
})();


/* HLRN Race Intelligence script block 11 */
(function(){
  function polish(){
    const hero=document.querySelector('.hero-inner');
    if(hero && !hero.querySelector('.nn-page-title')){
      const old=hero.querySelector('h1');
      const title=document.createElement('div');
      title.className='nn-page-title';
      title.textContent='HLRN Race Intelligence';
      if(old) old.insertAdjacentElement('afterend',title); else hero.prepend(title);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(polish,900));
  else setTimeout(polish,900);
  setTimeout(polish,1800);
})();


/* HLRN Race Intelligence script block 12 */
(function(){
  function syncRanks(){
    document.querySelectorAll('.intel-card').forEach(function(card,i){
      var top=card.querySelector('.card-top');
      if(top) top.setAttribute('data-rank',String(i+1).padStart(2,'0'));
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(syncRanks,900)});
  else setTimeout(syncRanks,900);
  setTimeout(syncRanks,1800);
  setInterval(syncRanks,5000);
})();
