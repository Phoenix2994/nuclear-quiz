// Integrazione con la piattaforma nativa (Capacitor). Sul web ogni funzione e un no-op.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const isNative = Capacitor.isNativePlatform();

/** Chiavi di localStorage che vengono duplicate nello storage nativo (SharedPreferences). */
export const PERSISTED_KEYS = ['wasteland-quiz-progress-v2', 'wasteland-quiz-reported-images', 'wasteland-quiz-map-v1'] as const;

/** Scrive in localStorage e, su nativo, anche nello storage persistente (resiste alla pulizia del WebView). */
export function storeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota o modalita privata */
  }
  if (isNative) void Preferences.set({ key, value }).catch(() => {});
}

/** Al primo avvio dopo una pulizia del WebView ripristina i dati dallo storage nativo. */
export async function restoreFromNative(keys: readonly string[]): Promise<void> {
  for (const key of keys) {
    try {
      if (localStorage.getItem(key) !== null) {
        // migrazione: i dati gia presenti in localStorage vengono copiati nello storage nativo
        const { value } = await Preferences.get({ key });
        if (value === null) await Preferences.set({ key, value: localStorage.getItem(key)! });
        continue;
      }
      const { value } = await Preferences.get({ key });
      if (value !== null) localStorage.setItem(key, value);
    } catch {
      /* si prosegue senza */
    }
  }
}

/** Da chiamare una volta prima del render. */
export async function initNative(keys: readonly string[] = PERSISTED_KEYS): Promise<void> {
  if (!isNative) return;
  await restoreFromNative(keys);
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a1a0a' });
  } catch {
    /* non supportato */
  }
}

/** Nasconde lo splash quando l'interfaccia e pronta. */
export function appReady(): void {
  if (isNative) void SplashScreen.hide().catch(() => {});
}

/**
 * Tasto indietro di Android: chi e interessato chiama preventDefault() sull'evento 'native-back'.
 * Se nessuno lo gestisce, l'app si chiude.
 */
export function listenBack(): void {
  if (!isNative) return;
  void CapApp.addListener('backButton', () => {
    const ev = new CustomEvent('native-back', { cancelable: true });
    window.dispatchEvent(ev);
    if (!ev.defaultPrevented) void CapApp.exitApp();
  });
}

export function haptic(kind: 'right' | 'wrong' | 'tap'): void {
  if (!isNative) return;
  try {
    if (kind === 'right') void Haptics.notification({ type: NotificationType.Success });
    else if (kind === 'wrong') void Haptics.notification({ type: NotificationType.Error });
    else void Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* nessuna vibrazione */
  }
}
