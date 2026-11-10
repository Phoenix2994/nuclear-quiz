import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { levelFromXp, streakMultiplier, timeMultiplier, xpForAnswer, xpForLevel } from './xp';
import { buildLessons, buildPractice, dailyQuestions, rngFrom, shuffleOptions, starsFor } from './session';
import { addDays, daysBetween, finishLesson, initialProgress, recordAnswer, streakShown, streakToday, touchStreak } from './progress';

const mk = (i: number, livello: 1 | 2 | 3 = 2, giochi: Question['giochi'] = ['fnv']): Question => ({
  id: `q${i}`, articleId: 'it:' + (i % 7), titolo: 'T' + i, tipo: 'luogo', giochi, q: 'D' + i + '?', options: ['a', 'b', 'c', 'd'], answer: i % 4, explanation: 'e', livello,
});
const pool = (n: number, livello: 1 | 2 | 3 = 2, g: Question['giochi'] = ['fnv']) => Array.from({ length: n }, (_, i) => mk(i, livello, g));

describe('xp', () => {
  it('moltiplicatori', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(100)).toBeCloseTo(1.3, 5);
    expect(timeMultiplier(0)).toBeCloseTo(1.2, 5);
    expect(timeMultiplier(20)).toBe(1);
    expect(timeMultiplier(999)).toBe(1);
  });
  it('xp per risposta', () => {
    expect(xpForAnswer(1, 0, 999)).toBe(10);
    expect(xpForAnswer(3, 0, 999)).toBe(20);
    expect(xpForAnswer(2, 100, 0)).toBe(Math.round(15 * 1.3 * 1.2));
  });
  it('livelli', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(300);
    expect(xpForLevel(3)).toBe(1200);
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(89).level).toBe(1);
    expect(levelFromXp(300).level).toBe(2);
    expect(levelFromXp(1200)).toEqual({ level: 3, into: 0, span: 1500 });
  });
});

describe('sessioni', () => {
  it('lezioni: ordine stabile, facili prima, nessuna domanda persa o doppia', () => {
    const qs = [...pool(25, 3), ...pool(30, 1).map((q) => ({ ...q, id: 'x' + q.id })), ...pool(5, 2, ['fo3']).map((q) => ({ ...q, id: 'y' + q.id }))];
    const l1 = buildLessons(qs, 'fnv');
    const l2 = buildLessons([...qs].reverse(), 'fnv');
    expect(l1).toEqual(l2);
    const ids = l1.flatMap((l) => l.questionIds);
    expect(new Set(ids).size).toBe(55);
    const byId = new Map(qs.map((q) => [q.id, q]));
    expect(byId.get(l1[0].questionIds[0])!.livello).toBe(1);
    expect(byId.get(ids[ids.length - 1])!.livello).toBe(3);
    expect(l1.every((l) => l.questionIds.length >= 5)).toBe(true);
  });
  it('rimescolo opzioni mantiene la risposta corretta', () => {
    for (let s = 0; s < 50; s++) {
      const q = { ...mk(1), options: ['uno', 'due', 'tre', 'quattro'], answer: 2 };
      const r = shuffleOptions(q, rngFrom(s));
      expect(r.options[r.answer]).toBe('tre');
      expect([...r.options].sort()).toEqual([...q.options].sort());
    }
  });
  it('rimescolo: le immagini seguono le opzioni e vero/falso non si inverte', () => {
    for (let s = 0; s < 50; s++) {
      const q = { ...mk(1), options: ['uno', 'due', 'tre', 'quattro'], optionImgs: ['i1', 'i2', 'i3', 'i4'], answer: 2 };
      const r = shuffleOptions(q, rngFrom(s));
      r.options.forEach((o, i) => expect(r.optionImgs![i]).toBe(`i${q.options.indexOf(o) + 1}`));
      const tf = { ...mk(1), kind: 'tf' as const, options: ['True', 'False'], answer: 1 };
      expect(shuffleOptions(tf, rngFrom(s))).toEqual(tf);
    }
  });
  it('pratica: ripassi dovuti prima, poi mai viste', () => {
    const qs = pool(30);
    let p = initialProgress();
    p = { ...p, wrong: { q1: '2026-01-01', q2: '2099-01-01' }, seen: ['q1', 'q2', 'q3'] };
    const s = buildPractice(qs, p, '2026-06-01', rngFrom(1));
    expect(s).toHaveLength(10);
    expect(s.map((q) => q.id)).toContain('q1');
    expect(s.map((q) => q.id)).not.toContain('q3');
    expect(new Set(s.map((q) => q.id)).size).toBe(10);
  });
  it('quiz del giorno: deterministico per giorno', () => {
    const qs = pool(100);
    expect(dailyQuestions(qs, '2026-03-01').map((q) => q.id)).toEqual(dailyQuestions(qs, '2026-03-01').map((q) => q.id));
    expect(dailyQuestions(qs, '2026-03-01').map((q) => q.id)).not.toEqual(dailyQuestions(qs, '2026-03-02').map((q) => q.id));
  });
  it('stelle', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(7, 10)).toBe(2);
    expect(starsFor(2, 10)).toBe(1);
  });
});

describe('progressi', () => {
  it('date', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('serie', () => {
    let p = initialProgress();
    expect(streakToday(p, '2026-05-01')).toBe(1);
    p = touchStreak(p, '2026-05-01');
    expect(p.streak.count).toBe(1);
    p = touchStreak(p, '2026-05-02');
    expect(p.streak.count).toBe(2);
    expect(touchStreak(p, '2026-05-02')).toBe(p);
    expect(streakShown(p, '2026-05-03')).toBe(2);
    expect(streakShown(p, '2026-05-04')).toBe(0);
    expect(touchStreak(p, '2026-05-10').streak.count).toBe(1);
  });
  it('risposte: xp, ripasso, sblocco scheda', () => {
    const q = mk(3);
    let p = recordAnswer(initialProgress(), q, false, 12, '2026-05-01');
    expect(p.xp).toBe(0);
    expect(p.wrong[q.id]).toBe('2026-05-03');
    expect(p.unlocked).toEqual([]);
    p = recordAnswer(p, q, true, 12, '2026-05-05');
    expect(p.xp).toBe(12);
    expect(p.wrong[q.id]).toBeUndefined();
    expect(p.unlocked).toEqual([q.articleId]);
    expect(p.stats).toMatchObject({ answered: 2, correct: 1 });
    expect(p.seen).toEqual([q.id]);
  });
  it('lezione: tiene le stelle migliori', () => {
    let p = finishLesson(initialProgress(), 'fnv:0', 3);
    p = finishLesson(p, 'fnv:0', 1);
    expect(p.lessons['fnv:0']).toBe(3);
  });
});
