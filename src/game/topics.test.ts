import { describe, expect, it } from 'vitest';
import { adjustedPct, groupSummary, levelFor, levelProgress, MIN_ANSWERS, RADAR_GROUPS, TOPIC_CARDS, topicSummary } from './topics';

describe('percentuale corretta e livelli', () => {
  it('smorza la percentuale con 10 risposte neutre', () => {
    expect(adjustedPct(10, 10)).toBe(0.75);
    expect(adjustedPct(100, 100)).toBeCloseTo(0.9545, 3);
    expect(adjustedPct(0, 0)).toBe(0.5);
    expect(adjustedPct(0, 20)).toBeCloseTo(5 / 30, 6);
  });
  it('assegna il livello dalle soglie 45/60/75/88', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(0.449)).toBe(1);
    expect(levelFor(0.45)).toBe(2);
    expect(levelFor(0.6)).toBe(3);
    expect(levelFor(0.75)).toBe(4);
    expect(levelFor(0.88)).toBe(5);
    expect(levelFor(1)).toBe(5);
  });
  it('misura l avanzamento dentro la fascia', () => {
    expect(levelProgress(0.525)).toBeCloseTo(0.5, 6);
    expect(levelProgress(0.95)).toBe(1);
    expect(levelProgress(0)).toBe(0);
  });
});

describe('riepilogo per topic e per gruppo', () => {
  it('senza dati non da livello e non divide per zero', () => {
    const s = topicSummary(undefined, 'arma');
    expect(s).toMatchObject({ answered: 0, correct: 0, wrong: 0, rawPct: 0, enough: false, level: null });
    expect(Number.isFinite(s.pct)).toBe(true);
  });
  it('sotto la soglia di 5 risposte nessun livello, a 5 si', () => {
    expect(MIN_ANSWERS).toBe(5);
    expect(topicSummary({ arma: { answered: 4, correct: 4 } }, 'arma').enough).toBe(false);
    const s = topicSummary({ arma: { answered: 5, correct: 5 } }, 'arma');
    expect(s).toMatchObject({ enough: true, level: 3, rawPct: 1, wrong: 0 });
  });
  it('tutte sbagliate resta nei limiti', () => {
    const s = topicSummary({ chem: { answered: 40, correct: 0 } }, 'chem');
    expect(s.level).toBe(1);
    expect(s.pct).toBeGreaterThanOrEqual(0);
    expect(s.wrong).toBe(40);
  });
  it('un gruppo somma i suoi topic', () => {
    const g = groupSummary({ arma: { answered: 6, correct: 6 }, armatura: { answered: 4, correct: 4 } }, RADAR_GROUPS[2]);
    expect(g).toMatchObject({ answered: 10, correct: 10, enough: true });
  });
  it('ignora un tipo senza domande inglesi o sconosciuto', () => {
    const g = groupSummary({ meccanica: { answered: 50, correct: 50 } } as never, RADAR_GROUPS[0]);
    expect(g.answered).toBe(0);
  });
});

describe('definizione dei gruppi', () => {
  it('ha 6 vertici e ogni scheda sta in un solo vertice', () => {
    expect(RADAR_GROUPS).toHaveLength(6);
    expect(TOPIC_CARDS).toHaveLength(14);
    for (const t of TOPIC_CARDS) expect(RADAR_GROUPS.filter((g) => g.topics.includes(t))).toHaveLength(1);
    const all = RADAR_GROUPS.flatMap((g) => g.topics);
    expect(all).not.toContain('meccanica');
    expect(all).not.toContain('lore');
  });
});

describe('dati dei livelli e topic mostrati', () => {
  it('ogni scheda ha 5 livelli e un etichetta', async () => {
    const { TOPIC_LEVELS, TOPIC_LABELS } = await import('./topicLevels');
    for (const t of TOPIC_CARDS) {
      expect(TOPIC_LEVELS[t]).toHaveLength(5);
      expect(TOPIC_LABELS[t].length).toBeGreaterThan(0);
    }
  });
  it('topicsWithQuestions raccoglie i tipi presenti', async () => {
    const { topicsWithQuestions } = await import('./topics');
    const s = topicsWithQuestions([{ tipo: 'arma' }, { tipo: 'arma' }, { tipo: 'lore' }] as never);
    expect([...s].sort()).toEqual(['arma', 'lore']);
  });
});

describe('geometria del radar', () => {
  const dist = (p: { x: number; y: number }, size: number) => Math.hypot(p.x - size / 2, p.y - size / 2);
  it('mette i vertici sul raggio massimo e il primo in alto', async () => {
    const { radarGeometry } = await import('./topics');
    const g = radarGeometry([1, 1, 1, 1, 1, 1], 200);
    expect(g.axes).toHaveLength(6);
    expect(g.axes[0].x).toBeCloseTo(100, 6);
    expect(g.axes[0].y).toBeCloseTo(100 - 76, 6);
    for (const a of g.axes) expect(dist(a, 200)).toBeCloseTo(76, 6);
    expect(g.rings).toHaveLength(4);
  });
  it('con valori 0.5 i punti stanno a meta raggio', async () => {
    const { radarGeometry } = await import('./topics');
    const g = radarGeometry([0.5, 0.5, 0.5, 0.5, 0.5, 0.5], 200);
    for (const d of g.dots) expect(dist(d!, 200)).toBeCloseTo(38, 6);
  });
  it('valori null: nessun punto, il poligono li tratta come 0, tutto dentro il quadrato', async () => {
    const { radarGeometry } = await import('./topics');
    const g = radarGeometry([0.5, null, 1, 0, 0.25, 1], 200);
    expect(g.dots[1]).toBeNull();
    for (const d of g.dots) if (d) { expect(d.x).toBeGreaterThanOrEqual(0); expect(d.x).toBeLessThanOrEqual(200); expect(d.y).toBeGreaterThanOrEqual(0); expect(d.y).toBeLessThanOrEqual(200); }
    expect(g.shape.split(' ')).toHaveLength(6);
  });
  it('tutti a 0 danno un poligono collassato sul centro', async () => {
    const { radarGeometry } = await import('./topics');
    const g = radarGeometry([0, 0, 0, 0, 0, 0], 200);
    expect(new Set(g.shape.split(' ')).size).toBe(1);
    expect(g.shape.split(' ')[0]).toBe('100,100');
  });
  it('valori fuori da 0-1 vengono limitati', async () => {
    const { radarGeometry } = await import('./topics');
    const g = radarGeometry([2, -1, 1, 1, 1, 1], 200);
    expect(dist(g.dots[0]!, 200)).toBeCloseTo(76, 6);
    expect(dist(g.dots[1]!, 200)).toBeCloseTo(0, 6);
  });
});

describe('ordine delle schede', () => {
  it('prima i topic con dati dal migliore, poi gli altri nell ordine standard', async () => {
    const { cardOrder } = await import('./topics');
    const by = { arma: { answered: 20, correct: 20 }, creatura: { answered: 10, correct: 5 }, luogo: { answered: 3, correct: 3 } };
    const shown = new Set(['arma', 'creatura', 'luogo', 'fazione']) as never;
    expect(cardOrder(by, shown)).toEqual(['arma', 'creatura', 'luogo', 'fazione']);
  });
  it('un topic fuori dalle 14 schede non compare', async () => {
    const { cardOrder } = await import('./topics');
    expect(cardOrder({}, new Set(['meccanica', 'arma']) as never)).toEqual(['arma']);
  });
  it('a parita di dati il migliore e quello con piu risposte', async () => {
    const { cardOrder } = await import('./topics');
    const by = { arma: { answered: 10, correct: 10 }, chem: { answered: 40, correct: 40 } };
    expect(cardOrder(by, new Set(['arma', 'chem']) as never)).toEqual(['chem', 'arma']);
  });
});

describe('contenuti dei livelli', () => {
  it('nomi diversi e non segnaposto, descrizioni brevi, immagini https o vuote', async () => {
    const { TOPIC_LEVELS } = await import('./topicLevels');
    for (const t of TOPIC_CARDS) {
      const lv = TOPIC_LEVELS[t];
      expect(new Set(lv.map((l) => l.name)).size).toBe(5);
      for (const l of lv) {
        expect(l.name).not.toMatch(/^Level \d$/);
        expect(l.name.length).toBeGreaterThan(2);
        expect(l.desc.length).toBeGreaterThan(5);
        expect(l.desc.length).toBeLessThanOrEqual(110);
        expect(l.img === '' || l.img.startsWith('https://')).toBe(true);
      }
    }
  });
  it('quasi tutte le immagini ci sono', async () => {
    const { TOPIC_LEVELS } = await import('./topicLevels');
    const all = TOPIC_CARDS.flatMap((t) => TOPIC_LEVELS[t]);
    expect(all.filter((l) => l.img).length).toBeGreaterThanOrEqual(66);
  });
});
