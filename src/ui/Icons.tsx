import type { ReactElement } from 'react';

/** Simboli generici a tema post-atomico (disegnati qui, nessuna grafica del marchio). Solo contorni, colore dal tema. */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const wrap = (children: ReactElement) => (
  <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" {...P}>
    {children}
  </svg>
);

export const ICONS: ReactElement[] = [
  // trifoglio della radioattivita'
  wrap(
    <g>
      <circle cx="24" cy="24" r="3" />
      <path d="M24 21 L17 9 A16 16 0 0 1 31 9 Z" />
      <path d="M26.6 25.5 L40 26 A16 16 0 0 1 33 38 Z" />
      <path d="M21.4 25.5 L15 38 A16 16 0 0 1 8 26 Z" />
    </g>,
  ),
  // atomo
  wrap(
    <g>
      <circle cx="24" cy="24" r="3" />
      <ellipse cx="24" cy="24" rx="19" ry="7.5" />
      <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)" />
      <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(120 24 24)" />
    </g>,
  ),
  // tappo di bottiglia
  wrap(
    <g>
      <path d="M24 5 l4 3 5-1 2 5 5 2-1 5 3 4-3 4 1 5-5 2-2 5-5-1-4 3-4-3-5 1-2-5-5-2 1-5-3-4 3-4-1-5 5-2 2-5 5 1z" />
      <circle cx="24" cy="24" r="9" />
    </g>,
  ),
  // ingranaggio
  wrap(
    <g>
      <circle cx="24" cy="24" r="6" />
      <path d="M21 4h6l1 5 4 2 4.5-2.5 4 4-2.5 4.5 2 4 5 1v6l-5 1-2 4 2.5 4.5-4 4-4.5-2.5-4 2-1 5h-6l-1-5-4-2-4.5 2.5-4-4 2.5-4.5-2-4-5-1v-6l5-1 2-4-2.5-4.5 4-4 4.5 2.5 4-2z" transform="scale(.82) translate(5.3 5.3)" />
    </g>,
  ),
  // teschio
  wrap(
    <g>
      <path d="M10 26c-4-3-5-8-3-13C10 6 17 4 24 4s14 2 17 9c2 5 1 10-3 13v8H10z" />
      <circle cx="17" cy="23" r="3.5" />
      <circle cx="31" cy="23" r="3.5" />
      <path d="M22 31l2-3 2 3M17 34v6M24 34v6M31 34v6" />
    </g>,
  ),
  // fungo atomico
  wrap(
    <g>
      <path d="M8 22c-4-2-5-8 0-11 1-5 8-7 12-4 3-4 10-3 12 1 6-1 10 6 6 10-3 3-6 3-9 2h-12c-3 2-6 3-9 2z" />
      <path d="M20 24c0 8-2 12-6 18h20c-4-6-6-10-6-18" />
    </g>,
  ),
  // chiave inglese
  wrap(
    <g>
      <path d="M31 6a9 9 0 0 0-8 12L6 35a4 4 0 0 0 6 6l17-17a9 9 0 0 0 12-8l-6 5-5-1-1-5z" />
    </g>,
  ),
  // lattina
  wrap(
    <g>
      <path d="M13 9h22v30a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z" />
      <path d="M13 15h22M13 33h22" />
      <circle cx="24" cy="24" r="4" />
    </g>,
  ),
];

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...P}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
