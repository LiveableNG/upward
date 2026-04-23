import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goodtenants.upward',
  appName: 'Upward Pay',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    hostname: 'localhost',
    allowNavigation: [
      'upward-pay.vercel.app',
      'upward-pay-vercel.app',
      'upward-dev.vercel.app',
      'upward.goodtenants.io'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
    }
  }
};

export default config;
