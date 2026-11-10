import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { buildLessons, indexQuestions } from './session';

const mk = (i: number, titolo: string): Question => ({
  id: `q${i}`, articleId: 'en:' + titolo, titolo, tipo: 'oggetto', giochi: ['fnv'], q: 'Q' + i + '?', options: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'e', livello: 1, ease: 10 - (i % 3),
});

describe('quote per tema', () => {
  it('cibo e chem non superano 1 domanda a missione nelle prime missioni, anche se sono tutte facili', () => {
    const tipi = ['personaggio', 'luogo', 'arma', 'creatura', 'oggetto'] as const;
    const qs: Question[] = [];
    for (let i = 0; i < 300; i++) qs.push({ ...mk(i, 'S' + i), tipo: tipi[i % 5], kind: 'k' + (i % 7) });
    for (let i = 300; i < 360; i++) qs.push({ ...mk(i, 'C' + i), tipo: (['cucina', 'bevande', 'chem'] as const)[i % 3], kind: 'k' + (i % 7) });
    const byId = new Map(qs.map((q) => [q.id, q]));
    const lessons = buildLessons(qs, 'fnv');
    for (const l of lessons.slice(0, 5)) expect(l.questionIds.filter((id) => ['cucina', 'bevande', 'chem'].includes(byId.get(id)!.tipo)).length).toBeLessThanOrEqual(1);
    for (const l of lessons.slice(0, 20)) expect(new Set(l.questionIds.map((id) => byId.get(id)!.tipo)).size).toBeGreaterThanOrEqual(4);
  });
});

describe('lezioni', () => {
  it('non mette due domande sullo stesso soggetto nella stessa lezione quando puo evitarlo', () => {
    const qs: Question[] = [];
    for (let s = 0; s < 14; s++) for (let k = 0; k < 3; k++) qs.push(mk(qs.length, `Soggetto ${s}`));
    const lessons = buildLessons(qs, 'fnv');
    const byId = new Map(qs.map((q) => [q.id, q]));
    for (const l of lessons.slice(0, 3)) {
      const subjects = l.questionIds.map((id) => byId.get(id)!.titolo);
      expect(new Set(subjects).size).toBe(subjects.length);
    }
    // le domande non si esauriscono (una puo tornare dopo un po'), ma quasi tutte escono almeno una volta e ogni lezione e piena
    expect(new Set(lessons.flatMap((l) => l.questionIds)).size).toBeGreaterThanOrEqual(qs.length * 0.8);
    for (const l of lessons) expect(new Set(l.questionIds).size).toBe(10);
  });
  it('stesso id in due lingue: indice nella lingua del quiz', () => {
    const a = { ...mk(1, 'Icona'), id: 'icon-x', lang: 'en' as const, q: 'What kind of place?' };
    const b = { ...a, lang: 'it' as const, q: 'Che tipo di luogo?' };
    expect(indexQuestions([a, b], 'en').get('icon-x')!.q).toBe('What kind of place?');
    expect(indexQuestions([b, a], 'en').get('icon-x')!.q).toBe('What kind of place?');
    expect(indexQuestions([a, b], 'it').get('icon-x')!.q).toBe('Che tipo di luogo?');
  });
});
