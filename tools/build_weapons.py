#!/usr/bin/env python3
"""Downloads the weapon pictures of the discovery mode's adventure (img/weapons/*.webp).

The weapon figures live in assets/pipboy-map.js (WEAPONS); this only fetches their pictures from the Fallout Wiki
(CC BY-SA 3.0), crops the empty border and shrinks them.
Usage: python3 tools/build_weapons.py [--cache DIR]   (needs curl, Pillow)
"""
import argparse, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_maps import fetch_file  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = {
    "knife": "File:Fallout4 Combat knife.png",
    "pistol": "File:Fallout4 10mm pistol.png",
    "shotgun": "File:Fo4 combat shotgun standard.png",
    "rifle": "File:Standard hunting rifle fo4.png",
    "sledge": "File:Super sledge (Fallout 4).png",
    "laser": "File:AER9 laser rifle.png",
    "plasma": "File:Fallout4 plasma sniper rifle.png",
    "minigun": "File:Fallout4 Minigun.png",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".map-cache"))
    cache = ap.parse_args().cache
    os.makedirs(cache, exist_ok=True)
    out = os.path.join(ROOT, "img/weapons")
    os.makedirs(out, exist_ok=True)
    for key, title in FILES.items():
        im = Image.open(fetch_file(cache, title)).convert("RGBA")
        im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
        im.thumbnail((480, 240), Image.LANCZOS)
        im.save(os.path.join(out, key + ".webp"), quality=86)
        print(key, im.size)


if __name__ == "__main__":
    main()
