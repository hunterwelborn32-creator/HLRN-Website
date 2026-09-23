/* HLRN Adventures: approved published stories + Hunter's in-progress cards. */
(async () => {
  const shelf = document.querySelector('.episode-shelf');
  if (!shelf) return;
  const get = async file => {
    const r = await fetch(file, {cache:'no-store'});
    if (!r.ok) return [];
    const x = await r.json();
    return Array.isArray(x) ? x : [];
  };
  const clean = e => e && typeof e.id === 'string' && /^[-a-z0-9]+$/.test(e.id) && typeof e.title === 'string';
  try {
    const [published, progress] = await Promise.all([get('episodes.json'), get('episode-status.json')]);
    const ready = published.filter(clean);
    const pending = progress.filter(clean).filter(e => !ready.some(r => r.id === e.id));
    if (!ready.length && !pending.length) return;
    shelf.querySelectorAll('.episode-tile.coming, .episode-tile[data-adventure-auto]').forEach(n => n.remove());
    const add = (e, inProgress) => {
      if (e.id === 'episode-01') return; // preserve existing manually approved artwork + card
      const el = document.createElement(inProgress ? 'article' : 'a');
      el.className = 'episode-tile ' + (inProgress ? 'coming' : 'ready');
      el.dataset.adventureAuto = 'true';
      el.dataset.adventureId = e.id;
      if (!inProgress) el.href = e.id + '/';
      const art = document.createElement('div');
      art.className = 'episode-art' + (inProgress ? ' placeholder-art' : '');
      if (inProgress) {
        const numeral = document.createElement('span'); numeral.className = 'ghost-number'; numeral.textContent = e.kind === 'special' ? '★' : String(e.number ?? '?').padStart(2, '0'); art.append(numeral);
      } else {
        const img = document.createElement('img'); img.loading = 'lazy'; img.alt = e.title + ' artwork'; img.src = e.cover || e.id + '/images/001.webp'; art.append(img);
        const play = document.createElement('div'); play.className = 'play-symbol'; play.textContent = '▶'; art.append(play);
      }
      const badge = document.createElement('span'); badge.className = 'episode-numeral'; badge.textContent = e.kind === 'special' ? 'SPECIAL' : String(e.number ?? '').padStart(2,'0'); art.append(badge);
      const info = document.createElement('div'); info.className = 'episode-details';
      const status = document.createElement('span'); status.className = 'episode-status' + (inProgress ? '' : ' available'); status.textContent = inProgress ? '🟢 IN PROGRESS' : (e.kind === 'special' ? 'SPECIAL EPISODE' : 'AVAILABLE NOW');
      const h = document.createElement('h3'); h.textContent = e.title;
      const p = document.createElement('p'); p.textContent = inProgress ? 'A new HLRN adventure is underway. The full story will be available after Hunter approves the final installment.' : 'Read the complete illustrated Adventure of High Line.';
      const footer = document.createElement('div'); footer.className = 'episode-bottom'; footer.textContent = inProgress ? 'STORY IN PROGRESS' : 'READ EPISODE ↗';
      info.append(status,h,p,footer); el.append(art,info); shelf.append(el);
    };
    // Keep main episodes ordered, with specials separated by their own label.
    const sort = (a,b) => (a.kind === 'special') - (b.kind === 'special') || (a.number ?? 999) - (b.number ?? 999);
    [...ready].sort(sort).forEach(e => add(e,false));
    [...pending].sort(sort).forEach(e => add(e,true));
    const count = document.querySelector('.episode-total');
    if (count) count.textContent = (1 + ready.filter(e=>e.kind==='main' && e.id!=='episode-01').length) + ' MAIN EPISODES · ' + ready.filter(e=>e.kind==='special').length + ' SPECIALS' + (pending.length ? ' · '+pending.length+' IN PROGRESS' : '');
  } catch (err) { console.warn('HLRN Adventures sync unavailable:', err); }
})();
