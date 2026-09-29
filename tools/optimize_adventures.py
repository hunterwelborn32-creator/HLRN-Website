#!/usr/bin/env python3
"""Optimize Adventures artwork for GitHub Pages.

Converts PNG/JPG/JPEG episode artwork to WebP when the WebP is smaller,
updates Adventures HTML/JSON/JS/CSS references, then removes the replaced
source image. GIF/WebP files are intentionally left unchanged.
"""
from __future__ import annotations

import re
from pathlib import Path
from PIL import Image, ImageOps

BASE = Path(__file__).resolve().parents[1]
ADVENTURES = BASE / "adventures"
QUALITY = 82
METHOD = 4
TEXT_SUFFIXES = {".html", ".json", ".js", ".css", ".txt", ".md"}
SOURCE_SUFFIXES = {".png", ".jpg", ".jpeg"}


def convert_image(source: Path):
    target = source.with_suffix(".webp")
    original_size = source.stat().st_size
    temp = target.with_suffix(".webp.tmp")

    try:
        with Image.open(source) as image:
            image = ImageOps.exif_transpose(image)
            has_alpha = image.mode in ("RGBA", "LA") or (
                image.mode == "P" and "transparency" in image.info
            )
            image = image.convert("RGBA" if has_alpha else "RGB")
            image.save(
                temp,
                format="WEBP",
                quality=QUALITY,
                method=METHOD,
                optimize=True,
                exact=has_alpha,
            )
        new_size = temp.stat().st_size
        # Only replace the original when the optimized asset is meaningfully smaller.
        if new_size >= original_size * 0.95:
            temp.unlink(missing_ok=True)
            return None
        temp.replace(target)
        return target, original_size, new_size
    except Exception:
        temp.unlink(missing_ok=True)
        raise


def text_files():
    for path in ADVENTURES.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES:
            yield path


def patch_references(conversions):
    changed_files = 0
    files = list(text_files())

    for path in files:
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        updated = content
        for source, target in conversions:
            # Reference from the Adventures root, e.g.
            # episode-09/images/018.png -> episode-09/images/018.webp
            src_root = source.relative_to(ADVENTURES).as_posix()
            dst_root = target.relative_to(ADVENTURES).as_posix()
            updated = updated.replace(src_root, dst_root)

            # Reference from inside the same episode folder, e.g.
            # images/018.png -> images/018.webp
            episode_dir = source.parent.parent
            try:
                path.relative_to(episode_dir)
                src_local = source.relative_to(episode_dir).as_posix()
                dst_local = target.relative_to(episode_dir).as_posix()
                updated = updated.replace(src_local, dst_local)
            except ValueError:
                pass

        # Browser-friendly decoding hint for story artwork.
        updated = re.sub(
            r'<img(?![^>]*\bdecoding=)',
            '<img decoding="async"',
            updated,
            flags=re.I,
        )

        if updated != content:
            path.write_text(updated, encoding="utf-8")
            changed_files += 1

    return changed_files


def main():
    sources = sorted(
        p for p in ADVENTURES.rglob("*")
        if p.is_file() and p.suffix.lower() in SOURCE_SUFFIXES
    )

    if not sources:
        print("No PNG/JPG Adventure images need optimization.")
        return

    conversions = []
    old_total = 0
    new_total = 0

    for index, source in enumerate(sources, 1):
        result = convert_image(source)
        if result is None:
            print(f"[{index}/{len(sources)}] kept original (WebP not smaller): {source.relative_to(BASE)}")
            continue

        target, old_size, new_size = result
        conversions.append((source, target))
        old_total += old_size
        new_total += new_size
        saved = 100 * (1 - new_size / old_size)
        print(
            f"[{index}/{len(sources)}] {source.relative_to(BASE)} -> "
            f"{target.name} | {old_size/1048576:.2f} MB -> "
            f"{new_size/1048576:.2f} MB | saved {saved:.1f}%"
        )

    if not conversions:
        print("No images were smaller as WebP; nothing changed.")
        return

    changed_text = patch_references(conversions)

    # References are patched first; only then remove replaced originals.
    for source, _target in conversions:
        source.unlink()

    print(
        f"Optimized {len(conversions)} images. "
        f"{old_total/1048576:.1f} MB -> {new_total/1048576:.1f} MB "
        f"({100*(1-new_total/old_total):.1f}% smaller)."
    )
    print(f"Updated {changed_text} Adventures text files.")


if __name__ == "__main__":
    main()
