        for a in m.get('attachments',[]):
            if not image_attachment(a):continue
            if a.get('size',0)>15_000_000:raise RuntimeError(f'Image too large in message {m["id"]}; not publishing partially')
            ext=pathlib.Path(a.get('filename','')).suffix.lower()
            if ext not in {'.png','.jpg','.jpeg','.webp','.gif'}:ext='.jpg'
            image_count+=1
            name=f'{image_count:03d}{ext}'
            image_dir.mkdir(parents=True,exist_ok=True)
            target=image_dir/name
            if not target.exists():
                # Try the original attachment, then Discord's media proxy if the
                # CDN repeatedly cuts the transfer short. Never write partial bytes.
                urls = [a.get('url'), a.get('proxy_url')]
                failures = []
                content = None
                for candidate in dict.fromkeys(u for u in urls if u):
                    try:
                        content = request(candidate, auth=False)
                        break
                    except (RuntimeError, urllib.error.HTTPError, urllib.error.URLError) as exc:
                        failures.append(str(exc))
                        print(f'Image source failed; trying fallback for {slug} message {m["id"]}: {type(exc).__name__}', flush=True)
                if content is None:
                    raise RuntimeError(f'{slug}: could not download image in message {m["id"]}; ' + ' | '.join(failures))
                temp = target.with_suffix(target.suffix + '.tmp')
                try:
                    temp.write_bytes(content)
                    temp.replace(target)
                finally:
                    temp.unlink(missing_ok=True)
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
    repair_existing_pages(msgs)
    entries = load(MANIFEST, [])
    state = load(STATE, {'published_ids': []})
    by_id = {entry['id']: entry for entry in entries}
    starts = []
    for i, m in enumerate(msgs):
        spec = opening(m)
        if spec:
            # Every valid episode/special heading is an episode boundary.
            # Historical configured openings remain supported by opening().
            #
            # Do NOT require 🟢 here. If we filter the heading out at this stage,
            # the episode disappears completely from the scan and can never reach
            # the "awaiting start", "in progress", or completed publishing logic.
            #
            # 🟢 is still checked below for in-progress status.
            # ✅ is still required below before the episode is actually published.
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
