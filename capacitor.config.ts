import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.phoenix2994.wastelandquiz',
  appName: 'Wasteland Quiz',
  webDir: 'dist',
  backgroundColor: '#0a1a0a',
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#0a1a0a', androidScaleType: 'CENTER_INSIDE', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#0a1a0a', overlaysWebView: false },
  },
};

export default config;
