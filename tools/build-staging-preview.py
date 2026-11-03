#!/usr/bin/env python3
"""Build an isolated local HLRN driver stats preview; never deploy Pages."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_staging_preview"

def file(path):
    src = ROOT / path
    if not src.is_file():
        raise FileNotFoundError(path)
    dest = OUT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)

def tree(path):
    if (ROOT / path).is_dir():
        shutil.copytree(ROOT / path, OUT / path, dirs_exist_ok=True)

def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for path in ("drivers", "stats", "assets/driver-photos", "assets/drivers", "assets/hosted"):
        tree(path)
    for src in (ROOT / "assets").iterdir():
        if src.is_file() and src.suffix in (".js", ".css", ".svg"):
            file(src.relative_to(ROOT))
    for path in (
        "data/derived/profiles.json", "data/driver-pages.json",
        "data/hlrn.json", "data/driver-numbers.json",
        "data/driver-status.json", "data/hlrn-version.json",
        "data/derived/reports.json", "data/driver-identities.json",
        "favicon.ico", "favicon-32x32.png", "apple-touch-icon.png"
    ):
        if (ROOT / path).is_file():
            file(path)
    assert not (OUT / "CNAME").exists(), "CNAME must never enter staging preview"
    (OUT / "STAGING-README.txt").write_text(
        "HLRN Advanced Driver Stats - ISOLATED staging package\n"
        "This is NOT deployed to highlineracingnetwork.com.\n"
        "Unzip the GitHub Actions artifact, open a terminal inside _staging_preview\n"
        "and run: python -m http.server 8765\n"
        "Open: http://localhost:8765/stats/\n"
        "Driver: http://localhost:8765/drivers/trevor-haley/\n"
        "Directory: http://localhost:8765/drivers/\n"
        "The preview only includes driver statistics pages, not the full HLRN site.\n"
        "Do not test external live admin submissions from the preview.\n",
        encoding="utf-8"
    )
    print("Staging ready:", OUT)

if __name__ == "__main__":
    main()
