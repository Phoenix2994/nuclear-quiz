#!/usr/bin/env python3
"""Builds data/place-facts.json: one curiosity per place of the map quiz.

Source: the "Behind the scenes" / "Trivia" bullets of the Fallout Wiki pages of the places (CC BY-SA 3.0). Lines that are
development credits or file/engine details are skipped, so only some places have a curiosity. Italian translations live in
tools/sources/place-facts-it.json (page title -> text) and are merged in.
Usage: python3 tools/build_facts.py [--cache DIR]   (needs data/maps.json and curl)
"""
import argparse, json, os, re, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://fallout.fandom.com/api.php"
SKIP = re.compile(r"""(?ix)designer|artist|worked\ on|voiced|voice\ actor|programmer|writer|developer|level\ design|concept|texture|
    modell?(ed|ing)\ |brought\ up|quest\ id|files|can\ be\ seen|evidenced|technical|mentioned\ in\ the|exterior|interior\ cell|
    lighting|\bnpc\b|spawn|unused|cut|created\ by|written\ by|designed\ by|responsible\ for|subtitle|state\ 1|geck|editor|
    in\ march\ 20|\.nif|sawyer\ responded|intern\b|megan\ parks|travis\ stout""")


# places whose only trivia is a weak one (a technical detail, a sign, a list of buildings): no curiosity shown
DENY = {"Berkeley Springs", "Blackhall Manor", "Bunker Hill", "Camp McClintock", "Harpers Ferry", "The Washington Monument",
        "Sacred bog", "Primm", "Skylanes Flight 1665"}


def clean(x):
    x = re.sub(r"<ref[^>]*?/>", "", x)
    x = re.sub(r"<ref.*?</ref>", "", x, flags=re.S)
    x = re.sub(r"<!--.*?-->", "", x, flags=re.S)
    for _ in range(4):
        x = re.sub(r"\{\{[^{}]*\}\}", "", x)
    x = re.sub(r"\[\[(?:File|Image|Category):[^\]]*\]\]", "", x)
    x = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", x)
    x = re.sub(r"'''?", "", x)
    x = re.sub(r"<[^>]+>", "", x)
    x = re.sub(r"\[https?://\S+ ([^\]]+)\]", r"\1", x)
    x = re.sub(r"\[https?://\S+\]", "", x).replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", x).strip()


def facts(wikitext):
    out = []
    pattern = r"^==\s*(Behind the scenes|Trivia)\s*==\s*$(.*?)(?=^==[^=]|\Z)"
    for m in re.finditer(pattern, wikitext or "", re.S | re.M | re.I):
        for line in m.group(2).split("\n"):
            if line.startswith("*") and not line.startswith("**"):
                c = clean(line.lstrip("* "))
                trivial = len(c) < 130 and re.search(r"(?i)based on the real|real[- ]world location of the same name|is a real world location", c)
                if 40 <= len(c) <= 330 and c[0].isupper() and not c.endswith(":") and not SKIP.search(c) and not trivial:
                    out.append(c)
    return out


def wikitext_of(pages, cache):
    path = os.path.join(cache, "place-wikitext.json")
    got = json.load(open(path)) if os.path.exists(path) else {}
    todo = [p for p in pages if p not in got]
    for i in range(0, len(todo), 40):
        batch = todo[i:i + 40]
        args = ["curl", "-sS", "-m", "90", "-G", API, "--data-urlencode", "action=query", "--data-urlencode", "titles=" + "|".join(batch),
                "--data-urlencode", "prop=revisions", "--data-urlencode", "rvprop=content", "--data-urlencode", "rvslots=main",
                "--data-urlencode", "redirects=1", "--data-urlencode", "format=json"]
        q = json.loads(subprocess.run(args, capture_output=True, text=True, check=True).stdout)["query"]
        red = {x["from"]: x["to"] for x in q.get("redirects", [])}
        norm = {x["from"]: x["to"] for x in q.get("normalized", [])}
        by_title = {p["title"]: p for p in q["pages"].values()}
        for t in batch:
            p = by_title.get(red.get(norm.get(t, t), norm.get(t, t)))
            got[t] = p["revisions"][0]["slots"]["main"]["*"] if p and "revisions" in p else None
        json.dump(got, open(path, "w"))
        time.sleep(1.2)
    return got


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".map-cache"))
    cache = ap.parse_args().cache
    os.makedirs(cache, exist_ok=True)
    maps = json.load(open(os.path.join(ROOT, "data/maps.json")))
    targets = {m["page"]: m["name"].strip() for g in maps.values() for m in g["markers"] if m["id"] in set(g["targets"])}
    texts = wikitext_of(sorted(targets), cache)
    it_path = os.path.join(ROOT, "tools/sources/place-facts-it.json")
    it = json.load(open(it_path)) if os.path.exists(it_path) else {}
    out = {}
    for page in sorted(targets):
        f = [] if page in DENY else facts(texts.get(page))
        if f:
            out[page] = {"en": f[0], **({"it": it[page]} if page in it else {})}
    json.dump(out, open(os.path.join(ROOT, "data/place-facts.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(len(out), "places with a curiosity;", sum("it" in v for v in out.values()), "translated into Italian")


if __name__ == "__main__":
    main()
