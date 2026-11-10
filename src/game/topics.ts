import type { TipoKey } from '../types';

export type TopicCount = { answered: number; correct: number };
export type ByTopic = Partial<Record<TipoKey, TopicCount>>;

export const MIN_ANSWERS = 5; // sotto questa soglia: "dati insufficienti"
const PRIOR_ANSWERS = 10; // risposte neutre (al 50%) con cui si smorza la percentuale
const LEVEL_BOUNDS = [0.45, 0.6, 0.75, 0.88]; // soglie dei livelli 2-5 sulla percentuale corretta

/** Le 14 schede, nell'ordine in cui compaiono quando non ci sono dati. Meccaniche e Lore non hanno domande inglesi. */
export const TOPIC_CARDS: TipoKey[] = [
  'personaggio', 'luogo', 'fazione', 'creatura', 'arma', 'armatura', 'oggetto',
  'missione', 'evento', 'cucina', 'bevande', 'chem', 'combattimento', 'canzone',
];

/** I 6 vertici del radar. */
export const RADAR_GROUPS: { key: string; label: string; topics: TipoKey[] }[] = [
  { key: 'characters', label: 'Characters', topics: ['personaggio'] },
  { key: 'locations', label: 'Locations', topics: ['luogo'] },
  { key: 'gear', label: 'Weapons & armor', topics: ['arma', 'armatura'] },
  { key: 'creatures', label: 'Creatures & combat', topics: ['creatura', 'combattimento'] },
  { key: 'stuff', label: 'Items, food & chems', topics: ['oggetto', 'cucina', 'bevande', 'chem'] },
  { key: 'history', label: 'History & culture', topics: ['missione', 'evento', 'fazione', 'canzone'] },
];

/** Percentuale "corretta": (giuste + 5) / (risposte + 10). Con poche risposte resta vicina al 50%. */
export function adjustedPct(correct: number, answered: number): number {
  return (correct + PRIOR_ANSWERS / 2) / (answered + PRIOR_ANSWERS);
}

export function levelFor(pct: number): 1 | 2 | 3 | 4 | 5 {
  let l = 1;
  for (const b of LEVEL_BOUNDS) if (pct >= b) l++;
  return l as 1 | 2 | 3 | 4 | 5;
}

/** Avanzamento (0-1) dentro la fascia del livello attuale; al livello massimo vale 1. */
export function levelProgress(pct: number): number {
  const l = levelFor(pct);
  if (l === 5) return 1;
  const lower = l === 1 ? 0 : LEVEL_BOUNDS[l - 2];
  const upper = LEVEL_BOUNDS[l - 1];
  return Math.max(0, Math.min(1, (pct - lower) / (upper - lower)));
}

export type Summary = { answered: number; correct: number; wrong: number; rawPct: number; pct: number; enough: boolean; level: 1 | 2 | 3 | 4 | 5 | null; progress: number };

function summarize(answered: number, correct: number): Summary {
  const pct = adjustedPct(correct, answered);
  const enough = answered >= MIN_ANSWERS;
  return { answered, correct, wrong: answered - correct, rawPct: answered ? correct / answered : 0, pct, enough, level: enough ? levelFor(pct) : null, progress: enough ? levelProgress(pct) : 0 };
}

export function topicSummary(byTopic: ByTopic | undefined, tipo: TipoKey): Summary {
  const c = byTopic?.[tipo];
  return summarize(c?.answered ?? 0, c?.correct ?? 0);
}

export function groupSummary(byTopic: ByTopic | undefined, group: { topics: TipoKey[] }): Summary {
  let a = 0, c = 0;
  for (const t of group.topics) { a += byTopic?.[t]?.answered ?? 0; c += byTopic?.[t]?.correct ?? 0; }
  return summarize(a, c);
}

/** I tipi che compaiono davvero in un elenco di domande (la UI poi li filtra sulle 14 schede). */
export function topicsWithQuestions(questions: { tipo?: TipoKey }[]): Set<TipoKey> {
  const s = new Set<TipoKey>();
  for (const q of questions) if (q.tipo) s.add(q.tipo);
  return s;
}

export type RadarGeometry = { axes: { x: number; y: number }[]; rings: string[]; shape: string; dots: ({ x: number; y: number } | null)[] };

/** Punti del radar in un quadrato `size`. `values` in 0-1 (null = senza dati). Vertice 0 in alto, in senso orario, raggio massimo size*0.38. */
export function radarGeometry(values: (number | null)[], size: number): RadarGeometry {
  const n = values.length, c = size / 2, R = size * 0.38;
  const at = (i: number, frac: number) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return { x: c + Math.cos(a) * R * frac, y: c + Math.sin(a) * R * frac }; };
  const pts = (frac: (i: number) => number) => Array.from({ length: n }, (_, i) => at(i, frac(i)));
  const str = (p: { x: number; y: number }[]) => p.map((q) => `${+q.x.toFixed(2)},${+q.y.toFixed(2)}`).join(' ');
  const clamp = (v: number | null) => (v == null ? 0 : Math.max(0, Math.min(1, v)));
  return {
    axes: pts(() => 1),
    rings: [0.25, 0.5, 0.75, 1].map((f) => str(pts(() => f))),
    shape: str(pts((i) => clamp(values[i]))),
    dots: values.map((v, i) => (v == null ? null : at(i, clamp(v)))),
  };
}

/** Ordine delle schede: prima i topic con abbastanza dati, dal migliore (percentuale corretta), poi gli altri nell'ordine standard. */
export function cardOrder(byTopic: ByTopic | undefined, shown: Set<TipoKey>): TipoKey[] {
  const list = TOPIC_CARDS.filter((t) => shown.has(t));
  const withData = list.filter((t) => topicSummary(byTopic, t).enough).sort((a, b) => topicSummary(byTopic, b).pct - topicSummary(byTopic, a).pct);
  return [...withData, ...list.filter((t) => !withData.includes(t))];
}
