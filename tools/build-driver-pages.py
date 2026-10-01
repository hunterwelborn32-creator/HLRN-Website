#!/usr/bin/env python3
"""Generate permanent, crawlable HLRN driver profile pages.

Sources:
- data/derived/profiles.json: verified driver/series statistics + race history
- data/hlrn.json: team rosters
- drivers/index.html: the existing HLRN car-number mapping

Output:
- drivers/<driver-slug>/index.html
- data/driver-pages.json

The generator never invents missing stats, teams, or car numbers.
"""
from __future__ import annotations

import html
import json
import re
import shutil
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
PROFILES_PATH = ROOT / "data" / "derived" / "profiles.json"
HLRN_PATH = ROOT / "data" / "hlrn.json"
DRIVERS_INDEX = ROOT / "drivers" / "index.html"
MANIFEST_PATH = ROOT / "data" / "driver-pages.json"
DRIVERS_ROOT = ROOT / "drivers"
ORIGIN = "https://highlineracingnetwork.com"
PHOTO_BASE = "/assets/driver-photos/cutout/"

SERIES_LABEL = {
    "sunday": "Sunday Night League",
    "monday": "Monday Night League",
    "hosted": "Hosted Racing",
}
SERIES_SHORT = {"sunday": "Sunday", "monday": "Monday", "hosted": "Hosted"}
SERIES_ORDER = ("sunday", "monday", "hosted")
HOSTED_NAME_ALIASES = {
    "ethanfonsecamoreno": "Ethan Moreno",
}


def esc(value):
    return html.escape(str(value if value is not None else ""), quote=True)


def num(value, default=0):
    try:
        if value in (None, "", "—"):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def intish(value):
    try:
        n = float(value)
        return str(int(n)) if n.is_integer() else str(round(n, 2))
    except (TypeError, ValueError):
        return "—"


def slugify(value):
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "driver"


def keyify(value):
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def extract_existing_number_map():
    """Use the exact number map already maintained by the Drivers page."""
    try:
        text = DRIVERS_INDEX.read_text(encoding="utf-8")
    except Exception:
        return {}
    m = re.search(r"const\s+KNOWN_DRIVER_NUMBERS\s*=\s*(\{.*?\});", text, re.S)
    if not m:
        return {}
    try:
        obj = json.loads(m.group(1))
        return {str(k): str(v) for k, v in obj.items()}
    except Exception:
        return {}


def team_maps(hlrn):
    out = {"sunday": {}, "monday": {}}
    leagues = (hlrn or {}).get("leagues") or {}
    for series in out:
        rosters = (leagues.get(series) or {}).get("teamRosters") or {}
        for team, members in rosters.items():
            for member in members or []:
                did = str(member.get("driverId") or "").strip()
                if did:
                    out[series][did] = team
    return out


def league_driver_maps(hlrn):
    """Verified current driver rows keyed by league + driver id."""
    out = {"sunday": {}, "monday": {}}
    leagues = (hlrn or {}).get("leagues") or {}
    for series in out:
        for row in (leagues.get(series) or {}).get("drivers") or []:
            did = str(row.get("driverId") or "").strip()
            if did:
                out[series][did] = row
    return out


def record_number(name, number_map, hosted_numbers=None):
    raw = keyify(name)
    if raw in number_map:
        return number_map[raw]
    raw2 = re.sub(r"\d+$", "", raw)
    if raw2 in number_map:
        return number_map[raw2]
    return (hosted_numbers or {}).get(name, "—")


def fmt_date(value):
    if not value:
        return "—"
    text = str(value).strip()
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return dt.strftime("%b %-d, %Y")
    except Exception:
        pass
    try:
        dt = datetime.strptime(text, "%m/%d/%Y")
        return dt.strftime("%b %-d, %Y")
    except Exception:
        return text[:10]


def result_url(series, race_number):
    if series in ("sunday", "monday") and race_number not in (None, "", "—"):
        return f"/results/?league={quote(series)}&race={quote(str(race_number))}#raceReportView"
    return "/results/"


def series_stats_block(series, rec, team):
    label = SERIES_LABEL.get(series, series.title())
    rank = rec.get("rank")
    rank_text = f"#{rank}" if rank not in (None, "", "—") else "—"
    team_text = team or "Not listed"
    stats = [
        ("Rank", rank_text),
        ("Points", intish(rec.get("points"))),
        ("Starts", intish(rec.get("races"))),
        ("Wins", intish(rec.get("wins"))),
        ("Top 5", intish(rec.get("top5"))),
        ("Top 10", intish(rec.get("top10"))),
        ("Avg Finish", intish(rec.get("avgFinish"))),
        ("Laps", intish(rec.get("laps"))),
        ("Laps Led", intish(rec.get("lapsLed"))),
        ("Incidents", intish(rec.get("incidents"))),
        ("Avg Rating", intish(rec.get("avgRating"))),
        ("Poles", intish(rec.get("poles"))),
    ]
    stats_html = "".join(
        f'<div class="stat"><small>{esc(k)}</small><strong>{esc(v)}</strong></div>'
        for k, v in stats
    )
    return f"""
    <section class="series-card {esc(series)}">
      <div class="series-head">
        <div><small>{esc(SERIES_SHORT.get(series, series.title()))}</small><h2>{esc(label)}</h2></div>
        <div class="team-badge"><small>TEAM</small><strong>{esc(team_text)}</strong></div>
      </div>
      <div class="stats-grid">{stats_html}</div>
    </section>"""


def combined_history(records):
    rows = []
    for series, rec in records.items():
        for result in rec.get("results") or []:
            row = dict(result)
            row["series"] = series
            rows.append(row)
    rows.sort(key=lambda x: str(x.get("date") or ""), reverse=True)
    return rows


def history_table(rows):
    if not rows:
        return '<div class="empty">No race history is available in the current HLRN data feed.</div>'
    html_rows = []
    for r in rows:
        finish = r.get("finish")
        cls = "win" if str(finish) == "1" else ("top5" if num(finish, 999) <= 5 else "")
        href = result_url(r.get("series"), r.get("raceNumber"))
        html_rows.append(
            f'<tr class="race-link" role="link" tabindex="0" data-href="{esc(href)}">'
            f'<td><span class="series-pill {esc(r.get("series"))}">{esc(SERIES_SHORT.get(r.get("series"), r.get("series")))}</span></td>'
            f"<td>{esc(r.get('raceNumber') if r.get('raceNumber') is not None else '—')}</td>"
            f"<td>{esc(fmt_date(r.get('date')))}</td>"
            f"<td><strong>{esc(r.get('track') or '—')}</strong></td>"
            f"<td>{esc(r.get('start') if r.get('start') is not None else '—')}</td>"
            f'<td class="{cls}">{esc(finish if finish is not None else "—")}</td>'
            f"<td>{esc(r.get('points') if r.get('points') is not None else '—')}</td>"
            f"<td>{esc(r.get('lapsLed') if r.get('lapsLed') is not None else '—')}</td>"
            f"<td>{esc(r.get('incidents') if r.get('incidents') is not None else '—')}</td>"
            f"<td>{esc(r.get('status') or '—')}</td>"
            "</tr>"
        )
    return (
        '<div class="history-wrap"><table><thead><tr>'
        "<th>Series</th><th>Race</th><th>Date</th><th>Track</th><th>Start</th>"
        "<th>Finish</th><th>Points</th><th>Led</th><th>Inc</th><th>Status</th>"
        "</tr></thead><tbody>"
        + "".join(html_rows)
        + "</tbody></table></div>"
    )


def recent_form(rows):
    finished = [r for r in rows if num(r.get("finish"), 0) > 0][:8]
    if not finished:
        return '<div class="empty">No recent finishes available.</div>'
    items = []
    for r in finished:
        finish = int(num(r.get("finish")))
        cls = "win" if finish == 1 else ("top5" if finish <= 5 else "")
        href = result_url(r.get("series"), r.get("raceNumber"))
        items.append(
            f'<a class="form-item {cls}" href="{esc(href)}"><strong>P{finish}</strong>'
            f'<span>{esc(r.get("track") or "Race")}</span>'
            f'<small>{esc(SERIES_SHORT.get(r.get("series"), ""))} • {esc(fmt_date(r.get("date")))}</small></a>'
        )
    return '<div class="form-grid">' + "".join(items) + "</div>"



def driver_profile_v2(history, records, teams):
    """Build factual driver snapshot / performance intel from verified profile history."""
    finished = [r for r in history if num(r.get("finish"), 0) > 0]
    recent = finished[:5]

    ranked = []
    for series in SERIES_ORDER:
        rec = records.get(series) or {}
        rank = rec.get("rank")
        if rank not in (None, "", "—") and num(rank, 0) > 0:
            ranked.append((num(rank), series, int(num(rank))))
    ranked.sort(key=lambda x: x[0])

    hero_badges = []
    for _, series, rank in ranked:
        points = records.get(series, {}).get("points")
        points_text = f" • {intish(points)} PTS" if points not in (None, "", "—") else ""
        hero_badges.append(
            f'<span class="profile-v2-badge {esc(series)}"><small>{esc(SERIES_SHORT.get(series, series.title()))}</small>'
            f'<strong>P{rank}{esc(points_text)}</strong></span>'
        )
    hero_badges_html = '<div class="profile-v2-badges">' + "".join(hero_badges) + "</div>" if hero_badges else ""

    team_names = []
    for series in SERIES_ORDER:
        team = str(teams.get(series) or "").strip()
        if team and team not in team_names:
            team_names.append(team)
    team_text = " / ".join(team_names) if team_names else "Independent"

    primary_champ = "—"
    primary_series = "HLRN"
    if ranked:
        _, series, rank = ranked[0]
        primary_champ = f"P{rank}"
        primary_series = SERIES_SHORT.get(series, series.title())

    recent_positions = [int(num(r.get("finish"))) for r in recent]
    recent_form_text = " • ".join(f"P{x}" for x in recent_positions) if recent_positions else "—"
    recent_avg = sum(recent_positions) / len(recent_positions) if recent_positions else None

    best = min(finished, key=lambda r: num(r.get("finish"), 9999)) if finished else None
    best_finish = f"P{int(num(best.get('finish')))}" if best else "—"
    best_track = str(best.get("track") or "—") if best else "—"

    movers = []
    for r in finished:
        start = num(r.get("start"), 0)
        finish = num(r.get("finish"), 0)
        if start > 0 and finish > 0:
            movers.append((start - finish, r))
    movers.sort(key=lambda x: x[0], reverse=True)
    biggest_mover = f"+{int(movers[0][0])}" if movers and movers[0][0] > 0 else "—"
    mover_track = str(movers[0][1].get("track") or "") if movers and movers[0][0] > 0 else ""

    starts = sum(num(r.get("races")) for r in records.values())
    wins = sum(num(r.get("wins")) for r in records.values())
    top10 = sum(num(r.get("top10")) for r in records.values())
    laps_led = sum(num(r.get("lapsLed")) for r in records.values())
    incidents = sum(num(r.get("incidents")) for r in records.values())
    pole_values = [r.get("poles") for r in records.values() if "poles" in r and r.get("poles") not in (None, "", "—")]
    poles = sum(num(value) for value in pole_values) if pole_values else None
    rating_rows = [
        (num(r.get("avgRating")), num(r.get("races")))
        for r in records.values()
        if r.get("avgRating") not in (None, "", "—") and num(r.get("races")) > 0
    ]
    avg_rating = (
        sum(rating * races for rating, races in rating_rows) / sum(races for _, races in rating_rows)
        if rating_rows else None
    )
    win_rate = (wins / starts * 100) if starts else None
    top10_rate = (top10 / starts * 100) if starts else None

    snapshot = f"""
    <section class="driver-v2-snapshot" aria-label="Driver snapshot">
      <div class="driver-v2-snapshot-head">
        <div><small>HLRN DRIVER PROFILE 2.0</small><strong>Driver Snapshot</strong></div>
        <span>VERIFIED NETWORK DATA</span>
      </div>
      <div class="driver-v2-snapshot-grid">
        <div><small>Current Championship</small><strong>{esc(primary_champ)}</strong><span>{esc(primary_series)}</span></div>
        <div><small>Team</small><strong>{esc(team_text)}</strong><span>Current HLRN team</span></div>
        <div><small>Recent 5</small><strong class="form-line">{esc(recent_form_text)}</strong><span>{esc(f"{recent_avg:.1f} avg finish" if recent_avg is not None else "No recent finishes")}</span></div>
        <div><small>Laps Led</small><strong>{esc(intish(laps_led))}</strong><span>Career verified total</span></div>
      </div>
    </section>
    """

    intel_items = [
        ("Best Finish", best_finish, best_track),
        ("Recent 5 Avg", f"{recent_avg:.1f}" if recent_avg is not None else "—", "Average finishing position"),
        ("Avg Rating", f"{avg_rating:.1f}" if avg_rating is not None else "—", "Verified league average"),
        ("Incidents", intish(incidents), "Verified league total"),
        ("Biggest Mover", biggest_mover, mover_track or "Recorded start-to-finish gain"),
        ("Win Rate", f"{win_rate:.1f}%" if win_rate is not None else "—", f"{intish(wins)} wins / {intish(starts)} starts"),
        ("Top-10 Rate", f"{top10_rate:.1f}%" if top10_rate is not None else "—", f"{intish(top10)} top 10s"),
        ("Poles", intish(poles), "Verified league totals"),
        ("Laps Led", intish(laps_led), "Verified league totals"),
        ("Races Recorded", str(len(finished)), "Race history on this profile"),
    ]
    intel_html = "".join(
        f'<div class="driver-v2-intel-card"><small>{esc(label)}</small><strong>{esc(value)}</strong><span>{esc(note)}</span></div>'
        for label, value, note in intel_items
    )
    performance = f'<div class="driver-v2-intel-grid">{intel_html}</div>'
    return hero_badges_html, snapshot, performance

def render_page(driver):
    name = driver["name"]
    slug = driver["slug"]
    number = driver["number"]
    records = driver["records"]
    teams = driver["teams"]
    history = combined_history(records)
    photo_slug = driver.get("photoSlug") or slug
    photo = PHOTO_BASE + quote(photo_slug) + ".webp"

    starts = sum(num(r.get("races")) for r in records.values())
    wins = sum(num(r.get("wins")) for r in records.values())
    top5 = sum(num(r.get("top5")) for r in records.values())
    top10 = sum(num(r.get("top10")) for r in records.values())
    laps = sum(num(r.get("laps")) for r in records.values())
    led = sum(num(r.get("lapsLed")) for r in records.values())
    incidents = sum(num(r.get("incidents")) for r in records.values())
    weighted_finish_num = sum(num(r.get("avgFinish")) * num(r.get("races")) for r in records.values())
    avg_finish = weighted_finish_num / starts if starts else None
    rating_rows = [
        (num(r.get("avgRating")), num(r.get("races")))
        for r in records.values()
        if r.get("avgRating") not in (None, "", "—") and num(r.get("races")) > 0
    ]
    avg_rating = (
        sum(rating * races for rating, races in rating_rows) / sum(races for _, races in rating_rows)
        if rating_rows else None
    )

    canonical = f"{ORIGIN}/drivers/{slug}/"
    series_names = " and ".join(SERIES_SHORT[s] for s in SERIES_ORDER if s in records)
    description = (
        f"{name}'s official High Line Racing Network driver profile with {series_names or 'HLRN'} "
        "statistics, race history, team information and recent results."
    )
    schema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": name,
        "url": canonical,
        "image": photo,
        "memberOf": [
            {
                "@type": "SportsOrganization",
                "name": SERIES_LABEL.get(series, series.title()),
                "url": f"{ORIGIN}/standings/",
            }
            for series in records
        ],
    }
    schema_json = json.dumps(schema, ensure_ascii=False).replace("</", "<\\/")

    series_html = "".join(
        series_stats_block(series, records[series], teams.get(series))
        for series in SERIES_ORDER if series in records
    )
    combined_stats = [
        ("Starts", intish(starts)),
        ("Wins", intish(wins)),
        ("Top 5", intish(top5)),
        ("Top 10", intish(top10)),
        ("Avg Finish", f"{avg_finish:.2f}" if avg_finish is not None else "—"),
        ("Avg Rating", f"{avg_rating:.1f}" if avg_rating is not None else "—"),
        ("Laps Led", intish(led)),
        ("Incidents", intish(incidents)),
    ]
    combined_html = "".join(
        f'<div class="career-stat"><small>{esc(k)}</small><strong>{esc(v)}</strong></div>'
        for k, v in combined_stats
    )
    hero_badges_html, driver_snapshot_html, driver_performance_html = driver_profile_v2(history, records, teams)

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(name)} | HLRN Driver Profile</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{esc(canonical)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="{esc(name)} | HLRN Driver Profile">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(canonical)}">
<meta property="og:image" content="{esc(photo)}">
<script type="application/ld+json">{schema_json}</script>
<link rel="stylesheet" href="/assets/site-shell.css?v=20261001control1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Inter:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{{--red:#e31837;--yellow:#ffd400;--ink:#101318;--muted:#727a84;--line:#d9dde2;--paper:#fff;--bg:#f2f3f5;--sun:#e31837;--mon:#53a832;--hosted:#c89c00}}
*{{box-sizing:border-box}}html{{background:var(--bg)}}body{{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,Arial,sans-serif}}a{{color:inherit;text-decoration:none}}
.page{{width:min(1380px,calc(100% - 30px));margin:0 auto;padding:26px 0 72px}}
.crumb{{font-size:9px;font-weight:1000;letter-spacing:.1em;text-transform:uppercase;color:#747d87;margin:10px 0 18px}}.crumb a:hover{{color:var(--red)}}
.hero{{position:relative;display:grid;grid-template-columns:minmax(330px,.82fr) minmax(0,1.18fr);min-height:500px;background:#fff;color:var(--ink);overflow:hidden;border:1px solid var(--line);border-bottom:6px solid var(--red)}}
.hero-media{{position:relative;min-height:500px;background:#fff;overflow:hidden;border-right:1px solid var(--line)}}
.hero-media:after{{content:"";display:none}}
.hero-photo{{position:absolute;z-index:2;left:50%;bottom:-2px;transform:translateX(-50%);height:95%;max-width:94%;object-fit:contain;filter:drop-shadow(0 14px 15px rgba(0,0,0,.35))}}
.hero-fallback{{position:absolute;inset:0;display:grid;place-items:center;color:rgba(17,22,28,.05);font:900 italic 210px/1 "Barlow Condensed",sans-serif}}
.hero-copy{{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;padding:48px 48px 42px;background:#fff}}
.kicker{{font-size:10px;font-weight:1000;letter-spacing:.16em;color:#68737f;text-transform:uppercase}}
.hero h1{{margin:10px 0 4px;color:#11161c;font:900 italic clamp(56px,7vw,98px)/.82 "Barlow Condensed",sans-serif;letter-spacing:-.045em;text-transform:uppercase}}
.carline{{display:flex;align-items:center;gap:14px;margin-top:14px}}.car-number{{font:900 italic 55px/1 "Barlow Condensed",sans-serif;color:#11161c}}.series-list{{color:#4f5a66;font-size:10px;font-weight:900;line-height:1.6;text-transform:uppercase}}
.career-strip{{display:grid;grid-template-columns:repeat(8,1fr);background:#fff;border:1px solid var(--line);border-top:0}}
.career-stat{{padding:14px 12px;border-right:1px solid var(--line);min-width:0}}.career-stat:last-child{{border-right:0}}.career-stat small,.stat small{{display:block;color:#7d8690;font-size:7px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}}.career-stat strong{{display:block;margin-top:5px;font:900 22px/1 "Barlow Condensed",sans-serif}}
.section-head{{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:31px 0 12px;padding-bottom:9px;border-bottom:4px solid #111}}.section-head small{{display:block;color:var(--red);font-size:8px;font-weight:1000;letter-spacing:.11em}}.section-head h2{{margin:3px 0 0;font:900 italic 34px/1 "Barlow Condensed",sans-serif;text-transform:uppercase}}
.series-grid{{display:grid;grid-template-columns:repeat({max(1,len(records))},minmax(0,1fr));gap:14px}}
.series-card{{background:#fff;border:1px solid var(--line);border-top:5px solid #222}}.series-card.sunday{{border-top-color:var(--sun)}}.series-card.monday{{border-top-color:var(--mon)}}.series-card.hosted{{border-top-color:var(--hosted)}}.series-head{{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:16px 18px;border-bottom:1px solid var(--line)}}.series-head small{{color:#7b848e;font-size:8px;font-weight:1000;letter-spacing:.1em;text-transform:uppercase}}.series-head h2{{margin:3px 0 0;font:900 italic 27px/1 "Barlow Condensed",sans-serif;text-transform:uppercase}}.team-badge{{text-align:right}}.team-badge strong{{display:block;margin-top:3px;font-size:13px}}
.stats-grid{{display:grid;grid-template-columns:repeat(6,1fr)}}.stat{{padding:13px 14px;border-right:1px solid #e5e7ea;border-bottom:1px solid #e5e7ea}}.stat:nth-child(6n){{border-right:0}}.stat strong{{display:block;margin-top:4px;font:900 19px/1 "Barlow Condensed",sans-serif}}
.form-grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}}.form-item{{display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center;background:#fff;border:1px solid var(--line);padding:12px;text-decoration:none;color:inherit;cursor:pointer}}.form-item:hover{{border-color:#9ea6ae}}.form-item strong{{grid-row:1/3;font:900 italic 28px/1 "Barlow Condensed",sans-serif}}.form-item span{{font-size:10px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.form-item small{{font-size:7px;font-weight:900;color:#7e8791;text-transform:uppercase}}.form-item.win{{border-left:4px solid var(--red)}}.form-item.top5{{border-left:4px solid #e5b900}}
.history-wrap{{overflow:auto;background:#fff;border:1px solid var(--line)}}table{{width:100%;border-collapse:collapse;min-width:950px}}.race-link{{cursor:pointer}}.race-link:hover td{{background:#f4f6f8}}.race-link:focus-visible{{outline:3px solid #111;outline-offset:-3px}}th{{padding:10px 9px;background:#11161d;color:#fff;text-align:left;font-size:8px;letter-spacing:.08em;text-transform:uppercase}}td{{padding:10px 9px;border-bottom:1px solid #e4e7ea;font-size:10px}}td.win{{background:#fff0f2;color:#b30c27;font-weight:1000}}td.top5{{font-weight:1000}}.series-pill{{display:inline-block;padding:4px 6px;background:#eee;font-size:7px;font-weight:1000;text-transform:uppercase}}.series-pill.sunday{{background:#fff0f2;color:#b30c27}}.series-pill.monday{{background:#eff9ea;color:#3d7f25}}.series-pill.hosted{{background:#fff8df;color:#7b5d00}}
.empty{{padding:22px;background:#fff;border:1px solid var(--line);color:#747d86;font-size:10px;font-weight:800}}
.actions{{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}}.actions a{{padding:11px 14px;background:#11161d;color:#fff;font:900 italic 15px/1 "Barlow Condensed",sans-serif;text-transform:uppercase}}.actions a.primary{{background:var(--red)}}
.updated{{margin-top:14px;color:#858d96;font-size:8px;font-weight:800;text-transform:uppercase}}

/* ===== DRIVER PROFILE 2.0 ===== */
.hero:before{{content:"#{esc(number)}";position:absolute;right:-30px;bottom:-44px;z-index:1;color:rgba(17,22,28,.035);font:900 italic clamp(170px,22vw,330px)/.7 "Barlow Condensed",sans-serif;letter-spacing:-.08em;pointer-events:none}}
.profile-v2-badges{{display:flex;flex-wrap:wrap;gap:7px;margin-top:22px}}
.profile-v2-badge{{display:inline-grid;grid-template-columns:auto auto;align-items:center;gap:7px;min-height:34px;padding:6px 9px;border:1px solid var(--line);background:#f6f7f9}}
.profile-v2-badge small{{color:#707983;font-size:7px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}}
.profile-v2-badge strong{{color:#11161c;font:900 italic 15px/1 "Barlow Condensed",sans-serif;white-space:nowrap}}
.profile-v2-badge.sunday{{border-left:4px solid var(--sun)}}.profile-v2-badge.monday{{border-left:4px solid var(--mon)}}.profile-v2-badge.hosted{{border-left:4px solid var(--hosted)}}

.driver-v2-snapshot{{margin-top:14px;border:1px solid var(--line);background:#fff;box-shadow:0 12px 28px rgba(18,24,31,.06)}}
.driver-v2-snapshot-head{{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:13px 15px;border-bottom:1px solid var(--line);background:#f5f6f8}}
.driver-v2-snapshot-head small{{display:block;color:var(--red);font-size:7px;font-weight:1000;letter-spacing:.12em;text-transform:uppercase}}
.driver-v2-snapshot-head strong{{display:block;margin-top:3px;font:900 italic 24px/1 "Barlow Condensed",sans-serif;text-transform:uppercase}}
.driver-v2-snapshot-head>span{{color:#7d8690;font-size:7px;font-weight:1000;letter-spacing:.08em}}
.driver-v2-snapshot-grid{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}}
.driver-v2-snapshot-grid>div{{min-width:0;padding:15px;border-right:1px solid var(--line)}}
.driver-v2-snapshot-grid>div:last-child{{border-right:0}}
.driver-v2-snapshot-grid small{{display:block;color:#7d8690;font-size:7px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}}
.driver-v2-snapshot-grid strong{{display:block;margin-top:6px;color:#11161c;font:900 italic 25px/1 "Barlow Condensed",sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.driver-v2-snapshot-grid strong.form-line{{font-size:19px;letter-spacing:.02em}}
.driver-v2-snapshot-grid span{{display:block;margin-top:5px;color:#737d87;font-size:8px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}

.driver-v2-intel-grid{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}}
.driver-v2-intel-card{{position:relative;min-width:0;min-height:104px;padding:15px;border:1px solid var(--line);background:#fff;overflow:hidden}}
.driver-v2-intel-card:before{{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#e31837}}
.driver-v2-intel-card small{{display:block;color:#7a848e;font-size:7px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}}
.driver-v2-intel-card strong{{display:block;margin-top:8px;color:#11161c;font:900 italic 28px/1 "Barlow Condensed",sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.driver-v2-intel-card span{{display:block;margin-top:6px;color:#727c87;font-size:8px;font-weight:800;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}

html[data-hlrn-theme="dark"] .hero:before{{color:rgba(255,255,255,.045)!important}}
html[data-hlrn-theme="dark"] .profile-v2-badge,
html[data-hlrn-theme="dark"] .driver-v2-snapshot,
html[data-hlrn-theme="dark"] .driver-v2-snapshot-head,
html[data-hlrn-theme="dark"] .driver-v2-snapshot-grid>div,
html[data-hlrn-theme="dark"] .driver-v2-intel-card{{background:#000!important;color:#fff!important;border-color:#2b2b2b!important;box-shadow:none!important}}
html[data-hlrn-theme="dark"] .profile-v2-badge small,
html[data-hlrn-theme="dark"] .driver-v2-snapshot-grid small,
html[data-hlrn-theme="dark"] .driver-v2-snapshot-grid span,
html[data-hlrn-theme="dark"] .driver-v2-intel-card small,
html[data-hlrn-theme="dark"] .driver-v2-intel-card span,
html[data-hlrn-theme="dark"] .driver-v2-snapshot-head>span{{color:#aaa!important}}
html[data-hlrn-theme="dark"] .profile-v2-badge strong,
html[data-hlrn-theme="dark"] .driver-v2-snapshot-head strong,
html[data-hlrn-theme="dark"] .driver-v2-snapshot-grid strong,
html[data-hlrn-theme="dark"] .driver-v2-intel-card strong{{color:#fff!important}}

html[data-hlrn-theme="dark"],
html[data-hlrn-theme="dark"] body{{background:#000!important;color:#fff!important}}
html[data-hlrn-theme="dark"] .page{{background:#000!important;color:#fff!important}}
html[data-hlrn-theme="dark"] .crumb{{color:#aeb8c4!important}}
html[data-hlrn-theme="dark"] .crumb a{{color:#fff!important}}

html[data-hlrn-theme="dark"] .hero{{background:#000!important;color:#fff!important;border-color:#2b2b2b!important}}
html[data-hlrn-theme="dark"] .hero-media{{background:#050505!important;border-right-color:#2b2b2b!important}}
html[data-hlrn-theme="dark"] .hero-media:after{{display:block;background:linear-gradient(transparent,#000)!important}}
html[data-hlrn-theme="dark"] .hero-fallback{{color:rgba(255,255,255,.08)!important}}
html[data-hlrn-theme="dark"] .hero-copy{{background:#000!important;background-image:none!important}}
html[data-hlrn-theme="dark"] .kicker{{color:var(--yellow)!important}}
html[data-hlrn-theme="dark"] .hero h1,
html[data-hlrn-theme="dark"] .car-number{{color:#fff!important}}
html[data-hlrn-theme="dark"] .series-list{{color:#fff!important}}

html[data-hlrn-theme="dark"] .career-strip,
html[data-hlrn-theme="dark"] .career-stat{{
  background:#000!important;
  color:#fff!important;
  border-color:#2b2b2b!important;
}}
html[data-hlrn-theme="dark"] .career-stat small{{color:#aaa!important}}
html[data-hlrn-theme="dark"] .career-stat strong{{color:#fff!important}}

html[data-hlrn-theme="dark"] .section-head{{
  background:#000!important;
  color:#fff!important;
  border-bottom-color:#2b2b2b!important;
}}
html[data-hlrn-theme="dark"] .section-head h2,
html[data-hlrn-theme="dark"] .section-head span{{color:#fff!important}}
html[data-hlrn-theme="dark"] .section-head small{{color:var(--red)!important}}

html[data-hlrn-theme="dark"] .series-grid{{background:#000!important}}
html[data-hlrn-theme="dark"] .series-card,
html[data-hlrn-theme="dark"] .series-head,
html[data-hlrn-theme="dark"] .stats-grid,
html[data-hlrn-theme="dark"] .stat{{
  background:#000!important;
  background-color:#000!important;
  background-image:none!important;
  color:#fff!important;
  border-color:#2b2b2b!important;
}}
html[data-hlrn-theme="dark"] .series-head small,
html[data-hlrn-theme="dark"] .stat small{{color:#aaa!important}}
html[data-hlrn-theme="dark"] .series-head h2,
html[data-hlrn-theme="dark"] .team-badge strong,
html[data-hlrn-theme="dark"] .stat strong{{color:#fff!important}}
html[data-hlrn-theme="dark"] .series-card.sunday{{border-top-color:var(--sun)!important}}
html[data-hlrn-theme="dark"] .series-card.monday{{border-top-color:var(--mon)!important}}
html[data-hlrn-theme="dark"] .series-card.hosted{{border-top-color:var(--hosted)!important}}

html[data-hlrn-theme="dark"] .form-grid{{background:#000!important}}
html[data-hlrn-theme="dark"] .form-item{{
  background:#000!important;
  color:#fff!important;
  border-color:#2b2b2b!important;
}}
html[data-hlrn-theme="dark"] .form-item strong,
html[data-hlrn-theme="dark"] .form-item span{{color:#fff!important}}
html[data-hlrn-theme="dark"] .form-item small{{color:#aaa!important}}
html[data-hlrn-theme="dark"] .form-item.win{{border-left-color:var(--red)!important}}
html[data-hlrn-theme="dark"] .form-item.top5{{border-left-color:#e5b900!important}}
html[data-hlrn-theme="dark"] .form-item:hover{{background:#0c0c0c!important;border-color:#555!important}}

html[data-hlrn-theme="dark"] .history-wrap,
html[data-hlrn-theme="dark"] table,
html[data-hlrn-theme="dark"] tbody,
html[data-hlrn-theme="dark"] tr,
html[data-hlrn-theme="dark"] td{{
  background:#000!important;
  color:#fff!important;
  border-color:#2b2b2b!important;
}}
html[data-hlrn-theme="dark"] th{{
  background:#0a0a0a!important;
  color:#fff!important;
  border-color:#2b2b2b!important;
}}
html[data-hlrn-theme="dark"] td.win{{
  background:#160307!important;
  color:#ff7b8f!important;
}}
html[data-hlrn-theme="dark"] .race-link:hover td{{background:#0c0c0c!important}}
html[data-hlrn-theme="dark"] .race-link:focus-visible{{outline-color:#fff!important}}
html[data-hlrn-theme="dark"] .series-pill{{
  background:#0a0a0a!important;
  color:#fff!important;
  border:1px solid #2b2b2b!important;
}}
html[data-hlrn-theme="dark"] .series-pill.sunday{{color:#ff8b9c!important;border-left:3px solid var(--sun)!important}}
html[data-hlrn-theme="dark"] .series-pill.monday{{color:#8ee06e!important;border-left:3px solid var(--mon)!important}}
html[data-hlrn-theme="dark"] .series-pill.hosted{{color:#e4c85a!important;border-left:3px solid var(--hosted)!important}}

html[data-hlrn-theme="dark"] .empty{{
  background:#000!important;
  color:#aaa!important;
  border-color:#2b2b2b!important;
}}
html[data-hlrn-theme="dark"] .actions a{{
  background:#0a0a0a!important;
  color:#fff!important;
  border:1px solid #333!important;
}}
html[data-hlrn-theme="dark"] .actions a.primary{{background:var(--red)!important;border-color:var(--red)!important}}
html[data-hlrn-theme="dark"] .updated{{color:#aaa!important}}

@media(max-width:900px){{.hero{{grid-template-columns:1fr}}.hero-media{{min-height:390px}}.hero-copy{{padding:34px 25px}}.career-strip{{grid-template-columns:repeat(4,1fr)}}.career-stat:nth-child(4n){{border-right:0}}.series-grid{{grid-template-columns:1fr}}.form-grid{{grid-template-columns:1fr 1fr}}}}
@media(max-width:560px){{.page{{width:min(100% - 18px,1380px)}}.hero-media{{min-height:330px}}.hero h1{{font-size:54px}}.career-strip{{grid-template-columns:repeat(2,1fr)}}.career-stat:nth-child(2n){{border-right:0}}.stats-grid{{grid-template-columns:repeat(2,1fr)}}.stat{{border-right:1px solid #e5e7ea!important}}.stat:nth-child(2n){{border-right:0!important}}.form-grid{{grid-template-columns:1fr}}}}
@media(max-width:900px){{.driver-v2-snapshot-grid{{grid-template-columns:repeat(2,1fr)}}.driver-v2-snapshot-grid>div:nth-child(2n){{border-right:0}}.driver-v2-intel-grid{{grid-template-columns:repeat(2,1fr)}}}}
@media(max-width:560px){{.hero:before{{right:-10px;bottom:-18px;font-size:150px}}.profile-v2-badges{{margin-top:16px}}.profile-v2-badge{{width:100%;justify-content:space-between}}.driver-v2-snapshot{{margin-top:9px}}.driver-v2-snapshot-head{{align-items:flex-start;padding:11px 12px}}.driver-v2-snapshot-head>span{{display:none}}.driver-v2-snapshot-grid{{grid-template-columns:1fr 1fr}}.driver-v2-snapshot-grid>div{{padding:12px}}.driver-v2-snapshot-grid strong{{font-size:21px}}.driver-v2-snapshot-grid strong.form-line{{font-size:15px}}.driver-v2-intel-grid{{grid-template-columns:1fr 1fr;gap:6px}}.driver-v2-intel-card{{min-height:92px;padding:12px}}.driver-v2-intel-card strong{{font-size:23px}}}}
</style>
</head>
<body>
<main class="page">
  <div class="crumb"><a href="/">HLRN</a> / <a href="/drivers/">DRIVERS</a> / {esc(name)}</div>

  <section class="hero">
    <div class="hero-media">
      <div class="hero-fallback">#{esc(number)}</div>
      <img class="hero-photo" src="{esc(photo)}" alt="{esc(name)}" loading="eager" decoding="async" onerror="this.remove()">
    </div>
    <div class="hero-copy">
      <div class="kicker">OFFICIAL HLRN DRIVER PROFILE</div>
      <h1>{esc(name)}</h1>
      <div class="carline">
        <div class="car-number">#{esc(number)}</div>
        <div class="series-list">{esc(series_names or "HLRN DRIVER")}<br>HIGH LINE RACING NETWORK</div>
      </div>
      {hero_badges_html}
    </div>
  </section>

  <section class="career-strip">{combined_html}</section>

  {driver_snapshot_html}

  <div class="section-head"><div><small>CHAMPIONSHIP DATA</small><h2>League Performance</h2></div></div>
  <div class="series-grid">{series_html}</div>

  <div class="section-head"><div><small>PERFORMANCE INTELLIGENCE</small><h2>Driver Intel</h2></div><span>Verified profile metrics</span></div>
  {driver_performance_html}

  <div class="section-head"><div><small>RECENT RESULTS</small><h2>Recent Form</h2></div></div>
  {recent_form(history)}

  <div class="section-head"><div><small>HLRN RECORD</small><h2>Race History</h2></div><span>{len(history)} recorded result{"s" if len(history)!=1 else ""} • CLICK A RACE FOR FULL RESULTS</span></div>
  {history_table(history)}

  <div class="actions">
    <a class="primary" href="/drivers/">← All Drivers</a>
    <a href="/standings/">Championship Standings →</a>
    <a href="/results/">Race Results →</a>
  </div>
  <div class="updated">Profile data generated from the current HLRN verified league snapshot.</div>
</main>
<script>
document.querySelectorAll(".race-link[data-href]").forEach(row=>{{
  const open=()=>{{if(row.dataset.href)location.href=row.dataset.href;}};
  row.addEventListener("click",open);
  row.addEventListener("keydown",event=>{{
    if(event.key==="Enter"||event.key===" "){{event.preventDefault();open();}}
  }});
}});
</script>
<script src="/assets/site-shell.js?v=20261001control1"></script>
</body>
</html>
"""



def canonical_hosted_name(name):
    raw = str(name or "").strip()
    return HOSTED_NAME_ALIASES.get(keyify(raw), raw)


def hosted_profile_records(hlrn):
    """Build verified Hosted profile summaries from the shared Hosted snapshot."""
    hosted = (hlrn or {}).get("hosted") or {}
    latest = hosted.get("latest") or {}
    latest_results = latest.get("results") or []

    latest_by_name = {}
    hosted_numbers = {}
    aliases = defaultdict(list)

    for row in latest_results:
        raw_name = str(row.get("driver") or "").strip()
        if not raw_name:
            continue
        name = canonical_hosted_name(raw_name)
        latest_by_name[keyify(name)] = row
        car_number = str(row.get("carNumber") or "").strip()
        if car_number:
            hosted_numbers[name] = car_number
        if raw_name != name and raw_name not in aliases[name]:
            aliases[name].append(raw_name)

    # Session rows are newest-first in the Hosted feed and give us a verified
    # fallback car number when the driver did not compete in the latest race.
    for row in hosted.get("sessions") or []:
        raw_name = str(row.get("driver") or "").strip()
        if not raw_name:
            continue
        name = canonical_hosted_name(raw_name)
        car_number = str(row.get("carNumber") or "").strip()
        if car_number and name not in hosted_numbers:
            hosted_numbers[name] = car_number
        if raw_name != name and raw_name not in aliases[name]:
            aliases[name].append(raw_name)

    records = {}
    for row in hosted.get("rankings") or []:
        raw_name = str(row.get("driver") or "").strip()
        if not raw_name:
            continue
        name = canonical_hosted_name(raw_name)
        if raw_name != name and raw_name not in aliases[name]:
            aliases[name].append(raw_name)

        rec = {
            "rank": row.get("rank"),
            "points": None,
            "races": row.get("races"),
            "wins": row.get("wins"),
            "top5": row.get("top5"),
            "top10": row.get("top10"),
            "avgFinish": row.get("averageFinish"),
            "laps": None,
            "lapsLed": None,
            "incidents": None,
            "results": [],
        }

        latest_row = latest_by_name.get(keyify(name))
        if latest_row:
            rec["results"].append({
                "raceNumber": None,
                "track": latest.get("track"),
                "date": latest.get("date"),
                "start": latest_row.get("start"),
                "finish": latest_row.get("position"),
                "points": None,
                "lapsLed": latest_row.get("lapsLed"),
                "incidents": latest_row.get("incidents"),
                "status": None,
            })

        records[name] = rec

    return records, hosted_numbers, aliases


def main():
    profiles = load_json(PROFILES_PATH)
    hlrn = load_json(HLRN_PATH)
    number_map = extract_existing_number_map()
    teams_by_series = team_maps(hlrn)
    driver_rows_by_series = league_driver_maps(hlrn)
    hosted_records, hosted_numbers, hosted_aliases = hosted_profile_records(hlrn)

    grouped = defaultdict(dict)
    photo_slug_by_name = {}
    id_by_series_name = {}
    for rec in profiles.get("drivers") or []:
        name = str(rec.get("name") or "").strip()
        series = str(rec.get("series") or "").lower()
        if not name or series not in ("sunday", "monday"):
            continue
        merged_rec = dict(rec)
        did = str(rec.get("id") or "").strip()
        shared = driver_rows_by_series.get(series, {}).get(did) or {}
        for field in ("avgRating", "poles"):
            if shared.get(field) not in (None, ""):
                merged_rec[field] = shared.get(field)
        grouped[name][series] = merged_rec
        if rec.get("photoSlug"):
            photo_slug_by_name.setdefault(name, str(rec.get("photoSlug")))
        id_by_series_name[(series, name)] = str(rec.get("id") or "")

    for name, rec in hosted_records.items():
        grouped[name]["hosted"] = rec

    pages = []
    slugs_seen = {}
    for name in sorted(grouped, key=lambda n: n.lower()):
        base = slugify(name)
        slug = base
        if slug in slugs_seen and slugs_seen[slug] != name:
            suffix = keyify(next(iter(grouped[name].values())).get("id"))[:6] or "driver"
            slug = f"{base}-{suffix}"
        slugs_seen[slug] = name

        records = grouped[name]
        teams = {}
        for series in records:
            did = id_by_series_name.get((series, name), "")
            teams[series] = teams_by_series.get(series, {}).get(did)

        driver = {
            "name": name,
            "slug": slug,
            "number": record_number(name, number_map, hosted_numbers),
            "photoSlug": photo_slug_by_name.get(name, slug),
            "records": records,
            "teams": teams,
        }

        folder = DRIVERS_ROOT / slug
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(render_page(driver), encoding="utf-8")

        pages.append({
            "name": name,
            "slug": slug,
            "url": f"/drivers/{slug}/",
            "number": driver["number"],
            "photoSlug": driver["photoSlug"],
            "series": sorted(records.keys()),
            "ids": {s: str(records[s].get("id") or "") for s in records},
            "teams": {s: teams.get(s) for s in records},
            "aliases": hosted_aliases.get(name, []),
        })

    manifest = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "count": len(pages),
        "drivers": pages,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"HLRN permanent driver pages: {len(pages)}")


if __name__ == "__main__":
    main()
