#!/usr/bin/env python3
"""Builds data/maps.json and img/maps/* for the map quiz.

Source: Fallout Wiki interactive maps (https://fallout.fandom.com, CC BY-SA 3.0): marker names,
coordinates and map images. Quiz targets are the notable locations: markers of a "major" category,
markers alone in their category (e.g. Diamond City) and markers that have an entry in data/articles.json.
Usage: python3 tools/build_maps.py [--cache DIR]   (needs curl, Pillow; downloads are cached in DIR)
"""
import argparse, json, os, re, subprocess
from PIL import Image

API = "https://fallout.fandom.com/api.php"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES = {  # key: (interactive map page, label, hit radius in map units, tint)
    "fo3": ("Map:FO3 World Map", "Fallout 3", 30, True),
    "fnv": ("Map:FNV World Map", "Fallout: New Vegas", 30, True),
    "fo4": ("Map:Fo4 Commonwealth", "Fallout 4", 28, False),
    "fo76": ("Map:FO76 Worldmap", "Fallout 76", 28, False),
}
SKIP_CATS = {"Unmarked", "Bobbleheads", "Pond/Lake", "Water bodies", "Wooded areas", "Quarry", "Mines"}
SETTLEMENTS = {"Vaults", "Large settlements", "Medium settlements", "Small settlements", "Monument", "Landmarks", "Military", "Buildings"}
MAJOR = {
    "fo3": SETTLEMENTS,
    "fnv": SETTLEMENTS,
    "fo4": {"Settlement", "City", "Vault", "Military Base", "Monument", "Landmark", "Skyscraper", "Airfield", "Railroad",
            "Hospital", "Police Station", "Church", "Town Ruins"},
    "fo76": {"Towns", "Cities", "Military ", "Landmarks", "Monuments", "Forts", "Dams", "Churches", "Public workshops"},
}


def curl_json(**p):
    p["format"] = "json"
    args = ["curl", "-sS", "-m", "90", "-G", API]
    for k, v in p.items():
        args += ["--data-urlencode", f"{k}={v}"]
    return json.loads(subprocess.run(args, capture_output=True, text=True, check=True).stdout)


def safe(name):
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)


def fetch_map(cache, page):
    path = os.path.join(cache, safe(page) + ".json")
    if not os.path.exists(path):
        r = curl_json(action="query", titles=page, prop="revisions", rvprop="content", rvslots="main")
        txt = list(r["query"]["pages"].values())[0]["revisions"][0]["slots"]["main"]["*"]
        if txt.startswith("#REDIRECT"):
            return fetch_map(cache, re.search(r"\[\[(.+?)\]\]", txt).group(1))
        open(path, "w").write(txt)
    return json.load(open(path))


def file_url(title):
    r = curl_json(action="query", titles=title, prop="imageinfo", iiprop="url")
    return list(r["query"]["pages"].values())[0]["imageinfo"][0]["url"]


def fetch_file(cache, title):
    path = os.path.join(cache, safe(title))
    if not os.path.exists(path):
        subprocess.run(["curl", "-sS", "-L", "-m", "300", "-o", path, file_url(title)], check=True)
    return path


def duotone(im, lo=(2, 10, 4), hi=(96, 255, 120)):
    g = im.convert("L")
    lut_r, lut_g, lut_b = [], [], []
    for v in range(256):
        t = min(1.0, max(0.0, (v / 255 - 0.04) / 0.8)) ** 0.9
        lut_r.append(round(lo[0] + (hi[0] - lo[0]) * t))
        lut_g.append(round(lo[1] + (hi[1] - lo[1]) * t))
        lut_b.append(round(lo[2] + (hi[2] - lo[2]) * t))
    return Image.merge("RGB", [g.point(lut_r), g.point(lut_g), g.point(lut_b)])


def glyph(path, out, color=(110, 255, 130)):
    """Gamebryo marker icons are opaque squares: keep the glyph, drop the background."""
    im = Image.open(path).convert("L")
    bg = im.getpixel((0, 0))
    a = im.point(lambda v: min(255, abs(v - bg) * 2))
    res = Image.new("RGBA", im.size, color + (0,))
    res.putalpha(a)
    res.save(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".map-cache"))
    cache = ap.parse_args().cache
    os.makedirs(cache, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "img/maps/icons"), exist_ok=True)

    maps = {g: fetch_map(cache, spec[0]) for g, spec in GAMES.items()}
    known = {a["titolo"].lower() for a in json.load(open(os.path.join(ROOT, "data/articles.json"))) if a["lang"] == "en"}

    out = {}
    for g, (page, label, hit, tint) in GAMES.items():
        m = maps[g]
        (x0, y0), (x1, y1) = m["mapBounds"]
        cats = {c["id"]: c for c in m["categories"]}
        src = fetch_file(cache, "File:" + m["mapImage"])
        im = Image.open(src).convert("RGB")
        if g == "fo76":
            im = im.resize((2560, 2560), Image.LANCZOS)
        elif tint:
            im = duotone(im)
        dst = f"img/maps/{g}.webp"
        im.save(os.path.join(ROOT, dst), "WEBP", quality=80 if g != "fo76" else 74, method=6)

        icons = {}
        if tint:
            for c in m["categories"]:
                if c.get("icon"):
                    ip = fetch_file(cache, c["icon"])
                    name = f"img/maps/icons/{safe(c['icon'][5:]).replace('_gamebryo', '').lower()}"
                    name = os.path.splitext(name)[0] + ".png"
                    glyph(ip, os.path.join(ROOT, name))
                    icons[c["id"]] = name

        names = {}
        for x in m["markers"]:
            names[x["popup"]["title"].strip().lower()] = names.get(x["popup"]["title"].strip().lower(), 0) + 1
        markers = []
        for i, x in enumerate(m["markers"]):
            t = x["popup"]["title"].strip()
            page_t = (x["popup"].get("link") or {}).get("url") or t
            px, py = x["position"]
            markers.append({
                "id": f"{g}-{i}", "name": t, "page": page_t, "cat": cats[x["categoryId"]]["name"], "cid": x["categoryId"],
                "x": round((px - x0) / (x1 - x0) * 1000, 1), "y": round((py - y0) / (y1 - y0) * 1000, 1),
            })
        per_cat = {}
        for k in markers:
            per_cat[k["cat"]] = per_cat.get(k["cat"], 0) + 1

        def notable(k):
            return (k["cat"] in MAJOR[g] or per_cat[k["cat"]] == 1 or k["name"].lower() in known
                    or k["page"].lower() in known)

        def has_icon(k):  # FO4's map has its icons baked in: keep only markers with a visible glyph
            if g != "fo4":
                return True
            cx, cy = k["x"] / 1000 * im.width, k["y"] / 1000 * im.height
            box = im.crop((int(cx) - 14, int(cy) - 14, int(cx) + 15, int(cy) + 15)).getchannel("G")
            return box.getextrema()[1] >= 200

        targets = [k["id"] for k in markers
                   if k["cat"] not in SKIP_CATS and names[k["name"].lower()] == 1 and notable(k) and has_icon(k)]
        xs = [k["x"] for k in markers]; ys = [k["y"] for k in markers]
        pad = 50
        bbox = [0, 0, 1000, 1000] if g == "fo76" else [max(0, min(xs) - pad), max(0, min(ys) - pad), min(1000, max(xs) + pad), min(1000, max(ys) + pad)]
        out[g] = {
            "label": label, "image": dst, "hit": hit, "bbox": [round(v) for v in bbox], "icons": icons,
            "cats": {c["id"]: c["name"] for c in m["categories"]},
            "markers": [{k: v for k, v in mk.items() if k != "cid"} | {"c": mk["cid"]} for mk in markers],
            "targets": targets,
        }
    json.dump(out, open(os.path.join(ROOT, "data/maps.json"), "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
