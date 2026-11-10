import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setSoundEnabled } from './sounds';
import type { Article, Progress, Question, Settings, SpecialKey } from './types';
import { addPoints, allocatePoint } from './game/special';
import { finishLesson, initialProgress, loadProgress, recordAnswer, saveProgress, streakToday, todayStr, toggleFavorite, touchStreak } from './game/progress';
import { xpForAnswer } from './game/xp';
import { HIDDEN_GAMES } from './game/config';
import { indexQuestions } from './game/session';

interface Store {
  questions: Question[];
  /** Domande del Topic Canzoni: si fanno solo dalla scheda RADIO, mai nel Quiz generale. */
  songQuestions: Question[];
  articles: Map<string, Article>;
  questionsById: Map<string, Question>;
  progress: Progress;
  today: string;
  /** Registra una risposta e restituisce gli XP guadagnati. */
  answer: (q: Question, correct: boolean, seconds: number) => number;
  completeLesson: (lessonId: string, stars: number) => void;
  completeSession: () => void;
  markDailyDone: () => void;
  /** Assegna a mano un punto S.P.E.C.I.A.L. (uno per ogni livello guadagnato). */
  allocate: (k: SpecialKey) => void;
  toggleFav: (articleId: string) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuori da StoreProvider');
  return s;
}

export function StoreProvider({ questions, articles, children }: { questions: Question[]; articles: Article[]; children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const today = todayStr();

  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => setSoundEnabled(progress.settings.sound ?? true), [progress.settings.sound]);

  const questionsById = useMemo(() => indexQuestions(questions, progress.settings.quizLang), [questions, progress.settings.quizLang]);
  const articleMap = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);

  const answer = useCallback(
    (q: Question, correct: boolean, seconds: number) => {
      const gained = correct ? xpForAnswer(q.livello, streakToday(progress, today), seconds) : 0;
      setProgress((p) => recordAnswer(p, q, correct, gained, today, seconds));
      return gained;
    },
    [progress, today],
  );

  const quizLang = progress.settings.quizLang;
  const quizQuestions = useMemo(() => questions.filter((q) => q.tipo !== 'canzone' && (q.lang ?? 'it') === quizLang && !(q.giochi.length > 0 && q.giochi.every((g) => HIDDEN_GAMES.includes(g)))), [questions, quizLang]);
  const songQuestions = useMemo(() => questions.filter((q) => q.tipo === 'canzone' && (q.lang ?? 'it') === quizLang), [questions, quizLang]);

  const value: Store = {
    questions: quizQuestions,
    songQuestions,
    articles: articleMap,
    questionsById,
    progress,
    today,
    answer,
    completeLesson: (id, stars) => setProgress((p) => finishLesson(p, id, stars)),
    completeSession: () => setProgress((p) => touchStreak(p, today)),
    markDailyDone: () => setProgress((p) => (p.dailyDone === today ? p : addPoints({ ...p, dailyDone: today }, 'L', 2))), // Luck: quiz del giorno
    allocate: (k) => setProgress((p) => allocatePoint(p, k)),
    toggleFav: (id) => setProgress((p) => toggleFavorite(p, id)),
    setSetting: (key, value) => setProgress((p) => ({ ...p, settings: { ...p.settings, [key]: value } })),
    reset: () => setProgress((p) => ({ ...initialProgress(), settings: p.settings })),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

