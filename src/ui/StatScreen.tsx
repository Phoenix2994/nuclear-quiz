import { CONFIG } from '../game/config';
import { streakShown } from '../game/progress';
import { levelFromXp, titoloForLevel, TITOLI } from '../game/xp';
import '../special.css';
import { TopicsTab } from './TopicsTab';
import { useStore } from '../store';
import { play, setSoundEnabled } from '../sounds';
import { useEffect, useState } from 'react';
import { freePoints, MAX_STAT, SPECIAL_INFO, SPECIAL_KEYS, SPECIAL_NAMES, statProgress, statValue } from '../game/special';
import { useT } from '../i18n';
import type { Lang, SpecialKey } from '../types';
import { img as assetImg } from '../assets';

type Sub = 'status' | 'special' | 'topics' | 'config';

const LINK_WIKI_EN = 'https://fallout.fandom.com';
const LINK_WIKI_IT = 'https://fallout.fandom.com/it';
const LINK_LICENSE = 'https://creativecommons.org/licenses/by-sa/3.0/';

function Credits({ lang }: { lang: Lang }) {
  const a = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
  return lang === 'it' ? (
    <p className="credits">
      I testi delle schede provengono dalla Fallout Wiki ({a(LINK_WIKI_EN, 'inglese')} e {a(LINK_WIKI_IT, 'italiana')}) e sono disponibili con licenza {a(LINK_LICENSE, 'CC BY-SA 3.0')}. Le domande sono state rielaborate a partire da quei testi e sono rilasciate con la stessa licenza. Le immagini appartengono ai rispettivi proprietari e sono mostrate dalla wiki. Progetto non ufficiale di appassionati: non è affiliato a Bethesda Softworks, ZeniMax Media o Microsoft. Fallout e i relativi marchi appartengono ai rispettivi proprietari.
    </p>
  ) : (
    <p className="credits">
      Entry texts come from the Fallout Wiki ({a(LINK_WIKI_EN, 'English')} and {a(LINK_WIKI_IT, 'Italian')}) and are available under {a(LINK_LICENSE, 'CC BY-SA 3.0')}. The questions were adapted from those texts and are released under the same license. Images belong to their respective owners and are displayed from the wiki. Unofficial fan project: not affiliated with Bethesda Softworks, ZeniMax Media or Microsoft. Fallout and related trademarks belong to their respective owners.
    </p>
  );
}
export function StatScreen() {
  const { progress, today, reset, setSetting, allocate, articles } = useStore();
  const free = freePoints(progress);
  const [sub, setSub] = useState<Sub>('special');
  const [sel, setSel] = useState<SpecialKey>('S');
  const [deco, setDeco] = useState<{ img: string; title: string }[]>([]);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/deco.json`).then((r) => r.json()).then((d) => setDeco(d.pool ?? [])).catch(() => {});
  }, []);
  /** Immagine iconica: prima il gruppo di immagini senza sfondo, poi qualsiasi scheda con quel titolo. */
  const imgFor = (title: string) => deco.find((d) => d.title === title)?.img ?? [...articles.values()].find((a) => a.lang === 'en' && a.titolo === title)?.img;
  const { t, lang } = useT();
  const { level, into, span } = levelFromXp(progress.xp);
  const streak = streakShown(progress, today);
  const due = Object.values(progress.wrong).filter((date) => date <= today).length;
  const accuracy = progress.stats.answered ? Math.round((progress.stats.correct / progress.stats.answered) * 100) : 0;
  const resetProgress = () => {
    if (window.confirm(t('resetConfirm'))) reset();
  };
  const langChips = (value: Lang, set: (l: Lang) => void) => (
    <div className="chips">
      {(['en', 'it'] as Lang[]).map((l) => (
        <button key={l} className={`chip ${value === l ? 'on' : ''}`} onClick={() => set(l)}>
          {l === 'en' ? 'English' : 'Italiano'}
        </button>
      ))}
    </div>
  );

  const subs: { key: Sub; label: string }[] = [
    { key: 'status', label: t('subStatus') },
    { key: 'special', label: t('special') },
    { key: 'topics', label: t('subTopics') },
    { key: 'config', label: t('settings') },
  ];
  const info = SPECIAL_INFO[sel];
  const img = info.img ?? imgFor(info.icon);

  return (
    <div className="screen">
      <div className="chips scroll">
        {subs.map((s) => (
          <button key={s.key} className={`chip ${sub === s.key ? 'on' : ''}`} onClick={() => setSub(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {sub === 'status' && (
        <>
          <section className="panel">
            <h3 className="subtitle">{t('level', { n: level })}</h3>
            <p>{titoloForLevel(level)}</p>
            <div className="progressbar" role="progressbar" aria-valuenow={into} aria-valuemin={0} aria-valuemax={span}>
              <div style={{ width: `${Math.min(100, (into / span) * 100)}%` }} />
            </div>
            <p className="muted">{t('xpToNext', { a: into, b: span })}</p>
            <p className="xp">{t('totalXp', { n: progress.xp })}</p>
          </section>

          <section className="panel">
            <h3 className="subtitle">{t('streak')}</h3>
            <p className="big center">{streak}</p>
            <p className="center">{streak === 1 ? t('streakDay') : t('streakDays')}</p>
            <p className="muted center">{t('streakBonus', { n: Math.round(CONFIG.kStreak * Math.sqrt(streak) * 100) })}</p>
          </section>

          <section className="panel">
            <h3 className="subtitle">{t('statistics')}</h3>
            <p>{t('answers', { n: progress.stats.answered })}</p>
            <p>{t('correctCount', { n: progress.stats.correct })}</p>
            <p>{t('accuracy', { n: accuracy })}</p>
            <p>{t('lessonsCompleted', { n: Object.keys(progress.lessons).length })}</p>
            <p>{t('entriesUnlocked', { n: progress.unlocked.length })}</p>
            <p>{t('toReview', { n: due })}</p>
          </section>

          <section className="panel">
            <h3 className="subtitle">{t('titles')}</h3>
            {TITOLI.map(({ level: requiredLevel, titolo }) => {
              const reached = level >= requiredLevel;
              return (
                <p key={requiredLevel} style={{ opacity: reached ? 1 : 0.45 }}>
                  {reached ? '◆' : '◇'} {titolo}
                  {!reached && ` — ${t('titleAtLevel', { n: requiredLevel })}`}
                </p>
              );
            })}
          </section>
        </>
      )}

      {sub === 'special' && (
        <section className="panel">
          {free > 0 && <p className="free">{t('freePoints', { n: free })}</p>}
          {SPECIAL_KEYS.map((k) => {
            const v = statValue(progress, k);
            return (
              <div key={k} className={`special-row ${k === sel ? 'sel' : ''}`} onClick={() => setSel(k)}>
                <span className="sp-name"><b>{k}</b> {SPECIAL_NAMES[k]}</span>
                <span className="sp-bar"><span style={{ width: `${Math.round(statProgress(progress, k) * 100)}%` }} /></span>
                <span className="sp-val">{v}</span>
                {free > 0 && v < MAX_STAT ? (
                  <button className="sp-plus" onClick={(e) => { e.stopPropagation(); allocate(k); }} aria-label={`+1 ${SPECIAL_NAMES[k]}`}>+</button>
                ) : (
                  <span className="sp-plus" />
                )}
              </div>
            );
          })}
          <div className="sp-detail">
            {img && <img src={assetImg(img)} alt="" referrerPolicy="origin" />}
            <div>
              <strong>{SPECIAL_NAMES[sel]}</strong>
              <p className="muted">{info.desc}</p>
            </div>
          </div>
          <p className="muted">{t('specialHint')}</p>
        </section>
      )}

      {sub === 'topics' && <TopicsTab />}

      {sub === 'config' && (
        <>
          <section className="panel">
            <h3 className="subtitle">{t('settings')}</h3>
            <p className="muted">{t('uiLanguage')}</p>
            {langChips(progress.settings.uiLang, (l) => setSetting('uiLang', l))}
            <p className="muted">{t('quizLanguage')}</p>
            {langChips(progress.settings.quizLang, (l) => setSetting('quizLang', l))}
            <p className="muted">{t('sound')}</p>
            <div className="chips">
              {[true, false].map((on) => (
                <button key={String(on)} className={`chip ${(progress.settings.sound ?? true) === on ? 'on' : ''}`} onClick={() => { setSetting('sound', on); setSoundEnabled(on); if (on) play('right'); }}>
                  {t(on ? 'soundOn' : 'soundOff')}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3 className="subtitle">{t('credits')}</h3>
            <Credits lang={lang} />
          </section>

          <button className="btn" onClick={resetProgress}>
            {t('resetProgress')}
          </button>
        </>
      )}
    </div>
  );
}
