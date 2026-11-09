(() => {
  "use strict";
  const panel = document.getElementById("raceWeekend");
  if (!panel) return;
  const byId = id => document.getElementById(id);
const ZONE="America/New_York";
const START_HOUR=20;
const START_MINUTE=30;
const COUNTDOWN_MINUTES=60;
const LIVE_END_HOUR=24;

const SCHEDULES={
  sunday:[
    {week:1,date:"2026-06-14",track:"DAYTONA",car:"GEN 7",laps:100},
    {week:2,date:"2026-06-28",track:"IOWA",car:"TRUCKS",laps:200},
    {week:3,date:"2026-07-12",track:"CHICAGOLAND",car:"ARCA",laps:175},
    {week:4,date:"2026-07-19",track:"ECHOPARK",car:"GEN 6",laps:175},
    {week:5,date:"2026-08-09",track:"CHARLOTTE",car:"GEN 7",laps:175},
    {week:6,date:"2026-08-16",track:"TEXAS",car:"TRUCKS",laps:175},
    {week:7,date:"2026-08-23",track:"AUTO CLUB",car:"ARCA",laps:125},
    {week:8,date:"2026-08-30",track:"TALLADEGA",car:"GEN 6",laps:100},
    {week:9,date:"2026-09-13",track:"HOMESTEAD-MIAMI",car:"GEN 7",laps:175},
    {week:10,date:"2026-09-20",track:"MICHIGAN",car:"TRUCKS",laps:125},
    {week:11,date:"2026-09-27",track:"INDIANAPOLIS",car:"ARCA",laps:100},
    {week:12,date:"2026-10-04",track:"IRACING SUPERSPEEDWAY",car:"GEN 6",laps:100},
    {week:13,date:"2026-10-11",track:"KANSAS",car:"GEN 7",laps:175},
    {week:14,date:"2026-10-18",track:"LAS VEGAS",car:"TRUCKS",laps:175},
    {week:15,date:"2026-10-25",track:"DAYTONA",car:"ARCA",laps:100},
    {week:16,date:"2026-11-01",track:"TALLADEGA",car:"GEN 6",laps:100,finale:true}
  ],
  monday:[
    {week:1,date:"2026-08-17",track:"DAYTONA",car:"GEN 7",laps:100},
    {week:2,date:"2026-08-24",track:"IOWA",car:"TRUCKS",laps:200},
    {week:3,date:"2026-08-31",track:"CHICAGOLAND",car:"ARCA",laps:175},
    {week:4,date:"2026-09-14",track:"ECHOPARK",car:"GEN 7",laps:175},
    {week:5,date:"2026-09-21",track:"CHARLOTTE",car:"GEN 7",laps:175},
    {week:6,date:"2026-09-28",track:"TEXAS",car:"TRUCKS",laps:175},
    {week:7,date:"2026-10-05",track:"AUTO CLUB",car:"ARCA",laps:100},
    {week:8,date:"2026-10-12",track:"TALLADEGA",car:"TRUCKS",laps:100},
    {week:9,date:"2026-10-19",track:"HOMESTEAD-MIAMI",car:"GEN 7",laps:175},
    {week:10,date:"2026-10-26",track:"MICHIGAN",car:"TRUCKS",laps:125},
    {week:11,date:"2026-11-02",track:"INDIANAPOLIS",car:"ARCA",laps:80},
    {week:12,date:"2026-11-09",track:"IRACING SUPERSPEEDWAY",car:"TRUCKS",laps:100},
    {week:13,date:"2026-11-16",track:"KANSAS",car:"GEN 7",laps:175},
    {week:14,date:"2026-11-23",track:"LAS VEGAS",car:"TRUCKS",laps:175},
    {week:15,date:"2026-11-30",track:"DAYTONA",car:"ARCA",laps:100},
    {week:16,date:"2026-12-07",track:"TALLADEGA",car:"GEN 7",laps:100,finale:true}
  ]
};

function etParts(date){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:ZONE,year:"numeric",month:"2-digit",day:"2-digit",
    weekday:"short",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
  }).formatToParts(date);
  const out={};
  parts.forEach(p=>{if(p.type!=="literal")out[p.type]=p.value});
  return {
    year:Number(out.year),month:Number(out.month),day:Number(out.day),
    hour:Number(out.hour),minute:Number(out.minute),second:Number(out.second),
    weekday:out.weekday
  };
}
function dateKey(p){
  return p.year+"-"+String(p.month).padStart(2,"0")+"-"+String(p.day).padStart(2,"0");
}
function raceForToday(now){
  const p=etParts(now),key=dateKey(p);
  for(const league of ["sunday","monday"]){
    const race=SCHEDULES[league].find(r=>r.date===key);
    if(race)return {league,race,parts:p};
  }
  return null;
}
function secondsSinceMidnight(p){return p.hour*3600+p.minute*60+p.second}
function phaseFor(today){
  const sec=secondsSinceMidnight(today.parts);
  const green=START_HOUR*3600+START_MINUTE*60;
  const countdown=green-COUNTDOWN_MINUTES*60;
  const liveEnd=LIVE_END_HOUR*3600;
  if(sec<countdown)return "raceday";
  if(sec<green)return "countdown";
  if(sec<liveEnd)return "live";
  return "off";
}
  const shortDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric"
  });
  let schedule, dayKey, event, phase, interval;
  function write(id, value) {
    const el = byId(id);
    if (el.textContent !== value) el.textContent = value;
  }
  function renderEvent(now) {
    const {league, race} = event;
    write("rwRound", (race.finale ? "Season finale · " : "") + "Round " + race.week);
    write("rwSeries", league + " Night League");
    write("rwTrack", race.track);
    write("rwDescription", race.description || "");
    byId("rwLength").parentElement.hidden = !Number(race.miles);
    write("rwCar", race.car || "TBA");
    write("rwLaps", String(race.laps || "TBA"));
    write("rwLength", Number(race.miles) > 0 ? Number(race.miles) + " mi" : "TBA");
    write("rwDate", shortDate.format(now));
    byId("rwDate").dateTime = race.date;
    byId("rwPreview").href = "/race-preview/?league=" + league;
  }
  function update() {
    if (document.hidden) return;
    const now = new Date();
    const parts = etParts(now);
    const date = dateKey(parts);
    if (date !== dayKey) {
      dayKey = date;
      event = raceForToday(now);
      phase = null;
      document.body.classList.remove("rn-sunday", "rn-monday", "rn-raceday", "rn-countdown", "rn-live");
      document.body.classList.toggle("rn-active", Boolean(event));
      panel.hidden = !event;
      if (event) {
        document.body.classList.add("rn-" + event.league);
        const detail = schedule?.leagues?.[event.league]?.find(row => row.date === date && !row.off);
        event.race = {...event.race, ...detail};
        renderEvent(now);
      }
    }
    if (!event) return;
    event.parts = parts;
    const mode = phaseFor(event);
    const greenFlag = "8:30 PM ET";
    const left = (START_HOUR * 60 + START_MINUTE) * 60 - secondsSinceMidnight(parts);
    const isTiming = mode === "live" && byId("ngLivePanel")?.dataset.status === "active";
    const nextPhase = mode === "raceday" ? "Race day" : mode === "countdown" ? "Final hour" : isTiming ? "Timing live" : "Race night";
    if (phase !== nextPhase) {
      phase = nextPhase;
      for (const name of ["raceday", "countdown", "live"]) {
        document.body.classList.toggle("rn-" + name, name === mode);
      }
      write("rwPhase", phase);
      write("rwGreen", greenFlag);
      write("rwBoardLabel", left > 0 ? "Time to green" : isTiming ? "Live scoring lap" : "Timing feed");
      write("rwDetailLabel", isTiming ? "Race leader" : "Points leader");
      panel.dataset.phase = isTiming ? "timing" : left <= 0 ? "night" : "prerace";
    }
    if (left > 0) {
      const clock = [Math.floor(left / 3600), Math.floor(left % 3600 / 60), left % 60];
      write("rwClock", clock.map(v => String(v).padStart(2, "0")).join(":"));
    } else {
      write("rwClock", isTiming ? "Lap " + byId("ngLiveLap").textContent : "Awaiting timing");
    }
    const source = isTiming ? byId("ngLiveLeader") : byId(event.league === "sunday" ? "homeSundayLeader" : "homeMondayLeader");
    const name = source?.textContent.trim();
    write("rwDetail", name && !/^(connecting[… .]*|--|—)$/i.test(name) ? name : "Pending");
  }
  function resume() {
    clearInterval(interval);
    if (!document.hidden) {
      update();
      interval = setInterval(update, 1000);
    }
  }
  document.addEventListener("hlrn:home-schedule", ({detail}) => {
    if (!detail?.leagues) return;
    schedule = detail;
    dayKey = null;
    resume();
  });
  document.addEventListener("visibilitychange", resume);
  resume();
})();
