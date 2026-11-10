import type { Progress, Question } from '../types';
import { CONFIG } from './config';
import { addPoints, answerPoints, emptySpecial } from './special';
import { storeSet } from '../native';

export const STORAGE_KEY = 'wasteland-quiz-progress-v2';

export function initialProgress(): Progress {
  return {
    xp: 0,
    streak: { lastDay: null, count: 0 },
    lessons: {},
    wrong: {},
    seen: [],
    unlocked: [],
    favorites: [],
    stats: { answered: 0, correct: 0, byTopic: {} },
    dailyDone: null,
    settings: { uiLang: 'en', quizLang: 'en', sound: true },
    special: { points: emptySpecial(), allocated: emptySpecial() },
  };
}

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}

/** Serie che varrebbe se oggi si giocasse (anche se non si e' ancora giocato). */
export function streakToday(p: Progress, today: string): number {
  const { lastDay, count } = p.streak;
  if (!lastDay) return 1;
  const gap = daysBetween(lastDay, today);
  if (gap <= 0) return count;
  return gap === 1 ? count + 1 : 1;
}

/** Serie visibile in UI: si spezza se ieri non si e' giocato. */
export function streakShown(p: Progress, today: string): number {
  const { lastDay, count } = p.streak;
  if (!lastDay) return 0;
  return daysBetween(lastDay, today) <= 1 ? count : 0;
}

export function touchStreak(p: Progress, today: string): Progress {
  if (p.streak.lastDay === today) return p;
  return addPoints({ ...p, streak: { lastDay: today, count: streakToday(p, today) } }, 'L', 1); // Luck: un punto per ogni giorno giocato
}

/** Registra una risposta: XP, statistiche, ripasso e sblocco della scheda. */
export function recordAnswer(p: Progress, q: Question, correct: boolean, xpGained: number, today: string, seconds = Infinity): Progress {
  const wrong = { ...p.wrong };
  if (correct || q.kind === 'map') delete wrong[q.id]; // le domande della mappa non esistono nel ripasso
  else wrong[q.id] = addDays(today, CONFIG.reviewDelayDays);
  const base: Progress = {
    ...p,
    xp: p.xp + (correct ? xpGained : 0),
    wrong,
    seen: p.seen.includes(q.id) ? p.seen : [...p.seen, q.id],
    unlocked: correct && q.articleId && !p.unlocked.includes(q.articleId) ? [...p.unlocked, q.articleId] : p.unlocked,
    stats: {
      answered: p.stats.answered + 1,
      correct: p.stats.correct + (correct ? 1 : 0),
      byTopic: q.tipo ? { ...(p.stats.byTopic ?? {}), [q.tipo]: { answered: (p.stats.byTopic?.[q.tipo]?.answered ?? 0) + 1, correct: (p.stats.byTopic?.[q.tipo]?.correct ?? 0) + (correct ? 1 : 0) } } : { ...(p.stats.byTopic ?? {}) },
    },
  };
  return answerPoints(q, correct, seconds).reduce((acc, { k, n }) => addPoints(acc, k, n), base);
}

export function finishLesson(p: Progress, lessonId: string, stars: number): Progress {
  return { ...p, lessons: { ...p.lessons, [lessonId]: Math.max(p.lessons[lessonId] ?? 0, stars) } };
}

export function toggleFavorite(p: Progress, articleId: string): Progress {
  return { ...p, favorites: p.favorites.includes(articleId) ? p.favorites.filter((x) => x !== articleId) : [...p.favorites, articleId] };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialProgress();
    const saved = JSON.parse(raw);
    const init = initialProgress();
    return {
      ...init,
      ...saved,
      stats: { ...init.stats, ...(saved.stats ?? {}), byTopic: { ...(saved.stats?.byTopic ?? {}) } },
      settings: { ...init.settings, ...(saved.settings ?? {}) },
      special: { points: { ...init.special.points, ...(saved.special?.points ?? {}) }, allocated: { ...init.special.allocated, ...(saved.special?.allocated ?? {}) } },
    };
  } catch {
    return initialProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    storeSet(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage non disponibile: si gioca comunque */
  }
}
