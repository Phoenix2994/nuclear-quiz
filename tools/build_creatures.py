#!/usr/bin/env python3
"""Builds data/creatures.json and img/creatures/*.webp for the map quiz fights.

Creature lists, names and images come from the Fallout Wiki (CC BY-SA 3.0): the pages of "Category:<game> creatures"
and the image of their infobox (the transparent render; its silhouette box is stored to place the V.A.T.S. zones).
Level tier, speed class and body type are NOT in the wiki in a uniform way: they are game-design choices defined here
(TIERS, SPEED, BODY), keyed by words of the creature name. Tune them freely.
Usage: python3 tools/build_creatures.py [--cache DIR]   (needs curl and Pillow)
"""
import argparse, io, json, os, re, subprocess, time
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://fallout.fandom.com/api.php"
CATEGORIES = {"fo3": "Fallout 3 creatures", "fnv": "Fallout: New Vegas creatures", "fo4": "Fallout 4 creatures", "fo76": "Fallout 76 creatures"}
SKIP = re.compile(r"(?i)^(aliens|cryptids|creature taming|.* legendary enemies|.* creatures|fish|fly|firefly|chicken|house cat|cat|beaver|crow|"
                  r"dolphish|iguana|gorilla|vulture|bee swarm)\b")
MAX_SIDE = 360

# base level of a creature: the first pattern (regex on the lower-case name, whole words) that matches wins
TIERS = [(r"mirelurk (king|queen)|fog crawler|snallygaster", 12), (r"behemoth", 15), (r"scorchbeast", 14), (r"deathclaw", 12),
         (r"wendigo", 9), (r"angler|alien|abomination|mothman", 8), (r"cazador|yao guai", 7),
         (r"mirelurk|centaur|super mutant|glowing|cyberdog|gulper", 6), (r"scorpion|mantis|stingwing", 5),
         (r"bighorner|hound|lakelurk|night stalker|hermit crab", 4), (r"dog|coyote|mongrel|ghoul|ant|radstag|floater|bloodbug|spore", 3),
         (r"rat|radrat|gecko|mole|brahmin|cricket", 2), (r"bloatfly|radroach", 1)]
DEFAULT_TIER = 4
# speed class: slow < normal < fast
SPEED = [(r"brahmin|mole|floater|gulper|fog crawler|behemoth|mirelurk|lakelurk|hermit crab", "slow"),
         (r"dog|coyote|hound|mongrel|cazador|deathclaw|mantis|stingwing|scorchbeast|radstag|bloatfly|yao guai|night stalker|rabbit", "fast")]
# body type -> V.A.T.S. zones (see assets/pipboy-map.js)
BODY = [(r"scorpion|\bant\b|roach|mantis|cricket|spore plant", "arthropod"), (r"bloatfly|cazador|stingwing|bloodbug|scorchbeast|mothman|raven|radgull|owlet", "flyer"),
        (r"mirelurk|lakelurk|angler|hermit crab", "crab"), (r"floater|fog crawler|spore carrier", "blob"),
        (r"dog|coyote|hound|mongrel|brahmin|bighorner|radstag|mole|\brat\b|radrat|gecko|yao guai|gulper|rabbit|radtoad|night stalker", "beast")]
DEFAULT_BODY = "humanoid"


def pick(table, name, default):
    low = name.lower()
    return next((v for pattern, v in table if re.search(r"\b(" + pattern + r")\b" if "\\b" not in pattern else pattern, low)), default)


def api(**p):
    p["format"] = "json"
    args = ["curl", "-sS", "-m", "90", "-G", API]
    for k, v in p.items():
        args += ["--data-urlencode", f"{k}={v}"]
    return json.loads(subprocess.run(args, capture_output=True, text=True, check=True).stdout)


def safe(s):
    return re.sub(r"[^A-Za-z0-9._-]", "_", s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".map-cache"))
    cache = ap.parse_args().cache
    os.makedirs(cache, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "img/creatures"), exist_ok=True)

    pages = {}
    for g, cat in CATEGORIES.items():
        r = api(action="query", list="categorymembers", cmtitle="Category:" + cat, cmlimit=500, cmnamespace=0)
        pages[g] = [m["title"] for m in r["query"]["categorymembers"] if not SKIP.search(re.sub(r"\s*\(.*\)$", "", m["title"]))]
        time.sleep(1)

    wikitext = {}
    titles = sorted({t for v in pages.values() for t in v})
    for i in range(0, len(titles), 40):
        batch = titles[i:i + 40]
        r = api(action="query", titles="|".join(batch), prop="revisions", rvprop="content", rvslots="main", redirects=1)["query"]
        red = {x["from"]: x["to"] for x in r.get("redirects", [])}
        by = {p["title"]: p for p in r["pages"].values()}
        for t in batch:
            p = by.get(red.get(t, t))
            wikitext[t] = p["revisions"][0]["slots"]["main"]["*"] if p and "revisions" in p else ""
        time.sleep(1.2)

    image_of = {}
    for t, wt in wikitext.items():
        m = re.search(r"\{\{Infobox creature.*?\|\s*image\s*=\s*([^\n|]+)", wt, re.S)
        if m and m.group(1).strip():
            image_of[t] = m.group(1).strip()
    files = sorted(set(image_of.values()))
    urls = {}
    for i in range(0, len(files), 40):
        r = api(action="query", titles="|".join("File:" + f for f in files[i:i + 40]), prop="imageinfo", iiprop="url", redirects=1)["query"]
        back = {x["to"]: x["from"] for x in r.get("redirects", [])}
        for p in r["pages"].values():
            if p.get("imageinfo"):
                urls[back.get(p["title"], p["title"])[5:]] = p["imageinfo"][0]["url"]
        time.sleep(1.2)

    out = {}
    for g, titles_g in pages.items():
        out[g] = []
        for t in titles_g:
            f = image_of.get(t)
            url = urls.get(f) or urls.get((f or "").replace("_", " "))
            if not url:
                continue
            path = os.path.join(cache, "cre-" + safe(f))
            if not os.path.exists(path):
                subprocess.run(["curl", "-sS", "-L", "-m", "120", "-o", path, url], check=True)
            try:
                im = Image.open(path).convert("RGBA")
            except Exception:
                continue
            alpha = im.getchannel("A")
            box = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
            if not box or alpha.getextrema()[0] > 200:  # opaque image: no silhouette, skip
                continue
            im = im.crop(box)  # keep only the creature
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            name = re.sub(r"\s*\(.*\)$", "", t)
            cid = f"{g}-{safe(name.lower())}"
            dst = f"img/creatures/{cid}.webp"
            im.save(os.path.join(ROOT, dst), "WEBP", quality=82, method=6)
            out[g].append({"id": cid, "name": name, "page": t, "img": dst, "w": im.width, "h": im.height,
                           "level": pick(TIERS, name, DEFAULT_TIER), "speed": pick(SPEED, name, "normal"), "body": pick(BODY, name, DEFAULT_BODY)})
    json.dump(out, open(os.path.join(ROOT, "data/creatures.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print({g: len(v) for g, v in out.items()})


if __name__ == "__main__":
    main()
