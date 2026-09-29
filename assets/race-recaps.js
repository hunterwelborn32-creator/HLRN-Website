(() => {
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);

  const load = async () => {
    try {
      const res = await fetch("/data/race-recaps/index.json?v=" + Date.now(), {cache:"no-store"});
      if(!res.ok) throw new Error("recap index unavailable");
      const data = await res.json();
      const recaps = Array.isArray(data?.recaps) ? data.recaps : [];
      renderHome(recaps);
      renderNews(recaps);
      renderArchive(recaps);
    } catch(err) {
      document.querySelectorAll("[data-race-recaps-loading]").forEach(el => {
        el.textContent = "Race recaps will appear here after the next completed HLRN race.";
      });
    }
  };

  const card = (item, compact=false) => {
    const winner=item?.winner||{};
    return `
      <a class="hlrn-recap-card ${compact?"compact":""}" href="${esc(item.url||"#")}">
        <div class="hlrn-recap-card-top">
          <span>RACE RECAP</span><b>${esc(item.series||"HLRN")}</b>
        </div>
        <div class="hlrn-recap-card-main">
          <small>${esc(item.displayDate||"")}</small>
          <h3>${esc(item.title||"HLRN Race Recap")}</h3>
          <p>${esc(item.subtitle||"")}</p>
        </div>
        <div class="hlrn-recap-card-foot">
          <span><strong>#${esc(winner.number||"—")}</strong> ${esc(winner.name||"Winner")}</span>
          <span>${esc(item.track||"")}</span>
          <b>READ STORY →</b>
        </div>
      </a>`;
  };

  const renderHome = recaps => {
    const section=document.getElementById("hlrnLatestRaceRecapSection");
    const mount=document.getElementById("hlrnLatestRaceRecap");
    if(!section||!mount) return;
    if(!recaps.length){ section.hidden=true; return; }
    section.hidden=false;
    mount.innerHTML=card(recaps[0],false);
  };

  const renderNews = recaps => {
    const section=document.getElementById("newsRaceRecaps");
    const grid=document.getElementById("newsRaceRecapsGrid");
    if(!section||!grid) return;
    if(!recaps.length){
      grid.innerHTML='<div class="hlrn-recap-empty" data-race-recaps-loading>Race recaps will appear here after the next completed HLRN race.</div>';
      return;
    }
    grid.innerHTML=recaps.slice(0,4).map(x=>card(x,true)).join("");
  };

  const renderArchive = recaps => {
    const grid=document.getElementById("raceRecapArchiveGrid");
    const count=document.getElementById("raceRecapArchiveCount");
    if(!grid) return;
    if(count) count.textContent=`${recaps.length} PUBLISHED RECAP${recaps.length===1?"":"S"}`;
    if(!recaps.length){
      grid.innerHTML='<div class="hlrn-recap-empty" data-race-recaps-loading>No published race recaps yet. The archive will populate automatically after a real race is frozen at checkered.</div>';
      return;
    }
    grid.innerHTML=recaps.map(x=>card(x,false)).join("");
  };

  load();
})();