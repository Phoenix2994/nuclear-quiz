/**
 * Unico punto di accesso agli asset "di terzi" (suoni e immagini del gioco).
 * Per cambiare sorgente (es. asset propri per gli store) basta intervenire qui o in public/.
 */
const BASE = import.meta.env.BASE_URL;

/** Suoni: file locali in public/sounds (m4a, compatibili con Android e iOS). */
export const soundUrl = (name: string) => `${BASE}sounds/${name}.m4a`;

/**
 * Sostituzioni delle immagini remote: URL originale -> percorso locale (es. 'img/wiki/abc.webp').
 * Vuota per ora: le immagini restano quelle del wiki finche non vengono scaricate.
 */
export const IMG_OVERRIDES: Record<string, string> = {};

/** Risolve l'URL di un'immagine: usa la copia locale se esiste, altrimenti l'URL originale. */
export function img(url: string): string;
export function img(url?: string | null): string | undefined;
export function img(url?: string | null) {
  if (!url) return undefined;
  const local = IMG_OVERRIDES[url];
  return local ? BASE + local : url;
}
