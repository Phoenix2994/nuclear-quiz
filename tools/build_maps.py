#!/usr/bin/env python3
"""Builds data/maps.json and img/maps/* for the map quiz.

Source: Fallout Wiki interactive maps (https://fallout.fandom.com, CC BY-SA 3.0): marker names,
coordinates and map images. Quiz targets are the notable locations: markers of a "major" category,
markers alone in their category (e.g. Diamond City) and markers that have an entry in data/articles.json.
Usage: python3 tools/build_maps.py [--cache DIR]   (needs curl, Pillow; downloads are cached in DIR)
"""
import argparse, json, math, os, re, subprocess
from html.parser import HTMLParser
from PIL import Image, ImageChops, ImageFilter

API = "https://fallout.fandom.com/api.php"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# key: (interactive map page, label, group, short name inside the group, hit radius in map units, tint green)
GAMES = {
    "fo3": ("Map:FO3 World Map", "Fallout 3", "fo3", "Capital Wasteland", 30, True),
    "fo3pl": ("Map:FO3PL World Map", "Fallout 3: Point Lookout", "fo3", "Point Lookout", 40, True),
    "fo3tp": ("Map:FO3TP World Map", "Fallout 3: The Pitt", "fo3", "The Pitt", 40, True),
    "fo3oa": ("Map:FO3OA World Map", "Fallout 3: Operation Anchorage", "fo3", "Anchorage", 40, True),
    "fnv": ("Map:FNV World Map", "Fallout: New Vegas", "fnv", "Mojave", 30, True),
    "fnvhh": ("Map:FNVHH World Map", "New Vegas: Honest Hearts", "fnv", "Honest Hearts", 40, True),
    "fnvlr": ("Map:FNVLR World Map", "New Vegas: Lonesome Road", "fnv", "Lonesome Road", 40, True),
    "fnvowb": ("Map:FNVOWB World Map", "New Vegas: Old World Blues", "fnv", "Old World Blues", 40, True),
    "fo4": ("Map:Fo4 Commonwealth", "Fallout 4", "fo4", "Commonwealth", 28, False),
    "fo76": ("Map:FO76 Worldmap", "Fallout 76", "fo76", "Appalachia", 28, False),
}
# Real in-game Pip-Boy maps with their icons already drawn in (provided by the project owner). They replace the
# wiki base image for the two main maps. ALIGN maps wiki marker coordinates onto them: (sx, sy, dx, dy), scale about the
# map centre then shift, in map units; fitted by matching marker positions to the icons visible in the image.
BAKED = {
    "fo3": {"file": "tools/sources/fo3-pipboy-map.jpg", "size": (1160, 1160), "align": (1.0, 1.016, -7.8, 2.6), "min_lum": 90},
    "fnv": {"file": "tools/sources/fnv-pipboy-map.jpg", "size": None, "align": (1.0, 1.004, -1.0, -5.9), "min_lum": 150},
}
# Discovery mode: icons of places still to discover are drawn again in another colour on top of the (untouched) map.
# ICON_RADIUS (map units) is the area around a marker that contains its baked-in icon even if the marker is a few
# pixels off; GLYPH_CONTRAST how much brighter than its surroundings a baked glyph pixel is.
ICON_RADIUS = {"fo3": 16, "fnv": 15, "fo4": 15, "fo76": 24}
GLYPH_CONTRAST = {"fo4": 40}  # FO4 glyphs have no plate: a transparent layer of the glyph pixels, recoloured
# FO3 / FNV icons are filled plates: a square copy of the map around the icon with its colour rotated (degrees, half size)
HUE_TINT = {"fo3": (-100, 14), "fnv": (155, 14)}  # green -> amber, amber -> cyan
UNDISCOVERED = {"fo3": (255, 176, 64), "fnv": (80, 215, 255), "fo4": (255, 176, 64)}  # colour of the icons to discover
GROUP_COLOR = {"fo3": (110, 255, 130), "fnv": (255, 186, 96)}  # glyph / tint colour of the maps without baked icons
# Where the "discover the map" mode starts (marker name): the game's starting vault or town, or the DLC entry point
START = {
    "fo3": "Vault 101", "fo3pl": "The Ark & Dove Cathedral", "fo3tp": "The Pitt train yard", "fo3oa": "U.S. Army field headquarters",
    "fnv": "Goodsprings", "fnvhh": "Southern Passage", "fnvlr": "Junction 7 rest stop", "fnvowb": "Signal Hills transmitter",
    "fo4": "Vault 111", "fo76": "Vault 76",
}
# Wiki location lists: locations in italic there are not marked on the Pip-Boy, so they are never asked
LOCATION_LISTS = {"fo3": "Fallout 3 locations", "fnv": "Fallout: New Vegas locations"}
SKIP_CATS = {"Unmarked", "Bobbleheads", "Pond/Lake", "Water bodies", "Wooded areas", "Quarry", "Mines"}
SETTLEMENTS = {"Vaults", "Large settlements", "Medium settlements", "Small settlements", "Monument", "Landmarks", "Military", "Buildings"}
MAJOR = {  # games without an entry (the DLC maps) ask every marker
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


class _Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.italic = self.li = 0
        self.marked, self.unmarked = set(), set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "li":
            self.li += 1
        elif tag in ("i", "em"):
            self.italic += 1
        elif tag == "a" and self.li and a.get("title") and a.get("href", "").startswith("/wiki/"):
            (self.unmarked if self.italic else self.marked).add(a["title"].lower())

    def handle_endtag(self, tag):
        if tag == "li":
            self.li -= 1
        elif tag in ("i", "em"):
            self.italic -= 1


def location_list(cache, page):
    path = os.path.join(cache, safe("list-" + page) + ".html")
    if not os.path.exists(path):
        open(path, "w").write(curl_json(action="parse", page=page, prop="text")["parse"]["text"]["*"])
    p = _Links()
    p.feed(open(path).read())
    return p.marked, p.unmarked


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


def make_glyphs(im, markers, radius, contrast, color):
    """Transparent layer holding only the baked-in icon pixels around each marker, in a flat `color`
    (needs opencv-python-headless). Drawn over the untouched map it recolours the icon."""
    import cv2
    import numpy as np
    a = np.asarray(im.convert("RGB"))[:, :, ::-1].copy()
    discs = np.zeros(a.shape[:2], np.uint8)
    for k in markers:
        cv2.circle(discs, (round(k["x"] / 1000 * im.width), round(k["y"] / 1000 * im.height)), round(radius / 1000 * im.width), 255, -1)
    gray = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY)
    glyph = ((gray.astype(int) - cv2.medianBlur(gray, 41).astype(int)) > contrast).astype(np.uint8) * 255
    alpha = cv2.dilate(cv2.bitwise_and(glyph, discs), np.ones((3, 3), np.uint8), iterations=1)  # cover antialiased edges
    rgba = np.zeros(a.shape[:2] + (4,), np.uint8)
    rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2], rgba[:, :, 3] = color[0], color[1], color[2], alpha
    return Image.fromarray(rgba, "RGBA")


def duotone(im, lo=(2, 10, 4), hi=(96, 255, 120)):  # lo/hi: dark and bright colour of the tinted map
    g = im.convert("L")
    lut_r, lut_g, lut_b = [], [], []
    for v in range(256):
        t = min(1.0, max(0.0, (v / 255 - 0.04) / 0.8)) ** 0.9
        lut_r.append(round(lo[0] + (hi[0] - lo[0]) * t))
        lut_g.append(round(lo[1] + (hi[1] - lo[1]) * t))
        lut_b.append(round(lo[2] + (hi[2] - lo[2]) * t))
    return Image.merge("RGB", [g.point(lut_r), g.point(lut_g), g.point(lut_b)])


# FO3 / New Vegas marker category -> Fallout 4 marker category whose icon is used for it
FO4_ICON_FOR = {
    "Vaults": "Vault", "Large settlements": "City", "Medium settlements": "Settlement", "Small settlements": "Encampment",
    "Military": "Military Base", "Monument": "Monument", "Landmarks": "Landmark", "Buildings": "Office", "Metro": "Metro",
    "Ruins": "Urban Ruins", "Districts": "Town Ruins", "Factories": "Factory + Industrial Shacks", "Caves": "Cave",
    "Sewers": "Sewer",
}


def central_glyph(a):
    """Keep only the glyph around the centre of a 48x48 alpha crop (drops pieces of neighbouring icons)."""
    near = a.point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(7))  # bridge small gaps
    w, h = near.size
    px = near.load()
    seed = min(((x, y) for x in range(w) for y in range(h) if px[x, y]), key=lambda p: math.hypot(p[0] - w / 2, p[1] - h / 2))
    keep, todo = {seed}, [seed]
    while todo:
        x, y = todo.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and (nx, ny) not in keep:
                keep.add((nx, ny))
                todo.append((nx, ny))
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for x, y in keep:
        mp[x, y] = 255
    return ImageChops.multiply(a, mask)


def extract_fo4_icons(im, markers):
    """Returns {colour name: {FO4 category: path}}."""
    icons = {}
    for cname, color, suffix in (("green", GROUP_COLOR["fo3"], ""), ("amber", GROUP_COLOR["fnv"], "-amber"),
                                 ("cyan", UNDISCOVERED["fnv"], "-cyan")):
        icons[cname] = _extract_fo4_icons(im, markers, color, suffix)
    return icons


def _extract_fo4_icons(im, markers, color, suffix):
    """FO4's map has its Pip-Boy icons baked in. Crop one clean glyph per category from an isolated marker."""
    pts = [(k["cat"], k["x"] / 1000 * im.width, k["y"] / 1000 * im.height) for k in markers]
    icons = {}
    for cat in sorted(set(FO4_ICON_FOR.values())):
        mine = [p for p in pts if p[0] == cat]
        def isolation(p):
            return min([math.hypot(p[1] - q[1], p[2] - q[2]) for q in pts if q is not p] or [1e9])
        _, cx, cy = max(mine, key=isolation)
        g = im.crop((round(cx) - 24, round(cy) - 24, round(cx) + 24, round(cy) + 24)).getchannel("G")
        a = g.point(lambda v: max(0, min(255, round((v - 110) * 255 / 100))))
        a = central_glyph(a)
        box = a.point(lambda v: 255 if v > 90 else 0).getbbox()
        a = a.crop(box)
        side = max(a.size) + 4
        sq = Image.new("L", (side, side), 0)
        sq.paste(a, ((side - a.width) // 2, (side - a.height) // 2))
        res = Image.new("RGBA", (side, side), color + (0,))
        res.putalpha(sq)
        name = "img/maps/icons/fo4-" + re.sub(r"[^a-z0-9]+", "-", cat.lower()).strip("-") + suffix + ".png"
        res.resize((48, 48), Image.LANCZOS).save(os.path.join(ROOT, name))
        icons[cat] = name
    return icons


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".map-cache"))
    cache = ap.parse_args().cache
    os.makedirs(cache, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "img/maps/icons"), exist_ok=True)

    maps = {g: fetch_map(cache, spec[0]) for g, spec in GAMES.items()}
    known = {a["titolo"].lower() for a in json.load(open(os.path.join(ROOT, "data/articles.json"))) if a["lang"] == "en"}

    marked, unmarked = {}, {}
    for grp, page in LOCATION_LISTS.items():
        marked[grp], unmarked[grp] = location_list(cache, page)
    fo4_icons = None
    out = {}
    for g, (page, label, group, short, hit, tint) in sorted(GAMES.items(), key=lambda kv: kv[0] != "fo4"):  # fo4 first: it supplies the icons
        m = maps[g]
        (x0, y0), (x1, y1) = m["mapBounds"]
        cats = {c["id"]: c for c in m["categories"]}
        src = None if g in BAKED else fetch_file(cache, "File:" + m["mapImage"])
        baked = BAKED.get(g)
        if baked:
            im = Image.open(os.path.join(ROOT, baked["file"])).convert("RGB")
            if baked["size"]:
                im = im.resize(baked["size"], Image.LANCZOS)  # the real map is square; the source screenshot is not
        else:
            im = Image.open(src).convert("RGB")
        if g == "fo76":
            im = im.resize((2560, 2560), Image.LANCZOS)
        elif tint and not baked:
            if group == "fnv":
                im = duotone(im, lo=(10, 6, 2), hi=(255, 184, 96))
            else:
                im = duotone(im)
        dst = f"img/maps/{g}.webp"
        im.save(os.path.join(ROOT, dst), "WEBP", quality=80 if g != "fo76" else 74, method=6)

        icons, icons_undisc = {}, {}
        if tint and not baked:  # tinted wiki maps carry no icons: draw FO4 glyphs (and a recoloured set for undiscovered places)
            for c in m["categories"]:
                if c["name"] in FO4_ICON_FOR:
                    icons[c["id"]] = fo4_icons["amber" if group == "fnv" else "green"][FO4_ICON_FOR[c["name"]]]
                    icons_undisc[c["id"]] = fo4_icons["cyan" if group == "fnv" else "amber"][FO4_ICON_FOR[c["name"]]]

        names = {}
        for x in m["markers"]:
            names[x["popup"]["title"].strip().lower()] = names.get(x["popup"]["title"].strip().lower(), 0) + 1
        markers = []
        for i, x in enumerate(m["markers"]):
            t = x["popup"]["title"].strip()
            page_t = (x["popup"].get("link") or {}).get("url") or t
            px, py = x["position"]
            mx, my = (px - x0) / (x1 - x0) * 1000, (py - y0) / (y1 - y0) * 1000
            if baked:
                sx, sy, dx, dy = baked["align"]
                mx, my = (mx - 500) * sx + 500 + dx, (my - 500) * sy + 500 + dy
            markers.append({
                "id": f"{g}-{i}", "name": t, "page": page_t, "cat": cats[x["categoryId"]]["name"], "cid": x["categoryId"],
                "x": round(mx, 1), "y": round(my, 1),
            })
        per_cat = {}
        for k in markers:
            per_cat[k["cat"]] = per_cat.get(k["cat"], 0) + 1

        def notable(k):
            if g not in MAJOR:
                return True
            return (k["cat"] in MAJOR[g] or per_cat[k["cat"]] == 1 or k["name"].lower() in known
                    or k["page"].lower() in known)

        def has_icon(k):  # maps with baked-in icons: keep only markers with a visible glyph
            if g != "fo4" and not baked:
                return True
            cx, cy = k["x"] / 1000 * im.width, k["y"] / 1000 * im.height
            win = im.crop((int(cx) - 14, int(cy) - 14, int(cx) + 15, int(cy) + 15))
            if baked:  # the glyph is the brightest thing around the marker; bare terrain stays darker
                return win.convert("L").getextrema()[1] >= baked["min_lum"]
            return win.getchannel("G").getextrema()[1] >= 200

        targets = [k["id"] for k in markers
                   if k["cat"] not in SKIP_CATS and names[k["name"].lower()] == 1 and notable(k) and has_icon(k)
                   and not (k["name"].lower() in unmarked.get(group, ()) and k["name"].lower() not in marked.get(group, ()))]
        if g == "fo4":
            fo4_icons = extract_fo4_icons(im, markers)
        xs = [k["x"] for k in markers]; ys = [k["y"] for k in markers]
        pad = 50 if g in ("fo3", "fnv", "fo4") else 90
        bbox = [0, 0, 1000, 1000] if g == "fo76" else [max(0, min(xs) - pad), max(0, min(ys) - pad), min(1000, max(xs) + pad), min(1000, max(ys) + pad)]
        start = next(k["id"] for k in markers if k["name"].strip() == START[g])
        glyphs = None
        if g in GLYPH_CONTRAST:
            glyphs = f"img/maps/{g}-glyphs.webp"
            make_glyphs(im, markers, ICON_RADIUS[g] + 2, GLYPH_CONTRAST[g], UNDISCOVERED[g]).save(
                os.path.join(ROOT, glyphs), "WEBP", lossless=True, method=6)
        for old in ("fo3", "fnv"):  # leftovers of a previous method
            if g == old and os.path.exists(os.path.join(ROOT, f"img/maps/{g}-glyphs.webp")):
                os.remove(os.path.join(ROOT, f"img/maps/{g}-glyphs.webp"))
        hue = HUE_TINT.get(g)
        out[g] = {
            "start": start, "glyphs": glyphs, "hue": hue, "patch": ICON_RADIUS.get(g, 0) + 2, "label": label, "group": group, "short": short, "image": dst, "hit": hit, "bbox": [round(v) for v in bbox], "icons": icons, "icons_undisc": icons_undisc,
            "cats": {c["id"]: c["name"] for c in m["categories"]},
            "markers": [{k: v for k, v in mk.items() if k != "cid"} | {"c": mk["cid"]} for mk in markers],
            "targets": targets,
        }
    out = {g: out[g] for g in GAMES}
    json.dump(out, open(os.path.join(ROOT, "data/maps.json"), "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
