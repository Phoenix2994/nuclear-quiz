import { useMemo, useState } from 'react';
import type { Question } from '../types';
import { GAMES, TEMI } from '../game/config';
import { buildPractice, dailyQuestions, rngFrom } from '../game/session';
import { streakShown } from '../game/progress';
import { useStore } from '../store';
import { useT } from '../i18n';
import { QuizSession } from './QuizSession';
import { RadioWave } from './RadioWave';

interface Active {
  title: string;
  qs: Question[];
  daily?: boolean;
}

type Sub = 'today' | 'topic' | 'game';

interface Item {
  id: string;
  title: string;
  sub: string;
  count?: number;
  disabled?: boolean;
  run: () => void;
}

/** Tab RADIO: onda animata, sotto-schede Oggi / Tema / Gioco, elenco Pip-Boy e dettaglio con avvio. */
export function RadioScreen() {
  const store = useStore();
  const { t, tema } = useT();
  const { questions, songQuestions, progress, today } = store;
  const topicPool = (key: string) => (key === 'canzone' ? songQuestions : questions.filter((q) => q.tipo === key));
  const [active, setActive] = useState<Active | null>(null);
  const [sub, setSub] = useState<Sub>('today');
  const [selId, setSelId] = useState<string | null>(null);
  const rng = () => rngFrom(Math.floor(Math.random() * 2 ** 31));

  const dueIds = useMemo(() => Object.keys(progress.wrong).filter((id) => progress.wrong[id] <= today && store.questionsById.has(id)), [progress.wrong, today, store.questionsById]);
  const dailyDone = progress.dailyDone === today;

  if (active) {
    return (
      <QuizSession
        title={active.title}
        questions={active.qs}
        onExit={() => setActive(null)}
        onFinish={() => {
          if (active.daily) store.markDailyDone();
          setActive(null);
        }}
      />
    );
  }

  const start = (title: string, qs: Question[], daily = false) => qs.length && setActive({ title, qs, daily });
  const shown = streakShown(progress, today);

  const items: Item[] =
    sub === 'today'
      ? [
          { id: 'daily', title: t('dailyQuiz'), sub: dailyDone ? t('dailyDone') : t('dailySub'), run: () => start(t('dailyQuiz'), dailyQuestions(questions, today), true) },
          {
            id: 'review',
            title: t('review'),
            sub: dueIds.length ? t('reviewDue', { n: dueIds.length }) : t('reviewNone'),
            count: dueIds.length,
            disabled: !dueIds.length,
            run: () => start(t('review'), dueIds.map((id) => store.questionsById.get(id)!).slice(0, 10)),
          },
          { id: 'mixed', title: t('mixed'), sub: t('mixedSub'), run: () => start(t('mixed'), buildPractice(questions, progress, today, rng())) },
        ]
      : sub === 'topic'
        ? TEMI.map((x) => ({ x, n: topicPool(x.key).length }))
            .filter(({ n }) => n > 0)
            .map(({ x, n }) => ({
              id: x.key,
              title: tema(x.key),
              sub: t('questionsCount', { n }),
              count: n,
              run: () => start(tema(x.key), buildPractice(topicPool(x.key), progress, today, rng())),
            }))
        : GAMES.map((g) => ({ g, n: questions.filter((q) => q.giochi.includes(g.key) && q.kind !== 'game').length }))
            .filter(({ n }) => n > 0)
            .map(({ g, n }) => ({
              id: g.key,
              title: g.label,
              sub: t('questionsCount', { n }),
              count: n,
              run: () => start(g.label, buildPractice(questions.filter((q) => q.giochi.includes(g.key) && q.kind !== 'game'), progress, today, rng())),
            }));

  const sel = items.find((i) => i.id === selId) ?? items.find((i) => !i.disabled) ?? items[0];
  const subs: { key: Sub; label: string }[] = [
    { key: 'today', label: t('radioToday') },
    { key: 'topic', label: t('radioTopic') },
    { key: 'game', label: t('radioGame') },
  ];

  return (
    <div className="screen radio">
      <RadioWave />
      <p className="muted data-sum">{shown > 0 ? t('streakActive', { n: shown, days: shown === 1 ? t('day') : t('days') }) : t('noStreak')}</p>
      <div className="chips scroll">
        {subs.map((s) => (
          <button
            key={s.key}
            className={`chip ${sub === s.key ? 'on' : ''}`}
            onClick={() => {
              setSub(s.key);
              setSelId(null);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sel && (
        <div className="pb-detail">
          <div>
            <strong>{sel.title}</strong>
            <p className="muted">{sel.sub}</p>
          </div>
          <button className="btn primary" disabled={sel.disabled} onClick={sel.run}>
            ▶ {t('tabQuiz')}
          </button>
        </div>
      )}
      <div className="pb-list radio-list">
        {items.map((i) => (
          <button key={i.id} className={`pb-row ${sel?.id === i.id ? 'sel' : ''} ${i.disabled ? 'lock' : ''}`} onClick={() => setSelId(i.id)}>
            <span className="sq" />
            <span className="ellipsis">{i.title}</span>
            {i.count !== undefined && <i>{i.count}</i>}
          </button>
        ))}
      </div>
    </div>
  );
}
