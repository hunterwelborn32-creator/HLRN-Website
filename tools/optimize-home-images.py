#!/usr/bin/env python3
"""Create small visually faithful WebP copies of both HLRN homepage backgrounds."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMAGES = (
    ROOT / "assets/home/HLRN_Day_Mode_Background.png",
    ROOT / "assets/home/HLRN_Night_Mode_Background.png",
)

def main():
    for source in IMAGES:
        if not source.is_file():
            raise FileNotFoundError(source)
        destination = source.with_suffix(".webp")
        if destination.is_file():
            print(f"Already optimized: {destination.name}")
            continue
        with Image.open(source) as image:
            image.load()
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            image.save(destination, "WEBP", quality=90, method=6)
        original_bytes, new_bytes = source.stat().st_size, destination.stat().st_size
        if new_bytes >= original_bytes:
            destination.unlink()
            raise RuntimeError(f"WebP not smaller than original: {source.name}")
        print(f"Optimized {source.name}: {original_bytes} -> {new_bytes} bytes "
              f"({100 * (1 - new_bytes/original_bytes):.1f}% smaller)")

if __name__ == "__main__":
    main()
