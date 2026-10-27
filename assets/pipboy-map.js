// Map quizzes for Fallout 3, New Vegas, 4 and 76 (plus the DLC maps).
//
// Modes: find the place (scored by distance), which place is this, discover the map (fog of war that lifts as you
// complete quiz missions, starting from the game's first vault), explorer, which icon is this.
//
// Plain ES module (no build step). It is wired into the compiled bundle through createMapTab(), which receives the
// bundle's React, store hook, i18n hook, sound player and the app's quiz-session component.
// Maps, markers and coordinates come from data/maps.json (see tools/build_maps.py).

const SIZE = 1000; // maps are square; marker coordinates are in 0-1000 map units
const MIN_W = 80; // closest zoom, in map units
const PICK_PX = 26; // tapping this close (screen px) to a marker selects it
const ROUNDS = 10;
const MISSION_QUESTIONS = 3;
const MISSION_PASS = 2; // correct answers needed to discover a place
const FRONTIER = 4; // how many undiscovered places are offered as next destinations
const STORE_KEY = "wasteland-quiz-map-v1";
const GROUP_SHORT = { fo3: "FO3", fnv: "FNV", fo4: "FO4", fo76: "76" }; // game chips, in display order
const WIKI = "https://fallout.fandom.com/wiki/";

const TEXT = {
  it: {
    places: "luoghi", record: "record",
    mFind: "TROVA IL LUOGO", mFindSub: "Tocca il punto giusto: più sei vicino, più punti fai",
    mPlace: "CHE LUOGO È?", mPlaceSub: "Riconosci il luogo evidenziato",
    mDiscover: "MAPPA DA SCOPRIRE", mDiscoverSub: "Parti dal vault e scopri la mappa con i quiz",
    mExplore: "ESPLORATORE", mExploreSub: "Sfoglia la mappa liberamente",
    mIcon: "CHE ICONA È?", mIconSub: "Riconosci il tipo di luogo dall'icona",
    find: "Trova sulla mappa", tapHint: "Tocca la mappa per rispondere", kind: "DOVE?",
    which: "Che luogo è quello evidenziato?", whichIcon: "Che cosa indica l'icona cerchiata?",
    kindPlace: "CHE LUOGO?", kindIcon: "CHE ICONA?",
    correct: "CORRETTO", wrong: "SBAGLIATO", next: "AVANTI", finish: "FINE", close: "Chiudi",
    you: "Hai toccato", pts: "pt", done: "SESSIONE COMPLETATA", answers: "risposte corrette",
    score: "punti", newRecord: "NUOVO RECORD", again: "GIOCA ANCORA", cont: "CONTINUA", wiki: "Wiki",
    loading: "CARICAMENTO MAPPA…", error: "Impossibile caricare le mappe.",
    zin: "Ingrandisci", zout: "Riduci", zreset: "Inquadra",
    found: "scoperti", mission: "MISSIONE", travel: "VIAGGIA", questions: "domande",
    unknown: "Luogo sconosciuto", pickDest: "Tocca un punto interrogativo per scegliere la prossima destinazione.",
    discovered: "SCOPERTO", failed: "Missione fallita", retry: "Riprova con la stessa destinazione o scegline un'altra.",
    complete: "MAPPA COMPLETATA", restart: "RICOMINCIA", restartConfirm: "Vuoi cancellare i luoghi scoperti su questa mappa?",
    needsQuestions: "Nessuna domanda disponibile per questo gioco.",
    highlight: "Evidenzia", all: "Tutti", tapMarker: "Tocca un'icona per vedere il luogo.",
    credit: "Mappe e posizioni: Fallout Wiki (CC BY-SA 3.0). Immagini di proprietà dei rispettivi titolari.",
    credit76: " Mappa di Fallout 76: Mappalachia.",
  },
  en: {
    places: "places", record: "best",
    mFind: "FIND THE PLACE", mFindSub: "Tap the right spot: the closer you are, the more points",
    mPlace: "WHICH PLACE IS THIS?", mPlaceSub: "Recognise the highlighted place",
    mDiscover: "DISCOVER THE MAP", mDiscoverSub: "Start at the vault and uncover the map with quizzes",
    mExplore: "EXPLORER", mExploreSub: "Browse the map freely",
    mIcon: "WHICH ICON IS THIS?", mIconSub: "Tell the kind of place from its icon",
    find: "Find on the map", tapHint: "Tap the map to answer", kind: "WHERE?",
    which: "Which place is highlighted?", whichIcon: "What does the circled icon stand for?",
    kindPlace: "WHICH PLACE?", kindIcon: "WHICH ICON?",
    correct: "CORRECT", wrong: "WRONG", next: "NEXT", finish: "FINISH", close: "Close",
    you: "You tapped", pts: "pt", done: "SESSION COMPLETE", answers: "correct answers",
    score: "points", newRecord: "NEW BEST", again: "PLAY AGAIN", cont: "CONTINUE", wiki: "Wiki",
    loading: "LOADING MAP…", error: "Unable to load the maps.",
    zin: "Zoom in", zout: "Zoom out", zreset: "Frame",
    found: "discovered", mission: "MISSION", travel: "TRAVEL", questions: "questions",
    unknown: "Unknown place", pickDest: "Tap a question mark to pick the next destination.",
    discovered: "DISCOVERED", failed: "Mission failed", retry: "Try the same destination again or pick another.",
    complete: "MAP COMPLETE", restart: "START OVER", restartConfirm: "Clear the places discovered on this map?",
    needsQuestions: "No questions available for this game.",
    highlight: "Highlight", all: "All", tapMarker: "Tap an icon to see the place.",
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
const catName = (lang, cat) => (lang === "it" ? CAT_IT[cat] : null) ?? clean(cat);
const wikiUrl = (m) => WIKI + encodeURIComponent(m.page.replace(/ /g, "_")).replace(/%2F/g, "/");
// Some marker categories are the place's own name (Diamond City, Castle…): they are not a type, so never shown as a hint.
const catCounts = new WeakMap();
const isGeneric = (map, cat) => {
  if (!catCounts.has(map)) {
    const c = new Map();
    map.markers.forEach((m) => c.set(m.cat, (c.get(m.cat) ?? 0) + 1));
    catCounts.set(map, c);
  }
  return catCounts.get(map).get(cat) >= 3;
};
const typeOf = (map, lang, m) => (isGeneric(map, m.cat) ? catName(lang, m.cat) : "");
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- own persistence (discovered places, best scores). Not part of the app store: see HANDOFF.md.

function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    return { discovered: s.discovered ?? {}, best: s.best ?? {} };
  } catch { return { discovered: {}, best: {} }; }
}
function saveSaved(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function createMapTab({ React, useStore, useI18n, sound, Quiz }) {
  const { useState, useRef, useEffect, useCallback, useMemo } = React;
  const h = React.createElement;

  const clampView = (v) => {
    const w = Math.min(SIZE, Math.max(MIN_W, v.w));
    return { w, x: Math.min(SIZE - w, Math.max(0, v.x)), y: Math.min(SIZE - w, Math.max(0, v.y)) };
  };
  const viewAround = (pts, pad, minW) => {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const w = Math.min(SIZE, Math.max(x1 - x0, y1 - y0, minW));
    return clampView({ w, x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w / 2 });
  };
  const bboxView = ([x0, y0, x1, y1]) => viewAround([{ x: x0, y: y0 }, { x: x1, y: y1 }], 0, 300);
  const mapIndex = (map) => new Map(map.markers.map((m) => [m.id, m]));

  // ---- map layers

  const Layers = React.memo(function Layers({ map, size }) {
    const icons = map.icons;
    return h("g", null,
      h("image", { href: map.image, x: 0, y: 0, width: SIZE, height: SIZE, className: "pm-bg" }),
      // The tinted DLC maps carry no icons: draw the category glyphs.
      Object.keys(icons).length > 0 && h("g", { className: "pm-icons" }, map.markers.map((m) =>
        icons[m.c] && h("image", {
          key: m.id, href: icons[m.c], x: m.x - size / 2, y: m.y - size / 2, width: size, height: size,
        }))));
  });

  // Fog of war: everything but the discovered surroundings is darkened. Black, partly transparent discs on a white
  // mask stack up, so neighbouring discs merge instead of re-covering each other.
  const Fog = React.memo(function Fog({ points, radius }) {
    return h("g", { className: "pm-fog" },
      h("defs", null,
        h("radialGradient", { id: "pm-fog-g" },
          h("stop", { offset: "0", stopColor: "#000", stopOpacity: 1 }),
          h("stop", { offset: "0.55", stopColor: "#000", stopOpacity: 1 }),
          h("stop", { offset: "1", stopColor: "#000", stopOpacity: 0 })),
        h("mask", { id: "pm-fog-m", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: SIZE, height: SIZE },
          h("rect", { x: 0, y: 0, width: SIZE, height: SIZE, fill: "#fff" }),
          points.map((p) => h("circle", { key: p.id, cx: p.x, cy: p.y, r: radius, fill: "url(#pm-fog-g)" })))),
      h("rect", { x: 0, y: 0, width: SIZE, height: SIZE, className: "pm-fog-rect", mask: "url(#pm-fog-m)" }));
  });

  function MapView({ map, view, setView, onTap, children, labels, home, interactive = true }) {
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

    const pdist = () => {
      const [a, b] = [...ptrs.current.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onDown = (e) => {
      svgRef.current.setPointerCapture(e.pointerId);
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.current.size === 1) drag.current = { moved: false, start: { x: e.clientX, y: e.clientY }, pinch: 0 };
      else drag.current = { moved: true, start: null, pinch: pdist() };
    };
    const onMove = (e) => {
      const prev = ptrs.current.get(e.pointerId);
      if (!prev) return;
      const rect = svgRef.current.getBoundingClientRect();
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.current.size === 2) {
        const d = pdist();
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
      if (had && ptrs.current.size === 0 && !drag.current.moved && e.type === "pointerup") {
        const upp = view.w / svgRef.current.getBoundingClientRect().width; // map units per screen px
        onTap(toMap(e.clientX, e.clientY), upp);
      }
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
        h("button", { className: "sqbtn", "aria-label": labels.zreset, onClick: () => setView(home ?? bboxView(map.bbox)) }, "⌂")));
  }

  // ---- shared pieces

  const Header = ({ title, i, n, onExit, T }) => h(React.Fragment, null,
    h("div", { className: "topbar" },
      h("button", { className: "link", onClick: onExit, "aria-label": T.close }, "✕"),
      h("span", { className: "muted" }, title),
      h("span", { className: "muted" }, n ? `${i + 1}/${n}` : "")),
    n ? h("div", { className: "progressbar" }, h("div", { style: { width: `${(i / n) * 100}%` } })) : null);

  function Summary({ T, top, sub, xp, extra, onAgain, onExit }) {
    return h("div", { className: "screen" },
      h("h2", { className: "title" }, T.done),
      h("div", { className: "panel center" },
        h("div", { className: "big" }, top),
        h("div", null, sub),
        extra,
        h("div", { className: "xp" }, "+", xp, " XP")),
      h("button", { className: "btn", onClick: onAgain }, T.again),
      h("button", { className: "btn primary", onClick: onExit }, T.cont));
  }

  function Label({ target, map, view }) {
    const x = target.x, below = target.y <= view.y + view.w * 0.2;
    return h("text", {
      x, y: below ? target.y + map.hit + 20 : target.y - map.hit - 6,
      textAnchor: x < view.x + view.w * 0.25 ? "start" : x > view.x + view.w * 0.75 ? "end" : "middle",
      className: "pm-label", style: { fontSize: Math.max(10, view.w * 0.034) },
    }, clean(target.name));
  }

  const pseudoQuestion = (map, id) => ({ id: "map:" + id, kind: "map", tipo: "luogo", livello: 2, giochi: [map.group] });

  // ---- mode 1: find the place, scored by distance

  const pointsFor = (d, hit) => (d <= hit / 2 ? 100 : Math.max(0, Math.round(100 * (1 - (d - hit / 2) / (7.5 * hit)))));

  function pickRounds(map) {
    const byId = mapIndex(map);
    return shuffle(map.targets).slice(0, ROUNDS).map((id) => byId.get(id));
  }

  function FindQuiz({ mapKey, map, lang, onExit, store, saved, setSaved }) {
    const T = TEXT[lang] ?? TEXT.en;
    const home = useMemo(() => bboxView(map.bbox), [map]);
    const [rounds, setRounds] = useState(() => pickRounds(map));
    const [i, setI] = useState(0);
    const [view, setView] = useState(home);
    const [pick, setPick] = useState(null);
    const [score, setScore] = useState({ ok: 0, xp: 0, pts: 0 });
    const [done, setDone] = useState(false);
    const [record, setRecord] = useState(false);
    const t0 = useRef(Date.now());
    const target = rounds[i];

    function onTap(p) {
      if (pick) return;
      const d = dist(p, target);
      const ok = d <= map.hit;
      const pts = pointsFor(d, map.hit);
      const other = map.markers.filter((m) => m.id !== target.id)
        .map((m) => ({ m, d: dist(p, m) })).filter((o) => o.d <= 14).sort((a, b) => a.d - b.d)[0];
      sound(ok ? "right" : "wrong");
      const xp = store.answer(pseudoQuestion(map, target.id), ok, (Date.now() - t0.current) / 1000);
      setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), xp: s.xp + xp, pts: s.pts + pts }));
      setPick({ ...p, ok, pts, other: other?.m });
    }
    function next() {
      if (i + 1 >= rounds.length) {
        store.completeSession();
        setRecord(score.pts > 0 && score.pts > (saved.best[mapKey] ?? 0));
        setSaved((s) => {
          const n = { ...s, best: { ...s.best, [mapKey]: Math.max(s.best[mapKey] ?? 0, score.pts) } };
          saveSaved(n);
          return n;
        });
        setDone(true);
        return;
      }
      setI(i + 1); setPick(null); setView(home); t0.current = Date.now();
    }
    function again() {
      setRounds(pickRounds(map)); setI(0); setPick(null); setView(home);
      setScore({ ok: 0, xp: 0, pts: 0 }); setDone(false); t0.current = Date.now();
    }

    if (done) {
      return h(Summary, {
        T, top: `${score.pts}`, sub: `${T.score} · ${score.ok}/${rounds.length} ${T.answers}`, xp: score.xp,
        extra: record ? h("div", { className: "pm-record" }, T.newRecord) : null, onAgain: again, onExit,
      });
    }

    const overlay = (size) => !pick ? null : h("g", { className: "pm-result" },
      h("circle", { cx: target.x, cy: target.y, r: map.hit, className: "pm-ring" }),
      h("circle", { cx: target.x, cy: target.y, r: size * 0.8, className: "pm-pulse" }),
      h("line", { x1: pick.x, y1: pick.y, x2: target.x, y2: target.y, className: "pm-line" }),
      h("path", {
        d: `M${pick.x - 6} ${pick.y - 6}L${pick.x + 6} ${pick.y + 6}M${pick.x + 6} ${pick.y - 6}L${pick.x - 6} ${pick.y + 6}`,
        className: "pm-x " + (pick.ok ? "ok" : "ko"),
      }),
      h(Label, { target, map, view }));

    return h("div", { className: "screen quiz" + (pick ? " answered" : "") },
      h(Header, { title: map.label, i, n: rounds.length, onExit, T }),
      h("p", { className: "tags" }, h("span", { className: "badge" }, T.kind), map.label),
      h("h2", { className: "question" }, T.find, ": ", h("span", { className: "pm-target" }, clean(target.name))),
      h(MapView, { map, view, setView, onTap, labels: T, home }, overlay),
      !pick && h("p", { className: "muted center pm-hint" }, T.tapHint),
      pick && h("div", { className: "feedback " + (pick.ok ? "ok" : "ko") },
        h("strong", null, pick.ok ? T.correct : T.wrong, " · +", pick.pts, " ", T.pts),
        h("p", null, clean(target.name), typeOf(map, lang, target) && ` — ${typeOf(map, lang, target)}`),
        !pick.ok && pick.other && h("p", { className: "muted" }, `${T.you}: ${clean(pick.other.name)}`),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl(target), target: "_blank", rel: "noreferrer" }, T.wiki, " ↗"),
          h("button", { className: "btn primary", onClick: next }, i + 1 < rounds.length ? T.next : T.finish))));
  }

  // ---- modes 2 and 5: multiple choice on the map ("which place" / "which icon")

  function buildChoice(map, lang, kind) {
    const byId = mapIndex(map);
    let pool = map.targets.map((id) => byId.get(id));
    if (kind === "icon") { // only generic types: a category with a handful of markers, not a place's own name
      pool = pool.filter((m) => isGeneric(map, m.cat));
    }
    return shuffle(pool).slice(0, ROUNDS).map((target) => {
      let options;
      if (kind === "icon") {
        const correct = catName(lang, target.cat);
        const others = [...new Set(pool.map((m) => catName(lang, m.cat)))].filter((c) => c !== correct);
        options = shuffle([correct, ...shuffle(others).slice(0, 3)]);
        return { target, options, answer: options.indexOf(correct) };
      }
      const near = pool.filter((m) => m.id !== target.id).sort((a, b) => dist(a, target) - dist(b, target));
      const same = near.filter((m) => m.cat === target.cat).slice(0, 6);
      const rest = near.slice(0, 12).filter((m) => !same.includes(m));
      const picks = shuffle([...shuffle(same).slice(0, 2), ...shuffle(rest)]).slice(0, 3);
      options = shuffle([target, ...picks]).map((m) => clean(m.name));
      return { target, options, answer: options.indexOf(clean(target.name)) };
    });
  }

  function ChoiceQuiz({ kind, map, lang, onExit, store }) {
    const T = TEXT[lang] ?? TEXT.en;
    const frame = (t) => viewAround([t], kind === "icon" ? 34 : 130, 60);
    const [rounds, setRounds] = useState(() => buildChoice(map, lang, kind));
    const [i, setI] = useState(0);
    const [view, setView] = useState(() => frame(rounds[0].target));
    const [chosen, setChosen] = useState(null);
    const [score, setScore] = useState({ ok: 0, xp: 0 });
    const [done, setDone] = useState(false);
    const t0 = useRef(Date.now());
    const q = rounds[i];

    function choose(k) {
      if (chosen !== null) return;
      const ok = k === q.answer;
      sound(ok ? "right" : "wrong");
      const xp = store.answer(pseudoQuestion(map, q.target.id), ok, (Date.now() - t0.current) / 1000);
      setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), xp: s.xp + xp }));
      setChosen(k);
    }
    function next() {
      if (i + 1 >= rounds.length) { store.completeSession(); setDone(true); return; }
      setView(frame(rounds[i + 1].target)); setI(i + 1); setChosen(null); t0.current = Date.now();
    }
    function again() {
      const r = buildChoice(map, lang, kind);
      setRounds(r); setI(0); setView(frame(r[0].target)); setChosen(null); setScore({ ok: 0, xp: 0 }); setDone(false);
      t0.current = Date.now();
    }

    if (done) {
      return h(Summary, { T, top: `${score.ok}/${rounds.length}`, sub: T.answers, xp: score.xp, onAgain: again, onExit });
    }
    const answered = chosen !== null;
    const overlay = (size) => h("g", { className: "pm-result" },
      h("circle", {
        cx: q.target.x, cy: q.target.y, r: kind === "icon" ? 11 : size * 0.9,
        className: answered ? "pm-ring" : "pm-ring pm-ring-q",
      }),
      !answered && kind === "place" && h("circle", { cx: q.target.x, cy: q.target.y, r: size * 0.8, className: "pm-pulse" }),
      answered && kind === "place" && h(Label, { target: q.target, map: { hit: size * 0.9 }, view }));
    return h("div", { className: "screen quiz" + (answered ? " answered" : "") },
      h(Header, { title: map.label, i, n: rounds.length, onExit, T }),
      h("p", { className: "tags" }, h("span", { className: "badge" }, kind === "icon" ? T.kindIcon : T.kindPlace), map.label),
      h("h2", { className: "question" }, kind === "icon" ? T.whichIcon : T.which),
      h(MapView, { map, view, setView, onTap: () => {}, labels: T, home: frame(q.target) }, overlay),
      h("div", { className: "options" }, q.options.map((o, k) => {
        const state = answered ? (k === q.answer ? "right" : k === chosen ? "wrong" : "dim") : "";
        return h("div", { className: "option-row", key: k },
          h("button", { className: "option " + state, disabled: answered, onClick: () => choose(k) },
            h("span", { className: "letter" }, String.fromCharCode(65 + k)), h("span", null, o)));
      })),
      answered && h("div", { className: "feedback " + (chosen === q.answer ? "ok" : "ko") },
        h("strong", null, chosen === q.answer ? T.correct : T.wrong),
        h("p", null, clean(q.target.name), typeOf(map, lang, q.target) && ` — ${typeOf(map, lang, q.target)}`),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl(q.target), target: "_blank", rel: "noreferrer" }, T.wiki, " ↗"),
          h("button", { className: "btn primary", onClick: next }, i + 1 < rounds.length ? T.next : T.finish))));
  }

  // ---- mode 3: discover the map

  function frontierOf(map, byId, found) {
    const reached = [...found].map((id) => byId.get(id)).filter(Boolean);
    return map.targets.filter((id) => !found.has(id)).map((id) => {
      const m = byId.get(id);
      return { m, d: Math.min(...reached.map((r) => dist(r, m))) };
    }).sort((a, b) => a.d - b.d).slice(0, FRONTIER).map((o) => o.m);
  }

  // unseen questions first, so every mission teaches something new
  function pickMissionQuestions(store, map) {
    const seen = new Set(store.progress.seen);
    const pool = store.questions.filter((q) => q.giochi.includes(map.group) && q.kind !== "game");
    const fresh = shuffle(pool.filter((q) => !seen.has(q.id)));
    return [...fresh, ...shuffle(pool.filter((q) => seen.has(q.id)))].slice(0, MISSION_QUESTIONS);
  }

  function Discover({ mapKey, map, lang, onExit, store, saved, setSaved }) {
    const T = TEXT[lang] ?? TEXT.en;
    const byId = useMemo(() => mapIndex(map), [map]);
    const radius = map.hit > 30 ? 130 : 105;
    const [found, setFound] = useState(() => new Set([map.start, ...(saved.discovered[mapKey] ?? [])]));
    const frontier = useMemo(() => frontierOf(map, byId, found), [map, byId, found]);
    const [sel, setSel] = useState(null);
    const [note, setNote] = useState(null); // { kind: "found" | "failed" | "noq", ... }
    const [mission, setMission] = useState(null);
    const frame = useCallback((f, fr) => viewAround([...f].map((id) => byId.get(id)).concat(fr), radius * 0.6, 260), [byId, radius]);
    const [view, setView] = useState(() => frame(found, frontier));
    const total = map.targets.length;
    const foundTargets = map.targets.filter((id) => found.has(id)).length;
    const complete = foundTargets >= total;
    const selected = sel && frontier.find((m) => m.id === sel);

    function persist(f) {
      setSaved((s) => {
        const n = { ...s, discovered: { ...s.discovered, [mapKey]: [...f].filter((id) => id !== map.start) } };
        saveSaved(n);
        return n;
      });
    }
    function onTap(p, upp) {
      const hit = frontier.map((m) => ({ m, d: dist(p, m) })).filter((o) => o.d <= PICK_PX * upp).sort((a, b) => a.d - b.d)[0];
      if (hit) { setSel(hit.m.id); setNote(null); }
    }
    function travel() {
      const qs = pickMissionQuestions(store, map);
      if (qs.length) setMission({ target: selected, qs });
      else setNote({ kind: "noq" });
    }
    function missionDone({ correct, total: tot }) {
      const target = mission.target;
      setMission(null);
      if (correct >= Math.min(MISSION_PASS, tot)) {
        const f = new Set(found).add(target.id);
        sound("caps");
        setFound(f); persist(f); setSel(null);
        setNote({ kind: "found", m: target });
        setView(frame(f, frontierOf(map, byId, f)));
      } else {
        setNote({ kind: "failed", correct, total: tot });
      }
    }
    function restart() {
      if (typeof window !== "undefined" && !window.confirm(T.restartConfirm)) return;
      const f = new Set([map.start]);
      setFound(f); persist(f); setSel(null); setNote(null);
      setView(frame(f, frontierOf(map, byId, f)));
    }

    if (mission) {
      return h(Quiz, {
        title: `${map.label} · ${T.mission}`, questions: mission.qs, onExit: () => setMission(null), onFinish: missionDone,
      });
    }

    const overlay = (size) => h("g", null,
      h(Fog, { points: [...found].map((id) => byId.get(id)), radius }),
      frontier.map((m) => h("g", { key: m.id, className: "pm-frontier" + (m.id === sel ? " on" : "") },
        h("circle", { cx: m.x, cy: m.y, r: size * 0.85, className: "pm-fr-ring" }),
        h("text", { x: m.x, y: m.y + size * 0.32, textAnchor: "middle", style: { fontSize: size * 0.9 }, className: "pm-fr-q" }, "?"))),
      note?.kind === "found" && h("g", { className: "pm-result" },
        h("circle", { cx: note.m.x, cy: note.m.y, r: size * 0.8, className: "pm-pulse" }),
        h(Label, { target: note.m, map: { hit: size * 0.9 }, view })));

    return h("div", { className: "screen quiz" },
      h(Header, { title: map.label, i: 0, n: 0, onExit, T }),
      h("div", { className: "progressbar" }, h("div", { style: { width: `${(foundTargets / total) * 100}%` } })),
      h("p", { className: "tags" }, h("span", { className: "badge" }, T.mDiscover), `${foundTargets}/${total} ${T.found}`),
      h(MapView, { map, view, setView, onTap, labels: T, home: frame(found, frontier) }, overlay),
      complete && h("div", { className: "feedback ok" }, h("strong", null, T.complete)),
      !complete && !selected && !note && h("p", { className: "muted center pm-hint" }, T.pickDest),
      note?.kind === "found" && h("div", { className: "feedback ok" },
        h("strong", null, T.discovered, ": ", clean(note.m.name)),
        typeOf(map, lang, note.m) && h("p", null, typeOf(map, lang, note.m)),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl(note.m), target: "_blank", rel: "noreferrer" }, T.wiki, " ↗"))),
      note?.kind === "failed" && h("div", { className: "feedback ko" },
        h("strong", null, T.failed, ` (${note.correct}/${note.total})`), h("p", null, T.retry)),
      note?.kind === "noq" && h("div", { className: "feedback ko" }, h("p", null, T.needsQuestions)),
      selected && !complete && h("div", { className: "pm-dest" },
        h("div", null, h("strong", null, T.unknown), typeOf(map, lang, selected) && h("p", { className: "muted" }, typeOf(map, lang, selected))),
        h("button", { className: "btn primary", onClick: travel }, "▶ ", T.travel, " · ", MISSION_QUESTIONS, " ", T.questions)),
      h("button", { className: "btn pm-restart", onClick: restart }, T.restart));
  }

  // ---- mode 4: explorer

  function Explorer({ map, lang, onExit }) {
    const T = TEXT[lang] ?? TEXT.en;
    const home = useMemo(() => bboxView(map.bbox), [map]);
    const [view, setView] = useState(home);
    const [sel, setSel] = useState(null);
    const [cat, setCat] = useState(null);
    const cats = useMemo(() => {
      const c = new Map();
      map.markers.forEach((m) => { const n = catName(lang, m.cat); c.set(n, (c.get(n) ?? 0) + 1); });
      return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n);
    }, [map, lang]);

    function onTap(p, upp) {
      const hit = map.markers.map((m) => ({ m, d: dist(p, m) })).filter((o) => o.d <= PICK_PX * upp)
        .sort((a, b) => a.d - b.d)[0];
      setSel(hit ? hit.m : null);
    }
    const overlay = (size) => h("g", null,
      cat && map.markers.filter((m) => catName(lang, m.cat) === cat).map((m) =>
        h("circle", { key: m.id, cx: m.x, cy: m.y, r: size * 0.8, className: "pm-hl" })),
      sel && h("g", { className: "pm-result" },
        h("circle", { cx: sel.x, cy: sel.y, r: size * 0.8, className: "pm-pulse" }),
        h("circle", { cx: sel.x, cy: sel.y, r: size * 0.8, className: "pm-ring" }),
        h(Label, { target: sel, map: { hit: size * 0.9 }, view })));
    return h("div", { className: "screen quiz" },
      h(Header, { title: map.label, i: 0, n: 0, onExit, T }),
      h("p", { className: "tags" }, h("span", { className: "badge" }, T.mExplore), map.label),
      h("div", { className: "chips scroll" },
        h("span", { className: "muted pm-chip-label" }, T.highlight),
        [null, ...cats].map((c) => h("button", {
          key: c ?? "all", className: "chip" + (c === cat ? " on" : ""), onClick: () => setCat(c),
        }, c ?? T.all))),
      h(MapView, { map, view, setView, onTap, labels: T, home }, overlay),
      sel ? h("div", { className: "feedback ok" },
        h("strong", null, clean(sel.name)), typeOf(map, lang, sel) && h("p", null, typeOf(map, lang, sel)),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl(sel), target: "_blank", rel: "noreferrer" }, T.wiki, " ↗")))
        : h("p", { className: "muted center pm-hint" }, T.tapMarker));
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
    const [mode, setMode] = useState(null);
    const [previewView, setPreviewView] = useState(null);
    const [saved, setSaved] = useState(loadSaved);

    useEffect(() => { loadMaps().then(setMaps).catch(() => setFailed(true)); }, []);
    const map = maps && maps[game];
    useEffect(() => { if (map) setPreviewView(bboxView(map.bbox)); }, [game, maps]);
    const areas = map ? Object.keys(maps).filter((k) => maps[k].group === map.group) : [];

    if (failed) return h("div", { className: "screen" }, h("p", { className: "muted" }, T.error));
    if (!map || !previewView) return h("div", { className: "screen" }, h("p", { className: "muted" }, T.loading));

    const exit = () => setMode(null);
    const props = { mapKey: game, map, lang, store, saved, setSaved, onExit: exit };
    if (mode === "find") return h(FindQuiz, { key: game + mode, ...props });
    if (mode === "place") return h(ChoiceQuiz, { key: game + mode, ...props, kind: "place" });
    if (mode === "icon") return h(ChoiceQuiz, { key: game + mode, ...props, kind: "icon" });
    if (mode === "discover") return h(Discover, { key: game + mode, ...props });
    if (mode === "explore") return h(Explorer, { key: game + mode, ...props });

    const nFound = new Set([map.start, ...(saved.discovered[game] ?? [])].filter((id) => map.targets.includes(id))).size;
    const rows = [
      { id: "find", title: T.mFind, sub: T.mFindSub, tag: saved.best[game] ? `${T.record} ${saved.best[game]}` : "" },
      { id: "place", title: T.mPlace, sub: T.mPlaceSub },
      { id: "discover", title: T.mDiscover, sub: T.mDiscoverSub, tag: `${nFound}/${map.targets.length}` },
      { id: "explore", title: T.mExplore, sub: T.mExploreSub },
      map.group !== "fo76" && { id: "icon", title: T.mIcon, sub: T.mIconSub },
    ].filter(Boolean);
    return h("div", { className: "screen" },
      h("div", { className: "chips scroll" }, Object.keys(GROUP_SHORT).map((grp) =>
        h("button", {
          key: grp, className: "chip" + (grp === map.group ? " on" : ""),
          onClick: () => setGame(Object.keys(maps).find((k) => maps[k].group === grp)),
        }, GROUP_SHORT[grp]))),
      areas.length > 1 && h("div", { className: "chips scroll" }, areas.map((k) =>
        h("button", { key: k, className: "chip" + (k === game ? " on" : ""), onClick: () => setGame(k) }, maps[k].short))),
      h("div", { className: "pm-preview" },
        h(MapView, { map, view: previewView, setView: setPreviewView, onTap: () => {}, labels: T, interactive: false })),
      h("p", { className: "muted" }, map.label, " · ", map.targets.length, " ", T.places),
      h("div", { className: "pb-list" }, rows.map((r) =>
        h("button", { key: r.id, className: "pb-row", "data-mode": r.id, onClick: () => setMode(r.id) },
          h("span", { className: "sq" }),
          h("span", { className: "pm-row-text" }, h("span", { className: "ellipsis" }, r.title), h("small", { className: "muted" }, r.sub)),
          r.tag ? h("i", null, r.tag) : null))),
      h("p", { className: "muted pm-credit" }, T.credit, game.startsWith("fo76") ? T.credit76 : ""));
  };
}
