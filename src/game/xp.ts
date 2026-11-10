import { CONFIG } from './config';

export function streakMultiplier(days: number): number {
  return 1 + CONFIG.kStreak * Math.sqrt(Math.max(0, days));
}

export function timeMultiplier(seconds: number): number {
  const frac = Math.max(0, 1 - seconds / CONFIG.timeWindowSec);
  return 1 + frac * CONFIG.kTime;
}

/** XP per una risposta corretta; le risposte sbagliate valgono 0. */
export function xpForAnswer(livello: number, streakDays: number, seconds: number): number {
  const base = CONFIG.xpBase[livello] ?? CONFIG.xpBase[2];
  return Math.round(base * streakMultiplier(streakDays) * timeMultiplier(seconds));
}

/** XP totali necessari per iniziare il livello n (n >= 1). */
export function xpForLevel(n: number): number {
  return CONFIG.levelBase * (n - 1) * (n - 1);
}

export function levelFromXp(xp: number): { level: number; into: number; span: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const start = xpForLevel(level);
  return { level, into: xp - start, span: xpForLevel(level + 1) - start };
}

/** Titoli sbloccati ai livelli indicati (solo estetici). */
export const TITOLI: { level: number; titolo: string }[] = [
  { level: 1, titolo: 'Abitante del Vault' },
  { level: 3, titolo: 'Vagabondo' },
  { level: 6, titolo: 'Esploratore del Wasteland' },
  { level: 10, titolo: 'Veterano della Zona Contaminata' },
  { level: 15, titolo: 'Archivista del Pip-Boy' },
  { level: 22, titolo: 'Leggenda del Wasteland' },
];

export function titoloForLevel(level: number): string {
  let t = TITOLI[0].titolo;
  for (const x of TITOLI) if (level >= x.level) t = x.titolo;
  return t;
}
