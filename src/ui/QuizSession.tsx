import { useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../types';
import { rngFrom, shuffleOptions } from '../game/session';
import { useStore } from '../store';
import { play } from '../sounds';
import { GAME_LABEL } from '../game/config';
import { useT } from '../i18n';
import type { I18nKey } from '../i18n';
import { img } from '../assets';
import { storeSet } from '../native';

export interface SessionResult {
  correct: number;
  total: number;
  xp: number;
}

interface Props {
  title: string;
  questions: Question[];
  onExit: () => void;
  onFinish: (r: SessionResult) => void;
}

const REPORT_KEY = 'wasteland-quiz-reported-images';

function Lightbox({ src, onClose, label }: { src: string; onClose: () => void; label: string }) {
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label={label}>
      <img src={src} alt="" referrerPolicy="origin" />
      <button className="btn">{label}</button>
    </div>
  );
}

/** Nascosto: le issue di GitHub richiedono un account. Va riattivato con un canale di raccolta senza account (es. modulo Google). */
const SHOW_REPORT = false;

/** Link a una nuova issue di GitHub gia compilata con i dati della domanda: arriva al repository del sito. */
function reportUrl(q: Question, picked: number | null): string {
  const opts = q.options.map((o, k) => `${k === q.answer ? '[x]' : '[ ]'} ${o}${k === picked ? '  <- risposta data' : ''}`).join('\n');
  const body = `Domanda: ${q.q}\n\n${opts}\n\nSpiegazione: ${q.explanation}\n\nId: ${q.id}\nArticolo: ${q.titolo}\nLingua: ${q.lang ?? 'it'}\n\nProblema (scrivi qui):\n`;
  return `https://github.com/Phoenix2994/nuclear-quiz/issues/new?title=${encodeURIComponent('Segnalazione: ' + q.id)}&body=${encodeURIComponent(body)}`;
}

/** Una sessione di quiz: domanda per domanda, feedback con spiegazione, ripasso finale degli errori. */
export function QuizSession({ title, questions, onExit, onFinish }: Props) {
  const store = useStore();
  const { t } = useT();
  const seed = useRef(Math.floor(Math.random() * 2 ** 31));
  const prepared = useMemo(() => {
    const rng = rngFrom(seed.current);
    return questions.map((q) => shuffleOptions(q, rng));
  }, [questions]);

  const [queue, setQueue] = useState<Question[]>(prepared);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [retry, setRetry] = useState<Question[]>([]);
  const [phase, setPhase] = useState<'quiz' | 'summary'>('quiz');
  const [isRetry, setIsRetry] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [reported, setReported] = useState<string[]>([]);
  const startedAt = useRef(Date.now());

  const q = queue[i];
  const total = prepared.length;
  const fbRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (picked !== null) fbRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [picked]);
  useEffect(() => {
    if (phase === 'summary' && correct > 0) play('caps');
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(idx: number) {
    if (picked !== null) return;
    const ok = idx === q.answer;
    const seconds = (Date.now() - startedAt.current) / 1000;
    setPicked(idx);
    play(ok ? 'right' : 'wrong');
    if (!isRetry) {
      const gained = store.answer(q, ok, seconds);
      if (ok) {
        setXp((x) => x + gained);
        setCorrect((c) => c + 1);
      } else setRetry((r) => [...r, q]);
    }
  }

  function next() {
    if (i + 1 < queue.length) {
      setI(i + 1);
      setPicked(null);
      startedAt.current = Date.now();
    } else setPhase('summary');
  }

  function redoWrong() {
    setQueue(retry);
    setRetry([]);
    setIsRetry(true);
    setI(0);
    setPicked(null);
    setPhase('quiz');
    startedAt.current = Date.now();
  }

  function report(id: string) {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(REPORT_KEY) ?? '[]');
      if (!list.includes(id)) storeSet(REPORT_KEY, JSON.stringify([...list, id]));
    } catch {
      /* storage non disponibile */
    }
    setReported((r) => [...r, id]);
  }

  if (phase === 'summary') {
    const wrongLeft = isRetry ? 0 : retry.length;
    return (
      <div className="screen">
        <h2 className="title">{isRetry ? t('reviewDoneTitle') : t('sessionDone')}</h2>
        {!isRetry && (
          <div className="panel center">
            <div className="big">
              {correct}/{total}
            </div>
            <div>{t('correctAnswers')}</div>
            <div className="xp">+{xp} XP</div>
          </div>
        )}
        {wrongLeft > 0 && (
          <button className="btn" onClick={redoWrong}>
            {t('redoWrong', { n: wrongLeft })}
          </button>
        )}
        <button
          className="btn primary"
          onClick={() => {
            store.completeSession();
            onFinish({ correct, total, xp });
          }}
        >
          {t('continue')}
        </button>
      </div>
    );
  }

  const kindKey = `kind_${q.kind ?? 'lore'}` as I18nKey;
  const isTF = q.kind === 'tf';
  const tags = q.giochi.map((g) => GAME_LABEL[g] ?? g).join(' · ');
  const answered = picked !== null;
  return (
    <div className={`screen quiz ${answered ? "answered" : ""}`}>
      <div className="topbar">
        <button className="link" onClick={onExit} aria-label={t('close')}>
          ✕
        </button>
        <span className="muted">{title}</span>
        <span className="muted">
          {i + 1}/{queue.length}
        </span>
      </div>
      <div className="progressbar">
        <div style={{ width: `${(i / queue.length) * 100}%` }} />
      </div>
      <p className="tags">
        <span className="badge">{isRetry ? t('reviewTag') : t(kindKey)}</span> {tags}
      </p>
      {q.map && (
        <figure className="hero mapview" aria-label="map">
          <img src={`img/maps/${q.map.group}.webp`} alt="" loading="eager" style={{ transform: `translate(-${q.map.x / 10}%, -${q.map.y / 10}%)` }} />
          <span className="mappin" />
        </figure>
      )}
      {q.img && (
        <figure className="hero" onClick={() => setZoom(img(q.img!))}>
          <img src={img(q.img)} alt="" referrerPolicy="origin" loading="eager" />
          {answered && (
            <button
              className="report"
              disabled={reported.includes(q.id)}
              onClick={(e) => {
                e.stopPropagation();
                report(q.id);
              }}
            >
              {reported.includes(q.id) ? t('reported') : t('reportImage')}
            </button>
          )}
        </figure>
      )}
      <h2 className="question">{q.q}</h2>
      <div className={`options ${isTF ? 'tf' : ''}`}>
        {q.options.map((o, idx) => {
          const cls = !answered ? '' : idx === q.answer ? 'right' : idx === picked ? 'wrong' : 'dim';
          const optImg = q.optionImgs?.[idx];
          return (
            <div key={idx} className={`option-row ${optImg ? 'has-img' : ''}`}>
              <button className={`option ${cls}`} disabled={answered} onClick={() => choose(idx)}>
                {!isTF && <span className="letter">{String.fromCharCode(65 + idx)}</span>}
                <span>{o}</span>
              </button>
              {optImg && (
                <button className="thumb" aria-label={t('viewImage')} onClick={() => setZoom(optImg)}>
                  <img src={optImg} alt="" referrerPolicy="origin" loading="lazy" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {answered && (
        <div ref={fbRef} className={`feedback ${picked === q.answer ? 'ok' : 'ko'}`}>
          <strong>{picked === q.answer ? t('correct') : t('wrong')}</strong>
          {store.articles.get(q.articleId)?.about && <p className="about">{store.articles.get(q.articleId)!.about}</p>}
          <p>{q.explanation}</p>
          <div className="fb-actions">
            {store.articles.get(q.articleId)?.url && (
              <a className="btn" href={store.articles.get(q.articleId)!.url} target="_blank" rel="noreferrer">
                {t('readOnWiki')} ↗
              </a>
            )}
            {SHOW_REPORT && (
              <a className="btn" href={reportUrl(q, picked)} target="_blank" rel="noreferrer">
                {t('report')} ↗
              </a>
            )}
            <button className="btn primary" onClick={next}>
              {i + 1 < queue.length ? t('next') : t('finish')}
            </button>
          </div>
        </div>
      )}
      {zoom && <Lightbox src={zoom} label={t('close')} onClose={() => setZoom(null)} />}
    </div>
  );
}
