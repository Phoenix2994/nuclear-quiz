import type { GameKey, Lesson, Progress, Question, TipoKey } from '../types';
import { CONFIG } from './config';

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Rimescola le opzioni (e le loro immagini) e rimappa l'indice della risposta corretta. Vero/Falso resta sempre nello stesso ordine. */
export function shuffleOptions(q: Question, rng: () => number): Question {
  if (q.kind === 'tf') return q;
  const idx = shuffle(q.options.map((_, i) => i), rng);
  return {
    ...q,
    options: idx.map((i) => q.options[i]),
    answer: idx.indexOf(q.answer),
    ...(q.optionImgs ? { optionImgs: idx.map((i) => q.optionImgs![i]) } : {}),
  };
}

/** Chiave del percorso: il gioco stesso se uno solo (cosi il progresso resta quello di prima), altrimenti il mix ordinato. */
export function pathKey(games: GameKey[]): string {
  return games.length === 1 ? games[0] : 'mix-' + [...games].sort().join('+');
}

/** Domande per id nella lingua del quiz: alcune (le icone della mappa) hanno lo stesso id in italiano e in inglese, e la seconda lingua scaricata non deve sostituire la prima. */
export function indexQuestions(questions: Question[], lang: string): Map<string, Question> {
  return new Map(questions.filter((q) => (q.lang ?? 'it') === lang).map((q) => [q.id, q]));
}

const SUBJECT_GAP = 30;
const QUESTION_GAP = 40; // una stessa domanda non torna prima di tante lezioni (salvo che non ci sia altro)
const KIND_CAP = 4;
const TIPO_CAP = 3;
// Quote per missione (10 domande): i temi nuovi di cibo/chem e di combattimento sono gruppi con un tetto basso, cosi non arrivano a ondate
// quando sono tutti facili; dentro il gruppo le ricette e le creature della mappa sono ancora piu limitate. Nelle prime missioni il tetto e 1.
const FOOD_TIPI = ['cucina', 'bevande', 'chem'];
const MAIN_GROUPS = ['personaggio', 'luogo', 'arma', 'creatura']; // almeno una domanda a missione, se ce n'e di adatte
const EARLY_LESSONS = 5;
export function groupOf(q: Question): string {
  if (FOOD_TIPI.includes(q.tipo)) return 'cibo';
  if (q.tipo === 'combattimento' || q.id.startsWith('en:le-')) return 'combat';
  return q.tipo ?? '';
}
function subGroupOf(q: Question): string {
  return q.id.startsWith('en:ck-') ? 'ricette' : q.id.startsWith('en:le-') ? 'creature-mappa' : '';
}
const groupCap = (g: string, lessonIdx: number, extra: boolean) => (g === 'cibo' || g === 'combat' ? (lessonIdx < EARLY_LESSONS || !extra ? 1 : 2) : TIPO_CAP);
// titoli "contenitore" (cronologia, intruso, missioni): non sono un soggetto, ogni domanda vale per se
const GENERIC_TITLES = new Set(['timeline', 'odd one out', 'main quests', 'expansions']);
const subjectCache = new WeakMap<Question, string>();
function subjectKey(q: Question): string {
  let k = subjectCache.get(q);
  if (k === undefined) { k = computeSubjectKey(q); subjectCache.set(q, k); }
  return k;
}
function computeSubjectKey(q: Question): string {
  const t = q.titolo.toLowerCase().replace(/\s*\([^)]*\)\s*/g, ' ').replace(/^the /, '').trim();
  return GENERIC_TITLES.has(t) ? '#' + q.id : t;
}

/** Percorso di uno o piu' giochi: lezioni da N domande, dalle piu' facili alle piu' difficili, ordine stabile. */
export function buildLessons(questions: Question[], gameOrGames: GameKey | GameKey[]): Lesson[] {
  const games = Array.isArray(gameOrGames) ? gameOrGames : [gameOrGames];
  const key = pathKey(games);
  const game = games[0];
  const n = CONFIG.questionsPerLesson;
  // difficolta continua: livello + (10 - ease)/10. Le domande restano in un elenco ordinato per difficolta e ogni lezione
  // ne pesca n attorno a un punto che avanza con il percorso, con qualche scarto: una parte piu facile e una piu difficile
  const sorted = questions
    .filter((q) => q.giochi.some((g) => games.includes(g)) && q.kind !== 'game') // "in quale gioco" non ha senso dentro un percorso di un solo gioco
    .map((q) => ({ q, d: q.livello + (10 - (q.ease ?? 5)) / 10, h: hashStr(q.id) }))
    .sort((a, b) => a.d - b.d || a.h - b.h);
  const total = sorted.length;
  const count = Math.ceil(total / n);
  const rng = rngFrom(hashStr('mix:' + key));
  const lessons: Lesson[] = [];
  // al massimo una domanda per soggetto in ogni lezione; lo stesso soggetto (anche di giochi diversi, "Bobby pin" in FO3/FNV/FO4)
  // non torna prima di SUBJECT_GAP lezioni; in una lezione non piu' di KIND_CAP domande dello stesso formato ne' TIPO_CAP dello stesso tema.
  // Se non basta si allenta, in questo ordine: tema, formato, distanza tra lezioni.
  // Le domande NON si esauriscono: ogni lezione pesca di nuovo dall'elenco intero. Si preferiscono le mai viste (se abbastanza vicine alla
  // difficolta cercata), poi quelle non viste da almeno QUESTION_GAP lezioni, e solo come ultima scelta una ripetizione piu ravvicinata.
  const lastSeen = new Map<string, number>();
  const lastUsedAt = new Int32Array(total).fill(-1); // indice in sorted -> lezione in cui e uscita l'ultima volta (-1: mai)
  const grp = sorted.map((x) => groupOf(x.q)); // precalcolati: il ciclo di ricerca li chiede milioni di volte
  const sks = sorted.map((x) => subjectKey(x.q));
  while (lessons.length < count) {
    const base = sorted[Math.min(total - 1, Math.floor((lessons.length / count) * total))].d;
    const picked: typeof sorted = [];
    const pickedIds = new Set<string>();
    const pickedIdx: number[] = [];
    const subjects = new Set<string>();
    const kinds = new Map<string, number>();
    const tipi = new Map<string, number>(); // per gruppo (vedi groupOf)
    const subs = new Map<string, number>();
    const extra = rng() < 0.3; // in una lezione su tre circa questi gruppi possono avere una seconda domanda: in media 1,3 a lezione, come il loro peso nel totale
    const take = (i: number) => {
      const it = sorted[i];
      picked.push(it);
      pickedIds.add(it.q.id);
      pickedIdx.push(i);
      subjects.add(subjectKey(it.q));
      kinds.set(it.q.kind ?? '', (kinds.get(it.q.kind ?? '') ?? 0) + 1);
      tipi.set(groupOf(it.q), (tipi.get(groupOf(it.q)) ?? 0) + 1);
      const sg = subGroupOf(it.q);
      if (sg) subs.set(sg, (subs.get(sg) ?? 0) + 1);
    };
    const lowerBound = (x: number) => { let l = 0, h = total; while (l < h) { const m = (l + h) >> 1; if (sorted[m].d < x) l = m + 1; else h = m; } return l; };
    const used = (i: number) => (lastUsedAt[i] < 0 ? undefined : lastUsedAt[i]);
    const eligible = (i: number) => !pickedIds.has(sorted[i].q.id) && (used(i) === undefined || lessons.length - used(i)! >= QUESTION_GAP);
    // minimo: una domanda per ognuno dei temi principali, se ce n'e una abbastanza vicina alla difficolta di questa lezione
    for (const g of shuffle(MAIN_GROUPS, rng)) {
      let best = -1;
      for (let i = lowerBound(base - 0.6); i < total && sorted[i].d <= base + 0.6; i++) {
        const q = sorted[i].q;
        if (grp[i] !== g || !eligible(i) || subjects.has(sks[i]) || (lastSeen.has(sks[i]) && lessons.length - lastSeen.get(sks[i])! <= SUBJECT_GAP)) continue;
        // a parita di vicinanza si preferisce la mai vista
        const score = (j: number) => Math.abs(sorted[j].d - base) + (used(j) === undefined ? 0 : 0.3);
        if (best < 0 || score(i) < score(best)) best = i;
      }
      if (best >= 0 && picked.length < n) take(best);
    }
    while (picked.length < n) {
      const r = rng();
      // 65% vicino al punto del percorso, 22% da mezzo livello a un livello e mezzo piu facile, 13% piu difficile
      const target = base + (r < 0.65 ? (rng() - 0.5) * 0.2 : r < 0.87 ? -(0.3 + rng() * 0.9) : 0.3 + rng() * 0.8);
      let lo = 0, hi = total - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m].d < target) lo = m + 1; else hi = m; }
      let found = -1;
      // fase 0: solo mai viste e vicine al bersaglio; fase 1: anche quelle non viste da QUESTION_GAP lezioni; fase 2: qualunque non gia in questa lezione
      for (let phase = 0; phase < 3 && found < 0; phase++) {
        for (let relax = 0; relax < (phase === 0 ? 2 : 4) && found < 0; relax++) { // tra le mai viste non si allenta troppo: meglio passare alla fase 1
          let a = lo - 1, b = lo, looked = 0; // si va verso l'esterno dal punto bersaglio, prima il piu vicino
          while (found < 0 && (a >= 0 || b < total)) {
            const useA = b >= total || (a >= 0 && target - sorted[a].d <= sorted[b].d - target);
            const i = useA ? a-- : b++;
            const q = sorted[i].q;
            if (phase === 0 && (Math.abs(sorted[i].d - target) > 0.8)) break; // piu lontano di cosi non cerchiamo tra le mai viste
            if (phase === 0 && used(i) !== undefined) continue;
            if (phase === 1 && !eligible(i)) continue;
            if (phase === 2 && pickedIds.has(q.id)) continue;
            const sk = sks[i];
            if (subjects.has(sk)) continue;
            if (relax < 3 && lastSeen.has(sk) && lessons.length - lastSeen.get(sk)! <= SUBJECT_GAP) continue;
            if (relax < 2 && (kinds.get(q.kind ?? '') ?? 0) >= KIND_CAP) continue;
            if (relax < 1 && (tipi.get(grp[i]) ?? 0) >= groupCap(grp[i], lessons.length, extra)) continue;
            if (relax < 2 && subGroupOf(q) && (subs.get(subGroupOf(q)) ?? 0) >= 1) continue;
            found = i;
          }
        }
      }
      if (found < 0) { // restano solo soggetti gia usati in questa lezione
        found = Math.min(lo, total - 1);
        while (pickedIds.has(sorted[found].q.id)) found = (found + 1) % total;
      }
      take(found);
    }
    for (const k of subjects) lastSeen.set(k, lessons.length);
    for (const i of pickedIdx) lastUsedAt[i] = lessons.length;
    picked.sort((x, y) => x.d - y.d || x.h - y.h); // dentro la lezione si parte dalle piu facili
    lessons.push({ id: `${key}:${lessons.length}`, game, index: lessons.length, questionIds: picked.map((p) => p.q.id) });
  }
  return lessons;
}

export function gamesWithPath(questions: Question[], games: GameKey[]): GameKey[] {
  return games.filter((g) => questions.filter((q) => q.giochi.includes(g)).length >= CONFIG.minLessonsGame * CONFIG.questionsPerLesson / 3);
}

/** Pesca n domande: prima i ripassi dovuti, poi le mai viste, poi le gia' viste. */
export function buildPractice(pool: Question[], p: Progress, today: string, rng: () => number, n = CONFIG.questionsPerLesson): Question[] {
  const due = shuffle(pool.filter((q) => p.wrong[q.id] && p.wrong[q.id] <= today), rng).slice(0, Math.ceil(n * 0.4));
  const taken = new Set(due.map((q) => q.id));
  const seen = new Set(p.seen);
  const unseen = shuffle(pool.filter((q) => !taken.has(q.id) && !seen.has(q.id)), rng);
  const again = shuffle(pool.filter((q) => !taken.has(q.id) && seen.has(q.id)), rng);
  const out = [...due];
  for (const q of [...unseen, ...again]) {
    if (out.length >= n) break;
    out.push(q);
  }
  // non piu' di due domande di fila sullo stesso articolo
  return shuffle(out, rng);
}

export function practiceByTema(questions: Question[], tema: TipoKey): Question[] {
  return questions.filter((q) => q.tipo === tema);
}

/** Quiz del giorno: 10 domande miste, uguali per tutti nello stesso giorno. */
export function dailyQuestions(questions: Question[], day: string, n = CONFIG.questionsPerLesson): Question[] {
  const rng = rngFrom(hashStr('daily:' + day));
  const medium = questions.filter((q) => q.livello <= 2);
  return shuffle(medium, rng).slice(0, n);
}

export function starsFor(correct: number, total: number): number {
  const r = total ? correct / total : 0;
  return r >= 0.9 ? 3 : r >= 0.7 ? 2 : 1;
}
