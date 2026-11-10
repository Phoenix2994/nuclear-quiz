import { useMemo } from 'react';
import { cardOrder, groupSummary, MIN_ANSWERS, RADAR_GROUPS, topicsWithQuestions, topicSummary } from '../game/topics';
import { TOPIC_LABELS, TOPIC_LEVELS } from '../game/topicLevels';
import { useT } from '../i18n';
import { useStore } from '../store';
import '../topics.css';
import { TopicRadar } from './TopicRadar';
import { img } from '../assets';

const FALLBACK_IMG = `${import.meta.env.BASE_URL}img/vaultboy-walk.png`;

export function TopicsTab() {
  const { t } = useT();
  const { progress, questions, songQuestions } = useStore();
  const by = progress.stats.byTopic;
  const shown = useMemo(() => topicsWithQuestions([...questions, ...songQuestions]), [questions, songQuestions]);
  const order = cardOrder(by, shown);
  const groups = RADAR_GROUPS.map((g) => ({ g, s: groupSummary(by, g) }));
  const values = groups.map(({ s }) => (s.enough ? s.pct : null));
  const withData = groups.filter(({ s }) => s.enough);
  const showRadar = withData.length >= 3;
  const best = [...withData].sort((a, b) => b.s.pct - a.s.pct);
  return (
    <>
      <section className="panel">
        {showRadar ? (
          <>
            <TopicRadar values={values} labels={groups.map(({ g }) => g.label)} />
            <p className="muted center">{t('topicsStrongest', { name: best[0].g.label })}</p>
            {best[best.length - 1].s.pct < best[0].s.pct && <p className="muted center">{t('topicsWeakest', { name: best[best.length - 1].g.label })}</p>}
          </>
        ) : (
          <p className="muted center">{t('topicsNeedData')}</p>
        )}
      </section>
      {order.map((tipo) => {
        const s = topicSummary(by, tipo);
        const info = s.level ? TOPIC_LEVELS[tipo][s.level - 1] : null;
        return (
          <section className="panel topic-card" key={tipo}>
            <img
              className="topic-img"
              src={img(info?.img) || FALLBACK_IMG}
              alt=""
              referrerPolicy="origin"
              loading="lazy"
              onError={(e) => { const el = e.currentTarget; if (!el.dataset.fb) { el.dataset.fb = '1'; el.src = FALLBACK_IMG; } }} // una sola volta: se anche la Vault Boy non si carica, niente ciclo
            />
            <div className="topic-body">
              <h3 className="subtitle">{TOPIC_LABELS[tipo]}</h3>
              {info ? (
                <>
                  <p className="topic-badge">{info.name}</p>
                  {info.desc && <p className="muted">{info.desc}</p>}
                  <div className="progressbar" role="progressbar" aria-valuenow={Math.round(s.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div style={{ width: `${Math.round(s.progress * 100)}%` }} />
                  </div>
                  <p className="muted">{Math.round(s.rawPct * 100)}% - {t('topicsCorrectWrong', { c: s.correct, w: s.wrong })}</p>
                </>
              ) : (
                <p className="muted">{t('topicsNotEnough', { a: s.answered, b: MIN_ANSWERS })}</p>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
