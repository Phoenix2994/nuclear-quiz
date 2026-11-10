// Effetti sonori: file locali in public/sounds (vedi assets.ts).
import { soundUrl } from './assets';
import { haptic } from './native';
const FILES = {
  right: soundUrl('right'),
  wrong: soundUrl('wrong'),
  caps: soundUrl('caps'),
  open: soundUrl('open'),
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
  if (!enabled) return;
  if (name === 'right' || name === 'wrong') haptic(name);
  if (typeof Audio === 'undefined') return;
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
