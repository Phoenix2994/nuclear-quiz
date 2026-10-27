#!/usr/bin/env python3
"""Adds "which kind of place does this map icon mark?" questions to the app's question banks.

One question per marker category (only generic ones with at least 2 markers on the map, never a place's own name):
the clean icon on its own, 4 categories of the same game to choose from, a few example places in the explanation.
Icons:
- FO3 / FNV: the wiki's gamebryo icons (the plates of the Pip-Boy map), tinted green / amber.
- FO4: the glyphs cropped from the FO4 map by build_maps.py (img/maps/icons), and for the other categories the wiki's
  FO76 marker sprites that reuse the FO4 ones, tinted Pip-Boy green.
- FO76: the wiki's marker icons as they are.
Output: img/quiz-icons/*.png, questions appended to data/questions-en.json / questions-it.json (ids "icon-*": a rerun
replaces them), sizes in data/trivia.json. A rebuild of the question banks from the original sources drops them: run
this script again afterwards. No articleId: they unlock no database entry.
Usage: python3 tools/build_icon_questions.py [--cache DIR]   (needs data/maps.json, curl, Pillow)
"""
import argparse, json, os, random, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_maps import fetch_file, fetch_map, GAMES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = "img/quiz-icons"
CANVAS, SIZE = (320, 180), 144  # landscape like the other quiz pictures, so the hero box shows it whole
TINT = {"fo3": (96, 255, 120), "fnv": (255, 184, 96), "fo4": (137, 255, 161)}
LABEL = {"fo3": "Fallout 3", "fnv": "Fallout: New Vegas", "fo4": "Fallout 4", "fo76": "Fallout 76"}

# FO4 has no icons in the wiki map: glyphs cropped from the map, or the FO4 sprite that FO76 reuses
FO4_ICON = {
    "Cave": "fo4:cave", "City": "fo4:city", "Encampment": "fo4:encampment",
    "Factory + Industrial Shacks": "fo4:factory-industrial-shacks", "Landmark": "fo4:landmark", "Metro": "fo4:metro",
    "Military Base": "fo4:military-base", "Monument": "fo4:monument", "Office": "fo4:office", "Settlement": "fo4:settlement",
    "Town Ruins": "fo4:town-ruins", "Urban Ruins": "fo4:urban-ruins", "Vault": "fo4:vault",
    "Church": "File:Icon church.png", "Farm": "File:Icon farm.png", "Bunker": "File:Icon bunker.png",
    "Filling Station": "File:Icon filling station.png", "Hospital": "File:F76 224 HospitalMarker.png",
    "Radio Tower": "File:F76 104 RadioTowerMarker.png", "Pond/Lake": "File:F76 134 PondLakeMarker.png",
    "Satellite": "File:F76 86 SatelliteMarker.png", "Quarry": "File:F76 110 QuarryMarker.png",
    "Radioactive Area": "File:F76 107 RadioactiveAreaMarker.png", "Airfield": "File:F76 343 AirfieldMarker.png",
    "Low-rise": "File:F76 187 LowRiseMarker.png", "Graveyard": "File:F76 230 GraveyardMarker.png",
    "Camper": "File:F76 221 HouseTrailerMarker.png",
    "Elevated Highway": "File:F76 260 ElevatedHighwayMarker.png",
}
# categories named after one place, or with no icon of their own
SKIP = {"Unmarked", "Bobbleheads", "Lady Janet's Soft Serve", "The Whitespring Resort", "Ohio River Adventures", "Fort Atlas",
        "Agricultural Center", "Small Trailers",
        "Blood Eagle camps"}  # its wiki icon is a faction logo, not a map glyph
# never offered together: the icons differ but the names are too close to be a fair choice
CLOSE = [{"Lookouts", "Lookout towers"}, {"Railways", "Trainyards", "Train stations"}, {"Small encampments", "Medium encampments"},
         {"Large buildings", "Low-rise buildings"}, {"Town Ruins", "Urban Ruins", "City"}]

CAT_IT = {
    "Buildings": "Edificio", "Caves": "Grotta", "Districts": "Quartiere", "Factories": "Fabbrica", "Landmarks": "Punto di riferimento",
    "Large settlements": "Grande insediamento", "Medium settlements": "Insediamento", "Small settlements": "Piccolo insediamento",
    "Metro": "Metropolitana", "Military": "Base militare", "Monument": "Monumento", "Ruins": "Rovine", "Sewers": "Fogne", "Vaults": "Vault",
    "Airfield": "Campo d'aviazione", "Bunker": "Bunker", "Cave": "Grotta", "Church": "Chiesa", "City": "Città",
    "Encampment": "Accampamento", "Factory + Industrial Shacks": "Fabbrica", "Farm": "Fattoria", "Filling Station": "Stazione di servizio",
    "Hospital": "Ospedale", "Landmark": "Punto di riferimento", "Low-rise": "Edificio basso", "Military Base": "Base militare",
    "Office": "Uffici", "Radio Tower": "Torre radio", "Radioactive Area": "Area radioattiva", "Railroad": "Ferrovia",
    "Satellite": "Stazione satellitare", "Settlement": "Insediamento", "Town Ruins": "Cittadina in rovina",
    "Urban Ruins": "Rovine urbane", "Vault": "Vault", "Pond/Lake": "Lago o stagno", "Quarry": "Cava", "Graveyard": "Cimitero",
    "Camper": "Camper", "Elevated Highway": "Sopraelevata",
    "Bunkers": "Bunker", "Cabins": "Baita", "Cemeteries": "Cimitero", "Churches": "Chiesa", "Cities": "Città", "Dams": "Diga",
    "Forts": "Forte", "Golf club": "Golf club", "High tech locations": "Struttura high-tech", "Lookout towers": "Torre di avvistamento",
    "Low-rise buildings": "Edificio basso", "Medical locations": "Struttura medica", "Medium encampments": "Accampamento",
    "Military ": "Base militare", "Monuments": "Monumento", "Offices": "Uffici", "Public workshops": "Officina pubblica",
    "Red Rocket stations": "Stazione Red Rocket", "Satellite stations": "Stazione satellitare", "Towns": "Cittadina",
    "Train stations": "Stazione ferroviaria", "Water Park": "Parco acquatico", "Winter sports": "Sport invernali",
    "Airfields": "Campo d'aviazione", " Cult locations": "Covo di cultisti", "Industrial ": "Impianto industriale",
    "Monorail": "Monorotaia", "Mines": "Miniera", "Agriculture": "Agricoltura", "Water bodies": "Specchio d'acqua",
    "Shacks": "Baracca", "Raider locations": "Covo di predoni", "Transmission stations": "Stazione di trasmissione",
    "Large buildings": "Edificio grande", "Power substations": "Sottostazione elettrica", "Wooded areas": "Bosco",
    "Small encampments": "Piccolo accampamento", "Trailers": "Roulotte", "Lookouts": "Punto panoramico",
    "Infrastructure": "Infrastruttura", "Mansions": "Villa", "Trainyards": "Scalo ferroviario",
    "Toxic waste dumps": "Discarica di rifiuti tossici", "Blood Eagle camps": "Accampamento dei Blood Eagle",
    "Power plants": "Centrale elettrica", "Railways": "Ferrovia", "Statues": "Statua", "Bridges": "Ponte", "Docks": "Banchina",
}


def tinted(im, tint, plate):
    """plate: a white plate with a black glyph (gamebryo), drawn as a coloured plate with the glyph cut out;
    otherwise a light glyph with a dark outline, recoloured keeping its shading."""
    a = np.asarray(im.convert("RGBA")).astype(float)
    lum = a[..., :3] @ [0.299, 0.587, 0.114]
    lum = np.clip(lum / (lum[a[..., 3] > 128].max() or 1), 0, 1)
    out = np.zeros_like(a)
    if plate:
        out[..., :3], out[..., 3] = tint, a[..., 3] * lum
    else:
        out[..., :3], out[..., 3] = (0.18 + 0.82 * lum)[..., None] * tint, a[..., 3]
    return Image.fromarray(out.round().astype(np.uint8))


def icon_image(game, src, cache):
    if src.startswith("fo4:"):
        im = Image.open(os.path.join(ROOT, "img/maps/icons", "fo4-" + src[4:] + ".png")).convert("RGBA")
    elif game in TINT:
        im = tinted(Image.open(fetch_file(cache, src)), TINT[game], plate="gamebryo" in src)
    else:
        im = Image.open(fetch_file(cache, src)).convert("RGBA")
    im = im.crop(im.getbbox())
    small = max(im.size) < 64
    scale = SIZE / max(im.size)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))),
                   Image.NEAREST if small else Image.LANCZOS)
    out = Image.new("RGBA", CANVAS)
    out.paste(im, ((CANVAS[0] - im.width) // 2, (CANVAS[1] - im.height) // 2), im)
    return out


def slug(s):
    return "".join(c if c.isalnum() else "-" for c in s.strip().lower()).strip("-").replace("--", "-")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".map-cache"))
    cache = ap.parse_args().cache
    os.makedirs(cache, exist_ok=True)
    os.makedirs(os.path.join(ROOT, OUT), exist_ok=True)
    maps = json.load(open(os.path.join(ROOT, "data/maps.json")))
    rnd = random.Random(76)
    made = {"en": [], "it": []}
    for game in ["fo3", "fnv", "fo4", "fo76"]:
        g = maps[game]
        wiki_icons = {c["name"]: c.get("icon") for c in fetch_map(cache, GAMES[game][0])["categories"]} if game != "fo4" else {}
        count, examples = {}, {}
        targets = set(g["targets"])
        for m in sorted(g["markers"], key=lambda m: m["id"] not in targets):  # example places: targets first
            count[m["cat"]] = count.get(m["cat"], 0) + 1
            examples.setdefault(m["cat"], []).append(m["name"].strip())
        cats = [c for c, n in count.items() if n >= 2 and c not in SKIP and (FO4_ICON if game == "fo4" else wiki_icons).get(c)]
        for cat in sorted(cats):
            src = (FO4_ICON if game == "fo4" else wiki_icons)[cat]
            path = f"{OUT}/{game}-{slug(cat)}.png"
            icon_image(game, src, cache).save(os.path.join(ROOT, path), optimize=True)
            close = set().union(*[s for s in CLOSE if cat in s]) if any(cat in s for s in CLOSE) else set()
            others = rnd.sample([c for c in cats if c != cat and c not in close and CAT_IT[c] != CAT_IT[cat]], 3)
            order = rnd.sample([cat] + others, 4)
            ex = examples[cat][:3]
            for lang in ("en", "it"):
                name = (lambda c: c.strip()) if lang == "en" else (lambda c: CAT_IT[c])
                if lang == "en":
                    q = f"What kind of place does this icon mark on the {LABEL[game]} map?"
                    expl = f"On the {LABEL[game]} map this icon marks: {name(cat)}. For example {', '.join(ex)}."
                else:
                    q = f"Che tipo di luogo indica questa icona sulla mappa di {LABEL[game]}?"
                    expl = f"Sulla mappa di {LABEL[game]} questa icona indica: {name(cat)}. Per esempio {', '.join(ex)}."
                made[lang].append({
                    "id": f"icon-{game}-{slug(cat)}", "articleId": "", "titolo": name(cat), "tipo": "luogo",
                    "giochi": [game], "lang": lang, "kind": "img", "img": path, "q": q,
                    "options": [name(c) for c in order], "answer": order.index(cat), "explanation": expl,
                    "livello": 2 if "settlements" in cat else 1, "ease": 5,
                })
    sizes = {}
    for lang in ("en", "it"):
        p = os.path.join(ROOT, f"data/questions-{lang}.json")
        bank = [x for x in json.load(open(p)) if not x["id"].startswith("icon-")] + made[lang]
        txt = json.dumps(bank, ensure_ascii=False, separators=(",", ":"))
        open(p, "w").write(txt)
        sizes[f"questions-{lang}"] = len(txt.encode())
    tp = os.path.join(ROOT, "data/trivia.json")
    trivia = json.load(open(tp))
    trivia["sizes"].update(sizes)
    json.dump(trivia, open(tp, "w"), ensure_ascii=False, separators=(",", ":"))
    print(len(made["en"]), "icon questions per language:",
          {g: sum(q["giochi"] == [g] for q in made["en"]) for g in ["fo3", "fnv", "fo4", "fo76"]})


if __name__ == "__main__":
    main()
