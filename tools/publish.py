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
                # Discord attachment metadata size is not necessarily the size of
                # the bytes served by CDN/proxy (which may transcode an image).
                # urlopen().read() validates the actual HTTP Content-Length and
                # raises IncompleteRead if the connection cuts out early.
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
