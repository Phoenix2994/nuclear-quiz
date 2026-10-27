// Map quizzes for Fallout 3, New Vegas, 4 and 76 (plus the DLC maps).
//
// Modes: find the place (scored by distance), which place is this, discover the map (fog of war that lifts as you
// complete quiz missions, starting from the game's first vault, with health, stimpaks and caps carried along), explorer.
//
// Plain ES module (no build step). It is wired into the compiled bundle through createMapTab(), which receives the
// bundle's React, store hook, i18n hook, sound player and the app's quiz-session component.
// Maps, markers and coordinates come from data/maps.json (see tools/build_maps.py).

const SIZE = 1000; // maps are square; marker coordinates are in 0-1000 map units
const MIN_W = 80; // closest zoom, in map units
const PICK_PX = 26; // tapping this close (screen px) to a marker selects it
const ROUNDS = 10;
const MISSION_QUESTIONS = 3;
const MISSION_PASS = 3; // correct answers needed to discover a place (all of them)
const FRONTIER = 8; // at most this many undiscovered places are offered at once
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
    find: "Trova sulla mappa", tapHint: "Tocca la mappa per rispondere", kind: "DOVE?",
    which: "Che luogo è quello evidenziato?",
    kindPlace: "CHE LUOGO?",
    correct: "CORRETTO", wrong: "SBAGLIATO", next: "AVANTI", finish: "FINE", close: "Chiudi",
    you: "Hai toccato", pts: "pt", done: "SESSIONE COMPLETATA", answers: "risposte corrette",
    score: "punti", newRecord: "NUOVO RECORD", again: "GIOCA ANCORA", cont: "CONTINUA", wiki: "Wiki",
    loading: "CARICAMENTO MAPPA…", error: "Impossibile caricare le mappe.",
    zin: "Ingrandisci", zout: "Riduci", zreset: "Inquadra",
    found: "scoperti", mission: "MISSIONE", travel: "VIAGGIA", questions: "domande",
    unknown: "Luogo sconosciuto",
    discovered: "SCOPERTO", failed: "Missione fallita", retry: "Riprova con la stessa destinazione o scegline un'altra.",
    complete: "MAPPA COMPLETATA", restart: "RICOMINCIA", restartConfirm: "Vuoi cancellare i luoghi scoperti su questa mappa?",
    needsQuestions: "Nessuna domanda disponibile per questo gioco.",
    highlight: "Evidenzia", all: "Tutti", tapMarker: "Tocca un'icona per vedere il luogo.", fact: "CURIOSITÀ",
    cBlocks: "Una creatura ti sbarra la strada!", cLevel: "LV", cSpeed: { slow: "lenta", normal: "normale", fast: "veloce" }, cSpeedLabel: "Velocità",
    cFight: "COMBATTI", cFlee: "FUGGI", cFleeWhy: "La creatura è più veloce di te: non puoi seminarla.", cFleeChance: "probabilità di fuga",
    cAim: "Scegli dove colpire", cAp: "PA", cHp: "PS", cCrit: "CRITICO", cCritArmed: "CRITICO PRONTO", cExec: "ESEGUI", cUndo: "ANNULLA",
    cMiss: "MANCATO", cCrippled: "STORPIATO", cCreatureTurn: "La creatura attacca!", cHitYou: "ti colpisce", cMissYou: "ti manca",
    cWin: "CREATURA SCONFITTA", cWinSub: "Ora puoi esplorare il luogo: rispondi al quiz.", cLose: "SEI STATO SCONFITTO", cLoseSub: "Perdi parte dei tappi e torni all'ultimo insediamento.",
    cFled: "SEI FUGGITO", cFledSub: "Sei scappato dalla creatura.", cFleeFail: "Fuga fallita!", cShot: "colpo", cQueue: "In coda", cYouHit: "Colpito", cCont: "CONTINUA",
    cDmg: "Danno", cResist: "Resistenza ai danni", cWeak: "PUNTI DEBOLI E RESISTENZE", cEst: "* stimato: il wiki non riporta il valore", cEstWeak: "Punti deboli stimati dalla stessa specie in Fallout 76 (dati del gioco)",
    pickDest: "Tocca una destinazione per scegliere dove andare.",
    defeatNote: "Sconfitto da", fledNote: "Sei fuggito da", critHint: "Si carica a ogni colpo (più in fretta con la Fortuna): il colpo critico colpisce sempre e fa doppio danno.",
    aHp: "PS", aStim: "Stimpak", aCaps: "tappi", aAt: "Sei a", camp: "INSEDIAMENTO", campVault: "RIFUGIO",
    aRest: "RIPOSA", aRestFree: "gratis", aBuy: "COMPRA STIMPAK", aFast: "VIAGGIO RAPIDO", aFull: "PS al massimo",
    aGotCaps: "tappi", aGotStim: "Hai trovato uno stimpak", aLost: "tappi persi", aBack: "Ti risvegli a",
    aRested: "Hai riposato: PS al massimo.", aBought: "Stimpak acquistato.", aNoEncounter: "Il viaggio è tranquillo: nessuna creatura.",
    cStim: "STIMPAK", cHealed: "Stimpak: +",
    credit: "Mappe e posizioni: Fallout Wiki (CC BY-SA 3.0). Immagini di proprietà dei rispettivi titolari.",
    credit76: " Mappa di Fallout 76: Mappalachia.",
  },
  en: {
    places: "places", record: "best",
    mFind: "FIND THE PLACE", mFindSub: "Tap the right spot: the closer you are, the more points",
    mPlace: "WHICH PLACE IS THIS?", mPlaceSub: "Recognise the highlighted place",
    mDiscover: "DISCOVER THE MAP", mDiscoverSub: "Start at the vault and uncover the map with quizzes",
    mExplore: "EXPLORER", mExploreSub: "Browse the map freely",
    find: "Find on the map", tapHint: "Tap the map to answer", kind: "WHERE?",
    which: "Which place is highlighted?",
    kindPlace: "WHICH PLACE?",
    correct: "CORRECT", wrong: "WRONG", next: "NEXT", finish: "FINISH", close: "Close",
    you: "You tapped", pts: "pt", done: "SESSION COMPLETE", answers: "correct answers",
    score: "points", newRecord: "NEW BEST", again: "PLAY AGAIN", cont: "CONTINUE", wiki: "Wiki",
    loading: "LOADING MAP…", error: "Unable to load the maps.",
    zin: "Zoom in", zout: "Zoom out", zreset: "Frame",
    found: "discovered", mission: "MISSION", travel: "TRAVEL", questions: "questions",
    unknown: "Unknown place",
    discovered: "DISCOVERED", failed: "Mission failed", retry: "Try the same destination again or pick another.",
    complete: "MAP COMPLETE", restart: "START OVER", restartConfirm: "Clear the places discovered on this map?",
    needsQuestions: "No questions available for this game.",
    highlight: "Highlight", all: "All", tapMarker: "Tap an icon to see the place.", fact: "TRIVIA",
    cBlocks: "A creature blocks your way!", cLevel: "LV", cSpeed: { slow: "slow", normal: "normal", fast: "fast" }, cSpeedLabel: "Speed",
    cFight: "FIGHT", cFlee: "FLEE", cFleeWhy: "The creature is faster than you: you cannot outrun it.", cFleeChance: "chance to escape",
    cAim: "Choose where to hit", cAp: "AP", cHp: "HP", cCrit: "CRITICAL", cCritArmed: "CRITICAL READY", cExec: "EXECUTE", cUndo: "UNDO",
    cMiss: "MISS", cCrippled: "CRIPPLED", cCreatureTurn: "The creature attacks!", cHitYou: "hits you", cMissYou: "misses you",
    cWin: "CREATURE DEFEATED", cWinSub: "Now you can explore the place: answer the quiz.", cLose: "YOU WERE DEFEATED", cLoseSub: "You lose some caps and go back to the last settlement.",
    cFled: "YOU ESCAPED", cFledSub: "You got away from the creature.", cFleeFail: "Escape failed!", cShot: "shot", cQueue: "Queued", cYouHit: "Hit", cCont: "CONTINUE",
    cDmg: "Damage", cResist: "Damage resistance", cWeak: "WEAK POINTS AND RESISTANCES", cEst: "* estimated: the wiki gives no figure", cEstWeak: "Weak points estimated from the same species in Fallout 76 (game data)",
    pickDest: "Tap a destination to pick where to go.",
    defeatNote: "Defeated by", fledNote: "You escaped from", critHint: "It charges with every shot (faster with Luck): a critical shot always hits and does double damage.",
    aHp: "HP", aStim: "Stimpaks", aCaps: "caps", aAt: "You are at", camp: "SETTLEMENT", campVault: "SHELTER",
    aRest: "REST", aRestFree: "free", aBuy: "BUY STIMPAK", aFast: "FAST TRAVEL", aFull: "HP full",
    aGotCaps: "caps", aGotStim: "You found a stimpak", aLost: "caps lost", aBack: "You wake up at",
    aRested: "You rested: HP full.", aBought: "Stimpak bought.", aNoEncounter: "A quiet trip: no creature.",
    cStim: "STIMPAK", cHealed: "Stimpak: +",
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
  " Cult locations": "Covo di cultisti", "Industrial ": "Impianto industriale", Monorail: "Monorotaia",
};

const clean = (s) => s.trim();
// test hook: window.__PM = { rng, creature, level, fast, invincible } makes fights deterministic (see tools/smoke_combat.mjs)
const testHook = () => (typeof window !== "undefined" ? window.__PM ?? {} : {});
const rng = () => (testHook().rng ?? Math.random)();
const sleep = (ms) => new Promise((r) => setTimeout(r, testHook().fast ? 5 : ms));
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

// ---- own persistence (discovered places, best scores, adventure state per map). Not part of the app store: see HANDOFF.md.

function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    return { discovered: s.discovered ?? {}, best: s.best ?? {}, adv: s.adv ?? {} };
  } catch { return { discovered: {}, best: {}, adv: {} }; }
}
function saveSaved(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}


// ---- combat engine (pure functions, no DOM: unit-tested by tools/test_combat.mjs)
//
// Rules, modelled on V.A.T.S. (Fallout 3 / 4): pick a body part, see its hit chance (capped at 95%), spend action points
// per attack and queue several shots, hit a limb until its own health bar is empty to cripple it, a critical meter that
// fills with every shot (faster with Luck) and turns the next shot into a guaranteed critical hit.
// Creature figures (level, health, damage, damage resistance, body, weak points) come from its Fallout Wiki page
// (data/creatures.json, tools/build_creatures.py); a missing figure falls back to health 8 + 10 L and damage 3 + 2 L.
// A weak creature can die from one good shot (a head shot, or a critical); stronger ones need several shots and hit back.
const SPEED_VALUE = { slow: 3, normal: 5, fast: 8 };
const AP_COST = 2; // action points per shot
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// zones: box = [x, y, w, h] as fractions of the creature picture; acc = base hit chance; mult = damage multiplier;
// share = fraction of the creature's health that cripples the part (0 = cannot be crippled); effect of a crippled part:
// blind (head: the creature misses more), weak (arm/claw: it hits softer), slow (leg/wing: it is slower and easier to hit)
const Z = (key, it, en, acc, mult, share, effect, box) => ({ key, label: { it, en }, acc, mult, share, effect, box });
export const BODIES = {
  humanoid: [Z("head", "Testa", "Head", 45, 2, 0.25, "blind", [0.3, 0, 0.4, 0.17]), Z("torso", "Torso", "Torso", 80, 1, 0, null, [0.24, 0.19, 0.52, 0.33]),
    Z("armL", "Braccio sx", "Left arm", 55, 0.7, 0.3, "weak", [0, 0.19, 0.24, 0.4]), Z("armR", "Braccio dx", "Right arm", 55, 0.7, 0.3, "weak", [0.76, 0.19, 0.24, 0.4]),
    Z("legL", "Gamba sx", "Left leg", 60, 0.8, 0.35, "slow", [0.2, 0.55, 0.3, 0.45]), Z("legR", "Gamba dx", "Right leg", 60, 0.8, 0.35, "slow", [0.5, 0.55, 0.3, 0.45])],
  beast: [Z("head", "Testa", "Head", 45, 2, 0.25, "blind", [0, 0.05, 0.3, 0.5]), Z("torso", "Corpo", "Body", 80, 1, 0, null, [0.28, 0.1, 0.45, 0.5]),
    Z("fore", "Zampe ant.", "Forelegs", 60, 0.8, 0.35, "slow", [0.1, 0.58, 0.28, 0.42]), Z("hind", "Zampe post.", "Hindlegs", 60, 0.8, 0.35, "slow", [0.6, 0.52, 0.32, 0.48])],
  arthropod: [Z("head", "Testa", "Head", 45, 2, 0.25, "blind", [0, 0.2, 0.26, 0.55]), Z("torso", "Corpo", "Body", 80, 1, 0, null, [0.26, 0.15, 0.4, 0.65]),
    Z("tail", "Addome", "Abdomen", 60, 1.2, 0.3, "weak", [0.66, 0.15, 0.34, 0.65]), Z("legs", "Zampe", "Legs", 60, 0.8, 0.35, "slow", [0.05, 0.78, 0.9, 0.22])],
  flyer: [Z("head", "Testa", "Head", 45, 2, 0.25, "blind", [0.3, 0, 0.4, 0.2]), Z("torso", "Corpo", "Body", 80, 1, 0, null, [0.28, 0.2, 0.44, 0.55]),
    Z("wingL", "Ala sx", "Left wing", 50, 0.7, 0.3, "slow", [0, 0, 0.28, 0.45]), Z("wingR", "Ala dx", "Right wing", 50, 0.7, 0.3, "slow", [0.72, 0, 0.28, 0.45])],
  crab: [Z("head", "Testa", "Head", 45, 2, 0.25, "blind", [0.3, 0, 0.4, 0.22]), Z("torso", "Torso", "Torso", 80, 1, 0, null, [0.22, 0.22, 0.56, 0.35]),
    Z("clawL", "Chela sx", "Left claw", 55, 0.7, 0.3, "weak", [0, 0.25, 0.22, 0.45]), Z("clawR", "Chela dx", "Right claw", 55, 0.7, 0.3, "weak", [0.78, 0.25, 0.22, 0.45]),
    Z("legs", "Zampe", "Legs", 60, 0.8, 0.35, "slow", [0.22, 0.6, 0.56, 0.4])],
  blob: [Z("head", "Cima", "Top", 45, 2, 0.25, "blind", [0.25, 0, 0.5, 0.25]), Z("torso", "Corpo", "Body", 80, 1, 0, null, [0.15, 0.25, 0.7, 0.4]),
    Z("legs", "Tentacoli", "Tentacles", 60, 0.8, 0.35, "slow", [0.1, 0.65, 0.8, 0.35])],
};
// a wide "humanoid" picture (a crouching deathclaw) is laid out like a four-legged beast
export const bodyOf = (c) => (c.body in BODIES ? c.body : "humanoid"); // data/creatures.json already holds the template that fits the picture

export function playerFrom(progress, stats) {
  const lvl = stats?.level(progress) ?? 1, sp = (k) => stats?.special(progress, k) ?? 1;
  return { level: lvl, hpMax: 40 + 8 * sp("E") + 5 * lvl, apMax: 6 + 2 * sp("A"), cost: AP_COST, dmg: 6 + 2 * lvl + sp("S"), per: sp("P"), agi: sp("A"), lck: sp("L") };
}

// the V.A.T.S. zones of a creature: the template of its body type, plus the antennae when the wiki says crippling them
// sends the creature into a frenzy
const ANTENNAE = { arthropod: [0, 0, 0.35, 0.2], flyer: [0.3, 0, 0.4, 0.1] };
export function zonesFor(creature) {
  const body = bodyOf(creature);
  // the rectangles fitted to this creature's silhouette (tools/build_creatures.py) replace the template ones
  const zones = BODIES[body].map((z) => (creature.zones?.[z.key] ? { ...z, box: creature.zones[z.key] } : z));
  if (creature.antennae && ANTENNAE[body]) zones.push(Z("antennae", "Antenne", "Antennae", 35, 0.5, 0.2, "frenzy", creature.zones?.antennae ?? ANTENNAE[body]));
  return zones;
}
// weak points / resistances (final damage multipliers, backed by a wiki sentence) are stored by role: head, torso, arms, legs
// so they apply to any body template
const roleOf = (z) => (z.key === "head" ? "head" : z.key === "torso" ? "torso" : z.effect === "weak" ? "arms" : z.effect === "slow" ? "legs" : null);

// hp / stim: what the player brings from the map (the adventure); full health and no stimpaks when left out
export function newFight(creature, player, hp, stim = 0) {
  const level = creature.level;
  const hpMax = Math.min(600, creature.hp ?? 8 + 10 * level);
  const parts = zonesFor(creature).map((z) => {
    const role = roleOf(z), max = z.share ? Math.max(1, Math.round(z.share * hpMax)) : 0;
    return { ...z, mult: creature.weak?.[role] ?? z.mult, acc: z.acc + (creature.weakAcc?.[role] ?? 0), max, hp: max, crippled: false };
  });
  const dmg = Math.max(creature.dmg ?? 0, Math.round(2 + 1.5 * level)); // creatures that fight with weapons have a tiny melee figure
  return { c: { name: creature.name, level, hpMax, hp: hpMax, dmg, absorb: creature.absorb ?? 0, speed: creature.speed, parts },
    p: { ...player, hp: clamp(hp ?? player.hpMax, 1, player.hpMax), stim, ap: player.apMax, crit: 0 }, round: 1 };
}

const effects = (c) => ({
  blind: c.parts.some((p) => p.crippled && (p.effect === "blind" || p.effect === "frenzy")), // a frenzied creature fights blindly too
  weak: c.parts.filter((p) => p.crippled && p.effect === "weak").length,
  slow: c.parts.filter((p) => p.crippled && p.effect === "slow").length,
});
export const creatureSpeed = (c) => Math.max(1, SPEED_VALUE[c.speed] - 2 * effects(c).slow);
export const hitChance = (f, part) => {
  const evasion = Math.min(35, Math.round(1.5 * f.c.level)) + (f.c.speed === "fast" ? 6 : 0) - (effects(f.c).slow ? 6 : 0);
  return clamp(Math.round(part.acc + 3 * f.p.per - evasion), 5, 95);
};
export const critGain = (p) => 14 + 3 * p.lck; // meter points per shot, 100 = full
export const maxShots = (f) => Math.floor(f.p.apMax / f.p.cost);

// A shot always consumes two random numbers (hit roll, damage roll) so that scripted tests are predictable.
export function playerShot(f, partKey, crit, rnd) {
  const part = f.c.parts.find((x) => x.key === partKey);
  const chance = hitChance(f, part), hitRoll = rnd() * 100, dmgRoll = rnd();
  const hit = crit || hitRoll < chance;
  // armour absorbs a share of the damage, except from a critical hit (as in Fallout 4)
  const dmg = hit ? Math.max(1, Math.round(f.p.dmg * part.mult * (crit ? 2 : 1 - f.c.absorb) * (0.9 + dmgRoll * 0.2))) : 0;
  f.p.ap -= f.p.cost;
  f.p.crit = crit ? 0 : Math.min(100, f.p.crit + critGain(f.p));
  f.c.hp = Math.max(0, f.c.hp - dmg);
  let crippled = false;
  if (hit && part.max) {
    part.hp = Math.max(0, part.hp - dmg);
    if (part.hp === 0 && !part.crippled) { part.crippled = true; crippled = true; }
  }
  return { part: partKey, hit, dmg, crit, crippled, killed: f.c.hp === 0, chance };
}

// the creature acts after your queue: 2 strikes if it is fast, 1 otherwise
export function creatureTurn(f, rnd) {
  const e = effects(f.c), out = [];
  const strikes = f.c.speed === "fast" ? 2 : 1;
  for (let i = 0; i < strikes && f.p.hp > 0; i++) {
    const chance = clamp(72 - 3 * f.p.agi, 10, 95) * (e.blind ? 0.5 : 1), hitRoll = rnd() * 100, dmgRoll = rnd();
    const hit = hitRoll < chance;
    const dmg = hit ? Math.max(1, Math.round(f.c.dmg * (1 - 0.25 * Math.min(2, e.weak)) * (0.85 + dmgRoll * 0.3))) : 0;
    f.p.hp = Math.max(0, f.p.hp - dmg);
    out.push({ hit, dmg, chance: Math.round(chance) });
  }
  return out;
}

// fleeing is only possible if you are faster than the creature (its legs/wings crippled slow it down) or it is blind
export function fleeInfo(f) {
  const mine = 3 + f.p.agi, theirs = creatureSpeed(f.c), blind = effects(f.c).blind;
  const allowed = mine > theirs || blind;
  return { allowed, chance: blind ? 85 : clamp(60 + 10 * (mine - theirs), 20, 95), reason: allowed ? "" : "faster", mine, theirs };
}
export const tryFlee = (f, rnd) => rnd() * 100 < fleeInfo(f).chance;

// ---- adventure (discovery mode): health, stimpaks, caps and position carried from one mission to the next, saved per map.
// Pure functions on a plain state { hp, stim, caps, at, safe }: at = place you are in, safe = last settlement visited.
export const ADV = {
  stim: 2, maxStim: 10, caps: 20, capsPerPlace: 5, // start; capsPerPlace: for places discovered before the adventure existed
  encounter: 0.75, // chance that a creature blocks the way on a trip
  heal: 0.4, // a stimpak heals this share of max health, for the action points of one shot
  foundCaps: 10, stimFind: 0.25, // reward of a discovered place, chance of finding a stimpak there
  defeatLoss: 0.25, // share of the caps lost when defeated (you wake up at the last settlement with half health)
  rest: 10, stimPrice: 25, // settlement prices; resting in the starting vault is free
};
export const winCaps = (level, r) => Math.round((5 + 3 * level) * (0.8 + 0.4 * r));
export const newAdventure = (hpMax, start, discovered = 0) =>
  ({ hp: hpMax, stim: ADV.stim, caps: ADV.caps + ADV.capsPerPlace * discovered, at: start, safe: start });
// the result of a fight: hp and stim are what the player has left at the end of it
export function advAfterFight(a, { result, hp, stim, level }, hpMax, rnd) {
  if (result === "win") { const gain = winCaps(level, rnd()); return { a: { ...a, hp, stim, caps: a.caps + gain }, gain }; }
  if (result === "lose") {
    const loss = Math.floor(a.caps * ADV.defeatLoss);
    return { a: { ...a, hp: Math.ceil(hpMax / 2), stim, caps: a.caps - loss, at: a.safe }, loss };
  }
  return { a: { ...a, hp: Math.max(1, hp), stim } }; // fled or left the fight
}
export function advAfterDiscover(a, placeId, isSafe, rnd) {
  const stim = a.stim < ADV.maxStim && rnd() < ADV.stimFind ? 1 : 0;
  return { a: { ...a, caps: a.caps + ADV.foundCaps, stim: a.stim + stim, at: placeId, safe: isSafe ? placeId : a.safe }, caps: ADV.foundCaps, stim };
}
export const restCost = (a, start) => (a.at === start ? 0 : ADV.rest);
export const canRest = (a, hpMax, start) => a.hp < hpMax && a.caps >= restCost(a, start);
export const rest = (a, hpMax, start) => (canRest(a, hpMax, start) ? { ...a, hp: hpMax, caps: a.caps - restCost(a, start) } : a);
export const canBuy = (a) => a.caps >= ADV.stimPrice && a.stim < ADV.maxStim;
export const buyStim = (a) => (canBuy(a) ? { ...a, stim: a.stim + 1, caps: a.caps - ADV.stimPrice } : a);
export const fastTravel = (a, placeId) => ({ ...a, at: placeId, safe: placeId });
// a stimpak in a fight: heals at once and costs the action points of one shot
export function useStimpak(f) {
  const heal = Math.min(f.p.hpMax - f.p.hp, Math.round(ADV.heal * f.p.hpMax));
  f.p.hp += heal; f.p.stim -= 1; f.p.ap -= f.p.cost;
  return { heal };
}
// settlements: where you can rest, buy stimpaks and fast travel to (plus the starting vault)
const SAFE_CAT = /settlement|^\s*(city|cities|towns?|diamond city|goodneighbor|sanctuary hills)\s*$/i;
export const isSafePlace = (map, m) => Boolean(m) && (m.id === map.start || SAFE_CAT.test(m.cat));

// which creature meets you: the more of the map is discovered, the higher the level of the creatures that can show up
export function pickCreature(pool, discovered, rnd = Math.random, forced = {}) {
  const mapLevel = 1 + Math.floor(discovered / 3);
  const forcedCreature = forced.creature && pool.find((c) => c.name === forced.creature);
  pool = pool.filter((c) => !c.pending); // creatures whose weak points are not known yet never show up
  const eligible = pool.filter((c) => c.level <= mapLevel + 3);
  const recent = eligible.filter((c) => c.level >= mapLevel - 6); // no radroaches once the map is well explored
  const list = recent.length ? recent : eligible.length ? eligible : [...pool].sort((a, b) => a.level - b.level).slice(0, 3);
  const creature = forcedCreature ?? list[Math.floor(rnd() * list.length)];
  return { creature: forced.level ? { ...creature, level: forced.level } : creature };
}

export function createMapTab({ React, useStore, useI18n, sound, Quiz, stats }) {
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

  // The map image and its icons. In the discovery mode `reveal` = { undiscovered: markers still to discover }: their
  // icons are drawn again in another colour (the map itself is never altered).
  //  - FO4 has its icons baked in: a transparent "glyphs" layer (flat colour, built from the icon pixels) is drawn over
  //    the map, clipped to a square around each undiscovered marker
  //  - FO3 / FNV icons are filled plates: a copy of the map with its hue rotated, clipped to a square around the marker
  //  - the tinted DLC maps draw category glyphs: undiscovered markers use the recoloured set
  //  - FO76 is left as it is
  const Layers = React.memo(function Layers({ map, size, reveal }) {
    const icons = map.icons;
    const glyphs = Object.keys(icons).length > 0;
    const todo = reveal ? new Set(reveal.undiscovered.map((m) => m.id)) : null;
    return h("g", null,
      h("image", { href: map.image, x: 0, y: 0, width: SIZE, height: SIZE, className: "pm-bg" }),
      reveal && map.glyphs && h("g", null,
        h("defs", null, h("clipPath", { id: "pm-todo" }, reveal.undiscovered.map((m) => h("rect", {
          key: m.id, x: m.x - map.patch * 0.95, y: m.y - map.patch * 0.95, width: map.patch * 1.9, height: map.patch * 1.9,
        })))),
        h("image", { href: map.glyphs, x: 0, y: 0, width: SIZE, height: SIZE, clipPath: "url(#pm-todo)" })),
      reveal && map.hue && h("g", null,
        h("defs", null,
          h("filter", { id: "pm-hue" }, h("feColorMatrix", { type: "hueRotate", values: String(map.hue[0]) })),
          h("clipPath", { id: "pm-todo-hue" }, reveal.undiscovered.map((m) => h("rect", {
            key: m.id, x: m.x - map.hue[1], y: m.y - map.hue[1], width: map.hue[1] * 2, height: map.hue[1] * 2,
          })))),
        h("image", { href: map.image, x: 0, y: 0, width: SIZE, height: SIZE, filter: "url(#pm-hue)", clipPath: "url(#pm-todo-hue)" })),
      glyphs && h("g", { className: "pm-icons" }, map.markers.map((m) => {
        const src = todo?.has(m.id) ? map.icons_undisc[m.c] : icons[m.c];
        return src && h("image", { key: m.id, href: src, x: m.x - size / 2, y: m.y - size / 2, width: size, height: size });
      })));
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

  function MapView({ map, view, setView, onTap, children, labels, home, reveal, interactive = true }) {
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
      }, h(Layers, { map, size, reveal }), children && children(size)),
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

  // what we know about a place: its description (the opening of its wiki page, data/place-descriptions.json) and, when the
  // wiki has one, a curiosity (data/place-facts.json). `info` = { d: descriptions, f: curiosities }, both keyed by wiki page.
  function Fact({ facts: info, place, lang, T }) {
    const d = info?.d?.[place.page], f = info?.f?.[place.page];
    const desc = d && (d[lang] ?? (lang === "it" ? d.en : null)), text = f && (f[lang] ?? f.en);
    if (!desc && !text) return null;
    return h("div", { className: "pm-info" },
      desc ? h("p", { className: "pm-desc" }, desc) : null,
      text ? h("div", { className: "pm-fact" }, h("strong", null, T.fact), h("p", null, text)) : null);
  }

  const pseudoQuestion = (map, id) => ({ id: "map:" + id, kind: "map", tipo: "luogo", livello: 2, giochi: [map.group] });

  // ---- mode 1: find the place, scored by distance

  const pointsFor = (d, hit) => (d <= hit / 2 ? 100 : Math.max(0, Math.round(100 * (1 - (d - hit / 2) / (7.5 * hit)))));

  function pickRounds(map) {
    const byId = mapIndex(map);
    return shuffle(map.targets).slice(0, ROUNDS).map((id) => byId.get(id));
  }

  function FindQuiz({ mapKey, map, lang, onExit, store, saved, setSaved, facts }) {
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
        h(Fact, { facts, place: target, lang, T }),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl(target), target: "_blank", rel: "noreferrer" }, T.wiki, " ↗"),
          h("button", { className: "btn primary", onClick: next }, i + 1 < rounds.length ? T.next : T.finish))));
  }

  // ---- mode 2: multiple choice on the map ("which place")

  function buildChoice(map) {
    const byId = mapIndex(map);
    const pool = map.targets.map((id) => byId.get(id));
    return shuffle(pool).slice(0, ROUNDS).map((target) => {
      const near = pool.filter((m) => m.id !== target.id).sort((a, b) => dist(a, target) - dist(b, target));
      const same = near.filter((m) => m.cat === target.cat).slice(0, 6);
      const rest = near.slice(0, 12).filter((m) => !same.includes(m));
      const picks = shuffle([...shuffle(same).slice(0, 2), ...shuffle(rest)]).slice(0, 3);
      const options = shuffle([target, ...picks]).map((m) => clean(m.name));
      return { target, options, answer: options.indexOf(clean(target.name)) };
    });
  }

  function ChoiceQuiz({ map, lang, onExit, store, facts }) {
    const T = TEXT[lang] ?? TEXT.en;
    const frame = (t) => viewAround([t], 130, 60);
    const [rounds, setRounds] = useState(() => buildChoice(map));
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
      const r = buildChoice(map);
      setRounds(r); setI(0); setView(frame(r[0].target)); setChosen(null); setScore({ ok: 0, xp: 0 }); setDone(false);
      t0.current = Date.now();
    }

    if (done) {
      return h(Summary, { T, top: `${score.ok}/${rounds.length}`, sub: T.answers, xp: score.xp, onAgain: again, onExit });
    }
    const answered = chosen !== null;
    const overlay = (size) => h("g", { className: "pm-result" },
      h("circle", {
        cx: q.target.x, cy: q.target.y, r: size * 0.9,
        className: answered ? "pm-ring" : "pm-ring pm-ring-q",
      }),
      !answered && h("circle", { cx: q.target.x, cy: q.target.y, r: size * 0.8, className: "pm-pulse" }),
      answered && h(Label, { target: q.target, map: { hit: size * 0.9 }, view }));
    return h("div", { className: "screen quiz" + (answered ? " answered" : "") },
      h(Header, { title: map.label, i, n: rounds.length, onExit, T }),
      h("p", { className: "tags" }, h("span", { className: "badge" }, T.kindPlace), map.label),
      h("h2", { className: "question" }, T.which),
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
        h(Fact, { facts, place: q.target, lang, T }),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl(q.target), target: "_blank", rel: "noreferrer" }, T.wiki, " ↗"),
          h("button", { className: "btn primary", onClick: next }, i + 1 < rounds.length ? T.next : T.finish))));
  }

  // ---- mode 3: discover the map

  // the places you can travel to: undiscovered targets inside the cleared area around what you already know
  // (the nearest one if none is that close), nearest first
  function frontierOf(map, byId, found, reach) {
    const reached = [...found].map((id) => byId.get(id)).filter(Boolean);
    const rest = map.targets.filter((id) => !found.has(id)).map((id) => {
      const m = byId.get(id);
      return { m, d: Math.min(...reached.map((r) => dist(r, m))) };
    }).sort((a, b) => a.d - b.d);
    const near = rest.filter((o) => o.d <= reach);
    return (near.length ? near : rest.slice(0, 1)).slice(0, FRONTIER).map((o) => o.m);
  }

  // Difficulty grows with the discovered share of the map: the first missions only ask easy questions (level 1), the middle ones
  // easy and medium, the last ones everything. Within the allowed levels the questions you have not seen come first.
  const missionLevel = (share) => (share < 0.15 ? 1 : share < 0.5 ? 2 : 3);
  function pickMissionQuestions(store, map, share) {
    const seen = new Set(store.progress.seen);
    const base = store.questions.filter((q) => q.giochi.includes(map.group) && q.kind !== "game");
    const maxLevel = missionLevel(share);
    const pick = (list) => {
      const fresh = shuffle(list.filter((q) => !seen.has(q.id)));
      return [...fresh, ...shuffle(list.filter((q) => seen.has(q.id)))];
    };
    const easy = pick(base.filter((q) => q.livello <= maxLevel));
    // too few questions at this level (a small game): top up with the next levels, never with harder ones first
    const rest = pick(base.filter((q) => q.livello > maxLevel)).sort((x, y) => x.livello - y.livello);
    return [...easy, ...rest].slice(0, MISSION_QUESTIONS);
  }

  // ---- the fight: creature appears, fight or flee, V.A.T.S.-style aiming, then the result

  const copy = (x) => JSON.parse(JSON.stringify(x));
  const playerOf = (store) => {
    const p = playerFrom(store.progress, stats);
    return testHook().invincible ? { ...p, hpMax: 99999 } : p; // test hook only
  };

  // the part's rectangle as a soft-edged mask (two gradients intersected), so the glow fades out instead of ending on a straight cut
  function featherMask(x, y, w, hh) {
    const F = 6, pc = (v) => `${(v * 100).toFixed(1)}%`;
    const band = (dir, a, b) => `linear-gradient(${dir}, transparent calc(${pc(a)} - ${F}%), #000 ${pc(a)}, #000 ${pc(b)}, transparent calc(${pc(b)} + ${F}%))`;
    const mask = `${band("to right", x, x + w)}, ${band("to bottom", y, y + hh)}`;
    return { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" };
  }

  // place the V.A.T.S. labels on the side of their body part, nearest first, without overlapping (fractions of the picture height)
  function layoutLabels(parts) {
    const GAP = 0.2;
    const items = parts.map((part) => ({ part, cx: part.box[0] + part.box[2] / 2, cy: part.box[1] + part.box[3] / 2 }));
    const count = { L: 0, R: 0 };
    for (const it of [...items].sort((a, b) => Math.abs(b.cx - 0.5) - Math.abs(a.cx - 0.5))) {
      it.side = it.cx < 0.45 ? "L" : it.cx > 0.55 ? "R" : count.L <= count.R ? "L" : "R";
      count[it.side]++;
    }
    for (const side of ["L", "R"]) {
      const col = items.filter((it) => it.side === side).sort((a, b) => a.cy - b.cy);
      let y = -Infinity;
      for (const it of col) { it.ly = Math.max(it.cy, y + GAP); y = it.ly; }
      const over = y - 0.95; // pushed past the bottom: slide the whole column up
      if (over > 0) col.forEach((it) => { it.ly -= over; });
    }
    return items;
  }

  // hp / stim: what the player brings from the map; onResult(result, { hp, stim }) gives back what is left
  function Encounter({ creature, lang, store, onResult, hp, stim }) {
    const T = TEXT[lang] ?? TEXT.en;
    const player = useMemo(() => playerOf(store), []);
    const [f, setF] = useState(() => newFight(creature, player, testHook().invincible ? undefined : hp, stim));
    const done = (result) => onResult(result, { hp: f.p.hp, stim: f.p.stim });
    const level = creature.level;
    const [phase, setPhase] = useState("intro"); // intro | aim | exec | win | lose | fled
    const [queue, setQueue] = useState([]); // [{ part, crit }]
    const [armed, setArmed] = useState(false);
    const [focus, setFocus] = useState(null);
    const [flash, setFlash] = useState(null);
    const [hurt, setHurt] = useState(null);
    const [lines, setLines] = useState([]);
    const alive = useRef(true);
    useEffect(() => () => { alive.current = false; }, []);
    const say = (t) => setLines((l) => [...l.slice(-3), t]);

    const critReady = f.p.crit >= 100 && !queue.some((q) => q.crit);
    const apLeft = f.p.ap - queue.length * f.p.cost;
    const info = fleeInfo(f);
    const speedNow = creatureSpeed(f.c);
    const stimQueued = queue.filter((q) => q.stim).length;
    const canStim = phase === "aim" && apLeft >= f.p.cost && stimQueued < f.p.stim && f.p.hp < f.p.hpMax;
    const predicted = queue.reduce((sum, q) => {
      if (q.stim) return sum;
      const part = f.c.parts.find((x) => x.key === q.part);
      return sum + Math.round(f.p.dmg * part.mult * (q.crit ? 2 : 1 - f.c.absorb));
    }, 0);

    function add(partKey) {
      if (phase !== "aim" || apLeft < f.p.cost) return;
      const crit = armed && critReady;
      setQueue((q) => [...q, { part: partKey, crit }]);
      if (crit) setArmed(false);
    }
    function addStim() { if (canStim) setQueue((q) => [...q, { stim: true }]); }
    function undo() { setQueue((q) => { const last = q[q.length - 1]; if (last?.crit) setArmed(true); return q.slice(0, -1); }); }

    async function creatureAttacks(st) {
      say(T.cCreatureTurn);
      for (const strike of creatureTurn(st, rng)) {
        setF(copy(st)); setHurt(strike);
        say(strike.hit ? `${st.c.name} ${T.cHitYou}: -${strike.dmg}` : `${st.c.name} ${T.cMissYou}`);
        await sleep(650);
        if (!alive.current) return false;
        setHurt(null);
      }
      return true;
    }

    async function execute() {
      const st = copy(f), shots = queue;
      setPhase("exec"); setQueue([]); setArmed(false);
      for (const shot of shots) {
        if (shot.stim) {
          const { heal } = useStimpak(st);
          setF(copy(st)); say(`${T.cHealed}${heal} ${T.cHp}`);
          await sleep(600);
          if (!alive.current) return;
          continue;
        }
        const r = playerShot(st, shot.part, shot.crit, rng);
        setF(copy(st)); setFlash(r);
        const label = st.c.parts.find((x) => x.key === shot.part).label[lang] ?? "";
        say(r.hit ? `${label}: -${r.dmg}${r.crit ? " (" + T.cCrit + ")" : ""}${r.crippled ? " · " + T.cCrippled : ""}` : `${label}: ${T.cMiss}`);
        await sleep(750);
        if (!alive.current) return;
        setFlash(null);
        if (r.killed) break;
      }
      if (st.c.hp <= 0) { setPhase("win"); return; }
      if (!(await creatureAttacks(st))) return;
      if (st.p.hp <= 0) { setPhase("lose"); return; }
      st.p.ap = st.p.apMax; st.round += 1;
      setF(copy(st)); setPhase("aim");
    }

    async function flee() {
      if (!info.allowed || phase !== "aim" && phase !== "intro") return;
      const st = copy(f);
      if (tryFlee(st, rng)) { setPhase("fled"); return; }
      setPhase("exec"); say(T.cFleeFail);
      if (!(await creatureAttacks(st))) return;
      if (st.p.hp <= 0) { setPhase("lose"); return; }
      setF(copy(st)); setPhase("aim");
    }

    const hpPct = (v, max) => `${Math.max(0, Math.round((v / max) * 100))}%`;
    const bar = (cls, v, max, extra) => h("div", { className: "vats-bar " + cls }, h("span", { style: { width: hpPct(v, max) } }), extra);

    const ar = creature.w / creature.h;
    // V.A.T.S. look: the targeted body part lights up following the creature's silhouette (a copy of the picture clipped to the
    // part's rectangle: the transparent background keeps only the creature's pixels), labels sit on the sides with leader lines
    const focusKey = focus && f.c.parts.some((x) => x.key === focus) ? focus : "torso";
    const placed = layoutLabels(f.c.parts);
    const pick = (key) => { setFocus(key); add(key); };
    const canShoot = phase === "aim" && apLeft >= f.p.cost;
    const glows = f.c.parts.map((part) => {
      const [x, y, w, hh] = part.box;
      const queued = queue.some((q) => q.part === part.key);
      const fl = flash && flash.part === part.key ? flash : null;
      const cls = fl ? (fl.hit ? " flash" : " missed") : part.key === focusKey ? " on" : queued ? " queued" : part.crippled ? " crippled" : "";
      return h("div", { key: part.key, className: "vats-glow" + cls },
        h("img", { src: creature.img, alt: "", draggable: false, style: featherMask(x, y, w, hh) }));
    });
    // invisible hit areas over the body, smallest on top so a limb wins over the torso it overlaps
    const hits = [...f.c.parts].sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]).map((part) => {
      const [x, y, w, hh] = part.box;
      return h("button", {
        key: part.key, className: "vats-hit", disabled: !canShoot, tabIndex: -1, "aria-hidden": "true",
        style: { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${hh * 100}%` },
        onClick: () => pick(part.key), onMouseEnter: () => setFocus(part.key),
      });
    });
    const leaders = h("svg", { className: "vats-lines", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" },
      placed.map(({ part, side, ly }) => {
        const [x, y, w, hh] = part.box;
        return h("polyline", {
          key: part.key, className: part.key === focusKey ? "on" : "",
          points: `${side === "L" ? -3 : 103},${ly * 100} ${side === "L" ? 2 : 98},${ly * 100} ${(x + w / 2) * 100},${(y + hh / 2) * 100}`,
        });
      }));
    const labels = placed.map(({ part, side, ly }) => {
      const hit = hitChance(f, part);
      const queued = queue.filter((q) => q.part === part.key).length;
      const fl = flash && flash.part === part.key ? flash : null;
      return h("button", {
        key: part.key, disabled: !canShoot,
        className: `vats-zone ${side}` + (part.key === focusKey ? " on" : "") + (part.crippled ? " crippled" : "") + (queued ? " queued" : ""),
        style: { top: `${ly * 100}%` },
        onClick: () => pick(part.key), onMouseEnter: () => setFocus(part.key), "aria-label": `${part.label[lang]} ${hit}%`,
      },
        h("small", null, part.label[lang]),
        h("b", null, part.crippled ? "✕" : `${hit}%`, h("i", null, ` ×${Math.round(part.mult * 100) / 100}`)),
        part.max ? h("span", { className: "vats-limb" }, h("span", { style: { width: hpPct(part.hp, part.max) } })) : null,
        queued ? h("em", null, queued) : null,
        fl ? h("u", { className: "vats-dmg" }, fl.hit ? `-${fl.dmg}` : T.cMiss) : null);
    });

    const aiming = phase !== "intro" && phase !== "win" && phase !== "lose" && phase !== "fled";
    const stage = h("div", { className: "vats-stage" + (aiming ? " aiming" : ""), key: aiming ? "aim" : "still" },
      h("div", { className: "vats-pic" + (hurt?.hit ? " struck" : ""), style: { "--ar": ar } },
        h("img", { className: "vats-base", src: creature.img, alt: creature.name, draggable: false }),
        aiming ? [h("div", { key: "g", className: "vats-glows" }, glows), h("div", { key: "h", className: "vats-hits" }, hits), leaders, ...labels] : null));

    const header = h("div", { className: "vats-head" },
      h("div", null, h("strong", null, creature.name), h("span", { className: "vats-lv" }, ` ${T.cLevel} ${level}`)),
      h("span", { className: "muted" }, `${T.cSpeedLabel}: ${T.cSpeed[speedNow < SPEED_VALUE.normal ? (speedNow <= 3 ? "slow" : "normal") : f.c.speed === "fast" ? "fast" : "normal"]}`));

    if (phase === "win" || phase === "lose" || phase === "fled") {
      const kind = { win: ["cWin", "cWinSub", "ok"], lose: ["cLose", "cLoseSub", "ko"], fled: ["cFled", "cFledSub", "ok"] }[phase];
      return h("div", { className: "screen quiz vats" },
        h("div", { className: "topbar" }, h("span", { className: "muted" }, T.cBlocks)),
        header, stage,
        h("div", { className: "feedback " + kind[2] }, h("strong", null, T[kind[0]]), h("p", null, T[kind[1]]),
          h("button", { className: "btn primary", onClick: () => done(phase === "win" ? "win" : phase === "lose" ? "lose" : "flee") }, T.cCont)));
    }

    const meter = h("div", { className: "vats-meter" },
      h("span", { className: "muted" }, T.cCrit),
      h("div", { className: "vats-bar crit" + (f.p.crit >= 100 ? " full" : "") }, h("span", { style: { width: `${Math.min(100, f.p.crit)}%` } })),
      h("button", {
        className: "btn vats-critbtn" + (armed ? " on" : ""), disabled: !critReady || phase !== "aim", title: T.critHint,
        onClick: () => setArmed((a) => !a),
      }, armed ? T.cCritArmed : T.cCrit));

    if (phase === "intro") {
      return h("div", { className: "screen quiz vats" },
        h("div", { className: "topbar" },
          h("button", { className: "link", onClick: () => done("abort"), "aria-label": T.close }, "✕"),
          h("span", { className: "muted" }, T.cBlocks), h("span", null)),
        header, stage,
        h("div", { className: "vats-hp" }, bar("enemy", f.c.hp, f.c.hpMax), h("em", null, `${f.c.hp}/${f.c.hpMax}${creature.derived?.includes("hp") ? "*" : ""}`)),
        h("div", { className: "vats-stats" },
          h("span", null, `${T.cDmg}: ${f.c.dmg}${creature.derived?.includes("dmg") ? "*" : ""}`),
          f.c.absorb > 0 && h("span", null, `${T.cResist}: ${Math.round(f.c.absorb * 100)}%`)),
        h("div", { className: "vats-me" }, h("span", { className: "muted" }, T.cHp), bar("me", f.p.hp, f.p.hpMax), h("em", null, `${f.p.hp}/${f.p.hpMax}`)),
        creature.notes?.length ? h("div", { className: "pm-fact vats-notes" }, h("strong", null, T.cWeak),
          creature.notes.map((n, i) => h("p", { key: i }, n[lang] ?? n.en))) : null,
        creature.derived?.some((x) => x === "hp" || x === "dmg") && h("p", { className: "muted vats-est" }, T.cEst),
        creature.derived?.includes("weak") && h("p", { className: "muted vats-est" }, T.cEstWeak),
        h("div", { className: "vats-choice" },
          h("button", { className: "btn primary", "data-act": "fight", onClick: () => { setPhase("aim"); say(T.cAim); } }, "⚔ ", T.cFight),
          h("button", { className: "btn", "data-act": "flee", disabled: !info.allowed, onClick: flee }, "➜ ", T.cFlee)),
        h("p", { className: "muted center pm-hint" }, info.allowed ? `${T.cFleeChance}: ${info.chance}%` : T.cFleeWhy));
    }

    return h("div", { className: "screen quiz vats" + (hurt ? " hurt" : "") },
      h("div", { className: "topbar" },
        h("button", { className: "link", onClick: () => done("abort"), "aria-label": T.close }, "✕"),
        h("span", { className: "muted" }, T.cAim), h("span", { className: "muted" }, `#${f.round}`)),
      header,
      h("div", { className: "vats-hp" }, bar("enemy", f.c.hp, f.c.hpMax,
        predicted ? h("span", { className: "vats-pred", style: { width: hpPct(Math.min(predicted, f.c.hp), f.c.hpMax), left: hpPct(f.c.hp - Math.min(predicted, f.c.hp), f.c.hpMax) } }) : null),
      h("em", null, `${f.c.hp}/${f.c.hpMax}`)),
      stage,
      h("div", { className: "vats-ap" },
        h("span", { className: "muted" }, T.cAp),
        h("div", { className: "vats-pips" }, Array.from({ length: maxShots(f) }, (_, i) =>
          h("i", { key: i, className: i < queue.length ? "used" : i < f.p.ap / f.p.cost ? "free" : "spent" }))),
        h("span", null, `${Math.max(0, apLeft)}/${f.p.apMax}`)),
      meter,
      h("div", { className: "vats-me" }, h("span", { className: "muted" }, T.cHp), bar("me", f.p.hp, f.p.hpMax), h("em", null, `${f.p.hp}/${f.p.hpMax}`)),
      h("div", { className: "vats-actions" },
        h("button", { className: "btn", disabled: phase !== "aim" || !queue.length, onClick: undo }, T.cUndo),
        h("button", { className: "btn primary", "data-act": "exec", disabled: phase !== "aim" || !queue.length, onClick: execute }, "▶ ", T.cExec, queue.length ? ` (${queue.length})` : ""),
        h("button", { className: "btn", "data-act": "flee", disabled: phase !== "aim" || !info.allowed, onClick: flee, title: info.allowed ? "" : T.cFleeWhy }, T.cFlee)),
        h("button", { className: "btn vats-stim", "data-act": "stim", disabled: !canStim, onClick: addStim },
          "+ ", T.cStim, ` (${f.p.stim - stimQueued})`, stimQueued ? h("em", null, ` · ${T.cQueue} ${stimQueued}`) : null),
      h("div", { className: "vats-log" }, lines.map((l, i) => h("p", { key: i, className: "muted" }, l))));
  }

  function Discover({ mapKey, map, lang, onExit, store, saved, setSaved, facts, creatures }) {
    const T = TEXT[lang] ?? TEXT.en;
    const byId = useMemo(() => mapIndex(map), [map]);
    const radius = map.hit > 30 ? 130 : 105;
    const [found, setFound] = useState(() => new Set([map.start, ...(saved.discovered[mapKey] ?? [])]));
    const frontier = useMemo(() => frontierOf(map, byId, found, radius * 0.85), [map, byId, found, radius]);
    const [sel, setSel] = useState(null);
    const [note, setNote] = useState(null); // { kind: "found" | "failed" | "noq" | "defeat" | "fled" | "msg", ... }
    const [mission, setMission] = useState(null);
    const frame = useCallback((f, fr) => viewAround([...f].map((id) => byId.get(id)).concat(fr), radius * 0.6, 260), [byId, radius]);
    const [view, setView] = useState(() => frame(found, frontier));
    // the adventure: health, stimpaks, caps and position, kept between missions (max health follows the app's level / SPECIAL)
    const hpMax = useMemo(() => playerOf(store).hpMax, []);
    const [adv, setAdv] = useState(() => {
      const a = saved.adv?.[mapKey];
      return a && byId.has(a.at) ? { ...a, hp: Math.min(a.hp, hpMax) } : newAdventure(hpMax, map.start, (saved.discovered[mapKey] ?? []).length);
    });
    const total = map.targets.length;
    const foundTargets = map.targets.filter((id) => found.has(id)).length;
    const complete = foundTargets >= total;
    const selected = sel && frontier.find((m) => m.id === sel);
    const camps = useMemo(() => [...found].map((id) => byId.get(id)).filter((m) => isSafePlace(map, m)), [map, byId, found]);
    const here = byId.get(adv.at);
    const camp = selected ? null : camps.find((m) => m.id === sel) ?? (isSafePlace(map, here) ? here : null);
    const recolored = Boolean(map.glyphs || map.hue || Object.keys(map.icons).length);
    // places still to discover keep their icon, in another colour
    const reveal = useMemo(() => (foundTargets >= total ? undefined
      : { undiscovered: map.targets.filter((id) => !found.has(id)).map((id) => byId.get(id)) }),
    [map, byId, found, foundTargets, total]);

    function persist(f, a) {
      setSaved((s) => {
        const n = { ...s, discovered: { ...s.discovered, [mapKey]: [...f].filter((id) => id !== map.start) }, adv: { ...s.adv, [mapKey]: a } };
        saveSaved(n);
        return n;
      });
    }
    const update = (a) => { setAdv(a); persist(found, a); };
    function onTap(p, upp) {
      const near = (list) => list.map((m) => ({ m, d: dist(p, m) })).filter((o) => o.d <= PICK_PX * upp).sort((a, b) => a.d - b.d)[0];
      const hit = near(frontier) ?? near(camps); // a destination, or a settlement already discovered (fast travel)
      if (hit) { setSel(hit.m.id); setNote(null); }
    }
    function travel() {
      const qs = pickMissionQuestions(store, map, foundTargets / total);
      if (!qs.length) { setNote({ kind: "noq" }); return; }
      const pool = creatures?.[map.group]; // pickCreature leaves out the creatures whose weak points are not known yet
      const hook = testHook();
      const meets = hook.encounter ?? (hook.creature ? true : Math.random() < ADV.encounter);
      if (!pool?.some((c) => !c.pending)) { setMission({ stage: "quiz", target: selected, qs }); return; } // no creature data: quiz only
      if (!meets) { setMission({ stage: "quiz", target: selected, qs, quiet: true }); return; }
      setMission({ stage: "fight", target: selected, qs, ...pickCreature(pool, foundTargets, rng, testHook()) });
    }
    function fightDone(result, left) {
      const m = mission;
      const r = advAfterFight(adv, { result, ...left, level: m.creature.level }, hpMax, Math.random);
      update(r.a);
      if (result === "win") { setMission({ ...m, stage: "quiz", gain: r.gain }); return; }
      setMission(null);
      if (result === "lose") { setSel(null); setNote({ kind: "defeat", name: m.creature.name, loss: r.loss, back: byId.get(r.a.at) }); }
      else if (result === "flee") setNote({ kind: "fled", name: m.creature.name });
    }
    function missionDone({ correct, total: tot }) {
      const { target, gain = 0, quiet } = mission;
      setMission(null);
      if (correct >= Math.min(MISSION_PASS, tot)) {
        const f = new Set(found).add(target.id);
        const r = advAfterDiscover(adv, target.id, isSafePlace(map, target), Math.random);
        sound("caps");
        setFound(f); setAdv(r.a); persist(f, r.a); setSel(null);
        setNote({ kind: "found", m: target, caps: r.caps + gain, stim: r.stim, quiet });
        setView(frame(f, frontierOf(map, byId, f, radius * 0.85)));
      } else {
        setNote({ kind: "failed", correct, total: tot, gain, quiet });
      }
    }
    function restart() {
      if (typeof window !== "undefined" && !window.confirm(T.restartConfirm)) return;
      const f = new Set([map.start]), a = newAdventure(hpMax, map.start);
      setFound(f); setAdv(a); persist(f, a); setSel(null); setNote(null);
      setView(frame(f, frontierOf(map, byId, f, radius * 0.85)));
    }

    if (mission?.stage === "fight") {
      return h(Encounter, { key: mission.target.id, creature: mission.creature, lang, store, onResult: fightDone, hp: adv.hp, stim: adv.stim });
    }
    if (mission) {
      return h(Quiz, {
        title: `${map.label} · ${T.mission}`, questions: mission.qs, onExit: () => setMission(null), onFinish: missionDone,
      });
    }

    const overlay = (size) => h("g", null,
      h(Fog, { points: [...found].map((id) => byId.get(id)), radius }),
      // Where the icons to discover are already recoloured (FO3, FNV, FO4, DLC maps) the icon itself is the marker and only
      // the selected one gets a ring. FO76 icons are not recoloured: there every place you can travel to gets the classic
      // empty map marker (the Fallout wiki's "FOx map circle"), a green ring.
      frontier.filter((m) => !recolored || m.id === sel).map((m) => h("g", { key: m.id, className: "pm-frontier" + (m.id === sel ? " on" : "") },
        h("circle", {
          cx: m.x, cy: m.y, r: map.patch > 5 ? map.patch * 0.78 : size * 0.62, className: "pm-fr-box", style: { strokeWidth: size * 0.075 },
        }))),
      // settlements you can fast travel to: a small square under the icon; you: a pin above the place you are in
      camps.map((m) => h("rect", {
        key: "c" + m.id, className: "pm-camp-mark" + (m.id === sel ? " on" : ""), x: m.x - size * 0.75, y: m.y - size * 0.75,
        width: size * 1.5, height: size * 1.5, style: { strokeWidth: size * 0.08 },
      })),
      here && h("path", {
        className: "pm-you", d: `M${here.x} ${here.y - size * 0.8} l${-size * 0.45} ${-size * 0.8} h${size * 0.9} z`, style: { strokeWidth: size * 0.08 },
      }),
      note?.kind === "found" && h("g", { className: "pm-result" },
        h("circle", { cx: note.m.x, cy: note.m.y, r: size * 0.8, className: "pm-pulse" }),
        h(Label, { target: note.m, map: { hit: size * 0.9 }, view })));

    const pct = `${Math.max(0, Math.round((adv.hp / hpMax) * 100))}%`;
    const hud = h("div", { className: "pm-hud" },
      h("span", { className: "muted" }, T.aHp),
      h("div", { className: "vats-bar me" }, h("span", { style: { width: pct } })),
      h("em", null, `${adv.hp}/${hpMax}`),
      h("span", { className: "pm-hud-item", "data-stim": adv.stim }, `${T.aStim} ${adv.stim}`),
      h("span", { className: "pm-hud-item", "data-caps": adv.caps }, `${adv.caps} ${T.aCaps}`));
    const quietLine = (n) => n.quiet && h("p", { className: "muted" }, T.aNoEncounter);
    const campPanel = camp && h("div", { className: "pm-camp" },
      h("div", null,
        h("strong", null, camp.id === map.start ? T.campVault : T.camp, ": ", clean(camp.name)),
        camp.id === adv.at && adv.hp >= hpMax && h("p", { className: "muted" }, T.aFull)),
      camp.id === adv.at
        ? h("div", { className: "fb-actions" },
          h("button", { className: "btn", "data-act": "rest", disabled: !canRest(adv, hpMax, map.start), onClick: () => { update(rest(adv, hpMax, map.start)); setNote({ kind: "msg", text: T.aRested }); } },
            T.aRest, " · ", restCost(adv, map.start) ? `${restCost(adv, map.start)} ${T.aCaps}` : T.aRestFree),
          h("button", { className: "btn", "data-act": "buy", disabled: !canBuy(adv), onClick: () => { update(buyStim(adv)); setNote({ kind: "msg", text: T.aBought }); } },
            T.aBuy, " · ", `${ADV.stimPrice} ${T.aCaps}`))
        : h("button", { className: "btn primary", "data-act": "fast", onClick: () => { update(fastTravel(adv, camp.id)); setSel(null); setNote(null); } }, "➜ ", T.aFast));

    return h("div", { className: "screen quiz" },
      h(Header, { title: map.label, i: 0, n: 0, onExit, T }),
      h("div", { className: "progressbar" }, h("div", { style: { width: `${(foundTargets / total) * 100}%` } })),
      h("p", { className: "tags" }, h("span", { className: "badge" }, T.mDiscover), `${foundTargets}/${total} ${T.found}`),
      hud,
      h(MapView, { map, view, setView, onTap, labels: T, home: frame(found, frontier), reveal }, overlay),
      here && h("p", { className: "muted pm-at" }, T.aAt, " ", clean(here.name)),
      complete && h("div", { className: "feedback ok" }, h("strong", null, T.complete)),
      !complete && !selected && !note && h("p", { className: "muted center pm-hint" }, T.pickDest),
      note?.kind === "found" && h("div", { className: "feedback ok" },
        h("strong", null, T.discovered, ": ", clean(note.m.name)),
        typeOf(map, lang, note.m) && h("p", null, typeOf(map, lang, note.m)),
        quietLine(note),
        h("p", { className: "pm-gain" }, `+${note.caps} ${T.aGotCaps}`, note.stim ? ` · ${T.aGotStim}` : ""),
        h(Fact, { facts, place: note.m, lang, T }),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl(note.m), target: "_blank", rel: "noreferrer" }, T.wiki, " ↗"))),
      note?.kind === "failed" && h("div", { className: "feedback ko" },
        h("strong", null, T.failed, ` (${note.correct}/${note.total})`), quietLine(note),
        note.gain > 0 && h("p", { className: "pm-gain" }, `+${note.gain} ${T.aGotCaps}`), h("p", null, T.retry)),
      note?.kind === "noq" && h("div", { className: "feedback ko" }, h("p", null, T.needsQuestions)),
      note?.kind === "defeat" && h("div", { className: "feedback ko" }, h("strong", null, `${T.defeatNote} ${note.name}`),
        h("p", null, `-${note.loss} ${T.aCaps}`, note.back ? ` · ${T.aBack} ${clean(note.back.name)}` : "")),
      note?.kind === "fled" && h("div", { className: "feedback ok" }, h("strong", null, `${T.fledNote} ${note.name}`), h("p", null, T.retry)),
      note?.kind === "msg" && h("div", { className: "feedback ok" }, h("p", null, note.text)),
      selected && !complete && h("div", { className: "pm-dest" },
        h("div", null, h("strong", null, T.unknown), typeOf(map, lang, selected) && h("p", { className: "muted" }, typeOf(map, lang, selected))),
        h("button", { className: "btn primary", onClick: travel }, "▶ ", T.travel, " · ", MISSION_QUESTIONS, " ", T.questions)),
      campPanel,
      h("button", { className: "btn pm-restart", onClick: restart }, T.restart));
  }

  // ---- mode 4: explorer

  function Explorer({ map, lang, onExit, facts }) {
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
        h(Fact, { facts, place: sel, lang, T }),
        h("div", { className: "fb-actions" },
          h("a", { className: "btn", href: wikiUrl(sel), target: "_blank", rel: "noreferrer" }, T.wiki, " ↗")))
        : h("p", { className: "muted center pm-hint" }, T.tapMarker));
  }

  // ---- tab

  let dataPromise = null;
  const json = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); });
  const loadData = () => (dataPromise ??= Promise.all([
    json("./data/maps.json"),
    json("./data/place-facts.json").catch(() => ({})), // curiosities are optional
    json("./data/place-descriptions.json").catch(() => ({})), // so are the descriptions
    json("./data/creatures.json").catch(() => ({})), // without creatures the discovery missions are quiz only
  ]).catch((e) => { dataPromise = null; throw e; }));

  return function MapTab() {
    const store = useStore();
    const { lang } = useI18n();
    const T = TEXT[lang] ?? TEXT.en;
    const [maps, setMaps] = useState(null);
    const [facts, setFacts] = useState({ d: {}, f: {} });
    const [creatures, setCreatures] = useState({});
    const [failed, setFailed] = useState(false);
    const [game, setGame] = useState("fo4");
    const [mode, setMode] = useState(null);
    const [previewView, setPreviewView] = useState(null);
    const [saved, setSaved] = useState(loadSaved);

    useEffect(() => { loadData().then(([m, f, d, c]) => { setMaps(m); setFacts({ f, d }); setCreatures(c); }).catch(() => setFailed(true)); }, []);
    const map = maps && maps[game];
    useEffect(() => { if (map) setPreviewView(bboxView(map.bbox)); }, [game, maps]);
    const areas = map ? Object.keys(maps).filter((k) => maps[k].group === map.group) : [];

    if (failed) return h("div", { className: "screen" }, h("p", { className: "muted" }, T.error));
    if (!map || !previewView) return h("div", { className: "screen" }, h("p", { className: "muted" }, T.loading));

    const exit = () => setMode(null);
    const props = { mapKey: game, map, lang, store, saved, setSaved, facts, creatures, onExit: exit };
    if (mode === "find") return h(FindQuiz, { key: game + mode, ...props });
    if (mode === "place") return h(ChoiceQuiz, { key: game + mode, ...props });
    if (mode === "discover") return h(Discover, { key: game + mode, ...props });
    if (mode === "explore") return h(Explorer, { key: game + mode, ...props });

    const adv = saved.adv?.[game], hpMax = playerOf(store).hpMax;
    const nFound = new Set([map.start, ...(saved.discovered[game] ?? [])].filter((id) => map.targets.includes(id))).size;
    const rows = [
      { id: "find", title: T.mFind, sub: T.mFindSub, tag: saved.best[game] ? `${T.record} ${saved.best[game]}` : "" },
      { id: "place", title: T.mPlace, sub: T.mPlaceSub },
      { id: "discover", title: T.mDiscover, tag: `${nFound}/${map.targets.length}`,
        sub: adv ? `${T.aHp} ${Math.min(adv.hp, hpMax)}/${hpMax} · ${T.aStim} ${adv.stim} · ${adv.caps} ${T.aCaps}` : T.mDiscoverSub },
      { id: "explore", title: T.mExplore, sub: T.mExploreSub },
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
