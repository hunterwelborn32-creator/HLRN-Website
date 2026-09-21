(() => {
  const script = document.currentScript;
  if (!script) return;

  const base = new URL('../', script.src);
  const to = (p='') => new URL(p, base).href;
  const path = location.pathname.toLowerCase();

  const active =
    path.includes('/live/') ? 'live' :
    path.includes('/standings/') ? 'standings' :
    path.includes('/schedule/') ? 'schedule' :
    path.includes('/results/') ? 'results' :
    path.includes('/drivers/') ? 'drivers' :
    path.includes('/fantasy/') ? 'fantasy' :
    path.includes('/news/') ? 'news' :
    path.includes('/rules/') ? 'rules' :
    path.includes('/broadcasters/') ? 'broadcasters' :
    path.includes('/store/') ? 'store' :
    'home';

  const primaryItems = [
    ['home','Home',''],
    ['live','Live','live/'],
    ['standings','Standings','standings/'],
    ['schedule','Schedule','schedule/'],
    ['results','Results','results/'],
    ['drivers','Drivers','drivers/'],
    ['fantasy','Fantasy','fantasy/'],
    ['news','News','news/']
  ];

  const moreItems = [
    ['rules','Rules','rules/'],
    ['broadcasters','Broadcasters','broadcasters/'],
    ['store','Store','store/']
  ];

  const moreActive = moreItems.some(([k]) => active === k);

  const nav = document.createElement('nav');
  nav.id = 'hlrn-global-nav';
  nav.setAttribute('aria-label','HLRN primary navigation');

  nav.innerHTML = `
    <div class="hgn-inner">
      <a class="hgn-brand" href="${to('')}">
        <span class="hgn-mark">HL</span>
        <span class="hgn-name">
          High Line Racing Network
          <small>HLRN // Official Network</small>
        </span>
      </a>

      <div class="hgn-links">
        ${primaryItems.map(([k,l,p]) =>
          `<a class="hgn-link ${active===k?'active':''}" href="${to(p)}">${l}</a>`
        ).join('')}

        <div class="hgn-more-wrap ${moreActive?'active':''}">
          <button
            class="hgn-link hgn-more-btn ${moreActive?'active':''}"
            type="button"
            aria-haspopup="true"
            aria-expanded="false"
          >
            More
            <span class="hgn-more-arrow" aria-hidden="true">▾</span>
          </button>

          <div class="hgn-more-menu" role="menu">
            ${moreItems.map(([k,l,p]) =>
              `<a
                class="hgn-more-item ${active===k?'active':''}"
                href="${to(p)}"
                role="menuitem"
              >${l}</a>`
            ).join('')}
          </div>
        </div>
      </div>

      <a class="hgn-live" href="${to('live/')}">
        <i></i> Race Center
      </a>

      <button
        class="hgn-menu"
        type="button"
        aria-label="Open navigation"
        aria-expanded="false"
      >☰</button>
    </div>

    <div class="hgn-mobile">
      ${primaryItems.map(([k,l,p]) =>
        `<a class="${active===k?'active':''}" href="${to(p)}">${l}</a>`
      ).join('')}

      <button
        class="hgn-mobile-more"
        type="button"
        aria-expanded="false"
      >
        More
        <span>▾</span>
      </button>

      <div class="hgn-mobile-more-menu">
        ${moreItems.map(([k,l,p]) =>
          `<a class="${active===k?'active':''}" href="${to(p)}">${l}</a>`
        ).join('')}
      </div>
    </div>
  `;

  document.body.insertBefore(nav, document.body.firstChild);

  /* ---------------- Desktop MORE dropdown ---------------- */
  const moreWrap = nav.querySelector('.hgn-more-wrap');
  const moreBtn = nav.querySelector('.hgn-more-btn');

  const openMore = () => {
    if (!moreWrap || !moreBtn) return;
    moreWrap.classList.add('open');
    moreBtn.setAttribute('aria-expanded','true');
  };

  const closeMore = () => {
    if (!moreWrap || !moreBtn) return;
    moreWrap.classList.remove('open');
    moreBtn.setAttribute('aria-expanded','false');
  };

  moreBtn?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const open = !moreWrap.classList.contains('open');
    if (open) openMore();
    else closeMore();
  });

  moreWrap?.addEventListener('mouseenter', openMore);
  moreWrap?.addEventListener('mouseleave', closeMore);

  moreWrap?.addEventListener('focusin', openMore);
  moreWrap?.addEventListener('focusout', (ev) => {
    if (!moreWrap.contains(ev.relatedTarget)) closeMore();
  });

  document.addEventListener('click', (ev) => {
    if (moreWrap && !moreWrap.contains(ev.target)) closeMore();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      closeMore();
      mobileMoreMenu?.classList.remove('open');
      mobileMoreBtn?.setAttribute('aria-expanded','false');
    }
  });

  /* ---------------- Mobile navigation ---------------- */
  const btn = nav.querySelector('.hgn-menu');
  const mobile = nav.querySelector('.hgn-mobile');

  btn?.addEventListener('click', () => {
    const open = mobile.classList.toggle('open');
    btn.setAttribute('aria-expanded',String(open));
    btn.textContent = open ? '×' : '☰';
  });

  const mobileMoreBtn = nav.querySelector('.hgn-mobile-more');
  const mobileMoreMenu = nav.querySelector('.hgn-mobile-more-menu');

  mobileMoreBtn?.addEventListener('click', () => {
    const open = mobileMoreMenu.classList.toggle('open');
    mobileMoreBtn.classList.toggle('open', open);
    mobileMoreBtn.setAttribute('aria-expanded',String(open));
  });

  /* ---------------- Old link migration ---------------- */
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;

    let u;
    try {
      u = new URL(a.href, location.href);
    } catch {
      return;
    }

    const host = u.hostname.toLowerCase();
    const p = u.pathname.toLowerCase();
    let dest = null;

    if (host === 'sites.google.com' && p.includes('/view/highlineracingnetwork')) {
      if (p.includes('/standings')) dest = 'standings/';
      else if (p.includes('/schedule')) dest = 'schedule/';
      else if (p.includes('/meet-our-team') || p.includes('/driver')) dest = 'drivers/';
      else if (p.includes('/news')) dest = 'news/';
      else if (p.includes('/rules')) dest = 'rules/';
      else if (p.includes('/broadcast')) dest = 'broadcasters/';
      else if (p.includes('/store')) dest = 'store/';
      else dest = '';
    } else if (host === 'hlrn-live-feed.onrender.com') {
      dest = 'live/';
    }

    if (dest !== null) {
      ev.preventDefault();
      location.href = to(dest);
    }
  }, true);
})();
