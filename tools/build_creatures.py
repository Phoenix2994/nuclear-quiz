#!/usr/bin/env python3
"""Builds data/creatures.json and img/creatures/*.webp for the map quiz fights.

Everything comes from the Fallout Wiki (CC BY-SA 3.0), the pages of "Category:<game> creatures":
- the image of the infobox (the transparent render; its silhouette box places the V.A.T.S. zones);
- the stats table of the page (level, health, damage resistance / threshold, melee damage), when it has one;
- the body type, read from the Biology / Characteristics / Gameplay text and the page categories (see body_of);
- weak points and resistances: the sentences of the page that describe them (shown to the player), plus the effects
  listed in tools/sources/creature-weakpoints.json, each one backed by the wiki sentence it comes from;
- "antennae": creatures whose page says that crippling the antennae makes them frenzy get that V.A.T.S. zone.
Only where the wiki gives no figure does a value fall back to a formula or a default (flagged in the data: "derived").
Italian translations of the notes live in tools/sources/creature-notes-it.json (English sentence -> Italian).
Usage: python3 tools/build_creatures.py [--cache DIR]   (needs curl and Pillow)
"""
import argparse, json, os, re, subprocess, time
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://fallout.fandom.com/api.php"
CATEGORIES = {"fo3": "Fallout 3 creatures", "fnv": "Fallout: New Vegas creatures", "fo4": "Fallout 4 creatures", "fo76": "Fallout 76 creatures"}
SKIP = re.compile(r"(?i)^(aliens|cryptids|creature taming|.* legendary enemies|.* creatures|fish|fly|firefly|chicken|house cat|cat|beaver|crow|"
                  r"dolphish|iguana|gorilla|vulture|bee swarm)\b")
# creatures the wiki says cannot be targeted in V.A.T.S. (cloaked / too small): no fight with them
NO_VATS = {"Raven", "Night stalker"}
MAX_SIDE = 360

# Used ONLY when the wiki page gives no level / no speed hint / no body hint (and flagged "derived" in the data)
FALLBACK_TIER = [(r"mirelurk (king|queen)|fog crawler|snallygaster", 12), (r"behemoth", 15), (r"scorchbeast", 14), (r"deathclaw", 12),
                 (r"angler|alien|abomination|mothman", 8), (r"cazador|yao guai", 7), (r"mirelurk|centaur|super mutant|glowing|gulper", 6),
                 (r"scorpion|mantis|stingwing", 5), (r"hound|lakelurk|hermit crab", 4), (r"dog|coyote|ghoul|ant|radstag|floater|bloodbug", 3),
                 (r"rat|gecko|mole|brahmin|cricket", 2), (r"bloatfly|radroach", 1)]
DEFAULT_TIER = 4
FAST = re.compile(r"(?i)\b(fastest|very fast|quick and agile|remarkable speed|incredible speed|erratic|sprint|quick and)\b")
SLOW = re.compile(r"(?i)\b(slow|sluggish|lumber\w*|plod\w*|lethargic)\b")
SPEED_FALLBACK = [(r"brahmin|mole|floater|gulper|fog crawler|behemoth|mirelurk|lakelurk|hermit crab", "slow"),
                  (r"dog|coyote|hound|mongrel|cazador|deathclaw|mantis|stingwing|scorchbeast|radstag|bloatfly|yao guai|rabbit", "fast")]

# body type evidence: (regex over the page text, body, weight); page categories count too
BODY_TEXT = [(r"quadruped|four[- ]legged|on all fours|canines?\b|rodents?\b|bovine|\bcows?\b|two[- ]headed|dicephalic|bicephal\w*|\bsheep\b|\bdeer\b|\btoads?\b|\brabbits?\b|\bdogs?\b|coyotes?|\bbison\b|lizards?|reptil\w*|newt", "beast", 3),
             (r"crustacean|\bcrabs?\b|thick shell|carapace", "crab", 3),
             (r"arthropod|arachnid|exoskeleton|\binsects?\b|scorpion|\bants?\b|mantis|cockroach|cricket", "arthropod", 3),
             (r"flying|\bfly\b|flies|hover|airborne|wingspan|\bwings\b", "flyer", 2),
             (r"tentacle|invertebrate|flotation|soft-bodied|stationary|rooted to the ground", "blob", 3),
             (r"humanoid|bipedal|biped\b|upright|human-like|arms and legs|\bhunch|shaped more like humans", "humanoid", 3)]
BODY_CATEGORY = {"Insects": "arthropod", "Mirelurks": "crab", "Birds": "flyer", "Dogs": "beast", "Mole rats": "beast", "Brahmin": "beast",
                 "Mongrels": "beast", "Mutant hounds": "beast", "Yao guai": "beast", "Ghouls": "humanoid", "Super mutants": "humanoid",
                 "Aliens": "humanoid", "Centaurs": "humanoid", "Deathclaws": "humanoid", "Radroaches": "arthropod", "Flora": "blob"}
DEFAULT_BODY = "humanoid"
# sentences about weak points and resistances: they must name a body part and a weakness / resistance
PART_WORDS = re.compile(r"(?i)\b(head|face|belly|underbelly|limbs?|extremit\w+|legs?|wings?|antenna\w*|shell|torso|arms?|claws?|tail|stinger|hide|scales?)\b")
WEAK_WORDS = re.compile(r"(?i)weak (point|spot)|vulnerab|unarmou?red|exposed|extra damage|reduced damage|resistan|immune|armou?r|protected|cripple|crippling|lack[s]? a|cannot be targeted|frenz")
NOT_NOTE = re.compile(r"(?i)#|drops|power armor|torsos lack|writhing|fast runners|surprising resistance|useless and withdrawn|trophies|unrealistic|larger than normal|clicking|bug|glitch|console|perk\b|companion|mounted|recipe|armor set|craft|tanned|legendary|\bfire (damage|resistance)|radiation|mutation|pre-war|experiment")


def api(**p):
    p["format"] = "json"
    args = ["curl", "-sS", "-m", "90", "-G", API]
    for k, v in p.items():
        args += ["--data-urlencode", f"{k}={v}"]
    return json.loads(subprocess.run(args, capture_output=True, text=True, check=True).stdout)


def safe(s):
    return re.sub(r"[^A-Za-z0-9._-]", "_", s)


def pick(table, name, default):
    low = name.lower()
    return next((v for pattern, v in table if re.search(r"\b(" + pattern + r")\b", low)), default)


def clean(x):
    x = re.sub(r"<ref.*?</ref>|<ref[^>]*/>", "", x, flags=re.S)
    x = re.sub(r"<!--.*?-->", "", x, flags=re.S)
    for _ in range(4):
        x = re.sub(r"\{\{[^{}]*\}\}", "", x)
    x = re.sub(r"\[\[(?:File|Image|Category)[^\]]*\]\]", "", x)
    x = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", x)
    x = re.sub(r"<[^>]+>", "", x).replace("'''", "").replace("''", "")
    return re.sub(r"[ \t]+", " ", x).strip()


def section(wt, name):
    m = re.search(r"^(={2,4})\s*" + name + r"\s*\1\s*$(.*?)(?=^={2,4}[^=]|\Z)", wt, re.S | re.M | re.I)
    return m.group(2) if m else ""


def base_stats(wt, name):
    """The row of the page's creature stats table for the plain creature (the row named like the creature, else the first)."""
    rows = []
    for m in re.finditer(r"\{\{Stats creature[^|]*\|row(.*?)\n\}\}", wt, re.S):
        rows.append({k: clean(v) for k, v in re.findall(r"\n\|\s*([a-z_0-9]+)\s*=([^\n]*)", m.group(1))})
    if not rows:
        return {}
    norm = lambda x: re.sub(r"\s*\(.*?\)|<br\s*/?>.*", "", x or "").strip().lower()
    exact = [r for r in rows if norm(r.get("name")) == name.lower()]
    return (exact or rows)[0]


def first_int(v):
    m = re.search(r"\d+", v or "")
    return int(m.group()) if m else None


def melee_damage(v):
    m = re.search(r"\(\s*(?:Melee\s*)?(\d+)", v or "")
    return int(m.group(1)) if m else None


def sentences(text):
    text = re.sub(r"\s+", " ", text)
    out = []
    for x in re.split(r"(?<=[.!?])\s+(?=[A-Z])", text):
        x = x.split(" * ")[0].strip(" *")  # wiki bullet lists glue several notes together: keep the first one
        if 30 < len(x) < 300 and x[0].isupper():
            out.append(x)
    return out


def body_of(text, categories):
    """Body type from what the wiki says (text and categories); "default" when the wiki says nothing about it."""
    score = {}
    for pattern, body, w in BODY_TEXT:
        n = len(re.findall(pattern, text, re.I))
        if n:
            score[body] = score.get(body, 0) + w * min(n, 3)
    for c in categories:
        if c in BODY_CATEGORY:
            score[BODY_CATEGORY[c]] = score.get(BODY_CATEGORY[c], 0) + 6
    if "flyer" in score and "arthropod" in score and not re.search(r"(?i)\b(flying|flies|hover|airborne|wingspan)\b", text):
        del score["flyer"]  # wings alone do not make an insect a flyer
    return (max(score, key=score.get), "wiki") if score else (DEFAULT_BODY, "default")


def notes_of(text):
    cand = []
    for x in sentences(text):
        if PART_WORDS.search(x) and WEAK_WORDS.search(x) and not NOT_NOTE.search(x):
            cand.append((len(PART_WORDS.findall(x)) + 2 * len(WEAK_WORDS.findall(x)), x))
    cand.sort(key=lambda t: -t[0])
    return [x for _, x in cand[:2]]


def absorb_of(game, dr, dt):
    """Share of the damage the creature's armour absorbs, from the wiki figures: damage resistance (a percentage in
    FO3/FNV, a rating in FO4/FO76) and the damage threshold (FNV)."""
    a_dr = min(0.8, (dr or 0) / 100) if game in ("fo3", "fnv") else (dr or 0) / ((dr or 0) + 100)
    a_dt = (dt or 0) / ((dt or 0) + 25)
    return round(min(0.85, 1 - (1 - a_dr) * (1 - a_dt)), 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".map-cache"))
    cache = ap.parse_args().cache
    os.makedirs(cache, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "img/creatures"), exist_ok=True)
    src = os.path.join(ROOT, "tools/sources")
    weakpoints = json.load(open(os.path.join(src, "creature-weakpoints.json"))) if os.path.exists(os.path.join(src, "creature-weakpoints.json")) else {}
    notes_it = json.load(open(os.path.join(src, "creature-notes-it.json"))) if os.path.exists(os.path.join(src, "creature-notes-it.json")) else {}

    pages_path = os.path.join(cache, "creature-pages.json")
    if os.path.exists(pages_path):
        pages = json.load(open(pages_path))
    else:
        pages = {}
        for g, cat in CATEGORIES.items():
            r = api(action="query", list="categorymembers", cmtitle="Category:" + cat, cmlimit=500, cmnamespace=0)
            pages[g] = [m["title"] for m in r["query"]["categorymembers"] if not SKIP.search(re.sub(r"\s*\(.*\)$", "", m["title"]))]
            time.sleep(1)
        json.dump(pages, open(pages_path, "w"))

    wt_path = os.path.join(cache, "creature-wikitext.json")
    wikitext = json.load(open(wt_path)) if os.path.exists(wt_path) else {}
    titles = sorted({t for v in pages.values() for t in v if t not in wikitext})
    for i in range(0, len(titles), 30):
        batch = titles[i:i + 30]
        r = api(action="query", titles="|".join(batch), prop="revisions", rvprop="content", rvslots="main", redirects=1)["query"]
        red = {x["from"]: x["to"] for x in r.get("redirects", [])}
        by = {p["title"]: p for p in r["pages"].values()}
        for t in batch:
            p = by.get(red.get(t, t))
            wikitext[t] = p["revisions"][0]["slots"]["main"]["*"] if p and "revisions" in p else ""
        json.dump(wikitext, open(wt_path, "w"))
        time.sleep(1.2)

    image_of = {}
    wanted = {t for v in pages.values() for t in v}
    for t, wt in wikitext.items():
        if t not in wanted:
            continue
        m = re.search(r"\{\{Infobox creature.*?\|\s*image\s*=\s*([^\n|]+)", wt, re.S)
        if m and m.group(1).strip():
            image_of[t] = m.group(1).strip()
    files = sorted({f for f in image_of.values() if not os.path.exists(os.path.join(cache, "cre-" + safe(f)))})  # only the missing ones
    urls = {}
    for i in range(0, len(files), 40):
        r = api(action="query", titles="|".join("File:" + f for f in files[i:i + 40]), prop="imageinfo", iiprop="url", redirects=1)["query"]
        back = {x["to"]: x["from"] for x in r.get("redirects", [])}
        for p in r["pages"].values():
            if p.get("imageinfo"):
                urls[back.get(p["title"], p["title"])[5:]] = p["imageinfo"][0]["url"]
        time.sleep(1.2)

    out = {}
    report = {"body_default": [], "level_derived": [], "no_hp": []}
    for g, titles_g in pages.items():
        out[g] = []
        for t in titles_g:
            name = re.sub(r"\s*\(.*\)$", "", t)
            f = image_of.get(t)
            url = urls.get(f) or urls.get((f or "").replace("_", " "))
            path = os.path.join(cache, "cre-" + safe(f or ""))
            if not f or name in NO_VATS or not (os.path.exists(path) or url):
                continue
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
            cid = f"{g}-{safe(name.lower())}"
            dst = f"img/creatures/{cid}.webp"
            im.save(os.path.join(ROOT, dst), "WEBP", quality=82, method=6)

            wt = wikitext[t]
            st = base_stats(wt, name)
            text = "\n".join(clean(section(wt, s)) for s in ("Gameplay attributes", "Characteristics", "Biology", "Notes"))
            lead = clean(re.sub(r"\{\{Infobox creature.*?\n\}\}", "", re.split(r"^==", wt, flags=re.M)[0], flags=re.S))
            body_text = lead + "\n" + "\n".join(clean(section(wt, s)) for s in ("Characteristics", "Biology"))  # no "Gameplay": it cites other creatures
            categories = [c.strip() for c in re.findall(r"\[\[Category:([^\]|]+)", wt)]
            body, body_src = body_of(body_text, categories)
            level = first_int(st.get("level"))
            derived = []
            if not level:
                level, _ = pick(FALLBACK_TIER, name, DEFAULT_TIER), derived.append("level")
            level = max(1, level)
            hp = first_int(st.get("hp"))
            dr, dt = first_int(st.get("dr")), first_int(st.get("dt"))
            dmg = max(filter(None, [melee_damage(st.get("attack1")), melee_damage(st.get("attack2"))]), default=None)
            speed = "fast" if FAST.search(text) and not SLOW.search(text) else "slow" if SLOW.search(text) and not FAST.search(text) else None
            if speed is None:
                speed, _ = pick(SPEED_FALLBACK, name, "normal"), derived.append("speed")
            if body_src == "default":
                derived.append("body")
            if not hp:
                derived.append("hp")
            if not dmg:
                derived.append("dmg")
            wp = weakpoints.get(t, {})
            rec = {"id": cid, "name": name, "page": t, "img": dst, "w": im.width, "h": im.height, "level": level, "speed": speed, "body": body,
                   "hp": hp, "dmg": dmg, "absorb": wp.get("absorb", absorb_of(g, dr, dt)), "dr": dr, "dt": dt,
                   "antennae": bool(re.search(r"(?i)antennae.{0,80}crippl\w*.{0,80}fren|crippl\w*.{0,60}antennae.{0,80}fren", text.replace("\n", " "))),
                   "weak": wp.get("mult", {}), "weakAcc": wp.get("acc", {}), "because": wp.get("because", ""),
                   "notes": [{"en": n, **({"it": notes_it[n]} if n in notes_it else {})} for n in (notes_of(text) if not wp.get("notes") else wp["notes"])],
                   "derived": derived}
            out[g].append({k: v for k, v in rec.items() if v not in (None, [], {}, "", False)})
            for key, label in (("body", "body_default"), ("level", "level_derived"), ("hp", "no_hp")):
                if key in derived:
                    report[label].append(f"{g}:{name}")
    json.dump(out, open(os.path.join(ROOT, "data/creatures.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print({g: len(v) for g, v in out.items()})
    print("body not stated by the wiki (default humanoid):", report["body_default"])
    print("level not in the wiki table (fallback):", report["level_derived"])
    print("no health in the wiki table (formula):", report["no_hp"])


if __name__ == "__main__":
    main()
