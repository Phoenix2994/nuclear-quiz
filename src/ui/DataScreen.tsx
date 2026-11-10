import { useMemo, useState } from 'react';
import type { Article, GameKey, TipoKey } from '../types';
import { GAME_LABEL, GAMES, TEMI } from '../game/config';
import { useStore } from '../store';
import { useT } from '../i18n';

const shortOf = (a: Article) => a.giochi.map((g) => GAMES.find((x) => x.key === g)?.short ?? g).join(' ');

export function DataScreen() {
  const { articles, progress, toggleFav } = useStore();
  const { t, tema } = useT();
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<TipoKey | null>(null);
  const [gioco, setGioco] = useState<GameKey | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [open, setOpen] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const lang = progress.settings.quizLang;
  const unlockedIds = useMemo(() => new Set(progress.unlocked), [progress.unlocked]);
  const favoriteIds = useMemo(() => new Set(progress.favorites), [progress.favorites]);
  const allArticles = useMemo(
    () => [...articles.values()].filter((a) => (a.lang ?? 'it') === lang).sort((a, b) => a.titolo.localeCompare(b.titolo, lang)),
    [articles, lang],
  );
  const needle = search.trim().toLocaleLowerCase(lang);
  const filtered = allArticles
    .filter((a) => {
      if (tipo && a.tipo !== tipo) return false;
      if (gioco && !a.giochi.includes(gioco)) return false;
      const unlocked = unlockedIds.has(a.id);
      if (needle && (!unlocked || !a.titolo.toLocaleLowerCase(lang).includes(needle))) return false;
      if (onlyFavorites && (!unlocked || !favoriteIds.has(a.id))) return false;
      return true;
    })
    // sbloccate in alto, cosi la lista non si apre su una pila di ???
    .sort((a, b) => Number(unlockedIds.has(b.id)) - Number(unlockedIds.has(a.id)));
  const unlockedCount = allArticles.filter((a) => unlockedIds.has(a.id)).length;
  const sel = filtered.find((a) => a.id === selId) ?? filtered[0];
  const activeFilters = Number(tipo !== null) + Number(gioco !== null);
  const unlockedSel = sel && unlockedIds.has(sel.id);

  return (
    <div className="screen data">
      <div className="data-bar">
        <input className="search" placeholder={t('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={`sqbtn ${open || activeFilters ? 'on' : ''}`} aria-label={t('filters')} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          {activeFilters > 0 && <b>{activeFilters}</b>}
        </button>
        <button className={`sqbtn ${onlyFavorites ? 'on' : ''}`} aria-label={t('onlyFavorites')} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites((v) => !v)}>
          {onlyFavorites ? '★' : '☆'}
        </button>
      </div>
      {open && (
        <div className="data-filters">
          <div className="chips scroll">
            <button className={`chip ${tipo === null ? 'on' : ''}`} onClick={() => setTipo(null)}>
              {t('all')}
            </button>
            {TEMI.filter((x) => !['canzone', 'cucina', 'bevande', 'chem', 'combattimento'].includes(x.key)).map((x) => (
              <button key={x.key} className={`chip ${tipo === x.key ? 'on' : ''}`} onClick={() => setTipo(x.key)}>
                {tema(x.key)}
              </button>
            ))}
          </div>
          <div className="chips scroll">
            <button className={`chip ${gioco === null ? 'on' : ''}`} onClick={() => setGioco(null)}>
              {t('all')}
            </button>
            {GAMES.map((g) => (
              <button key={g.key} className={`chip ${gioco === g.key ? 'on' : ''}`} onClick={() => setGioco(g.key)}>
                {g.short}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="muted data-sum">
        {t('unlockedOf', { a: unlockedCount, b: allArticles.length })} · {t('entries', { n: filtered.length })}
      </p>
      <div className="pb-list data-list">
        {filtered.map((a) => {
          const unlocked = unlockedIds.has(a.id);
          return (
            <button key={a.id} className={`pb-row ${sel?.id === a.id ? 'sel' : ''} ${unlocked ? '' : 'lock'}`} onClick={() => setSelId(a.id)}>
              <span className="sq" />
              <span className="ellipsis">{unlocked ? a.titolo : '???'}</span>
              <i>
                {favoriteIds.has(a.id) && unlocked ? '★ ' : ''}
                {shortOf(a)}
              </i>
            </button>
          );
        })}
      </div>
      {sel && (
        <div className="data-detail">
          <strong>{unlockedSel ? sel.titolo : '???'}</strong>
          <span className="tags">
            {tema(sel.tipo)} · {sel.giochi.map((g) => GAME_LABEL[g] ?? g).join(', ')}
          </span>
          {unlockedSel ? (
            <>
              <div className="data-text">
                {sel.img && <img className="entry-img" src={sel.img} alt="" referrerPolicy="origin" />}
                <p>{sel.intro.replace(/ +([.,;:!?])/g, '$1')}</p>
              </div>
              <div className="data-actions">
                <button className="btn" onClick={() => toggleFav(sel.id)} aria-label={favoriteIds.has(sel.id) ? t('removeFav') : t('addFav')}>
                  {favoriteIds.has(sel.id) ? '★' : '☆'} {t('favorite')}
                </button>
                <a className="btn" href={sel.url} target="_blank" rel="noreferrer">
                  {t('readOnWiki')} ↗
                </a>
              </div>
            </>
          ) : (
            <p className="muted">{t('locked')}</p>
          )}
        </div>
      )}
    </div>
  );
}
