import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { initialProgress, recordAnswer, touchStreak } from './progress';
import { allocatePoint, earnedLevel, freePoints, MAX_STAT, statFor, statValue } from './special';

const q = (tipo: Question['tipo'], livello: 1 | 2 | 3 = 1, kind?: string): Question => ({
  id: 'x', articleId: 'en:1', titolo: 'T', tipo, giochi: ['fnv'], q: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'e', livello, kind,
});

describe('S.P.E.C.I.A.L.', () => {
  it('mappa argomenti e immagini sulle caratteristiche', () => {
    expect(statFor(q('arma'))).toBe('S');
    expect(statFor(q('creatura'))).toBe('E');
    expect(statFor(q('personaggio'))).toBe('C');
    expect(statFor(q('meccanica'))).toBe('I');
    expect(statFor(q('personaggio', 1, 'img'))).toBe('P');
  });

  it('le risposte corrette danno punti pesati dalla difficolta, le sbagliate nulla', () => {
    let p = initialProgress();
    p = recordAnswer(p, q('arma', 3), true, 10, '2026-01-01');
    expect(p.special.points.S).toBe(3);
    p = recordAnswer(p, q('arma', 3), false, 0, '2026-01-01');
    expect(p.special.points.S).toBe(3);
  });

  it('una risposta veloce da un punto Agility in piu', () => {
    const p = recordAnswer(initialProgress(), q('luogo'), true, 10, '2026-01-01', 2);
    expect(p.special.points.A).toBe(1);
    expect(recordAnswer(initialProgress(), q('luogo'), true, 10, '2026-01-01', 15).special.points.A).toBe(0);
  });

  it('un giorno giocato da un punto Luck', () => {
    expect(touchStreak(initialProgress(), '2026-01-01').special.points.L).toBe(1);
  });

  it('il valore parte da 1, sale con le soglie e si ferma a 10', () => {
    expect(earnedLevel(29)).toBe(0);
    expect(earnedLevel(30)).toBe(1);
    expect(earnedLevel(90)).toBe(2);
    let p = initialProgress();
    p = { ...p, special: { ...p.special, points: { ...p.special.points, S: 100000 } } };
    expect(statValue(p, 'S')).toBe(MAX_STAT);
  });

  it('un punto da assegnare per ogni livello oltre il primo', () => {
    let p = initialProgress();
    expect(freePoints(p)).toBe(0);
    expect(allocatePoint(p, 'S')).toBe(p);
    p = { ...p, xp: 300 }; // livello 2
    expect(freePoints(p)).toBe(1);
    p = allocatePoint(p, 'S');
    expect(statValue(p, 'S')).toBe(2);
    expect(freePoints(p)).toBe(0);
  });
});
