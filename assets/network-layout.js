/* Shared section navigation for the full site and its standalone pages. */
(() => {
  "use strict";
  const script = document.currentScript;
  if (!script || document.documentElement.hasAttribute("data-network-layout")) return;
  const root = new URL("../", script.src);
  const path = location.pathname.slice(root.pathname.length).replace(/(?:^|\/)index\.html$/, "");
  const parts = path.split("/").filter(Boolean);
  const section = parts[0] || "home";
  const html = document.documentElement;
  const standalone = script.hasAttribute("data-standalone");
  const labels = {
    "home":"Home", "live":"Live timing", "racing":"Mini racing",
    "results":"Race results","race-preview":"Race preview",
    "race-intelligence":"Race intelligence",
    "drivers":"Driver roster", "team-pages":"Team headquarters", "standings":"Standings",
    "adventures":"Adventures", "news":"Race recaps", "broadcasters":"Broadcasts",
    "store":"Store", "meet-the-admins":"Meet the admins", "rules":"Rulebook",
    "control-center":"Network control", "my-hlrn":"My HLRN", "foundation-check.html":"Site diagnostics"
  };
  const key = labels[section] ? section : "404";
  const label = labels[key] || "Page not found";
  const grouped = [
    ["competition", ["standings","results","race-preview"]],
    ["timing", ["live","racing","race-intelligence"]],
    ["garage", ["drivers","team-pages","my-hlrn","meet-the-admins"]],
    ["features", ["news","broadcasters","adventures","store"]],
  ];
  html.dataset.networkLayout = key;
  html.dataset.networkGroup = grouped.find(([, routes]) => routes.includes(key))?.[0] || "network";
  const sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = new URL("network-layout.css?v=20261110carart1", script.src);
  document.head.append(sheet);

  let themeButton;
  function readTheme() {
    try { return localStorage.getItem("hlrn_site_theme_v2") === "dark" ? "dark" : "light"; }
    catch { return html.dataset.hlrnTheme === "dark" ? "dark" : "light"; }
  }
  function setTheme(theme) {
    html.dataset.hlrnTheme = theme;
    html.style.colorScheme = theme;
    if (themeButton) {
      themeButton.textContent = theme === "dark" ? "Night mode" : "Day mode";
      themeButton.setAttribute("aria-checked", String(theme === "dark"));
    }
  }
  if (standalone) {
    html.dataset.networkStandalone = "";
    setTheme(readTheme());
    window.addEventListener("storage", event => {
      if (event.key === "hlrn_site_theme_v2" || event.key === null) setTheme(readTheme());
    });
  }
  // Keep embedded scoring views and the homepage takeover free of an extra navigation row.
  if (window.self !== window.top) return;
  const programModule = new URL("race-program.js?v=1", script.src).href;
  document.addEventListener("click", async event => {
    const trigger = event.target.closest?.("a[data-race-program]");
    if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    try {
      const { openRaceProgram } = await import(programModule);
      openRaceProgram(root, trigger);
    } catch {
      location.assign(trigger.href);
    }
  });
  if (key === "home") return;
  const related = {
    competition:["race-preview","results","standings"],
    timing:["live","racing","race-intelligence"],
    garage:["drivers","team-pages","my-hlrn"],
    features:["broadcasters","adventures","store"],
    network:["rules","meet-the-admins","broadcasters"]
  };
  function link(text, target) {
    const a = document.createElement("a");
    a.textContent = text;
    a.href = new URL(target, root);
    return a;
  }
  const bar = document.createElement("nav");
  bar.className = "network-section-bar";
  bar.setAttribute("aria-label", "Section navigation");
  const trail = document.createElement("div");
  trail.className = "network-trail";
  trail.append(link("HLRN", "./"));
  const nested = parts.length > 1 && key !== "news";
  const current = nested ? link(label, key + "/") : document.createElement("span");
  current.textContent = label;
  if (!nested) current.setAttribute("aria-current", "page");
  trail.append(current);
  const actions = document.createElement("div");
  actions.className = "network-related";
  const links = related[html.dataset.networkGroup].filter(name => name !== key).slice(0, 2);
  for (const name of links) {
    const target = name + "/";
    actions.append(link(labels[name], target));
  }
  const programLink = link("Race program", "race-preview/");
  programLink.dataset.raceProgram = "";
  programLink.setAttribute("aria-haspopup", "dialog");
  actions.prepend(programLink);
  if (standalone) {
    themeButton = document.createElement("button");
    themeButton.type = "button";
    themeButton.setAttribute("role", "switch");
    themeButton.setAttribute("aria-label", "Night mode");
    setTheme(readTheme());
    themeButton.addEventListener("click", () => {
      const next = html.dataset.hlrnTheme === "dark" ? "light" : "dark";
      try { localStorage.setItem("hlrn_site_theme_v2", next); } catch {}
      setTheme(next);
    });
    actions.append(themeButton);
  }
  const back = document.getElementById("hlrn-team-return");
  if (back) actions.append(back);
  bar.append(trail, actions);
  const header = document.getElementById("hlrn-global-nav");
  if (header) header.after(bar);
  else document.body.prepend(bar);
})();
