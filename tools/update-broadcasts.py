#!/usr/bin/env python3
import json, subprocess, datetime, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "broadcasts.json"
SUNDAY_URL = "https://www.youtube.com/@High_Line_Racing/streams"

def load_streams():
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--flat-playlist",
        "--playlist-end", "8",
        "--dump-single-json",
        "--no-warnings",
        SUNDAY_URL,
    ]
    raw = subprocess.check_output(cmd, text=True, timeout=120)
    return json.loads(raw)

def choose_latest(data):
    entries = data.get("entries") or []
    for e in entries:
        if not e:
            continue
        vid = e.get("id")
        title = (e.get("title") or "").strip()
        availability = e.get("availability")
        live_status = e.get("live_status")
        # Skip scheduled/upcoming streams; we want the latest completed replay.
        if live_status in {"is_upcoming", "is_live"}:
            continue
        if vid and len(vid) == 11:
            return {
                "videoId": vid,
                "title": title or "Latest Sunday Night League Broadcast",
                "url": f"https://www.youtube.com/watch?v={vid}",
                "availability": availability,
                "liveStatus": live_status,
            }
    return None

def main():
    data = load_streams()
    latest = choose_latest(data)
    channel_id = data.get("channel_id") or data.get("uploader_id")
    if channel_id and not str(channel_id).startswith("UC"):
        channel_id = None

    payload = {
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "sunday": {
            "channelUrl": "https://www.youtube.com/@High_Line_Racing",
            "channelId": channel_id,
            "latestReplay": latest,
            "source": "youtube-streams",
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))

if __name__ == "__main__":
    main()
