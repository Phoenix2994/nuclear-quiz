import { useEffect, useMemo, useState } from 'react';
import type { GameKey, Lesson, Question } from '../types';
import { EPOCHS, GAMES } from '../game/config';
import { buildLessons, gamesWithPath, pathKey, starsFor } from '../game/session';
import { useStore } from '../store';
import { useT } from '../i18n';
import { QuizSession } from './QuizSession';
import { LockIcon } from './Icons';

/** Tab QUIZ: percorso a lezioni per gioco, sbloccate in sequenza. */
export function PathScreen() {
  const store = useStore();
  const { t } = useT();
  const { questions, progress } = store;
  const games = useMemo(() => GAMES.filter((g) => g.key !== 'vanburen' && gamesWithPath(questions, [g.key]).length), [questions]);
  // giochi scelti (anche piu' di uno, domande mescolate): di partenza l'epoca Bethesda
  const available = games.map((g) => g.key);
  const epochs = [
    ...EPOCHS.map((e) => ({ key: e.key as 'classic' | 'bethesda' | 'all', label: t(e.key === 'classic' ? 'epochClassic' : 'epochBethesda'), games: e.games.filter((k) => available.includes(k)) })),
    { key: 'all' as const, label: t('epochAll'), games: available },
  ].filter((e) => e.games.length);
  // con un'epoca scelta si possono selezionare solo i suoi giochi; per mescolare epoche diverse serve TUTTI
  const epoch = epochs.find((e) => e.key === (progress.settings.pathEpoch ?? 'bethesda')) ?? epochs[0];
  const saved = (progress.settings.pathGames ?? epoch.games).filter((k) => epoch.games.includes(k));
  const selected: GameKey[] = saved.length ? saved : epoch.games;
  const chooseEpoch = (e: (typeof epochs)[number]) => {
    store.setSetting('pathEpoch', e.key);
    store.setSetting('pathGames', e.games);
  };
  const toggleGame = (k: GameKey) => {
    if (selected.includes(k)) { if (selected.length > 1) store.setSetting('pathGames', selected.filter((x) => x !== k)); }
    else store.setSetting('pathGames', epoch.games.filter((x) => x === k || selected.includes(x)));
  };
  const [deco, setDeco] = useState<{ img: string; title: string }[]>([]);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/deco.json`).then((r) => r.json()).then((d) => setDeco(d.pool ?? [])).catch(() => {});
  }, []);
  const [active, setActive] = useState<{ lesson: Lesson; qs: Question[] } | null>(null);

  const current = selected[0];
  const lessons = useMemo(() => (current ? buildLessons(questions, selected) : []), [questions, selected.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstOpen = lessons.findIndex((l) => !progress.lessons[l.id]);
  const unlockedUpTo = firstOpen === -1 ? lessons.length - 1 : firstOpen;

  if (!current) return <div className="screen"><p className="muted">{t('noQuestions')}</p></div>;

  function start(l: Lesson) {
    const qs = l.questionIds.map((id) => store.questionsById.get(id)!).filter(Boolean);
    // le domande da ripassare di questo gioco entrano al posto delle ultime
    const pool = questions.filter((q) => q.giochi.some((g) => selected.includes(g)));
    const due = pool.filter((q) => progress.wrong[q.id] && progress.wrong[q.id] <= store.today && !qs.some((x) => x.id === q.id)).slice(0, 3);
    setActive({ lesson: l, qs: [...qs.slice(0, Math.max(5, qs.length - due.length)), ...due] });
  }

  const gameInfo = GAMES.find((g) => g.key === current)!;
  const infos = selected.map((k) => GAMES.find((g) => g.key === k)!);
  const years = infos.map((g) => g.year).filter((y): y is number => !!y);
  const mix = selected.length > 1;
  const title = !mix ? gameInfo.label : selected.length > 4 ? t('allGames') : infos.map((g) => g.short).join(' · ');
  if (active) {
    const { lesson, qs } = active;
    return (
      <QuizSession
        title={`${mix ? title : gameInfo.label} · ${t('lesson', { n: lesson.index + 1 })}`}
        questions={qs}
        onExit={() => setActive(null)}
        onFinish={(r) => {
          store.completeLesson(lesson.id, starsFor(r.correct, r.total));
          setActive(null);
        }}
      />
    );
  }

  const done = lessons.filter((l) => progress.lessons[l.id]).length;
  const gameShift = GAMES.findIndex((g) => g.key === current);
  return (
    <div className="screen">
      <div className="chips eras">
        {epochs.map((e) => (
          <button key={e.key} className={`chip ${e.key === epoch.key ? 'on' : ''}`} onClick={() => chooseEpoch(e)}>
            {e.label}
          </button>
        ))}
      </div>
      <div className="chips picks">
        {games.filter((g) => epoch.games.includes(g.key)).map((g) => (
          <button key={g.key} className={`chip ${selected.includes(g.key) ? 'sel' : ''}`} aria-pressed={selected.includes(g.key)} onClick={() => toggleGame(g.key)}>
            {g.short}
          </button>
        ))}
      </div>
      <header className="hero-title">
        <span className="kicker">{years.length ? (Math.min(...years) === Math.max(...years) ? Math.min(...years) : `${Math.min(...years)} – ${Math.max(...years)}`) : ''}</span>
        <h2>{title}</h2>
        <div className="progressbar"><div style={{ width: `${lessons.length ? (100 * done) / lessons.length : 0}%` }} /></div>
        <p className="muted">{t('lessonsDone', { done, total: lessons.length })}</p>
      </header>
      {lessons[unlockedUpTo] && (
        <div className="pb-detail">
          {deco.length > 0 && <img src={deco[(unlockedUpTo + gameShift * 5) % deco.length].img} alt="" referrerPolicy="origin" />}
          <div>
            <strong>{t('lessonLabel', { n: unlockedUpTo + 1 })}</strong>
            <p className="muted">{mix ? t('mixGames', { n: selected.length }) : gameInfo.label}</p>
          </div>
          <button className="btn primary" onClick={() => start(lessons[unlockedUpTo])}>▶ {t('tabQuiz')}</button>
        </div>
      )}
      <div className="pb-list">
        {lessons.map((l, idx) => {
          const stars = progress.lessons[l.id] ?? 0;
          const locked = idx > unlockedUpTo;
          return (
            <button key={l.id} className={`pb-row ${idx === unlockedUpTo ? 'sel' : ''} ${locked ? 'lock' : ''}`} disabled={locked} onClick={() => start(l)}>
              <span className="sq" />
              <span>{t('lessonLabel', { n: idx + 1 })}</span>
              <i>{locked ? <LockIcon /> : stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : ''}</i>
            </button>
          );
        })}
      </div>
    </div>
  );
}
