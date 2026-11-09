// Load the program only when a visitor opens it. Reuse it for subsequent visits on the page.
let dialog;
let opener;
let activeRequest = 0;
const easternDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year:"numeric", month:"2-digit", day:"2-digit"
});
const dateLabel = new Intl.DateTimeFormat("en-US", {
  timeZone:"UTC", weekday:"short", month:"short", day:"numeric"
});

function todayKey() {
  const parts = Object.fromEntries(easternDay.formatToParts(new Date()).map(p => [p.type, p.value]));
  return [parts.year, parts.month, parts.day].join("-");
}
function dateText(date) { return dateLabel.format(new Date(date + "T12:00:00Z")); }
function element(tag, text, cls) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function createDialog() {
  const d = element("dialog", null, "race-program");
  d.setAttribute("aria-labelledby", "rp-title");
  d.innerHTML = '<header class="rp-header"><h2 id="rp-title">Race program</h2><button type="button" class="rp-close" aria-label="Close race program">Close ×</button></header><div class="rp-body"></div>';
  d.querySelector(".rp-close").addEventListener("click", () => d.close());
  d.addEventListener("close", () => opener?.focus({preventScroll:true}));
  d.addEventListener("click", event => {
    if (event.target !== d) return;
    const rect = d.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom) d.close();
  });
  document.body.append(d);
  return d;
}
function action(text, path, root) {
  const a = element("a", text);
  a.href = new URL(path, root);
  return a;
}
function draw(schedule, root, body) {
  const today = todayKey();
  const races = ["sunday","monday"].flatMap(league =>
    (schedule.leagues[league] || []).filter(r => !r.off && r.track && /^\d{4}-\d\d-\d\d$/.test(r.date) && r.date >= today)
      .map(r => ({...r, league}))
  ).sort((a,b) => a.date.localeCompare(b.date));
  if (!races.length) {
    body.replaceChildren(element("p","The next race hasn’t been announced.","rp-message"),action("View latest results →","results/",root));
    return;
  }
  const picker = element("label", "Upcoming races", "rp-picker");
  const select = element("select");
  races.forEach((race,i) => select.add(new Option(dateText(race.date) + " · " + race.track, String(i))));
  picker.append(select);
  const feature = element("section", null, "rp-feature");
  feature.setAttribute("aria-live","polite");
  function choose() {
    const r = races[select.selectedIndex];
    const art = element("div", null, "rp-art");
    art.dataset.vehicle = /truck/i.test(r.car || "") ? "truck" : "stock";
    art.setAttribute("aria-hidden","true");
    const copy = element("div",null,"rp-copy");
    const leagueName = r.league === "sunday" ? "Sunday Night League" : "Monday Night League";
    copy.append(element("p", leagueName + (r.week ? " · Round " + r.week : ""), "rp-series"),
      element("h3",r.track), element("p", dateText(r.date) + " · " + (schedule.greenFlag || "8:30 PM ET"),"rp-start"));
    if (r.description) copy.append(element("p",r.description,"rp-description"));
    const facts = element("dl",null,"rp-facts");
    for (const [name,value] of [["Car class",r.car],["Laps",r.laps],["Track length",Number(r.miles)>0 ? Number(r.miles)+" mi":null],["Banking",r.banking],["Tire sets",r.tires]]) {
      if (value == null || value === "") continue;
      const cell = element("div"); cell.append(element("dt",name),element("dd",value)); facts.append(cell);
    }
    const links = element("nav",null,"rp-links");
    links.setAttribute("aria-label","Race program links");
    links.append(action("Watch HLRN →","broadcasters/",root),action("League preview →","race-preview/?league="+r.league,root),action("Timing →","live/",root));
    feature.replaceChildren(art,copy,facts,links);
  }
  select.addEventListener("change",choose);
  body.replaceChildren(picker,feature);
  choose();
}
export function openRaceProgram(root, trigger) {
  if (!dialog) dialog = createDialog();
  if (dialog.open) return;
  opener = trigger;
  const body = dialog.querySelector(".rp-body");
  body.replaceChildren(element("p","Loading the race schedule…","rp-message"));
  dialog.showModal();
  dialog.querySelector(".rp-close").focus();
  const token = ++activeRequest;
  fetch(new URL("data/schedules-2026.json",root),{cache:"default"}).then(r => {
    if (!r.ok) throw new Error("Schedule unavailable");
    return r.json();
  }).then(schedule => {
    if (token === activeRequest && dialog.open) draw(schedule,root,body);
  }).catch(() => {
    if (token !== activeRequest || !dialog.open) return;
    body.replaceChildren(element("p","The race schedule is temporarily unavailable.","rp-message"),action("Open Race Preview →","race-preview/",root));
  });
}
