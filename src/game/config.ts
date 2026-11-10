import type { GameKey, TipoKey } from '../types';

export const GAMES: { key: GameKey; label: string; short: string; year?: number }[] = [
  { key: 'fo1', label: 'Fallout', short: 'FO1', year: 1997 },
  { key: 'fo2', label: 'Fallout 2', short: 'FO2', year: 1998 },
  { key: 'fo3', label: 'Fallout 3', short: 'FO3', year: 2008 },
  { key: 'fnv', label: 'Fallout: New Vegas', short: 'FNV', year: 2010 },
  { key: 'fo4', label: 'Fallout 4', short: 'FO4', year: 2015 },
  { key: 'fo76', label: 'Fallout 76', short: '76', year: 2018 },
  { key: 'tactics', label: 'Fallout Tactics', short: 'TAC', year: 2001 },
  { key: 'bos', label: 'Brotherhood of Steel', short: 'BoS', year: 2004 },
  { key: 'shelter', label: 'Fallout Shelter', short: 'SHL', year: 2015 },
  { key: 'vanburen', label: 'Van Buren (cancelled)', short: 'VB' },
  { key: 'bible', label: 'Fallout Bible', short: 'BIB' },
  { key: 'tv', label: 'Fallout TV series', short: 'TV', year: 2024 },
  { key: 'generale', label: 'Whole series', short: 'SERIES' },
];

/** Epoche per era di uscita: scorciatoie che selezionano in blocco i giochi del percorso. */
export const EPOCHS: { key: 'classic' | 'bethesda'; games: GameKey[] }[] = [
  { key: 'classic', games: ['fo1', 'fo2', 'tactics', 'bos'] },
  { key: 'bethesda', games: ['fo3', 'fnv', 'fo4', 'fo76'] },
];

/** Giochi le cui domande restano nascoste (per ora): Van Buren cancellato, Shelter e serie TV. */
export const HIDDEN_GAMES: GameKey[] = ['vanburen', 'shelter', 'tv'];

export const TEMI: { key: TipoKey; label: string }[] = [
  { key: 'personaggio', label: 'Personaggi' },
  { key: 'luogo', label: 'Luoghi' },
  { key: 'fazione', label: 'Fazioni' },
  { key: 'creatura', label: 'Creature' },
  { key: 'arma', label: 'Armi' },
  { key: 'armatura', label: 'Armature' },
  { key: 'oggetto', label: 'Oggetti' },
  { key: 'missione', label: 'Missioni' },
  { key: 'evento', label: 'Eventi' },
  { key: 'meccanica', label: 'Meccaniche' },
  { key: 'lore', label: 'Lore' },
  { key: 'canzone', label: 'Canzoni' },
  { key: 'cucina', label: 'Cucina' },
  { key: 'bevande', label: 'Bevande' },
  { key: 'chem', label: 'Chem e medicine' },
  { key: 'combattimento', label: 'Combattimento' },
];

export const GAME_LABEL: Record<string, string> = Object.fromEntries(GAMES.map((g) => [g.key, g.label]));
export const TEMA_LABEL: Record<string, string> = Object.fromEntries(TEMI.map((t) => [t.key, t.label]));

export const CONFIG = {
  questionsPerLesson: 10,
  xpBase: { 1: 10, 2: 15, 3: 20 } as Record<number, number>,
  kStreak: 0.03, // moltiplicatore = 1 + kStreak * sqrt(giorni)
  kTime: 0.2, // bonus massimo per risposta istantanea
  timeWindowSec: 20,
  levelBase: 300, // XP per arrivare al livello N: levelBase * (N-1)^2 (livello 2 a 300, 3 a 1200, 4 a 2700)
  reviewDelayDays: 2,
  minLessonsGame: 3, // giochi con meno domande di cosi non hanno un percorso
};
