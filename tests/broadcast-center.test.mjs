import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function element(dataset = {}) {
  const classes = new Set();
  const listeners = new Map();
  return {
    dataset, style: {}, hidden: false, textContent: '', href: '',
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, force) {
        const use = force === undefined ? !classes.has(name) : force;
        if (use) classes.add(name); else classes.delete(name);
        return use;
      }
    },
    addEventListener: (event, handler) => listeners.set(event, handler),
    click() { listeners.get('click')?.(); },
    querySelector: () => element(),
    removeAttribute(name) { delete this[name]; },
    replaceChildren() {},
    append() {}
  };
}

test('Watch HLRN loads schedule, replays, league tabs, result links and filters', async () => {
  const registered = new Map();
  const nodes = new Map();
  const ids = [
    'bcMainPlayer','bcSundayMainFallback','bcSundayReplayFallback',
    'bcPlayerStatus','bcPlayerSub','bcPlayerTitle','bcPlayerDesc',
    'bcYoutubeLink','bcResultsLink','bcNetworkFlag','bcNetworkHeadline',
    'bcNetworkMeta','bcSundayReplayTitle','bcSundayReplayFoot',
    'bcMomentsStatus','bcMomentsList'
  ];
  for (const name of ids) nodes.set('#' + name, element());
  nodes.get('#bcNetworkHeadline').textContent = 'CONNECTING';
  const tabs = [element({ series: 'sunday' }), element({ series: 'monday' })];
  const filters = [
    element({ filter: 'all' }), element({ filter: 'sunday' }),
    element({ filter: 'monday' })
  ];
  const cards = [element({ series: 'sunday' }), element({ series: 'monday' })];
  const links = [
    element({ resultsSeries: 'sunday' }),
    element({ resultsSeries: 'monday' })
  ];
  const frames = {
    sunday: element(), monday: element()
  };
  const location = {
    href: 'https://highlineracingnetwork.com/broadcasters/',
    search: ''
  };
  const document = {
    addEventListener: (event, handler) => registered.set(event, handler),
    querySelector(selector) {
      if (nodes.has(selector)) return nodes.get(selector);
      const frame = selector.match(/^\[data-replay-frame="(sunday|monday)"\]$/);
      if (frame) return frames[frame[1]];
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.bc-tab') return tabs;
      if (selector === '.bc-filter') return filters;
      if (selector === '.bc-person,.bc-replay-card') return cards;
      if (selector === '[data-results-series]') return links;
      return [];
    },
    createElement: () => element()
  };
  const fetch = async url => {
    if (String(url).includes('broadcasts.json'))
      return {
        ok: true, json: async () => ({
          sunday: { channelId: 'UCaxHNmaiYiKsZYLtqhhgfHg',
            latestReplay: { videoId: '456R6ISycD8', title: 'HLRN Sunday League Race at Daytona' } }
        })
      };
    if (String(url).includes('hlrn.json'))
      return {
        ok: true, json: async () => ({
          leagues: {
            sunday: { results: [{ raceNumber: 5, track: 'Daytona' }] },
            monday: { results: [{ raceNumber: 8, track: 'Charlotte' }] }
          }
        })
      };
    return { ok: true, json: async () => ({ replays: [] }) };
  };
  const context = {
    document, location, URL, URLSearchParams, Date, Intl,
    console: { warn() {} }, fetch, setInterval() {},
    history: {
      replaceState(_state, _title, href) {
        location.href = String(href);
        location.search = new URL(location.href).search;
      }
    }
  };
  const source = readFileSync(new URL('../assets/broadcast-center/broadcast-center.js', import.meta.url), 'utf8');
  runInNewContext(source, context, { filename: 'broadcast-center.js' });
  const initialize = registered.get('DOMContentLoaded');
  assert.equal(typeof initialize, 'function');
  assert.doesNotThrow(initialize, 'startup must not call obsolete archive controls or forEach on a single element');
  assert.notEqual(nodes.get('#bcNetworkHeadline').textContent, 'CONNECTING');
  assert.equal(tabs.filter(tab => tab.classList.contains('active')).length, 1);

  await new Promise(resolve => setImmediate(resolve));
  assert.match(frames.sunday.src, /youtube\.com\/embed\/456R6ISycD8/);
  assert.match(links[0].href, /league=sunday&race=5/);
  assert.match(links[1].href, /league=monday&race=8/);

  tabs[1].click();
  assert.match(location.search, /league=monday/);
  assert.equal(tabs[1].classList.contains('active'), true);
  assert.match(nodes.get('#bcYoutubeLink').href, /rsibroadcasting/);
  filters[1].click();
  assert.equal(cards[0].style.display, '');
  assert.equal(cards[1].style.display, 'none');
  filters[0].click();
  assert.equal(cards[1].style.display, '');
});
