import { useEffect, useState } from 'react';
import { GAME_LABEL } from '../game/config';
import type { Lang } from '../types';
import { img } from '../assets';

export interface Trivia {
  title: string;
  tipo: string;
  game: string;
  img: string;
  fact: string;
}

const TXT: Record<Lang, { loading: string; did: string; tipo: Record<string, string> }> = {
  en: { loading: 'LOADING DATA', did: 'WASTELAND TRIVIA', tipo: { creatura: 'CREATURE', arma: 'WEAPON', armatura: 'ARMOR', oggetto: 'ITEM', fazione: 'FACTION' } },
  it: { loading: 'CARICAMENTO DATI', did: 'CURIOSITA DAL DESERTO', tipo: { creatura: 'CREATURA', arma: 'ARMA', armatura: 'ARMATURA', oggetto: 'OGGETTO', fazione: 'FAZIONE' } },
};

const ROTATE_MS = 15000;

/** Schermata di caricamento: barra con percentuale reale e una curiosita con immagine che cambia ogni pochi secondi. */
export function Boot({ pct, trivia, lang }: { pct: number; trivia: Trivia[]; lang: Lang }) {
  const txt = TXT[lang];
  const [i, setI] = useState(() => Math.floor(Math.random() * 1000));
  useEffect(() => {
    if (trivia.length < 2) return;
    const id = setInterval(() => setI((x) => x + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, [trivia.length]);
  const cur = trivia.length ? trivia[i % trivia.length] : null;
  return (
    <div className="boot">
      {cur && (
        <div className="boot-card" key={i}>
          <div className="boot-kicker">{txt.did}</div>
          <img className="boot-img" src={img(cur.img)} alt="" referrerPolicy="origin" loading="eager" onError={() => setI((x) => x + 1)} />
          <div className="boot-title">{cur.title}</div>
          <div className="boot-meta">{[txt.tipo[cur.tipo] ?? cur.tipo, GAME_LABEL[cur.game]].filter(Boolean).join(' · ')}</div>
          <p className="boot-fact">{cur.fact}</p>
        </div>
      )}
      <div className="boot-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${Math.round(pct)}%` }} />
      </div>
      <div className="boot-label">{txt.loading} {Math.round(pct)}%</div>
    </div>
  );
}
