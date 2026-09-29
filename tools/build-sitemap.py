#!/usr/bin/env python3
"""Build HLRN sitemap.xml from real public routes and current data."""
from __future__ import annotations
import json
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://highlineracingnetwork.com"

STATIC_ROUTES = [
    "/",
    "/live/",
    "/standings/",
    "/results/",
    "/drivers/",
    "/news/",
    "/news/race-recaps/",
    "/race-preview/",
    "/race-intelligence/",
    "/teams/",
    "/adventures/",
    "/meet-the-admins/",
    "/rules/",
    "/broadcast/",
    "/broadcasters/",
    "/store/",
]

def pretty_name(name):
    text = str(name or "").strip()
    if "," in text:
        last, rest = text.split(",", 1)
        return f"{rest.strip()} {last.strip()}".strip()
    return text

def add(urls, route):
    route = str(route or "").strip()
    if not route:
        return
    if route.startswith("http://") or route.startswith("https://"):
        url = route
    else:
        url = ORIGIN + (route if route.startswith("/") else "/" + route)
    urls.add(url)

def driver_urls(urls):
    manifest = ROOT / "data" / "driver-pages.json"
    if not manifest.exists():
        return
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
    except Exception:
        return
    for row in data.get("drivers") or []:
        route = row.get("url")
        if route:
            add(urls, route)

def adventure_urls(urls):
    root = ROOT / "adventures"
    if not root.exists():
        return
    for p in sorted(root.glob("*/index.html")):
        if p.parent == root:
            continue
        add(urls, "/" + p.parent.relative_to(ROOT).as_posix().rstrip("/") + "/")

def recap_urls(urls):
    path = ROOT / "data" / "race-recaps" / "index.json"
    if not path.exists():
        return
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return
    for item in data.get("recaps") or []:
        route = item.get("url")
        if route:
            add(urls, route)

def main():
    urls = set()
    for route in STATIC_ROUTES:
        add(urls, route)
    adventure_urls(urls)
    recap_urls(urls)
    driver_urls(urls)

    body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in sorted(urls):
        body.append("  <url>")
        body.append(f"    <loc>{escape(url)}</loc>")
        body.append("  </url>")
    body.append("</urlset>")
    body.append("")
    (ROOT / "sitemap.xml").write_text("\n".join(body), encoding="utf-8")
    print(f"HLRN sitemap: {len(urls)} URLs")

if __name__ == "__main__":
    main()
