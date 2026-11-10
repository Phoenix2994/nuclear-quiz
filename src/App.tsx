import { useEffect, useRef, useState } from 'react';
import type { Article, Question } from './types';
import { StoreProvider, useStore } from './store';
import { levelFromXp } from './game/xp';
import { streakShown } from './game/progress';
import { PathScreen } from './ui/PathScreen';
import { RadioScreen } from './ui/RadioScreen';
import { DataScreen } from './ui/DataScreen';
import { StatScreen } from './ui/StatScreen';
import { useT } from './i18n';
import { loadProgress } from './game/progress';
import { Boot, type Trivia } from './ui/Boot';
import { MapTab } from './features/map/MapTab';

type Tab = 'quiz' | 'radio' | 'data' | 'map' | 'stat';

/** Simbolo di radioattivita: tre pale a 120 gradi attorno a un cerchio centrale. */
const TREFOIL = [30, 150, 270].map((c) => {
  const pt = (r: number, deg: number) => `${(r * Math.cos((deg * Math.PI) / 180)).toFixed(2)} ${(-r * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`;
  const [a, b] = [c - 30, c + 30];
  return `M${pt(3.6, a)} L${pt(9, a)} A9 9 0 0 0 ${pt(9, b)} L${pt(3.6, b)} A3.6 3.6 0 0 1 ${pt(3.6, a)}Z`;
}).join('');

/** Barra di stato in fondo, come nel Pip-Boy: livello con avanzamento XP e giorni di serie. */
function StatusBar() {
  const { progress, today } = useStore();
  const { level, into, span } = levelFromXp(progress.xp);
  const streak = streakShown(progress, today);
  const PIPS = 1; // un solo simbolo: acceso se la serie e attiva, il numero dice quanti giorni
  return (
    <div className="status">
      <span>LV {level}</span>
      <div className="bar rad" role="progressbar" aria-valuenow={Math.round((100 * into) / span)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${Math.round((100 * into) / span)}%` }} />
      </div>
      <span>{progress.xp} XP</span>
      <em className="ap" title={`STREAK ${streak}`} aria-label={`STREAK ${streak}`}>
        {Array.from({ length: PIPS }, (_, k) => (
          <svg key={k} className={k < streak ? 'on' : ''} viewBox="-10 -10 20 20" aria-hidden="true">
            <path d={TREFOIL} />
            <circle r="2.2" />
          </svg>
        ))}
        <b>{streak}</b>
      </em>
    </div>
  );
}

function Shell() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('quiz');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'quiz', label: t('tabQuiz') },
    { key: 'radio', label: t('tabRadio') },
    { key: 'data', label: t('tabData') },
    { key: 'map', label: t('tabMap') },
    { key: 'stat', label: t('tabStat') },
  ];
  return (
    <div className="app">
      <nav className="tabs">
        {tabs.map((x) => (
          <button key={x.key} className={x.key === tab ? 'on' : ''} onClick={() => setTab(x.key)}>
            {x.label}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'quiz' && <PathScreen />}
        {tab === 'radio' && <RadioScreen />}
        {tab === 'data' && <DataScreen />}
        {tab === 'map' && <MapTab />}
        {tab === 'stat' && <StatScreen />}
      </main>
      <StatusBar />
    </div>
  );
}

/** Scarica un JSON contando i byte decompressi man mano, per far avanzare la barra. */
async function fetchJson<T>(url: string, onBytes: (n: number) => void): Promise<T> {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(url);
  const reader = r.body.getReader();
  const parts: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    onBytes(value.length);
  }
  return JSON.parse(await new Blob(parts as BlobPart[]).text());
}

export function App() {
  const [data, setData] = useState<{ questions: Question[]; articles: Article[] } | null>(null);
  const [error, setError] = useState(false);
  const [pct, setPct] = useState(0);
  const [trivia, setTrivia] = useState<Trivia[]>([]);
  const settings = useRef(loadProgress().settings).current;

  useEffect(() => {
    const base = import.meta.env.BASE_URL + 'data/';
    // ?boot=8 tiene visibile la schermata di caricamento per almeno 8 secondi (per provarla)
    const hold = Number(new URLSearchParams(location.search).get('boot')) || 0;
    const t0 = Date.now();
    (async () => {
      const meta = await fetchJson<{ sizes: Record<string, number>; items: Trivia[] }>(base + 'trivia.json', () => {}).catch(() => ({ sizes: {} as Record<string, number>, items: [] as Trivia[] }));
      setTrivia(meta.items);
      const first = `questions-${settings.quizLang}`, other = `questions-${settings.quizLang === 'en' ? 'it' : 'en'}`;
      const total = (meta.sizes[first] ?? 0) + (meta.sizes.articles ?? 0) || 1;
      let got = 0;
      const tick = (n: number) => { got += n; setPct(Math.min(99, (100 * got) / total)); };
      const [questions, articles] = await Promise.all([fetchJson<Question[]>(base + first + '.json', tick), fetchJson<Article[]>(base + 'articles.json', tick)]);
      setPct(100);
      const wait = hold * 1000 - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setData({ questions, articles });
      // l'altra lingua si scarica dopo, a gioco gia aperto
      fetchJson<Question[]>(base + other + '.json', () => {}).then((more) => setData((d) => (d ? { ...d, questions: [...d.questions, ...more] } : d))).catch(() => {});
    })().catch(() => setError(true));
  }, [settings.quizLang]);

  if (error) return <div className="boot">Unable to load the data. Reload the page.</div>;
  if (!data) return <Boot pct={pct} trivia={trivia} lang={settings.uiLang} />;

  return (
    <StoreProvider questions={data.questions} articles={data.articles}>
      <Shell />
    </StoreProvider>
  );
}
