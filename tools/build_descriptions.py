#!/usr/bin/env python3
"""Builds data/place-descriptions.json: a short description (the opening of the wiki page) of each place of the map quiz.

English from the Fallout Wiki pages, Italian from the Italian Fallout Wiki (the page linked by the interlanguage link) when it
exists, otherwise from tools/sources/place-descriptions-it.json (hand-written translations of the English text).
Both under CC BY-SA 3.0. Usage: python3 tools/build_descriptions.py [--cache DIR]   (needs data/maps.json, curl)
"""
import argparse, json, os, re, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EN = "https://fallout.fandom.com/api.php"
IT = "https://fallout.fandom.com/it/api.php"
MAXLEN = 300


def api(base, **p):
    p["format"] = "json"
    args = ["curl", "-sS", "-m", "90", "-G", base]
    for k, v in p.items():
        args += ["--data-urlencode", f"{k}={v}"]
    return json.loads(subprocess.run(args, capture_output=True, text=True, check=True).stdout)


def clean(x, title):
    x = re.sub(r"<ref.*?</ref>|<ref[^>]*/>", "", x, flags=re.S)
    x = re.sub(r"<!--.*?-->", "", x, flags=re.S)
    x = re.sub(r"\{\{(?:BASE)?PAGENAME\}\}", title, x)
    for _ in range(4):
        x = re.sub(r"\{\{[^{}]*\}\}", "", x)
    x = re.sub(r"\[\[(?:File|Image|File|Immagine|Category|Categoria)[^\]]*\]\]", "", x)
    x = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", x)
    x = re.sub(r"<[^>]+>", "", x).replace("'''", "").replace("''", "").replace("&nbsp;", " ")
    x = re.sub(r"\[https?://\S+ ([^\]]+)\]|\[https?://\S+\]", r"\1", x)
    return re.sub(r"\s+([,.;:])", r"\1", re.sub(r"\s+", " ", x)).strip()


def strip_templates(x):
    """Remove every top-level {{...}} block (infoboxes included, however long) with balanced braces."""
    out, depth, i = [], 0, 0
    while i < len(x):
        if x.startswith("{{", i):
            depth += 1; i += 2
        elif x.startswith("}}", i) and depth:
            depth -= 1; i += 2
        else:
            if not depth:
                out.append(x[i])
            i += 1
    return "".join(out)


# an opening that only says "X is a location in Y" tells nothing: such places get no description
EMPTY = re.compile(r"(?i)^[^.]{0,50}\b(is a location|è un luogo|è una località)\b[^.]{0,60}\.?$")


def lead(wikitext, title):
    """The first bold-subject paragraph of the page, cut at a sentence boundary under MAXLEN characters."""
    if not wikitext:
        return ""
    head = re.split(r"^==", wikitext, flags=re.M)[0]
    head = strip_templates(re.sub(r"\{\{(?:BASE)?PAGENAME\}\}", title, head))  # the page name is often a magic word
    m = re.search(r"^'''.*$", head, re.M) or re.search(r"^[^\n{|*=<\[]*'''.*$", head, re.M)  # bold subject, even mid-line ("Il '''Vault 101''' è...")
    if not m:
        return ""
    paras = [p for p in re.split(r"\n\s*\n", head[m.start():]) if p.strip()]
    text = ""
    for para in paras[:3]:
        if para.lstrip().startswith(("|", "[[File", "[[Image", "[[Immagine", "*")):
            continue
        c = clean(para, title)
        if len(c) < 30:
            continue
        for s in re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-Ý\"“])", c):
            if text and len(text) + len(s) > MAXLEN:
                return text
            text = (text + " " + s).strip()
            if len(text) >= 130:
                return text[:MAXLEN + 60]
    return text[:MAXLEN + 60]


def fetch_texts(base, titles, cache_path):
    got = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    todo = [t for t in titles if t not in got]
    for i in range(0, len(todo), 40):
        batch = todo[i:i + 40]
        q = api(base, action="query", titles="|".join(batch), prop="revisions", rvprop="content", rvslots="main", redirects=1)["query"]
        red = {x["from"]: x["to"] for x in q.get("redirects", [])}
        norm = {x["from"]: x["to"] for x in q.get("normalized", [])}
        by = {p["title"]: p for p in q["pages"].values()}
        for t in batch:
            p = by.get(red.get(norm.get(t, t), norm.get(t, t)))
            got[t] = p["revisions"][0]["slots"]["main"]["*"] if p and "revisions" in p else None
        json.dump(got, open(cache_path, "w"))
        time.sleep(1.2)
    return got


def italian_links(titles, cache_path):
    got = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    todo = [t for t in titles if t not in got]
    for i in range(0, len(todo), 40):
        batch = todo[i:i + 40]
        q = api(EN, action="query", titles="|".join(batch), prop="langlinks", lllang="it", lllimit=500, redirects=1)["query"]
        red = {x["from"]: x["to"] for x in q.get("redirects", [])}
        norm = {x["from"]: x["to"] for x in q.get("normalized", [])}
        by = {p["title"]: p for p in q["pages"].values()}
        for t in batch:
            links = (by.get(red.get(norm.get(t, t), norm.get(t, t))) or {}).get("langlinks")
            got[t] = links[0]["*"] if links else None
        json.dump(got, open(cache_path, "w"))
        time.sleep(1.2)
    return got


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(ROOT, ".map-cache"))
    cache = ap.parse_args().cache
    os.makedirs(cache, exist_ok=True)
    maps = json.load(open(os.path.join(ROOT, "data/maps.json")))
    pages = sorted({m["page"] for g in maps.values() for m in g["markers"] if m["id"] in set(g["targets"])})
    en_wt = fetch_texts(EN, pages, os.path.join(cache, "place-wikitext.json"))
    links = italian_links(pages, os.path.join(cache, "place-it-links.json"))
    it_wt = fetch_texts(IT, sorted({v for v in links.values() if v}), os.path.join(cache, "place-it-wikitext.json"))
    manual_path = os.path.join(ROOT, "tools/sources/place-descriptions-it.json")
    manual = json.load(open(manual_path)) if os.path.exists(manual_path) else {}
    out, missing = {}, []
    for page in pages:
        en = lead(en_wt.get(page), page)
        it = lead(it_wt.get(links.get(page)), links.get(page) or page) if links.get(page) else ""
        en, it = ("" if EMPTY.match(en) else en), ("" if EMPTY.match(it) else it)
        it = it or manual.get(page, "")
        if not en and not it:
            continue
        out[page] = {k: v for k, v in (("en", en), ("it", it)) if v}
        if en and not it:
            missing.append(page)
    json.dump(out, open(os.path.join(ROOT, "data/place-descriptions.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump({p: out[p]["en"] for p in missing}, open(os.path.join(cache, "descriptions-to-translate.json"), "w"), ensure_ascii=False, indent=0)
    print(len(out), "places with a description;", len(missing), "English only (translate them in tools/sources/place-descriptions-it.json)")


if __name__ == "__main__":
    main()
