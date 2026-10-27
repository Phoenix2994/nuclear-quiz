// Map quiz: "find the location on the map" for Fallout 3, New Vegas, 4 and 76.
// Plain ES module (no build step). It is wired into the compiled bundle through createMapTab(),
// which receives the bundle's React, store hook, i18n hook and sound player.
// Maps, markers and coordinates come from data/maps.json (see tools/build_maps.py).

const SIZE = 1000; // maps are square; marker coordinates are in 0-1000 map units
const MIN_W = 80; // closest zoom, in map units
const PICK_RADIUS = 14; // tap this close to another marker to name it in the feedback
const ROUNDS = 10;
const GAME_ORDER = ["fo3", "fnv", "fo4", "fo76"];
const GAME_SHORT = { fo3: "FO3", fnv: "FNV", fo4: "FO4", fo76: "76" };
const WIKI = "https://fallout.fandom.com/wiki/";

const TEXT = {
  it: {
    title: "MAPPA", sub: "Individua il luogo sulla mappa", places: "luoghi", start: "▶ INIZIA",
    find: "Trova sulla mappa", tapHint: "Tocca la mappa per rispondere", kind: "DOVE?",
    correct: "CORRETTO", wrong: "SBAGLIATO", next: "AVANTI", finish: "FINE", close: "Chiudi",
    you: "Hai toccato", done: "SESSIONE COMPLETATA", answers: "risposte corrette", again: "GIOCA ANCORA",
    cont: "CONTINUA", wiki: "Wiki", loading: "CARICAMENTO MAPPA…", error: "Impossibile caricare le mappe.",
    zin: "Ingrandisci", zout: "Riduci", zreset: "Mostra tutta la mappa",
    credit: "Mappe e posizioni: Fallout Wiki (CC BY-SA 3.0). Immagini di proprietà dei rispettivi titolari.",
    credit76: " Mappa di Fallout 76: Mappalachia.",
  },
  en: {
    title: "MAP", sub: "Find the location on the map", places: "places", start: "▶ START",
    find: "Find on the map", tapHint: "Tap the map to answer", kind: "WHERE?",
    correct: "CORRECT", wrong: "WRONG", next: "NEXT", finish: "FINISH", close: "Close",
    you: "You tapped", done: "SESSION COMPLETE", answers: "correct answers", again: "PLAY AGAIN",
    cont: "CONTINUE", wiki: "Wiki", loading: "LOADING MAP…", error: "Unable to load the maps.",
    zin: "Zoom in", zout: "Zoom out", zreset: "Show the whole map",
    credit: "Maps and positions: Fallout Wiki (CC BY-SA 3.0). Images belong to their respective owners.",
    credit76: " Fallout 76 map: Mappalachia.",
  },
};

// Italian names for the generic marker categories (proper-name categories stay as they are).
const CAT_IT = {
  Buildings: "Edificio", Caves: "Grotta", Districts: "Quartiere", Factories: "Fabbrica", Landmarks: "Punto di riferimento",
  "Large settlements": "Grande insediamento", "Medium settlements": "Insediamento", "Small settlements": "Piccolo insediamento",
  Metro: "Metropolitana", Military: "Base militare", Monument: "Monumento", Ruins: "Rovine", Sewers: "Fogne", Vaults: "Vault",
  Airfield: "Campo d'aviazione", Bunker: "Bunker", Car: "Auto", Cave: "Grotta", Church: "Chiesa", City: "Città",
  Encampment: "Accampamento", "Factory + Industrial Shacks": "Fabbrica", Farm: "Fattoria", "Filling Station": "Stazione di servizio",
  Forested: "Bosco", Hospital: "Ospedale", Landmark: "Punto di riferimento", "Low-rise": "Edificio basso", "Military Base": "Base militare",
  Office: "Uffici", Pier: "Molo", "Police Station": "Commissariato", "Radio Tower": "Torre radio", "Radioactive Area": "Area radioattiva",
  Railroad: "Ferrovia", "Railroad (Faction)": "Ferrovia (fazione)", Satellite: "Stazione satellitare", School: "Scuola",
  Settlement: "Insediamento", Sewer: "Fogne", Shipwreck: "Relitto", Skyscraper: "Grattacielo", "Town Ruins": "Cittadina in rovina",
  "Urban Ruins": "Rovine urbane", Vault: "Vault",
  Bunkers: "Bunker", Cabins: "Baite", Cemeteries: "Cimitero", Churches: "Chiesa", Cities: "Città", Dams: "Diga", Forts: "Forte",
  "Golf club": "Golf club", "High tech locations": "Struttura high-tech", Junkyards: "Discarica", "Lookout towers": "Torre di avvistamento",
  "Low-rise buildings": "Edificio basso", "Medical locations": "Struttura medica", "Medium encampments": "Accampamento",
  "Military ": "Base militare", Monuments: "Monumento", Offices: "Uffici", "Public workshops": "Officina pubblica",
  "Red Rocket stations": "Stazione Red Rocket", "Satellite stations": "Stazione satellitare", Towns: "Cittadina",
  "Train stations": "Stazione ferroviaria", "Water Park": "Parco acquatico", "Winter sports": "Sport invernali", Airfields: "Campo d'aviazione",
  " Cult locations": "Luogo di culto", "Industrial ": "Impianto industriale", Monorail: "Monorotaia",
};

const clean = (s) => s.trim();

export function createMapTab({ React, useStore, useI18n, sound }) {
  const { useState, useRef, useEffect, useCallback, useMemo } = React;
  const h = React.createElement;

  const clampView = (v) => {
    const w = Math.min(SIZE, Math.max(MIN_W, v.w));
    return { w, x: Math.min(SIZE - w, Math.max(0, v.x)), y: Math.min(SIZE - w, Math.max(0, v.y)) };
  };
  const bboxView = ([x0, y0, x1, y1]) => {
    const w = Math.min(SIZE, Math.max(x1 - x0, y1 - y0, 300));
    return clampView({ w, x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w / 2 });
  };
  const catName = (lang, cat) => (lang === "it" ? CAT_IT[cat] : null) ?? clean(cat);

  // ---- map layers

  const Layers = React.memo(function Layers({ map, size }) {
    const icons = map.icons;
    return h("g", null,
      h("image", { href: map.image, x: 0, y: 0, width: SIZE, height: SIZE, className: "pm-bg" }),
      // Fallout 3 / New Vegas maps carry no icons: draw the game's own marker glyphs.
      Object.keys(icons).length > 0 && h("g", { className: "pm-icons" }, map.markers.map((m) =>
        icons[m.c] && h("image", {
          key: m.id, href: icons[m.c], x: m.x - size / 2, y: m.y - size / 2, width: size, height: size,
        }))));
  });

  function MapView({ map, view, setView, onTap, children, labels, interactive = true }) {
    const svgRef = useRef(null);
    const ptrs = useRef(new Map());
    const drag = useRef({ moved: false, start: null, pinch: 0 });

    const toMap = (cx, cy) => {
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = cx; pt.y = cy;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      return { x: q.x, y: q.y };
    };
    const zoomAt = useCallback((factor, cx, cy) => {
      setView((v) => {
        const w = Math.min(SIZE, Math.max(MIN_W, v.w * factor));
        const k = w / v.w;
        return clampView({ w, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
    }, [setView]);

    useEffect(() => {
      if (!interactive) return undefined;
      const el = svgRef.current;
      const onWheel = (e) => {
        e.preventDefault();
        const p = toMap(e.clientX, e.clientY);
        zoomAt(e.deltaY < 0 ? 0.8 : 1.25, p.x, p.y);
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }, [zoomAt, interactive]);

    const dist = () => {
      const [a, b] = [...ptrs.current.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onDown = (e) => {
      svgRef.current.setPointerCapture(e.pointerId);
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.current.size === 1) drag.current = { moved: false, start: { x: e.clientX, y: e.clientY }, pinch: 0 };
      else drag.current = { moved: true, start: null, pinch: dist() };
    };
    const onMove = (e) => {
      const prev = ptrs.current.get(e.pointerId);
      if (!prev) return;
      const rect = svgRef.current.getBoundingClientRect();
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.current.size === 2) {
        const d = dist();
        if (drag.current.pinch) {
          const [a, b] = [...ptrs.current.values()];
          const p = toMap((a.x + b.x) / 2, (a.y + b.y) / 2);
          zoomAt(drag.current.pinch / d, p.x, p.y);
        }
        drag.current.pinch = d;
        return;
      }
      const s = drag.current.start;
      if (!s) return;
      if (!drag.current.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 6) return;
      drag.current.moved = true;
      const k = view.w / rect.width;
      const dx = (e.clientX - prev.x) * k, dy = (e.clientY - prev.y) * k;
      setView((v) => clampView({ ...v, x: v.x - dx, y: v.y - dy }));
    };
    const onUp = (e) => {
      const had = ptrs.current.delete(e.pointerId);
      if (had && ptrs.current.size === 0 && !drag.current.moved && e.type === "pointerup") onTap(toMap(e.clientX, e.clientY));
      if (ptrs.current.size === 1) drag.current = { moved: true, start: null, pinch: 0 };
    };

    const size = 22 * Math.sqrt(view.w / SIZE) + 4; // glyph size in map units: grows slowly when zooming in
    const center = (f) => zoomAt(f, view.x + view.w / 2, view.y + view.w / 2);
    return h("div", { className: "pm-wrap" + (interactive ? "" : " static") },
      h("svg", {
        ref: svgRef, className: "pm-svg", viewBox: `${view.x} ${view.y} ${view.w} ${view.w}`,
        ...(interactive ? { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp } : {}),
        role: "img", "aria-label": map.label,
      }, h(Layers, { map, size }), children && children(size)),
      interactive && h("div", { className: "pm-zoom" },
        h("button", { className: "sqbtn", "aria-label": labels.zin, onClick: () => center(0.7) }, "+"),
        h("button", { className: "sqbtn", "aria-label": labels.zout, onClick: () => center(1.4) }, "−"),
        h("button", { className: "sqbtn", "aria-label": labels.zreset, onClick: () => setView(bboxView(map.bbox)) }, "⌂")));
  }

  // ---- quiz

  function pickRounds(map) {
    const byId = new Map(map.markers.map((m) => [m.id, m]));
    const a = map.targets.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, ROUNDS).map((id) => byId.get(id));
  }

  function MapQuiz({ gameKey, map, lang, onExit, store }) {
    const T = TEXT[lang] ?? TEXT.en;
    const home = useMemo(() => bboxView(map.bbox), [map]);
    const [rounds, setRounds] = useState(() => pickRounds(map));
    const [i, setI] = useState(0);
    const [view, setView] = useState(home);
    const [pick, setPick] = useState(null);
    const [score, setScore] = useState({ ok: 0, xp: 0 });
    const [done, setDone] = useState(false);
    const t0 = useRef(Date.now());
    const target = rounds[i];

    function onTap(p) {
      if (pick) return;
      const d = Math.hypot(p.x - target.x, p.y - target.y);
      const ok = d <= map.hit;
      const other = map.markers.filter((m) => m.id !== target.id)
        .map((m) => ({ m, d: Math.hypot(p.x - m.x, p.y - m.y) }))
        .filter((o) => o.d <= PICK_RADIUS).sort((x, y) => x.d - y.d)[0];
      sound(ok ? "right" : "wrong");
      const xp = store.answer(
        { id: "map:" + target.id, kind: "map", tipo: "luogo", livello: 2, giochi: [gameKey] },
        ok, (Date.now() - t0.current) / 1000);
      setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), xp: s.xp + xp }));
      setPick({ ...p, ok, other: other?.m });
    }
    function next() {
      if (i + 1 >= rounds.length) { store.completeSession(); setDone(true); return; }
      setI(i + 1); setPick(null); setView(home); t0.current = Date.now();
    }
    function again() {
      setRounds(pickRounds(map)); setI(0); setPick(null); setView(home);
      setScore({ ok: 0, xp: 0 }); setDone(false); t0.current = Date.now();
    }

    if (done) {
      return h("div", { className: "screen" },
        h("h2", { className: "title" }, T.done),
        h("div", { className: "panel center" },
          h("div", { className: "big" }, score.ok, "/", rounds.length),
          h("div", null, T.answers),
          h("div", { className: "xp" }, "+", score.xp, " XP")),
        h("button", { className: "btn", onClick: again }, T.again),
        h("button", { className: "btn primary", onClick: onExit }, T.cont));
    }

    const overlay = (size) => !pick ? null : h("g", { className: "pm-result" },
      h("circle", { cx: target.x, cy: target.y, r: map.hit, className: "pm-ring" }),
      h("circle", { cx: target.x, cy: target.y, r: size * 0.8, className: "pm-pulse" }),
      h("line", { x1: pick.x, y1: pick.y, x2: target.x, y2: target.y, className: "pm-line" }),
      h("path", {
        d: `M${pick.x - 6} ${pick.y - 6}L${pick.x + 6} ${pick.y + 6}M${pick.x + 6} ${pick.y - 6}L${pick.x - 6} ${pick.y + 6}`,
        className: "pm-x " + (pick.ok ? "ok" : "ko"),
      }),
      h("text", {
        x: target.x, y: target.y > view.y + view.w * 0.2 ? target.y - map.hit - 6 : target.y + map.hit + 20,
        textAnchor: target.x < view.x + view.w * 0.25 ? "start" : target.x > view.x + view.w * 0.75 ? "end" : "middle",
        className: "pm-label", style: { fontSize: Math.max(10, view.w * 0.034) },
      }, clean(target.name)));

    const wikiUrl = WIKI + encodeURIComponent(target.page.replace(/ /g, "_")).replace(/%2F/g, "/");
    return h("div", { className: "screen quiz" + (pick ? " answered" : "") },
      h("div", { className: "topbar" },
        h("button", { className: "link", onClick: onExit, "aria-label": T.close }, "✕"),
        h("span", { className: "muted" }, map.label),
        h("span", { className: "muted" }, i + 1, "/", rounds.length)),
      h("div", { className: "progressbar" }, h("div", { style: { width: `${(i / rounds.length) * 100}%` } })),
      h("p", { className: "tags" }, h("span", { className: "badge" }, T.kind), map.label),
      h("h2", { className: "question" }, T.find, ": ", h("span", { className: "pm-target" }, clean(target.name))),
      h(MapView, { map, view, setView, onTap, labels: T }, overlay),
      !pick && h("p", { className: "muted center pm-hint" }, T.tapHint),
      pick && h("div", { className: "feedback " + (pick.ok ? "ok" : "ko") },
        h("strong", null, pick.ok ? T.correct : T.wrong),
        h("p", null, clean(target.name), " — ", catName(lang, target.cat)),
        !pick.ok && pick.other && h("p", { className: "muted" }, `${T.you}: ${clean(pick.other.name)}`),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl, target: "_blank", rel: "noreferrer" }, T.wiki, " ↗"),
          h("button", { className: "btn primary", onClick: next }, i + 1 < rounds.length ? T.next : T.finish))));
  }

  // ---- tab

  let mapsPromise = null;
  const loadMaps = () => (mapsPromise ??= fetch("./data/maps.json").then((r) => {
    if (!r.ok) throw new Error("maps");
    return r.json();
  }).catch((e) => { mapsPromise = null; throw e; }));

  return function MapTab() {
    const store = useStore();
    const { lang } = useI18n();
    const T = TEXT[lang] ?? TEXT.en;
    const [maps, setMaps] = useState(null);
    const [failed, setFailed] = useState(false);
    const [game, setGame] = useState("fo4");
    const [playing, setPlaying] = useState(false);
    const [previewView, setPreviewView] = useState(null);

    useEffect(() => { loadMaps().then(setMaps).catch(() => setFailed(true)); }, []);
    const map = maps && maps[game];
    useEffect(() => { if (map) setPreviewView(bboxView(map.bbox)); }, [game, maps]);

    if (failed) return h("div", { className: "screen" }, h("p", { className: "muted" }, T.error));
    if (!map || !previewView) return h("div", { className: "screen" }, h("p", { className: "muted" }, T.loading));
    if (playing) {
      return h(MapQuiz, { key: game, gameKey: game, map, lang, store, onExit: () => setPlaying(false) });
    }
    return h("div", { className: "screen" },
      h("div", { className: "chips scroll" }, GAME_ORDER.map((g) =>
        h("button", { key: g, className: "chip" + (g === game ? " on" : ""), onClick: () => setGame(g) }, GAME_SHORT[g]))),
      h("header", { className: "hero-title" }, h("h2", null, map.label), h("p", { className: "muted" }, T.sub)),
      h(MapView, { map, view: previewView, setView: setPreviewView, onTap: () => {}, labels: T, interactive: false }),
      h("div", { className: "pb-detail" },
        h("div", null, h("strong", null, map.label), h("p", { className: "muted" }, map.targets.length, " ", T.places)),
        h("button", { className: "btn primary", onClick: () => setPlaying(true) }, T.start)),
      h("p", { className: "muted pm-credit" }, T.credit, game === "fo76" ? T.credit76 : ""));
  };
}
