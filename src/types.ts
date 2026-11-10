export type GameKey = 'fo1' | 'fo2' | 'fo3' | 'fnv' | 'fo4' | 'fo76' | 'tactics' | 'bos' | 'shelter' | 'vanburen' | 'bible' | 'tv' | 'generale';
export type TipoKey = 'personaggio' | 'luogo' | 'fazione' | 'creatura' | 'arma' | 'armatura' | 'oggetto' | 'missione' | 'evento' | 'meccanica' | 'lore' | 'canzone' | 'cucina' | 'bevande' | 'chem' | 'combattimento';
export type Lang = 'en' | 'it';
export type SpecialKey = 'S' | 'P' | 'E' | 'C' | 'I' | 'A' | 'L';

export interface Question {
  id: string;
  articleId: string; // chiave univoca tra le wiki: "en:123" o "it:123"
  titolo: string;
  tipo: TipoKey;
  giochi: GameKey[];
  q: string;
  options: string[];
  answer: number;
  explanation: string;
  livello: 1 | 2 | 3;
  ease?: number; // 1 (oscura) - 10 (la conosce chiunque), voto dei worker
  lang?: Lang;
  kind?: string; // img | tf | cloze | clue | game | where | did | who | lore
  img?: string; // immagine mostrata sopra la domanda
  map?: { group: string; x: number; y: number; id: string }; // mappa di gioco con il marker del luogo (0-1000), mostrata sopra la domanda
  optionImgs?: (string | null)[]; // immagine opzionale per ogni opzione, aperta al tocco
}

export interface Article {
  id: string;
  titolo: string;
  tipo: TipoKey;
  giochi: GameKey[];
  intro: string;
  about?: string; // una riga: cos'e e di chi/dove, mostrata sopra la spiegazione
  url: string;
  lang?: Lang;
  img?: string;
}

export interface Lesson {
  id: string; // es. "fnv:3"
  game: GameKey;
  index: number;
  questionIds: string[];
}

export interface Settings {
  uiLang: Lang;
  quizLang: Lang;
  sound?: boolean;
  /** Giochi scelti nel percorso del tab QUIZ (se assente: epoca Bethesda). */
  pathGames?: GameKey[];
  /** Epoca scelta nel percorso: i giochi selezionabili sono solo quelli dell'epoca (con 'all' tutti). */
  pathEpoch?: 'classic' | 'bethesda' | 'all';
}

export interface Progress {
  xp: number;
  streak: { lastDay: string | null; count: number };
  lessons: Record<string, number>; // lessonId -> stelle (1-3)
  /** domande sbagliate da ripassare: id -> giorno (YYYY-MM-DD) in cui tornano */
  wrong: Record<string, string>;
  seen: string[];
  unlocked: string[]; // articleId sbloccati nell'enciclopedia
  favorites: string[];
  /** totali e, per ogni topic (campo `tipo` della domanda), risposte date e giuste; `byTopic` manca nei salvataggi vecchi */
  stats: { answered: number; correct: number; byTopic?: Partial<Record<TipoKey, { answered: number; correct: number }>> };
  dailyDone: string | null; // giorno dell'ultimo quiz del giorno completato
  settings: Settings;
  /** S.P.E.C.I.A.L.: punti guadagnati con le risposte e punti assegnati a mano a ogni livello */
  special: { points: Record<SpecialKey, number>; allocated: Record<SpecialKey, number> };
}
