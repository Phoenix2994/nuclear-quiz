# nuclear-quiz (sorgente)

Unofficial fan-made quiz app. Not affiliated with Bethesda Softworks, ZeniMax Media or Microsoft. Fallout and related trademarks belong to their owners. Entry texts come from the Fallout Wiki (CC BY-SA 3.0).

Questo branch contiene il **sorgente** (React 18 + Vite + TypeScript). Il sito pubblicato (GitHub Pages) sta su `main` e non viene toccato.

## Comandi
- `npm ci` - installa le dipendenze
- `npm run dev` - server di sviluppo
- `npm test` - test (Vitest)
- `npm run build` - typecheck + build in `dist/`

`public/data` (JSON) e `public/img` (immagini) sono serviti come asset statici.

## Migrazione ad app nativa (Capacitor)
Piano: 1 fondamenta, 2 offline e asset locali, 3 guscio Capacitor, 4 storage persistente, 5 UX da app, 6 build/test Android, 7 pronta per gli store.
Target: Android per primo; distribuzione personale, store in futuro.
