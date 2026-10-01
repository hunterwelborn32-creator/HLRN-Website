#!/usr/bin/env python3
"""Mirror the HLRN Discord announcements channel into a public GitHub Pages JSON feed.

This intentionally bypasses the Cloudflare announcements worker so the News page does
not depend on a separate service. It uses the existing repository Discord bot token.
"""
from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

BASE = pathlib.Path(__file__).resolve().parents[1]
OUT = BASE / "data" / "announcements.json"
TOKEN = os.getenv("DISCORD_BOT_TOKEN", "").strip()
ANCHOR_CHANNEL = os.getenv("DISCORD_ANCHOR_CHANNEL_ID", "1528189461656244364").strip()
EXPLICIT_CHANNEL = os.getenv("DISCORD_ANNOUNCEMENTS_CHANNEL_ID", "").strip()
API = "https://discord.com/api/v10"

if not TOKEN:
    sys.exit("Missing DISCORD_BOT_TOKEN repository secret; no announcement sync performed.")

HEADERS = {
    "Authorization": "Bot " + TOKEN,
    "User-Agent": "HLRN-Announcements-GitHub-Mirror/1.0",
    "Accept": "application/json",
}


def request_json(path: str):
    url = API + path
    for attempt in range(7):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=35) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                try:
                    retry = float(json.loads(exc.read().decode("utf-8")).get("retry_after", 2))
                except Exception:
                    retry = 2
                time.sleep(min(retry + 0.25, 30))
                continue
            if exc.code >= 500 and attempt < 6:
                time.sleep(min(2 ** attempt, 12))
                continue
            body = ""
            try:
                body = exc.read().decode("utf-8", "replace")[:500]
            except Exception:
                pass
            raise RuntimeError(f"Discord HTTP {exc.code} for {path}: {body}") from exc
        except urllib.error.URLError as exc:
            if attempt == 6:
                raise RuntimeError(f"Discord request failed for {path}: {exc}") from exc
            time.sleep(min(2 ** attempt, 12))
    raise RuntimeError("Discord request retries exceeded")


def norm_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")


def discover_channel():
    if EXPLICIT_CHANNEL:
        channel = request_json(f"/channels/{EXPLICIT_CHANNEL}")
        guild_id = str(channel.get("guild_id") or "")
        if not guild_id:
            raise RuntimeError("Configured announcements channel is not a guild channel.")
        return guild_id, channel

    anchor = request_json(f"/channels/{ANCHOR_CHANNEL}")
    guild_id = str(anchor.get("guild_id") or "")
    if not guild_id:
        raise RuntimeError("Could not determine the HLRN Discord guild from the anchor channel.")

    channels = request_json(f"/guilds/{guild_id}/channels")
    text_channels = [
        c for c in channels
        if c.get("type") in (0, 5) and c.get("id") and c.get("name")
    ]

    exact_priority = [
        "announcements",
        "hlrn-announcements",
        "official-announcements",
        "league-announcements",
        "announcement",
        "updates-and-announcements",
        "announcements-and-updates",
    ]
    by_name = {norm_name(c.get("name")): c for c in text_channels}
    for name in exact_priority:
        if name in by_name:
            return guild_id, by_name[name]

    candidates = [
        c for c in text_channels
        if "announce" in norm_name(c.get("name"))
        and not any(
            private_word in norm_name(c.get("name"))
            for private_word in ("admin", "staff", "moderator", "mod-", "race-control", "bot-")
        )
    ]
    if not candidates:
        available = ", ".join(sorted(c.get("name", "") for c in text_channels))
        raise RuntimeError(
            "No Discord announcement channel could be found automatically. "
            "Set DISCORD_ANNOUNCEMENTS_CHANNEL_ID if the channel uses a different name. "
            f"Visible text channels: {available}"
        )

    # Multiple HLRN channels can contain "announcements". Prefer the public-facing
    # candidate that is actually active now instead of blindly taking the first
    # channel named #announcements (which may be an old archived channel).
    preferred_names = {
        "hlrn-announcements": 0,
        "official-announcements": 1,
        "league-announcements": 2,
        "announcements": 3,
        "announcement": 4,
        "updates-and-announcements": 5,
        "announcements-and-updates": 6,
    }

    def recent_activity(channel):
        channel_id = str(channel.get("id") or "")
        latest_ts = ""
        latest_id = ""
        try:
            batch = request_json(f"/channels/{channel_id}/messages?limit=1")
            if batch:
                latest_ts = str(batch[0].get("timestamp") or "")
                latest_id = str(batch[0].get("id") or "")
        except Exception:
            pass
        return latest_ts, latest_id

    scored = []
    for channel in candidates:
        latest_ts, latest_id = recent_activity(channel)
        name = norm_name(channel.get("name"))
        scored.append((
            latest_ts,
            latest_id,
            -preferred_names.get(name, 99),
            -int(channel.get("position") or 9999),
            channel,
        ))

    scored.sort(key=lambda item: item[:4], reverse=True)
    return guild_id, scored[0][4]


def compact_embed(embed):
    if not isinstance(embed, dict):
        return {}
    result = {}
    for key in ("title", "description", "url", "type", "color"):
        if embed.get(key) not in (None, ""):
            result[key] = embed.get(key)
    for key in ("image", "thumbnail"):
        block = embed.get(key)
        if isinstance(block, dict) and block.get("url"):
            result[key] = {"url": block.get("url")}
    if isinstance(embed.get("author"), dict):
        a = embed["author"]
        result["author"] = {
            k: a.get(k) for k in ("name", "url", "icon_url") if a.get(k)
        }
    if isinstance(embed.get("footer"), dict):
        footer = embed["footer"]
        result["footer"] = {
            k: footer.get(k) for k in ("text", "icon_url") if footer.get(k)
        }
    if embed.get("timestamp"):
        result["timestamp"] = embed.get("timestamp")
    return result


def compact_message(message, guild_id, channel_id):
    author = message.get("author") or {}
    attachments = []
    for a in message.get("attachments") or []:
        attachments.append({
            k: a.get(k)
            for k in ("id", "filename", "url", "proxy_url", "size", "content_type", "width", "height")
            if a.get(k) not in (None, "")
        })

    embeds = [compact_embed(e) for e in (message.get("embeds") or [])]
    embeds = [e for e in embeds if e]

    return {
        "id": str(message.get("id") or ""),
        "content": str(message.get("content") or ""),
        "timestamp": message.get("timestamp"),
        "edited_timestamp": message.get("edited_timestamp"),
        "pinned": bool(message.get("pinned")),
        "author": {
            "id": str(author.get("id") or ""),
            "username": author.get("global_name") or author.get("username") or "HLRN",
            "global_name": author.get("global_name"),
            "avatar": author.get("avatar"),
        },
        "attachments": attachments,
        "embeds": embeds,
        "jump_url": f"https://discord.com/channels/{guild_id}/{channel_id}/{message.get('id')}",
    }


def load_messages(guild_id, channel_id, limit_total=1000):
    before = None
    collected = []
    while len(collected) < limit_total:
        params = {"limit": "100"}
        if before:
            params["before"] = before
        query = urllib.parse.urlencode(params)
        batch = request_json(f"/channels/{channel_id}/messages?{query}")
        if not batch:
            break

        for message in batch:
            if message.get("type") not in (0, 19):
                continue
            if not (
                str(message.get("content") or "").strip()
                or message.get("attachments")
                or message.get("embeds")
            ):
                continue
            collected.append(compact_message(message, guild_id, channel_id))
            if len(collected) >= limit_total:
                break

        before = str(batch[-1].get("id") or "")
        if len(batch) < 100 or not before:
            break

    # Discord already returns newest-first; reinforce it for deterministic output.
    collected.sort(key=lambda m: str(m.get("timestamp") or ""), reverse=True)
    return collected


def existing_payload():
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main():
    guild_id, channel = discover_channel()
    channel_id = str(channel.get("id"))
    channel_name = str(channel.get("name") or "announcements")
    announcements = load_messages(guild_id, channel_id)

    old = existing_payload()
    same = (
        old.get("success") is True
        and str((old.get("channel") or {}).get("id") or "") == channel_id
        and old.get("announcements") == announcements
    )
    if same:
        print(f"Announcements unchanged: {len(announcements)} messages from #{channel_name}")
        return 0

    payload = {
        "success": True,
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "channel": {
            "id": channel_id,
            "name": channel_name,
            "guild_id": guild_id,
        },
        "announcements": announcements,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Synced {len(announcements)} announcements from #{channel_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
