// Map quiz: "find the location on the Pip-Boy map".
// Plain ES module (no build step). It is wired into the compiled bundle through
// createMapTab(), which receives the bundle's React, store hook, i18n hook and sound player.

export const MAP_W = 1000;
export const MAP_H = 760;
const HIT_RADIUS = 62; // tap this close (map units) to the target to count as correct
const PICK_RADIUS = 26; // tap this close to another icon to name it in the feedback
const ROUNDS = 10;

// Approximate positions on the Commonwealth map, in map units (x 0-1000, y 0-760).
// kind -> icon. Edit this table to tune positions or add places.
export const PLACES = [
  { id: "sanctuary", name: "Sanctuary Hills", kind: "house", x: 168, y: 98,
    it: "Il quartiere residenziale dove vive il Sopravvissuto prima della guerra.",
    en: "The suburb where the Sole Survivor lived before the war." },
  { id: "vault111", name: "Vault 111", kind: "vault", x: 226, y: 112,
    it: "Il Vault criogenico in cui il Sopravvissuto si risveglia dopo 210 anni.",
    en: "The cryogenic Vault where the Sole Survivor wakes up after 210 years." },
  { id: "redrocket", name: "Red Rocket Truck Stop", kind: "gas", x: 200, y: 152,
    it: "La stazione di servizio vicino a Sanctuary Hills dove si incontra Dogmeat.",
    en: "The gas station near Sanctuary Hills where you meet Dogmeat." },
  { id: "concord", name: "Concord", kind: "town", x: 222, y: 205,
    it: "Cittadina con il Museo della Libertà, dove si incontrano i Minutemen.",
    en: "A town with the Museum of Freedom, where you meet the Minutemen." },
  { id: "lexington", name: "Lexington", kind: "town", x: 262, y: 266,
    it: "Cittadina in rovina a sud di Concord.",
    en: "A ruined town south of Concord." },
  { id: "corvega", name: "Corvega Assembly Plant", kind: "factory", x: 118, y: 342,
    it: "L'ex fabbrica di automobili Corvega, occupata dai predoni.",
    en: "The former Corvega car factory, taken over by raiders." },
  { id: "graygarden", name: "Graygarden", kind: "farm", x: 306, y: 150,
    it: "Fattoria gestita da robot Handy.",
    en: "A farm run by Mr. Handy robots." },
  { id: "hagen", name: "Fort Hagen Command Center", kind: "military", x: 440, y: 142,
    it: "Antica base militare con un centro di comando sotterraneo.",
    en: "An old military base with an underground command center." },
  { id: "covenant", name: "Covenant", kind: "house", x: 470, y: 60,
    it: "Comunità dall'aria idilliaca che nasconde un oscuro segreto.",
    en: "A seemingly idyllic community hiding a dark secret." },
  { id: "salem", name: "Salem", kind: "town", x: 850, y: 128,
    it: "Cittadina costiera a nord, famosa per il suo museo della stregoneria.",
    en: "A coastal town in the north, known for its witchcraft museum." },
  { id: "diamond", name: "Diamond City", kind: "city", x: 470, y: 410,
    it: "La più grande città del Commonwealth, costruita dentro il Fenway Park.",
    en: "The largest city in the Commonwealth, built inside Fenway Park." },
  { id: "cambridge", name: "Cambridge Police Station", kind: "military", x: 335, y: 440,
    it: "L'ex commissariato dove si incontra Paladin Danse.",
    en: "The former police station where you meet Paladin Danse." },
  { id: "vault81", name: "Vault 81", kind: "vault", x: 235, y: 520,
    it: "Il Vault dove si incontra Curie.",
    en: "The Vault where you meet Curie." },
  { id: "goodneighbor", name: "Goodneighbor", kind: "town", x: 625, y: 455,
    it: "Città libera di ghoul e reietti, governata dal sindaco Hancock.",
    en: "A free town of ghouls and outcasts, run by Mayor Hancock." },
  { id: "bunkerhill", name: "Bunker Hill", kind: "city", x: 690, y: 400,
    it: "Importante posto di scambio dove fanno tappa le carovane.",
    en: "A major trading post where the caravans stop." },
  { id: "constitution", name: "USS Constitution", kind: "ship", x: 735, y: 340,
    it: "La storica fregata Old Ironsides, ormeggiata a Charlestown.",
    en: "The historic frigate Old Ironsides, docked at Charlestown." },
  { id: "airport", name: "Boston Airport", kind: "plane", x: 905, y: 505,
    it: "L'aeroporto dove è ormeggiato il Prydwen della Confraternita d'Acciaio.",
    en: "The airport where the Brotherhood of Steel's Prydwen is moored." },
  { id: "castle", name: "Castle", kind: "military", x: 800, y: 640,
    it: "L'ex Fort Independence, che diventa il quartier generale dei Minutemen.",
    en: "The former Fort Independence, which becomes the Minutemen's headquarters." },
  { id: "strong", name: "Fort Strong", kind: "military", x: 880, y: 585,
    it: "Base militare su un'isola, occupata dai super mutanti.",
    en: "A military base on an island, held by super mutants." },
  { id: "quincy", name: "Quincy Ruins", kind: "town", x: 610, y: 640,
    it: "Le rovine di Quincy, teatro dello scontro con i Gunners.",
    en: "The ruins of Quincy, scene of the clash with the Gunners." },
];

const KIND_LABEL = {
  it: { house: "Insediamento", vault: "Vault", gas: "Stazione di servizio", town: "Cittadina", factory: "Fabbrica",
        farm: "Fattoria", military: "Base militare", city: "Città", ship: "Nave", plane: "Aeroporto" },
  en: { house: "Settlement", vault: "Vault", gas: "Gas station", town: "Town", factory: "Factory",
        farm: "Farm", military: "Military site", city: "City", ship: "Ship", plane: "Airport" },
};

const TEXT = {
  it: {
    tab: "MAP", title: "MAPPA", sub: "Individua il luogo sulla mappa del Commonwealth",
    start: "▶ INIZIA", find: "Trova sulla mappa", tapHint: "Tocca la mappa per rispondere",
    correct: "CORRETTO", wrong: "SBAGLIATO", next: "AVANTI", finish: "FINE", close: "Chiudi",
    you: "Hai toccato", done: "SESSIONE COMPLETATA", answers: "risposte corrette",
    again: "GIOCA ANCORA", cont: "CONTINUA", kind: "DOVE?", game: "Fallout 4",
    zin: "Ingrandisci", zout: "Riduci", zreset: "Mostra tutta la mappa", place: "luoghi",
  },
  en: {
    tab: "MAP", title: "MAP", sub: "Find the location on the Commonwealth map",
    start: "▶ START", find: "Find on the map", tapHint: "Tap the map to answer",
    correct: "CORRECT", wrong: "WRONG", next: "NEXT", finish: "FINISH", close: "Close",
    you: "You tapped", done: "SESSION COMPLETE", answers: "correct answers",
    again: "PLAY AGAIN", cont: "CONTINUE", kind: "WHERE?", game: "Fallout 4",
    zin: "Zoom in", zout: "Zoom out", zreset: "Show the whole map", place: "places",
  },
};

// ---------------------------------------------------------------- terrain

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 1831565813) >>> 0;
    let n = t;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

const SEA = [
  // north-east Atlantic
  "M705 0 H1000 V232 C965 226 940 238 918 214 C896 190 882 168 846 160 C806 150 786 118 760 86 C738 58 712 40 705 0Z",
  // Boston harbour
  "M1000 552 C976 560 952 556 934 574 C914 594 930 616 912 636 C892 656 906 690 940 700 C970 708 1000 704 1000 704Z",
];
const RIVER = "M268 468 C320 470 372 446 420 470 C470 494 520 478 566 500 C606 518 640 500 676 520 C706 536 730 520 760 548";
const HIGHWAYS = [
  "M0 238 C150 214 280 190 380 214 S560 250 650 330 S760 430 800 520",
  "M52 600 C30 470 70 380 190 336 S392 308 470 354 S604 392 690 372",
  "M292 0 C268 90 318 170 306 260 S346 420 330 520 S372 660 356 760",
  "M470 354 C520 440 600 470 650 560 S760 640 800 760",
];
const FOREST = [
  [120, 190, 90, 60], [380, 90, 70, 50], [560, 170, 100, 70], [150, 470, 80, 60],
  [420, 600, 100, 70], [560, 330, 60, 45], [90, 90, 60, 40],
];

function buildStreets() {
  const r = rng(2287);
  const lines = [];
  // outer roads: random walks
  for (let i = 0; i < 46; i++) {
    let x = r() * MAP_W, y = r() * MAP_H, a = r() * Math.PI * 2;
    const pts = [[x, y]];
    const steps = 5 + Math.floor(r() * 8);
    for (let s = 0; s < steps; s++) {
      a += (r() - 0.5) * 1.1;
      const l = 36 + r() * 46;
      x += Math.cos(a) * l;
      y += Math.sin(a) * l;
      pts.push([x, y]);
    }
    lines.push(pts);
  }
  // dense city grid around the downtown peninsula
  const cx = 640, cy = 470;
  for (let i = 0; i < 70; i++) {
    const ang = r() * Math.PI * 2, rad = r() * 190;
    const x = cx + Math.cos(ang) * rad * 1.2, y = cy + Math.sin(ang) * rad * 0.8;
    const horiz = r() > 0.5, l = 30 + r() * 50;
    lines.push(horiz ? [[x, y], [x + l, y + (r() - 0.5) * 10]] : [[x, y], [x + (r() - 0.5) * 10, y + l]]);
  }
  return lines.map((pts) => {
    let d = "M" + pts[0][0].toFixed(0) + " " + pts[0][1].toFixed(0);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += " Q" + pts[i][0].toFixed(0) + " " + pts[i][1].toFixed(0) + " " + mx.toFixed(0) + " " + my.toFixed(0);
    }
    const last = pts[pts.length - 1];
    return d + " L" + last[0].toFixed(0) + " " + last[1].toFixed(0);
  });
}
const STREETS = buildStreets();

// ---------------------------------------------------------------- icons (24x24, drawn with currentColor)

const ICONS = {
  house: "M12 3 L22 12 H19 V21 H5 V12 H2Z M10 21 V15 H14 V21Z",
  vault: "M12 1.5 L14.3 4.2 L17.8 3.6 L18.6 7 L22 8.2 L20.8 11.5 L22.5 14.5 L19.6 16.6 L19.6 20 L16 20.1 L14.2 23 L12 21 L9.8 23 L8 20.1 L4.4 20 L4.4 16.6 L1.5 14.5 L3.2 11.5 L2 8.2 L5.4 7 L6.2 3.6 L9.7 4.2Z M12 8 A4 4 0 1 0 12.01 8Z",
  gas: "M3 19 V9 H9 V19Z M11 19 V6 H14 V19Z M16 19 V12 H21 V19Z M2 20 H22 V22 H2Z",
  town: "M2 21 V10 H8 V21Z M9 21 V4 H15 V21Z M16 21 V12 H22 V21Z M11 7 H13 V9 H11Z M11 12 H13 V14 H11Z M11 17 H13 V19 H11Z",
  city: "M2 21 V12 L6 9 L10 12 V21Z M11 21 V3 H17 V21Z M18 21 V9 H22 V21Z M13 6 H15 V8 H13Z M13 11 H15 V13 H13Z M13 16 H15 V18 H13Z",
  factory: "M2 21 V11 L8 15 V11 L14 15 V11 L20 15 V4 H23 V21Z M5 17 H7 V19 H5Z M11 17 H13 V19 H11Z M17 17 H19 V19 H17Z",
  farm: "M4 21 V12 L12 6 L20 12 V21Z M9 21 V15 H15 V21Z M2 5 H8 V11 H2Z",
  military: "M12 1 A11 11 0 1 0 12.01 1Z M12 4 A8 8 0 1 1 11.99 4Z M12 6 L13.6 10.2 L18 10.3 L14.5 13 L15.8 17.3 L12 14.8 L8.2 17.3 L9.5 13 L6 10.3 L10.4 10.2Z",
  ship: "M3 15 H21 L18 20 H6Z M11 3 V13 H5Z M13 5 L19 13 H13Z",
  plane: "M21 16 V14 L13 9 V3.5 C13 2.7 12.3 2 11.5 2 C10.7 2 10 2.7 10 3.5 V9 L2 14 V16 L10 13.5 V19 L8 20.5 V22 L11.5 21 L15 22 V20.5 L13 19 V13.5Z",
};

// ---------------------------------------------------------------- component factory

export function createMapTab({ React, useStore, useI18n, sound }) {
  const { useState, useRef, useMemo, useEffect, useCallback } = React;
  const h = React.createElement;

  const clampView = (v) => {
    const w = Math.min(MAP_W, Math.max(240, v.w));
    const hh = w * MAP_H / MAP_W;
    return { w, x: Math.min(MAP_W - w, Math.max(0, v.x)), y: Math.min(MAP_H - hh, Math.max(0, v.y)) };
  };
  const FULL = { x: 0, y: 0, w: MAP_W };

  function Terrain() {
    return h("g", { className: "pm-terrain" },
      h("rect", { width: MAP_W, height: MAP_H, className: "pm-land" }),
      FOREST.map(([cx, cy, rx, ry], i) => h("ellipse", { key: "f" + i, cx, cy, rx, ry, className: "pm-forest" })),
      h("g", { className: "pm-streets" }, STREETS.map((d, i) => h("path", { key: i, d }))),
      h("g", { className: "pm-highways" }, HIGHWAYS.map((d, i) => h("path", { key: i, d }))),
      SEA.map((d, i) => h("path", { key: "s" + i, d, className: "pm-sea" })),
      h("path", { d: RIVER, className: "pm-river-edge" }),
      h("path", { d: RIVER, className: "pm-river" }),
    );
  }

  const Icons = React.memo(function Icons({ size }) {
    return h("g", { className: "pm-icons" }, PLACES.map((p) =>
      h("svg", {
        key: p.id, x: p.x - size / 2, y: p.y - size / 2, width: size, height: size, viewBox: "0 0 24 24",
        className: "pm-icon",
      }, h("path", { d: ICONS[p.kind], fillRule: "evenodd" }))));
  });

  function MapView({ view, setView, onTap, children, labels }) {
    const svgRef = useRef(null);
    const ptrs = useRef(new Map());
    const drag = useRef({ moved: false, start: null, pinch: 0 });

    const toMap = (cx, cy) => {
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = cx; pt.y = cy;
      const m = svg.getScreenCTM().inverse();
      const q = pt.matrixTransform(m);
      return { x: q.x, y: q.y };
    };
    const zoomAt = useCallback((factor, cx, cy) => {
      setView((v) => {
        const w = Math.min(MAP_W, Math.max(240, v.w * factor));
        const k = w / v.w;
        return clampView({ w, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
    }, [setView]);

    useEffect(() => {
      const el = svgRef.current;
      const onWheel = (e) => {
        e.preventDefault();
        const p = toMap(e.clientX, e.clientY);
        zoomAt(e.deltaY < 0 ? 0.8 : 1.25, p.x, p.y);
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }, [zoomAt]);

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
      if (had && ptrs.current.size === 0 && !drag.current.moved && e.type === "pointerup") {
        const p = toMap(e.clientX, e.clientY);
        onTap(p);
      }
      if (ptrs.current.size === 1) drag.current = { moved: true, start: null, pinch: 0 };
    };

    const size = 34 * Math.sqrt(view.w / MAP_W) + 6;
    return h("div", { className: "pm-wrap" },
      h("svg", {
        ref: svgRef, className: "pm-svg", viewBox: `${view.x} ${view.y} ${view.w} ${view.w * MAP_H / MAP_W}`,
        onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp,
        role: "img", "aria-label": "Commonwealth map",
      },
        h(Terrain),
        h(Icons, { size }),
        children && children(size),
      ),
      h("div", { className: "pm-zoom" },
        h("button", { className: "sqbtn", "aria-label": labels.zin, onClick: () => zoomAt(0.7, view.x + view.w / 2, view.y + view.w * MAP_H / MAP_W / 2) }, "+"),
        h("button", { className: "sqbtn", "aria-label": labels.zout, onClick: () => zoomAt(1.4, view.x + view.w / 2, view.y + view.w * MAP_H / MAP_W / 2) }, "−"),
        h("button", { className: "sqbtn", "aria-label": labels.zreset, onClick: () => setView(FULL) }, "⌂"),
      ),
    );
  }

  function pickRounds() {
    const r = rng(Math.floor(Math.random() * 2 ** 31));
    const a = PLACES.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, ROUNDS);
  }

  function MapQuiz({ lang, onExit, store }) {
    const T = TEXT[lang] ?? TEXT.en;
    const [rounds, setRounds] = useState(pickRounds);
    const [i, setI] = useState(0);
    const [view, setView] = useState(FULL);
    const [pick, setPick] = useState(null);
    const [score, setScore] = useState({ ok: 0, xp: 0 });
    const [done, setDone] = useState(false);
    const t0 = useRef(Date.now());
    const target = rounds[i];

    function onTap(p) {
      if (pick) return;
      const d = Math.hypot(p.x - target.x, p.y - target.y);
      const ok = d <= HIT_RADIUS;
      const other = PLACES.filter((q) => q.id !== target.id)
        .map((q) => ({ q, d: Math.hypot(p.x - q.x, p.y - q.y) }))
        .filter((o) => o.d <= PICK_RADIUS).sort((a, b) => a.d - b.d)[0];
      sound(ok ? "right" : "wrong");
      const xp = store.answer(
        { id: "map:" + target.id, kind: "map", tipo: "luogo", livello: 2, giochi: ["fo4"] },
        ok, (Date.now() - t0.current) / 1000);
      setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), xp: s.xp + xp }));
      setPick({ ...p, d, ok, other: other?.q });
    }
    function next() {
      if (i + 1 >= rounds.length) { store.completeSession(); setDone(true); return; }
      setI(i + 1); setPick(null); setView(FULL); t0.current = Date.now();
    }
    function again() {
      setRounds(pickRounds()); setI(0); setPick(null); setView(FULL); setScore({ ok: 0, xp: 0 }); setDone(false);
      t0.current = Date.now();
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
      h("circle", { cx: target.x, cy: target.y, r: HIT_RADIUS, className: "pm-ring" }),
      h("circle", { cx: target.x, cy: target.y, r: size * 0.8, className: "pm-pulse" }),
      h("line", { x1: pick.x, y1: pick.y, x2: target.x, y2: target.y, className: "pm-line" }),
      h("path", {
        d: `M${pick.x - 9} ${pick.y - 9}L${pick.x + 9} ${pick.y + 9}M${pick.x + 9} ${pick.y - 9}L${pick.x - 9} ${pick.y + 9}`,
        className: "pm-x " + (pick.ok ? "ok" : "ko"),
      }),
      h("text", { x: target.x, y: target.y < 90 ? target.y + size * 1.5 : target.y - size * 0.95, textAnchor: "middle", className: "pm-label" }, target.name));

    return h("div", { className: "screen quiz" + (pick ? " answered" : "") },
      h("div", { className: "topbar" },
        h("button", { className: "link", onClick: onExit, "aria-label": T.close }, "✕"),
        h("span", { className: "muted" }, T.title),
        h("span", { className: "muted" }, i + 1, "/", rounds.length)),
      h("div", { className: "progressbar" }, h("div", { style: { width: `${(i / rounds.length) * 100}%` } })),
      h("p", { className: "tags" }, h("span", { className: "badge" }, T.kind), T.game),
      h("h2", { className: "question" }, T.find, ": ", h("span", { className: "pm-target" }, target.name)),
      h(MapView, { view, setView, onTap, labels: T }, overlay),
      !pick && h("p", { className: "muted center pm-hint" }, T.tapHint),
      pick && h("div", { className: "feedback " + (pick.ok ? "ok" : "ko") },
        h("strong", null, pick.ok ? T.correct : T.wrong),
        h("p", null, target.name, " — ", KIND_LABEL[lang]?.[target.kind] ?? KIND_LABEL.en[target.kind],
          ". ", target[lang] ?? target.en),
        !pick.ok && pick.other && h("p", { className: "muted" }, `${T.you}: ${pick.other.name}`),
        h("div", { className: "fb-actions" },
          h("button", { className: "btn primary", onClick: next }, i + 1 < rounds.length ? T.next : T.finish))));
  }

  return function MapTab() {
    const store = useStore();
    const { lang } = useI18n();
    const T = TEXT[lang] ?? TEXT.en;
    const [playing, setPlaying] = useState(false);
    if (playing) return h(MapQuiz, { lang, store, onExit: () => setPlaying(false) });
    return h("div", { className: "screen" },
      h("h2", { className: "title" }, T.title),
      h("div", { className: "pm-preview" }, h(PreviewMap)),
      h("div", { className: "pb-detail" },
        h("div", null, h("strong", null, "Commonwealth"), h("p", { className: "muted" }, T.sub, " · ", PLACES.length, " ", T.place)),
        h("button", { className: "btn primary", onClick: () => setPlaying(true) }, T.start)));
  };

  function PreviewMap() {
    return h("svg", { className: "pm-svg", viewBox: `0 0 ${MAP_W} ${MAP_H}`, "aria-hidden": "true" },
      h(Terrain), h(Icons, { size: 38 }));
  }
}
