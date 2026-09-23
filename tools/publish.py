#!/usr/bin/env python3
"""HLRN Adventures Discord -> GitHub Pages collector. Python stdlib only.

Runs inside GitHub Actions. Reads channel history oldest to newest, only Jim's posts.
A confirmed END reaction from the designated publisher closes an episode. Historical opening markers
are specific and configurable; unknown openings are skipped, never guessed.
"""
import os, json, re, sys, time, pathlib, urllib.request, urllib.error, mimetypes, html, http.client, socket
from datetime import datetime, timezone

BASE=pathlib.Path(__file__).resolve().parents[1]
DEST=BASE/'adventures'
CHANNEL=os.getenv('DISCORD_CHANNEL_ID','1528189461656244364')
AUTHOR=os.getenv('JIM_USER_ID','1051673096463077386')
APPROVER=os.getenv('PUBLISH_APPROVER_USER_ID','897239790188109874')
TOKEN=os.getenv('DISCORD_BOT_TOKEN')
if not TOKEN: sys.exit('Missing DISCORD_BOT_TOKEN repository secret; no changes made.')
API='https://discord.com/api/v10'
HEADERS={'Authorization':'Bot '+TOKEN,'User-Agent':'HLRN-Adventures-Collector/1.0'}
CONFIG=json.loads((BASE/'tools'/'episode-rules.json').read_text(encoding='utf8'))
STATE=DEST/'discord-state.json'
MANIFEST=DEST/'episodes.json'
PROGRESS=DEST/'episode-status.json'

def request(url, auth=True, expected_size=None):
    """Retry rate limits, transient HTTP errors and interrupted image downloads."""
    headers = HEADERS if auth else {'User-Agent': 'HLRN-Adventures-Collector/1.0'}
    for attempt in range(7):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=45) as r:
                content = r.read()
                if expected_size is not None and len(content) != expected_size:
                    raise http.client.IncompleteRead(content, expected_size - len(content))
                return content
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                try:
                    delay = float(json.loads(exc.read()).get('retry_after', 2))
                except Exception:
                    delay = 2
                time.sleep(min(delay + 0.3, 60))
                continue
            if exc.code >= 500 and attempt < 6:
                print(f'Temporary HTTP {exc.code}; retrying download ({attempt + 1}/7)', flush=True)
                time.sleep(min(2 ** attempt, 12))
                continue
            raise RuntimeError(f'Download failed HTTP {exc.code} at {url.split("?")[0]}') from exc
        except (http.client.IncompleteRead, http.client.RemoteDisconnected,
                ConnectionResetError, BrokenPipeError, TimeoutError,
                socket.timeout, urllib.error.URLError) as exc:
            if attempt == 6:
                raise RuntimeError(f'Download failed after 7 attempts at {url.split("?")[0]}: {exc}') from exc
            print(f'Interrupted download; retrying ({attempt + 1}/7): {type(exc).__name__}', flush=True)
            time.sleep(min(2 ** attempt, 12))
    raise RuntimeError('Download retries exceeded')

def api(path): return json.loads(request(API+path))
def load(path,default):
    try:return json.loads(path.read_text(encoding='utf8'))
    except FileNotFoundError:return default

def save(path,object_):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(object_,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def history():
    # Discord returns newest first. Scan channel history, not just a recent window.
    before=None; all_messages=[]
    while True:
        url=f'/channels/{CHANNEL}/messages?limit=100'+(f'&before={before}' if before else '')
        batch=api(url)
        if not batch:break
        all_messages.extend(batch)
        before=batch[-1]['id']
        if len(batch)<100:break
        if len(all_messages)>20000:raise RuntimeError('More than 20,000 messages: set a manual historical cutoff before continuing.')
    all_messages.reverse()
    return [m for m in all_messages if m.get('author',{}).get('id')==AUTHOR and m.get('type',0)==0]

def opening(m):
    body=(m.get('content') or '').strip()
    # Historical stories use exact Discord opening message IDs. This avoids
    # fragile text matching when Discord resolves mentions as <@user_id>.
    # For ID-configured stories, do not fall back to regex on other posts.
    for spec in CONFIG['known_episodes']:
        if spec.get('opening_message_id') == m.get('id'):
            return spec
    for spec in CONFIG['known_episodes']:
        if spec.get('opening_message_id'):
            continue
        pattern = spec.get('opening_regex')
        if pattern and re.search(pattern,body,re.I):
            return spec
    match=re.match(r'^\s*(EPISODE|SPECIAL)\s*(?:#?\s*(\d+))?\s*[:\-–—]\s*(.+)',body,re.I)
    if match:
        kind='special' if match[1].lower()=='special' else 'main'
        number=int(match[2]) if kind=='main' and match[2] else None
        if kind=='main' and number is None:return None
        title=match[3].strip()
        if not title:return None
        slug=('episode-%02d'%number) if kind=='main' else 'special-'+re.sub('[^a-z0-9]+','-',title.lower()).strip('-')[:60]
        return dict(slug=slug,title=title,kind=kind,number=number)
    return None

def approved_reaction(m, emoji):
    """Only Hunter's reaction counts; check paginated Discord reaction users."""
    import urllib.parse
    if not any(r.get('emoji', {}).get('name') == emoji for r in m.get('reactions', [])):
        return False
    after = None
    while True:
        url = f'/channels/{CHANNEL}/messages/{m["id"]}/reactions/{urllib.parse.quote(emoji, safe="")}?limit=100'
        if after:
            url += f'&after={after}'
        users = api(url)
        if any(u.get('id') == APPROVER for u in users):
            return True
        if len(users) < 100:
            return False
        after = users[-1]['id']


def complete(m):
    return approved_reaction(m, '✅')


def begun(m):
    return approved_reaction(m, '🟢')

def image_attachment(a):
    ct=(a.get('content_type') or '').lower()
    ext=pathlib.Path(a.get('filename','')).suffix.lower()
    return ct.startswith('image/') or ext in {'.png','.jpg','.jpeg','.webp','.gif'}

def build_episode(spec,messages):
    slug=spec['slug']; directory=DEST/slug; image_dir=directory/'images'
    blocks=[]; image_count=0
    for m in messages:
        body=(m.get('content') or '').strip()
        if body:blocks.append(dict(type='text',text=body,message_id=m['id']))
        for a in m.get('attachments',[]):
            if not image_attachment(a):continue
            if a.get('size',0)>15_000_000:raise RuntimeError(f'Image too large in message {m["id"]}; not publishing partially')
            ext=pathlib.Path(a.get('filename','')).suffix.lower()
            if ext not in {'.png','.jpg','.jpeg','.webp','.gif'}:ext='.jpg'
            image_count+=1
            name=f'{image_count:03d}{ext}'
            image_dir.mkdir(parents=True,exist_ok=True)
            target=image_dir/name
            if not target.exists():target.write_bytes(request(a['url'],auth=False,expected_size=a.get('size') or None))
            blocks.append(dict(type='image',src='images/'+name,alt=a.get('description') or 'Adventure illustration'))
    if not blocks or not image_count:raise RuntimeError(f'{slug}: no images and/or content found; not publishing')
    cover=next((b['src'] for b in blocks if b['type']=='image'),None)
    data=dict(id=slug,title=spec['title'],kind=spec['kind'],number=spec.get('number'),discord_open_id=messages[0]['id'],discord_close_id=messages[-1]['id'],date=messages[0]['timestamp'],cover=slug+'/'+cover,blocks=blocks)
    save(directory/'episode.json',data)
    # For new episodes: full reader. Existing Episode 1 is intentionally untouched.
    if not (directory/'index.html').exists():
        parts=[]
        for b in blocks:
            if b['type']=='image':parts.append('<figure><img loading="lazy" src="'+html.escape(b['src'],quote=True)+'" alt="'+html.escape(b['alt'],quote=True)+'"></figure>')
            else:
                body=html.escape(b['text']).replace('\n','<br>')
                parts.append('<section class="story"><p>'+body+'</p></section>')
        page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'''+html.escape(spec['title'])+''' | The Adventures of High Line</title><link rel="stylesheet" href="../../assets/site-shell.css"><style>body{margin:0;background:#0a0b10;color:#f5f5f7;font:16px Arial,sans-serif}main{max-width:1040px;margin:auto;padding:30px 18px 90px}.back{color:#ff8291;font-weight:bold;text-decoration:none}h1{font-size:clamp(38px,6vw,76px);line-height:1;letter-spacing:-.04em;text-transform:uppercase}.tag{color:#ff697b;font-size:12px;letter-spacing:.18em;font-weight:900}.story{background:#171a21;border-left:4px solid #e52b42;padding:20px 26px;margin:24px 0;font-size:18px;line-height:1.8;white-space:normal;overflow-wrap:anywhere}.story p{margin:0}figure{margin:26px 0}figure img{display:block;width:100%;height:auto;border-radius:8px}footer{padding:35px;text-align:center;color:#aaa}</style></head><body><main><a class="back" href="../">← ALL EPISODES</a><p class="tag">HLRN ORIGINAL · '''+('SPECIAL' if spec['kind']=='special' else 'EPISODE '+str(spec['number']))+'''</p><h1>'''+html.escape(spec['title'])+'''</h1>'''+''.join(parts)+'''</main><footer>THE ADVENTURES OF HIGH LINE</footer><script src="../../assets/site-shell.js"></script></body></html>'''
        (directory/'index.html').write_text(page,encoding='utf8')
    return {k:data[k] for k in ('id','title','kind','number','cover','date')}

def inject_home_script():
    page=DEST/'index.html'
    if not page.exists():raise RuntimeError('Missing adventures/index.html. Upload the existing Netflix-style homepage first.')
    content=page.read_text(encoding='utf8')
    marker='<script src="auto-episodes.js" defer></script>'
    if marker not in content:
        if '</body>' not in content:raise RuntimeError('Homepage missing </body>; cannot install episode library safely.')
        content=content.replace('</body>',marker+'</body>',1)
        page.write_text(content,encoding='utf8')

def main():
    # Never publish any partial episode. Start marker only adds a status card.
    inject_home_script()
    msgs = history()
    print('Jim messages found:', len(msgs))
    entries = load(MANIFEST, [])
    state = load(STATE, {'published_ids': []})
    by_id = {entry['id']: entry for entry in entries}
    starts = []
    for i, m in enumerate(msgs):
        spec = opening(m)
        if spec:
            # Existing, explicitly configured historical openings remain supported.
            # New episodes require both a valid heading and Hunter's 🟢 reaction.
            known = any(spec['slug'] == x['slug'] for x in CONFIG['known_episodes'])
            if known or begun(m):
                starts.append((i, spec))
    print('Recognized episode openings:', [(sp['slug'], msgs[i]['id']) for i, sp in starts])
    in_progress = []
    for x, (start, spec) in enumerate(starts):
        slug = spec['slug']
        if slug == 'episode-01' and (DEST/'episode-01'/'index.html').exists():
            if slug not in state['published_ids']:
                state['published_ids'].append(slug)
            continue
        if slug in state['published_ids'] or slug in by_id:
            continue
        next_start = starts[x+1][0] if x+1 < len(starts) else len(msgs)
        group = msgs[start:next_start]
        approved_end = next((i for i, m in enumerate(group) if complete(m)), None)
        if approved_end is None:
            if begun(group[0]):
                in_progress.append({
                    'id': slug, 'title': spec['title'], 'kind': spec['kind'],
                    'number': spec.get('number'), 'status': 'in_progress',
                    'date': group[0]['timestamp'], 'discord_open_id': group[0]['id']
                })
                print('In progress:', slug, 'messages:', len(group))
            else:
                print('Awaiting start 🟢 or finish ✅:', slug)
            continue
        group = group[:approved_end+1]
        if len(group) < 2 and not group[0].get('attachments'):
            print('SKIP empty episode:', slug)
            continue
        record = build_episode(spec, group)
        by_id[slug] = record
        entries.append(record)
        state['published_ids'].append(slug)
        print('Published:', slug, 'messages:', len(group))
    entries.sort(key=lambda e: (0 if e.get('kind') == 'main' else 1, e.get('number') or 999, e.get('date') or ''))
    # Write status separately so an unfinished episode never appears as published.
    save(MANIFEST, entries)
    save(PROGRESS, in_progress)
    state['published_ids'] = sorted(set(state['published_ids']))
    save(STATE, state)
    print('Published manifest:', len(entries), '| In-progress cards:', len(in_progress))

if __name__=='__main__':main()
