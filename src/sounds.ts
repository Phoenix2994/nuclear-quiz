// Effetti sonori: file della wiki mostrati direttamente (come le immagini), niente copie nel repository.
const BASE = 'https://static.wikia.nocookie.net/fallout/images';
const FILES = {
  right: `${BASE}/c/ca/Ui_karma_up.ogg/revision/latest`,
  wrong: `${BASE}/3/3f/Ui_karma_down.ogg/revision/latest`,
  caps: `${BASE}/6/6b/Ui_items_bottlecaps_down_01.ogg/revision/latest`,
  open: `${BASE}/c/cd/Ui_pimpboy.ogg/revision/latest`,
} as const;
export type SoundName = keyof typeof FILES;

const VOLUME: Record<SoundName, number> = { right: 0.5, wrong: 0.5, caps: 0.6, open: 0.4 };
const cache = new Map<SoundName, HTMLAudioElement>();
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/** Riproduce un suono; ogni errore (rete, formato, blocco del browser) viene ignorato. */
export function play(name: SoundName) {
  if (!enabled || typeof Audio === 'undefined') return;
  try {
    let a = cache.get(name);
    if (!a) {
      a = new Audio(FILES[name]);
      a.preload = 'auto';
      a.volume = VOLUME[name];
      cache.set(name, a);
    }
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* nessun suono */
  }
}
