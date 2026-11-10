import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = new Map<string, string>();
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: native.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => void native.set(key, value),
  },
}));
vi.mock('@capacitor/app', () => ({ App: {} }));
vi.mock('@capacitor/status-bar', () => ({ StatusBar: {}, Style: {} }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: {} }));
vi.mock('@capacitor/haptics', () => ({ Haptics: {}, ImpactStyle: {}, NotificationType: {} }));

const local = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => local.get(k) ?? null,
  setItem: (k: string, v: string) => void local.set(k, v),
});

import { restoreFromNative, storeSet } from './native';

describe('storage nativo', () => {
  beforeEach(() => {
    native.clear();
    local.clear();
  });

  it('ripristina da nativo quando localStorage e stato svuotato', async () => {
    native.set('k', '{"xp":120}');
    await restoreFromNative(['k']);
    expect(local.get('k')).toBe('{"xp":120}');
  });

  it('migra i dati esistenti in localStorage verso lo storage nativo', async () => {
    local.set('k', '{"xp":7}');
    await restoreFromNative(['k']);
    expect(native.get('k')).toBe('{"xp":7}');
  });

  it('non sovrascrive mai i dati locali piu recenti con quelli nativi', async () => {
    local.set('k', 'nuovo');
    native.set('k', 'vecchio');
    await restoreFromNative(['k']);
    expect(local.get('k')).toBe('nuovo');
    expect(native.get('k')).toBe('vecchio');
  });

  it('storeSet scrive in entrambi', async () => {
    storeSet('k', 'v');
    await Promise.resolve();
    expect(local.get('k')).toBe('v');
    expect(native.get('k')).toBe('v');
  });
});
