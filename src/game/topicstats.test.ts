import { afterEach, describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { initialProgress, loadProgress, recordAnswer, STORAGE_KEY } from './progress';

const mk = (tipo: Question['tipo'] | undefined): Question =>
  ({ id: 'q1', articleId: 'en:1', titolo: 'T', tipo, giochi: ['fnv'], q: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'e', livello: 2 }) as Question;

describe('contatori per topic', () => {
  it('conta giuste e sbagliate per il tipo della domanda, senza toccare i totali', () => {
    let p = recordAnswer(initialProgress(), mk('arma'), true, 10, '2026-11-03');
    expect(p.stats.byTopic?.arma).toEqual({ answered: 1, correct: 1 });
    p = recordAnswer(p, mk('arma'), false, 0, '2026-11-03');
    expect(p.stats.byTopic?.arma).toEqual({ answered: 2, correct: 1 });
    expect(p.stats.answered).toBe(2);
    expect(p.stats.correct).toBe(1);
  });
  it('conta anche le canzoni', () => {
    const p = recordAnswer(initialProgress(), mk('canzone'), true, 10, '2026-11-03');
    expect(p.stats.byTopic?.canzone).toEqual({ answered: 1, correct: 1 });
  });
  it('una domanda senza tipo non rompe e non crea chiavi', () => {
    const p = recordAnswer(initialProgress(), mk(undefined), true, 10, '2026-11-03');
    expect(p.stats.answered).toBe(1);
    expect(Object.keys(p.stats.byTopic ?? {})).toEqual([]);
  });
});

describe('progresso salvato prima della funzione', () => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };
  afterEach(() => { delete store[STORAGE_KEY]; });
  it('si carica senza byTopic e conserva i totali', () => {
    store[STORAGE_KEY] = JSON.stringify({ xp: 5, stats: { answered: 3, correct: 2 } });
    const p = loadProgress();
    expect(p.stats.answered).toBe(3);
    expect(p.stats.correct).toBe(2);
    expect(p.stats.byTopic).toEqual({});
  });
  it('si carica anche senza il campo stats', () => {
    store[STORAGE_KEY] = JSON.stringify({ xp: 5 });
    const p = loadProgress();
    expect(p.stats.byTopic).toEqual({});
    expect(p.stats.answered).toBe(0);
  });
  it('conserva i contatori gia salvati', () => {
    store[STORAGE_KEY] = JSON.stringify({ stats: { answered: 4, correct: 3, byTopic: { luogo: { answered: 4, correct: 3 } } } });
    expect(loadProgress().stats.byTopic?.luogo).toEqual({ answered: 4, correct: 3 });
  });
});
