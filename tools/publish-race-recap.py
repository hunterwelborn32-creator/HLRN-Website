#!/usr/bin/env python3
"""Publish one frozen HLRN Live recorder race as a permanent News recap.

Stdlib only. Intended for GitHub Actions.
- Fetches the frozen recap API (or --input fixture/file).
- Refuses DEMO/TEST data.
- Creates data/race-recaps/<slug>.json.
- Creates news/race-recaps/<slug>/index.html.
- Updates data/race-recaps/index.json newest first.
- Is idempotent for the same race.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "data" / "race-recaps" / "index.json"
DATA_DIR = ROOT / "data" / "race-recaps"
ARTICLE_DIR = ROOT / "news" / "race-recaps"
DEFAULT_RECAP_URL = "https://hlrn-live-feed.onrender.com/api/recaps"
SITE_ORIGIN = "https://highlineracingnetwork.com"
ET = ZoneInfo("America/New_York")

# Races intentionally removed from the public HLRN recap/results archive.
REMOVED_RACE_KEYS = {"subsession:89034974"}


def safe_int(value, default=None):
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def safe_float(value, default=None):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def slugify(value):
    text = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    return text or "race"


def escape(value):
    return html.escape(str(value if value is not None else ""), quote=True)


def load_json(path):
    with Path(path).open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    with temp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    temp.replace(path)


def fetch_json(url, timeout=25):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "HLRN-Race-Recap-Publisher/1.0",
            "Accept": "application/json",
            "Cache-Control": "no-cache",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def extract_recaps(payload):
    """Accept either the legacy single recap or the rolling /api/recaps envelope."""
    if isinstance(payload, dict) and isinstance(payload.get("recaps"), list):
        return [x for x in payload.get("recaps") or [] if isinstance(x, dict)]
    if isinstance(payload, dict):
        return [payload]
    return []


def recap_sort_key(recap):
    return str(
        (recap or {}).get("raceFrozenAt")
        or (recap or {}).get("publishedAt")
        or ""
    )


def recap_quality(recap):
    """Score a frozen record so a later, richer PC backup can upgrade the same race."""
    race = (recap or {}).get("race") or {}
    snapshots = list((recap or {}).get("lapSnapshots") or [])
    cautions = list((recap or {}).get("cautionHistory") or [])
    penalties = list((recap or {}).get("penaltyHistory") or [])
    timeline = list((recap or {}).get("timelineEvents") or [])
    drivers = list(race.get("drivers") or [])

    def exact_reason_count(items):
        total = 0
        for item in items:
            source = str((item or {}).get("reasonSource") or "UNAVAILABLE").upper()
            reason = str((item or {}).get("reason") or "").strip()
            if source not in ("", "UNAVAILABLE", "INFERRED") and reason and "not supplied" not in reason.lower():
                total += 1
        return total

    # Completed-lap coverage is most important, then final classification,
    # then race-control detail. Exact reason text can upgrade an otherwise
    # same-sized archive.
    return (
        len(snapshots) * 1_000_000
        + len(drivers) * 10_000
        + len(cautions) * 1_000
        + len(penalties) * 500
        + exact_reason_count(cautions) * 200
        + exact_reason_count(penalties) * 200
        + len(timeline)
    )


def identity(entry):
    if entry.get("carIdx") is not None:
        return f"idx:{entry.get('carIdx')}"
    return f"car:{entry.get('number','')}|{entry.get('name','')}"


def final_order(recap):
    race = recap.get("race") or {}
    snapshots = recap.get("lapSnapshots") or []
    snapshot_order = []
    if snapshots:
        last = max(snapshots, key=lambda x: safe_int(x.get("lap"), -1))
        snapshot_order = list(last.get("order") or [])

    live_drivers = list(race.get("drivers") or [])
    by_idx = {str(d.get("carIdx")): d for d in live_drivers if d.get("carIdx") is not None}
    by_num_name = {
        (str(d.get("number") or ""), str(d.get("name") or "")): d for d in live_drivers
    }

    base = snapshot_order or live_drivers
    merged = []
    for item in base:
        extra = None
        if item.get("carIdx") is not None:
            extra = by_idx.get(str(item.get("carIdx")))
        if extra is None:
            extra = by_num_name.get((str(item.get("number") or ""), str(item.get("name") or "")))
        row = dict(extra or {})
        row.update(item)
        merged.append(row)

    merged.sort(key=lambda d: safe_int(d.get("position"), 9999))
    return merged


def first_order(recap):
    snapshots = recap.get("lapSnapshots") or []
    if not snapshots:
        return []
    first = min(snapshots, key=lambda x: safe_int(x.get("lap"), 999999))
    return sorted(list(first.get("order") or []), key=lambda d: safe_int(d.get("position"), 9999))


def leader_stats(recap):
    snapshots = sorted(
        recap.get("lapSnapshots") or [],
        key=lambda x: safe_int(x.get("lap"), 999999),
    )
    counts = Counter()
    labels = {}
    previous = None
    lead_changes = 0
    for snap in snapshots:
        order = sorted(list(snap.get("order") or []), key=lambda d: safe_int(d.get("position"), 9999))
        if not order:
            continue
        leader = next((d for d in order if safe_int(d.get("position")) == 1), order[0])
        key = identity(leader)
        counts[key] += 1
        labels[key] = leader
        if previous is not None and key != previous:
            lead_changes += 1
        previous = key
    led = []
    for key, laps in counts.most_common():
        d = labels[key]
        led.append({
            "name": d.get("name") or "Unknown Driver",
            "number": d.get("number") or "—",
            "laps": laps,
        })
    return led, lead_changes


def fastest_lap(recap):
    race = recap.get("race") or {}
    drivers = list(race.get("drivers") or [])
    valid = []
    for d in drivers:
        best = safe_float(d.get("bestLapTime"))
        if best and best > 0:
            valid.append((best, d))
    if not valid:
        return None
    best, driver = min(valid, key=lambda x: x[0])
    return {
        "name": driver.get("name") or "Unknown Driver",
        "number": driver.get("number") or "—",
        "time": best,
    }


def movement(recap):
    start = first_order(recap)
    finish = final_order(recap)
    starts = {identity(d): safe_int(d.get("position")) for d in start}
    rows = []
    for d in finish:
        key = identity(d)
        s = starts.get(key)
        f = safe_int(d.get("position"))
        if s is None or f is None:
            continue
        rows.append({
            "name": d.get("name") or "Unknown Driver",
            "number": d.get("number") or "—",
            "firstRecordedPosition": s,
            "finish": f,
            "gain": s - f,
        })
    rows.sort(key=lambda x: (-x["gain"], x["finish"]))
    return rows


def classify_series(series):
    raw = str(series or "").strip()
    lower = raw.lower()
    if "sunday" in lower:
        return "Sunday Night Series"
    if "monday" in lower:
        return "Monday Night Series"
    return raw or "HLRN"


def format_lap_time(seconds):
    value = safe_float(seconds)
    if not value or value <= 0:
        return "—"
    minutes = int(value // 60)
    sec = value - minutes * 60
    return f"{minutes}:{sec:06.3f}" if minutes else f"{sec:.3f}"


def local_date(iso_value):
    if not iso_value:
        dt = datetime.now(timezone.utc)
    else:
        text = str(iso_value).replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(text)
        except ValueError:
            dt = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(ET)


def race_key(recap):
    race = recap.get("race") or {}
    sub = race.get("subSessionId")
    sid = race.get("sessionId")
    snum = race.get("sessionNum")
    if sub is not None:
        return f"subsession:{sub}"
    if sid is not None:
        return f"session:{sid}:{snum}"
    return str(recap.get("sessionKey") or f"{race.get('track')}|{recap.get('raceFrozenAt')}")


def is_publishable(recap):
    if race_key(recap) in REMOVED_RACE_KEYS:
        return False, "race is intentionally excluded from the public archive"
    if not recap.get("raceFrozen"):
        return False, "race is not frozen"
    race = recap.get("race")
    if not isinstance(race, dict):
        return False, "frozen race metadata is unavailable"

    safety_text = " ".join(
        str(race.get(k) or "") for k in ("source", "series", "track", "sessionName")
    ).lower()
    if "demo" in safety_text or " test" in f" {safety_text}" or safety_text.startswith("test"):
        return False, "DEMO/TEST race data is never published"

    order = final_order(recap)
    if not order or safe_int(order[0].get("position")) != 1:
        return False, "final winner is unavailable"

    return True, ""


def build_model(recap):
    race = recap.get("race") or {}
    order = final_order(recap)
    first = first_order(recap)
    winner = order[0]
    podium = order[:3]
    snapshots = recap.get("lapSnapshots") or []
    cautions = list(recap.get("cautionHistory") or [])
    penalties = list(recap.get("penaltyHistory") or [])
    leaders, lead_changes = leader_stats(recap)
    fast = fastest_lap(recap)
    moves = movement(recap)

    frozen_at = recap.get("raceFrozenAt")
    local_dt = local_date(frozen_at)
    series = classify_series(race.get("series"))
    track = str(race.get("track") or "HLRN Race")
    total_laps = safe_int(race.get("totalLaps"))
    completed_laps = max(
        [safe_int(s.get("lap"), 0) for s in snapshots] + [safe_int(race.get("lap"), 0)]
    )

    last_restart = None
    for caution in cautions:
        restart = safe_int(caution.get("restartLap"))
        if restart is not None:
            last_restart = max(last_restart or restart, restart)

    late_restart = bool(
        total_laps and last_restart is not None and last_restart >= max(1, int(total_laps * 0.80))
    )
    winner_name = str(winner.get("name") or "HLRN Winner")
    if late_restart:
        title = f"{winner_name} Wins at {track} After Late-Race Restart"
    else:
        title = f"{winner_name} Takes HLRN Victory at {track}"

    slug = "-".join([
        local_dt.strftime("%Y-%m-%d"),
        slugify(series)[:34],
        slugify(track)[:42],
        str(race.get("subSessionId") or race.get("sessionId") or local_dt.strftime("%H%M")),
    ])
    slug = slugify(slug)[:140]

    winner_led = next((x["laps"] for x in leaders if x["name"] == winner_name and str(x["number"]) == str(winner.get("number") or "—")), 0)

    subtitle_parts = [
        f"{winner_name} was frozen P1 in the HLRN recorder classification",
        f"{len(cautions)} caution{'s' if len(cautions) != 1 else ''}",
        f"{lead_changes} recorded lead change{'s' if lead_changes != 1 else ''}",
    ]
    subtitle = " • ".join(subtitle_parts)

    return {
        "raceKey": race_key(recap),
        "slug": slug,
        "title": title,
        "subtitle": subtitle,
        "publishedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "raceFrozenAt": frozen_at,
        "displayDate": local_dt.strftime("%B %-d, %Y"),
        "series": series,
        "track": track,
        "trackLength": race.get("trackLength"),
        "totalLaps": total_laps,
        "completedLapsCaptured": len(snapshots),
        "lastRecordedLap": completed_laps,
        "driverCount": len(order),
        "subSessionId": race.get("subSessionId"),
        "sessionId": race.get("sessionId"),
        "winner": {
            "name": winner_name,
            "number": winner.get("number") or "—",
            "lapsCompleted": winner.get("lapsCompleted"),
            "lapsLedCaptured": winner_led,
        },
        "podium": [
            {
                "position": safe_int(d.get("position")),
                "name": d.get("name") or "Unknown Driver",
                "number": d.get("number") or "—",
            }
            for d in podium
        ],
        "finalOrder": [
            {
                "position": safe_int(d.get("position")),
                "name": d.get("name") or "Unknown Driver",
                "number": d.get("number") or "—",
                "lapsCompleted": d.get("lapsCompleted"),
                "lapsDown": d.get("lapsDown"),
                "status": d.get("status") or ("DQ" if d.get("disqualified") else "ACTIVE"),
            }
            for d in order
        ],
        "top10": [
            {
                "position": safe_int(d.get("position")),
                "name": d.get("name") or "Unknown Driver",
                "number": d.get("number") or "—",
                "lapsCompleted": d.get("lapsCompleted"),
                "lapsDown": d.get("lapsDown"),
                "status": d.get("status") or ("DQ" if d.get("disqualified") else "ACTIVE"),
            }
            for d in order[:10]
        ],
        "cautions": cautions,
        "penalties": penalties,
        "leaders": leaders,
        "leadChanges": lead_changes,
        "fastestLap": fast,
        "movement": moves[:5],
        "firstRecordedLap": min([safe_int(s.get("lap"), 999999) for s in snapshots], default=None),
        "lastRestartLap": last_restart,
        "lateRestart": late_restart,
    }


def render_table_rows(model):
    rows = []
    for d in model["top10"]:
        laps_down = safe_int(d.get("lapsDown"), 0) or 0
        laps_text = "LEAD LAP" if laps_down <= 0 else f"{laps_down} LAP{'S' if laps_down != 1 else ''} DOWN"
        rows.append(
            "<tr>"
            f"<td class=\"pos\">{escape(d.get('position') or '—')}</td>"
            f"<td><span class=\"number\">#{escape(d.get('number') or '—')}</span></td>"
            f"<td><strong>{escape(d.get('name'))}</strong></td>"
            f"<td>{escape(d.get('lapsCompleted') if d.get('lapsCompleted') is not None else '—')}</td>"
            f"<td>{escape(laps_text)}</td>"
            f"<td>{escape(d.get('status') or 'ACTIVE')}</td>"
            "</tr>"
        )
    return "\n".join(rows)


def render_cautions(model):
    if not model["cautions"]:
        return '<div class="empty-note">No caution periods were recorded by the frozen HLRN recorder.</div>'
    cards = []
    for c in model["cautions"]:
        source = str(c.get("reasonSource") or "UNAVAILABLE").upper()
        reason = c.get("reason") or "Reason not supplied by iRacing telemetry"
        restart = c.get("restartLap")
        detail = f"Lap {c.get('startLap','—')}"
        if c.get("endedUnderYellow"):
            detail += " → Finished under caution"
        elif restart is not None:
            detail += f" → Restart Lap {restart}"
        cards.append(
            '<div class="moment caution">'
            f'<small>CAUTION #{escape(c.get("number") or "—")}</small>'
            f'<strong>{escape(detail)}</strong>'
            f'<p>{escape(reason)}{f" [{escape(source)}]" if source != "UNAVAILABLE" else ""}</p>'
            '</div>'
        )
    return "\n".join(cards)


def render_penalties(model):
    if not model["penalties"]:
        return '<div class="empty-note">No black-flag/penalty records were stored by the frozen recorder.</div>'
    cards = []
    for p in model["penalties"]:
        name = p.get("name") or ((p.get("drivers") or [""])[0] if isinstance(p.get("drivers"), list) else "")
        number = p.get("number") or ((p.get("carNumbers") or [""])[0] if isinstance(p.get("carNumbers"), list) else "")
        reason = p.get("reason") or "Reason not supplied by iRacing telemetry"
        source = str(p.get("reasonSource") or "UNAVAILABLE").upper()
        who = f"#{number or '—'} {name or 'Unknown Driver'}"
        cards.append(
            '<div class="moment penalty">'
            f'<small>LAP {escape(p.get("lap") if p.get("lap") is not None else "—")} • {escape(p.get("title") or "BLACK FLAG")}</small>'
            f'<strong>{escape(who)}</strong>'
            f'<p>{escape(reason)}{f" [{escape(source)}]" if source != "UNAVAILABLE" else ""}</p>'
            '</div>'
        )
    return "\n".join(cards)


def render_leaders(model):
    if not model["leaders"]:
        return '<div class="empty-note">Lap-leader data was not available.</div>'
    return "".join(
        f'<div class="stat-row"><span>#{escape(x["number"])} {escape(x["name"])}</span><strong>{escape(x["laps"])} recorded lap{"s" if x["laps"] != 1 else ""} led</strong></div>'
        for x in model["leaders"][:8]
    )


def render_movement(model):
    moves = [x for x in model["movement"] if x["gain"] != 0]
    if not moves:
        return '<div class="empty-note">No first-recorded-lap movement comparison is available.</div>'
    return "".join(
        f'<div class="stat-row"><span>#{escape(x["number"])} {escape(x["name"])}</span>'
        f'<strong>{"+" if x["gain"] > 0 else ""}{escape(x["gain"])} positions • P{escape(x["firstRecordedPosition"])} → P{escape(x["finish"])}</strong></div>'
        for x in moves
    )


def render_article(model):
    winner = model["winner"]
    podium = model["podium"]
    p2 = podium[1] if len(podium) > 1 else None
    p3 = podium[2] if len(podium) > 2 else None

    opening = (
        f'#{winner["number"]} {winner["name"]} was frozen as the winner at {model["track"]}'
    )
    if p2:
        opening += f', ahead of #{p2["number"]} {p2["name"]}'
    if p3:
        opening += f' and #{p3["number"]} {p3["name"]}'
    opening += "."
    if model["lateRestart"] and model["lastRestartLap"] is not None:
        opening += f' The recorder shows the final restart on Lap {model["lastRestartLap"]}.'

    captured = model["completedLapsCaptured"]
    second = (
        f'HLRN captured {captured} completed leader lap{"s" if captured != 1 else ""}, '
        f'{len(model["cautions"])} caution{"s" if len(model["cautions"]) != 1 else ""}, '
        f'{model["leadChanges"]} recorded lead change{"s" if model["leadChanges"] != 1 else ""}, '
        f'and {len(model["penalties"])} penalty record{"s" if len(model["penalties"]) != 1 else ""}.'
    )

    fast = model["fastestLap"]
    fastest_html = (
        f'<div class="metric"><small>FASTEST RECORDED LAP</small><strong>{escape(format_lap_time(fast["time"]))}</strong><span>#{escape(fast["number"])} {escape(fast["name"])}</span></div>'
        if fast
        else '<div class="metric"><small>FASTEST RECORDED LAP</small><strong>—</strong><span>Not available in frozen feed</span></div>'
    )

    canonical = f'{SITE_ORIGIN}/news/race-recaps/{model["slug"]}/'
    raw_url = f'/data/race-recaps/{model["slug"]}.json'
    schema_json = json.dumps({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": model["title"],
        "description": model["subtitle"],
        "datePublished": model["publishedAt"],
        "dateModified": model.get("updatedAt") or model["publishedAt"],
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "articleSection": "HLRN Race Recap",
        "isAccessibleForFree": True,
        "author": {
            "@type": "Organization",
            "name": "High Line Racing Network",
            "url": SITE_ORIGIN + "/",
        },
        "publisher": {
            "@type": "Organization",
            "name": "High Line Racing Network",
            "url": SITE_ORIGIN + "/",
        },
        "about": [
            {"@type": "SportsEvent", "name": f'{model["series"]} at {model["track"]}'},
            {"@type": "SportsOrganization", "name": "High Line Racing Network"},
        ],
    }, ensure_ascii=False).replace("</", "<\\/")

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(model["title"])} | HLRN News</title>
<meta name="description" content="{escape(model["subtitle"])}">
<link rel="canonical" href="{escape(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="{escape(model["title"])}">
<meta property="og:description" content="{escape(model["subtitle"])}">
<meta property="og:url" content="{escape(canonical)}">
<script type="application/ld+json">{schema_json}</script>
<link rel="stylesheet" href="/assets/site-shell.css?v=20260929health1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Inter:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box}}html{{background:#f3f4f5}}body{{margin:0;color:#13161b;background:#f3f4f5;font-family:Inter,Arial,sans-serif}}a{{color:inherit;text-decoration:none}}
.story{{width:min(1180px,calc(100% - 30px));margin:0 auto;padding:28px 0 70px}}
.crumb{{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#737b85;margin:12px 0 20px}}.crumb a:hover{{color:#e31837}}
.hero{{position:relative;overflow:hidden;background:#0b0e12;color:#fff;padding:48px 46px 42px;border-bottom:6px solid #e31837}}
.hero:after{{content:"";position:absolute;right:-8%;top:-80%;width:58%;height:260%;background:linear-gradient(115deg,transparent 43%,rgba(227,24,55,.20) 44% 54%,transparent 55%);transform:rotate(7deg)}}
.hero>*{{position:relative;z-index:1}}.kicker{{font:900 italic 15px/1 "Barlow Condensed",sans-serif;color:#ffcf20;letter-spacing:.1em;text-transform:uppercase}}
.hero h1{{max-width:970px;margin:12px 0 16px;font:900 italic clamp(46px,7vw,92px)/.84 "Barlow Condensed",sans-serif;letter-spacing:-.045em;text-transform:uppercase}}
.hero p{{max-width:850px;margin:0;color:#c8ced6;font-size:14px;line-height:1.6;font-weight:700}}
.meta{{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:22px;color:#9da7b2;font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}}
.hero-number{{position:absolute;right:32px;bottom:-31px;font:900 italic 190px/.7 "Barlow Condensed",sans-serif;color:rgba(255,255,255,.055)}}
.metrics{{display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border:1px solid #dfe3e7;border-top:0}}
.metric{{padding:17px 18px;border-right:1px solid #dfe3e7;min-height:92px}}.metric:last-child{{border-right:0}}.metric small{{display:block;color:#838b94;font-size:8px;font-weight:900;letter-spacing:.1em}}.metric strong{{display:block;margin-top:7px;font:900 25px/1 "Barlow Condensed",sans-serif}}.metric span{{display:block;margin-top:5px;color:#59616b;font-size:9px;font-weight:800}}
.content{{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.65fr);gap:24px;margin-top:24px}}.paper{{background:#fff;border:1px solid #dfe3e7;padding:30px}}.paper h2{{margin:0 0 15px;font:900 italic 34px/1 "Barlow Condensed",sans-serif;text-transform:uppercase}}.paper h3{{margin:28px 0 12px;font:900 italic 24px/1 "Barlow Condensed",sans-serif;text-transform:uppercase;border-bottom:3px solid #111;padding-bottom:8px}}.paper p{{font-size:14px;line-height:1.75;color:#383f47;font-weight:600}}.lede{{font-size:17px!important;color:#15191e!important;font-weight:800!important}}
.note{{margin:24px 0 0;padding:13px 15px;border-left:4px solid #e31837;background:#f7f8f9;color:#646c75;font-size:10px;line-height:1.55;font-weight:800}}
table{{width:100%;border-collapse:collapse}}th{{background:#11161d;color:#fff;text-align:left;padding:10px 9px;font-size:8px;letter-spacing:.08em}}td{{padding:10px 9px;border-bottom:1px solid #e2e5e8;font-size:10px}}td.pos{{font:900 19px/1 "Barlow Condensed",sans-serif;width:45px}}.number{{font-weight:1000}}
.moment{{padding:12px 13px;border:1px solid #dfe3e7;border-left:4px solid #858d96;margin-bottom:8px}}.moment.caution{{border-left-color:#e0b600;background:#fffdf2}}.moment.penalty{{border-left-color:#e31837;background:#fff8f9}}.moment small{{display:block;font-size:8px;font-weight:1000;letter-spacing:.08em;color:#767f88}}.moment strong{{display:block;margin-top:4px;font-size:12px}}.moment p{{margin:5px 0 0;font-size:10px;line-height:1.5}}
.stat-row{{display:flex;justify-content:space-between;gap:15px;padding:10px 0;border-bottom:1px solid #e2e5e8;font-size:10px}}.stat-row span{{font-weight:900}}.stat-row strong{{text-align:right;color:#606872}}
.empty-note{{padding:16px;background:#f7f8f9;color:#747d86;font-size:10px;font-weight:700}}
.ctas{{display:grid;gap:8px;margin-top:18px}}.ctas a{{padding:12px 14px;background:#11161d;color:#fff;font:900 italic 15px/1 "Barlow Condensed",sans-serif;text-transform:uppercase}}.ctas a.primary{{background:#e31837}}.ctas a:hover{{filter:brightness(1.12)}}
.source{{margin-top:18px;font-size:9px;line-height:1.6;color:#777f88;font-weight:700}}.source a{{text-decoration:underline}}
@media(max-width:820px){{.hero{{padding:34px 24px}}.hero-number{{display:none}}.metrics{{grid-template-columns:1fr 1fr}}.metric:nth-child(2){{border-right:0}}.metric:nth-child(-n+2){{border-bottom:1px solid #dfe3e7}}.content{{grid-template-columns:1fr}}.paper{{padding:22px 18px}}}}
</style>
</head>
<body>
<main class="story">
  <div class="crumb"><a href="/">HLRN</a> / <a href="/news/">NEWS</a> / <a href="/news/race-recaps/">RACE RECAPS</a> / {escape(model["track"])}</div>
  <article>
    <header class="hero">
      <div class="kicker">RACE RECAP • {escape(model["series"])}</div>
      <h1>{escape(model["title"])}</h1>
      <p>{escape(model["subtitle"])}</p>
      <div class="meta"><span>{escape(model["displayDate"])}</span><span>{escape(model["track"])}</span><span>HLRN LIVE RECORDER</span></div>
      <div class="hero-number">#{escape(winner["number"])}</div>
    </header>

    <section class="metrics">
      <div class="metric"><small>WINNER</small><strong>#{escape(winner["number"])}</strong><span>{escape(winner["name"])}</span></div>
      <div class="metric"><small>RECORDED LAPS LED</small><strong>{escape(winner["lapsLedCaptured"])}</strong><span>Completed-lap snapshots</span></div>
      <div class="metric"><small>CAUTIONS</small><strong>{len(model["cautions"])}</strong><span>{model["leadChanges"]} recorded lead changes</span></div>
      {fastest_html}
    </section>

    <section class="content">
      <div class="paper">
        <h2>Race Story</h2>
        <p class="lede">{escape(opening)}</p>
        <p>{escape(second)}</p>

        <h3>Top 10</h3>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>POS</th><th>CAR</th><th>DRIVER</th><th>LAPS</th><th>TRACK</th><th>STATUS</th></tr></thead>
          <tbody>{render_table_rows(model)}</tbody>
        </table></div>

        <h3>Caution / Restart History</h3>
        {render_cautions(model)}

        <h3>Black Flags / Penalties</h3>
        {render_penalties(model)}

        <div class="note"><strong>Recorder note:</strong> This article is generated from the HLRN Live recorder frozen at checkered. It is race-night reporting data, not the official championship source. Official results and standings remain separate.</div>
      </div>

      <aside>
        <div class="paper">
          <h2>Race Facts</h2>
          <div class="stat-row"><span>Track</span><strong>{escape(model["track"])}</strong></div>
          <div class="stat-row"><span>Field</span><strong>{escape(model["driverCount"])} cars</strong></div>
          <div class="stat-row"><span>Snapshots</span><strong>{escape(model["completedLapsCaptured"])}</strong></div>
          <div class="stat-row"><span>Final recorded lap</span><strong>{escape(model["lastRecordedLap"])}</strong></div>
          <div class="stat-row"><span>Lead changes</span><strong>{escape(model["leadChanges"])}</strong></div>
          <div class="stat-row"><span>Penalties</span><strong>{escape(len(model["penalties"]))}</strong></div>

          <h3>Recorded Laps Led</h3>
          {render_leaders(model)}

          <h3>Movement</h3>
          <p style="font-size:9px;margin-top:-4px">Compared from the first captured completed lap to the frozen finish — not necessarily the starting grid.</p>
          {render_movement(model)}

          <div class="ctas">
            <a class="primary" href="/live/?section=report">Current Race Replay →</a>
            <a href="/results/">Full Results →</a>
            <a href="/standings/">Standings →</a>
            <a href="/news/">HLRN News →</a>
          </div>

          <div class="source">Source: HLRN Live frozen recorder. <a href="{escape(raw_url)}">View archived recorder data</a>.</div>
        </div>
      </aside>
    </section>
  </article>
</main>
<script src="/assets/site-shell.js?v=20260929myhlrn1"></script>
</body>
</html>
"""


def load_index():
    if not INDEX_PATH.exists():
        return {"updatedAt": None, "recaps": []}
    try:
        data = load_json(INDEX_PATH)
        if not isinstance(data, dict):
            raise ValueError("index must be an object")
        if not isinstance(data.get("recaps"), list):
            data["recaps"] = []
        return data
    except Exception:
        return {"updatedAt": None, "recaps": []}


def publish(recap):
    ok, reason = is_publishable(recap)
    if not ok:
        print(f"[HLRN recap] Skip: {reason}")
        return False

    model = build_model(recap)
    index = load_index()
    existing_pos = next(
        (i for i, item in enumerate(index["recaps"]) if str(item.get("raceKey")) == model["raceKey"]),
        None,
    )
    existing = index["recaps"][existing_pos] if existing_pos is not None else None

    existing_recorder = None
    if existing:
        existing_slug = str(existing.get("slug") or "").strip()
        existing_path = DATA_DIR / f"{existing_slug}.json" if existing_slug else None
        if existing_path and existing_path.exists():
            try:
                existing_archive = load_json(existing_path)
                if isinstance(existing_archive, dict):
                    existing_recorder = existing_archive.get("recorder")
            except Exception:
                existing_recorder = None

        incoming_quality = recap_quality(recap)
        existing_quality = recap_quality(existing_recorder) if isinstance(existing_recorder, dict) else -1
        if incoming_quality <= existing_quality:
            print(
                f"[HLRN recap] Already published at equal/better quality: {model['raceKey']} "
                f"({existing_quality} >= {incoming_quality})"
            )
            return False

        # Preserve the permanent URL and original publication timestamp while
        # refreshing the article/raw archive with the richer frozen record.
        model["slug"] = existing.get("slug") or model["slug"]
        model["publishedAt"] = existing.get("publishedAt") or model["publishedAt"]
        model["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    else:
        model["updatedAt"] = model["publishedAt"]

    quality = recap_quality(recap)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    article_path = ARTICLE_DIR / model["slug"] / "index.html"
    article_path.parent.mkdir(parents=True, exist_ok=True)

    archive = {
        "schemaVersion": 2,
        "archiveQuality": quality,
        "article": model,
        "recorder": recap,
    }
    save_json(DATA_DIR / f"{model['slug']}.json", archive)
    article_path.write_text(render_article(model), encoding="utf-8")

    summary = {
        "raceKey": model["raceKey"],
        "slug": model["slug"],
        "url": f"/news/race-recaps/{model['slug']}/",
        "rawUrl": f"/data/race-recaps/{model['slug']}.json",
        "resultsUrl": f"/results/?recap={model['slug']}",
        "title": model["title"],
        "subtitle": model["subtitle"],
        "publishedAt": model["publishedAt"],
        "updatedAt": model["updatedAt"],
        "raceFrozenAt": model["raceFrozenAt"],
        "displayDate": model["displayDate"],
        "series": model["series"],
        "track": model["track"],
        "subSessionId": model["subSessionId"],
        "sessionId": model["sessionId"],
        "winner": model["winner"],
        "drivers": [
            {
                "position": d.get("position"),
                "name": d.get("name"),
                "number": d.get("number"),
                "status": d.get("status"),
            }
            for d in model.get("finalOrder", [])
        ],
        "cautions": len(model["cautions"]),
        "penalties": len(model["penalties"]),
        "leadChanges": model["leadChanges"],
        "completedLapsCaptured": model["completedLapsCaptured"],
        "archiveQuality": quality,
    }

    if existing_pos is None:
        index["recaps"].append(summary)
        action = "Published"
    else:
        index["recaps"][existing_pos] = summary
        action = "Enriched"

    index["recaps"].sort(
        key=lambda x: str(x.get("raceFrozenAt") or x.get("publishedAt") or ""),
        reverse=True,
    )
    index["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    save_json(INDEX_PATH, index)

    print(f"[HLRN recap] {action} {summary['url']} • quality {quality}")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", help="Use a local recap JSON instead of fetching Render.")
    parser.add_argument("--url", default=os.getenv("HLRN_RECAP_URL", DEFAULT_RECAP_URL))
    args = parser.parse_args()

    if args.input:
        try:
            payload = load_json(args.input)
        except Exception as exc:
            print(f"[HLRN recap] Input archive unavailable: {exc}")
            return 0
    else:
        try:
            payload = fetch_json(args.url)
        except Exception as primary_exc:
            fallback_url = args.url.rsplit("/", 1)[0] + "/recap" if args.url.rstrip("/").endswith("/recaps") else None
            if not fallback_url:
                print(f"[HLRN recap] Recorder API unavailable; continuing without recap publication: {primary_exc}")
                return 0
            try:
                payload = fetch_json(fallback_url)
                print(f"[HLRN recap] Rolling archive unavailable; recovered newest frozen race from {fallback_url}")
            except Exception as fallback_exc:
                print(
                    "[HLRN recap] Recorder API unavailable; continuing without recap publication: "
                    f"{primary_exc}; fallback failed: {fallback_exc}"
                )
                return 0

    recaps = extract_recaps(payload)
    if not recaps and not args.input and args.url.rstrip("/").endswith("/recaps"):
        fallback_url = args.url.rsplit("/", 1)[0] + "/recap"
        try:
            fallback_payload = fetch_json(fallback_url)
            recaps = extract_recaps(fallback_payload)
            if recaps and any(x.get("raceFrozen") for x in recaps):
                print(f"[HLRN recap] Rolling archive was empty; recovered newest frozen race from {fallback_url}")
        except Exception:
            pass

    if not recaps:
        print("[HLRN recap] No frozen recorder races available.")
        return 0

    published = 0
    try:
        # Oldest first ensures back-to-back races are all published even when
        # several frozen sessions arrive in the same sync window.
        for recap in sorted(recaps, key=recap_sort_key):
            if publish(recap):
                published += 1
    except Exception as exc:
        print(f"[HLRN recap] Publisher error: {exc}", file=sys.stderr)
        return 1

    print(f"[HLRN recap] Archive scan complete: {len(recaps)} checked, {published} newly published.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
