import type { Progress, Question, SpecialKey } from '../types';
import { levelFromXp } from './xp';

export const SPECIAL_KEYS: SpecialKey[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];
export const SPECIAL_NAMES: Record<SpecialKey, string> = {
  S: 'Strength', P: 'Perception', E: 'Endurance', C: 'Charisma', I: 'Intelligence', A: 'Agility', L: 'Luck',
};
/** Immagine iconica (titolo della scheda wiki) e descrizione di cosa fa crescere ogni caratteristica. */
export const SPECIAL_INFO: Record<SpecialKey, { icon: string; desc: string; img?: string }> = {
  S: { icon: 'Super mutant', desc: 'Raw power. Grows with questions about weapons and armor.' },
  P: { icon: 'Eyebot', desc: 'Sharp eyes. Grows with picture questions, places and items.' },
  E: { icon: 'Stimpak', desc: 'Survival. Grows with questions about creatures of the Wasteland.' },
  C: { icon: 'Robert House', img: 'https://static.wikia.nocookie.net/fallout/images/2/2b/FOTV_Mr_House_Screen.png/revision/latest/scale-to-width-down/480?cb=20260318063352', desc: 'The way with people. Grows with questions about characters and factions.' },
  I: { icon: 'Mister Handy', desc: 'Know-how. Grows with lore, quests, events and game mechanics.' },
  A: { icon: 'Deathclaw', desc: 'Quick reflexes. Grows when you answer correctly within 5 seconds.' },
  L: { icon: 'Slots', img: 'https://static.wikia.nocookie.net/fallout/images/f/f4/FNV_slotmachine_model2.png/revision/latest/scale-to-width-down/371?cb=20200623170236', desc: 'Fortune favors you. Grows for every day you play and every daily quiz.' },
};

export const MAX_STAT = 10;
export const FAST_SECONDS = 5; // una risposta corretta entro questi secondi vale un punto Agility

export function emptySpecial(): Record<SpecialKey, number> {
  return { S: 0, P: 0, E: 0, C: 0, I: 0, A: 0, L: 0 };
}

/** Caratteristica legata a una domanda: le immagini sono Perception, il resto dipende dall'argomento. */
export function statFor(q: Pick<Question, 'kind' | 'tipo'>): SpecialKey {
  if (q.kind === 'img') return 'P';
  switch (q.tipo) {
    case 'arma':
    case 'armatura':
      return 'S';
    case 'luogo':
    case 'oggetto':
      return 'P';
    case 'creatura':
      return 'E';
    case 'personaggio':
    case 'fazione':
      return 'C';
    default:
      return 'I'; // missioni, eventi, meccaniche di gioco, lore
  }
}

/** Punti per una risposta corretta: crescono con il livello di difficolta (1-3) derivato dal voto di facilita. */
export function pointsFor(q: Pick<Question, 'livello'>): number {
  return q.livello;
}

/** Punti totali per raggiungere il valore n+1: 15*n*(n+1) (30, 90, 180, 300... fino a 1350 per il 10). */
export function pointsForStep(n: number): number {
  return 15 * n * (n + 1);
}

export function earnedLevel(points: number): number {
  let n = 0;
  while (n < MAX_STAT - 1 && pointsForStep(n + 1) <= points) n++;
  return n;
}

export function statValue(p: Progress, k: SpecialKey): number {
  return Math.min(MAX_STAT, 1 + earnedLevel(p.special.points[k]) + p.special.allocated[k]);
}

/** Avanzamento verso il prossimo valore ottenuto con le risposte: 0-1 (1 se al massimo). */
export function statProgress(p: Progress, k: SpecialKey): number {
  if (statValue(p, k) >= MAX_STAT) return 1;
  const n = earnedLevel(p.special.points[k]);
  const from = n === 0 ? 0 : pointsForStep(n);
  return (p.special.points[k] - from) / (pointsForStep(n + 1) - from);
}

/** Punti da assegnare a mano: uno per ogni livello del giocatore oltre il primo. */
export function freePoints(p: Progress): number {
  const spent = SPECIAL_KEYS.reduce((a, k) => a + p.special.allocated[k], 0);
  return Math.max(0, levelFromXp(p.xp).level - 1 - spent);
}

export function allocatePoint(p: Progress, k: SpecialKey): Progress {
  if (freePoints(p) <= 0 || statValue(p, k) >= MAX_STAT) return p;
  return { ...p, special: { ...p.special, allocated: { ...p.special.allocated, [k]: p.special.allocated[k] + 1 } } };
}

export function addPoints(p: Progress, k: SpecialKey, n: number): Progress {
  return { ...p, special: { ...p.special, points: { ...p.special.points, [k]: p.special.points[k] + n } } };
}

/** Punti guadagnati rispondendo: caratteristica dell'argomento, piu Agility se la risposta e' veloce. */
export function answerPoints(q: Question, correct: boolean, seconds: number): { k: SpecialKey; n: number }[] {
  if (!correct) return [];
  const out = [{ k: statFor(q), n: pointsFor(q) }];
  if (seconds <= FAST_SECONDS) out.push({ k: 'A' as SpecialKey, n: 1 });
  return out;
}
