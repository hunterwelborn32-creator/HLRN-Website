
(() => {
  const script = document.currentScript;
  if (!script) return;
  const base = new URL('../', script.src);
  const to = (p='') => new URL(p, base).href;
  const path = location.pathname.toLowerCase();
  const active = path.includes('/live/') ? 'live' : path.includes('/standings/') ? 'standings' : path.includes('/schedule/') ? 'schedule' : path.includes('/results/') ? 'results' : path.includes('/drivers/') ? 'drivers' : path.includes('/fantasy/') ? 'fantasy' : path.includes('/news/') ? 'news' : path.includes('/rules/') ? 'rules' : 'home';
  const items = [
    ['home','Home',''],['live','Live','live/'],['standings','Standings','standings/'],['schedule','Schedule','schedule/'],['results','Results','results/'],['drivers','Drivers','drivers/'],['fantasy','Fantasy','fantasy/'],['news','News','news/'],['rules','Rules','rules/']
  ];
  const nav = document.createElement('nav');
  nav.id = 'hlrn-global-nav';
  nav.setAttribute('aria-label','HLRN primary navigation');
  nav.innerHTML = `<div class="hgn-inner">
    <a class="hgn-brand" href="${to('')}"><span class="hgn-mark">HL</span><span class="hgn-name">High Line Racing Network<small>HLRN // Official Network</small></span></a>
    <div class="hgn-links">${items.map(([k,l,p])=>`<a class="hgn-link ${active===k?'active':''}" href="${to(p)}">${l}</a>`).join('')}</div>
    <a class="hgn-live" href="${to('live/')}"><i></i> Race Center</a>
    <button class="hgn-menu" type="button" aria-label="Open navigation" aria-expanded="false">☰</button>
  </div><div class="hgn-mobile">${items.map(([k,l,p])=>`<a class="${active===k?'active':''}" href="${to(p)}">${l}</a>`).join('')}</div>`;
  document.body.insertBefore(nav, document.body.firstChild);
  const btn = nav.querySelector('.hgn-menu');
  const mobile = nav.querySelector('.hgn-mobile');
  btn?.addEventListener('click',()=>{const open=mobile.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));btn.textContent=open?'×':'☰';});

  // Keep old HLRN Google Sites links inside the new standalone site during migration.
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    let u; try { u = new URL(a.href, location.href); } catch { return; }
    const host = u.hostname.toLowerCase();
    const p = u.pathname.toLowerCase();
    let dest = null;
    if (host === 'sites.google.com' && p.includes('/view/highlineracingnetwork')) {
      if (p.includes('/standings')) dest = 'standings/';
      else if (p.includes('/schedule')) dest = 'schedule/';
      else if (p.includes('/meet-our-team') || p.includes('/driver')) dest = 'drivers/';
      else if (p.includes('/news')) dest = 'news/';
      else if (p.includes('/rules')) dest = 'rules/';
      else dest = '';
    } else if (host === 'hlrn-live-feed.onrender.com') {
      dest = 'live/';
    }
    if (dest !== null) { ev.preventDefault(); location.href = to(dest); }
  }, true);
})();
