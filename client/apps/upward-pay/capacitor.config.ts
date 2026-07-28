import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goodtenants.upward',
  appName: 'Upward Pay',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    hostname: 'localhost',
    allowNavigation: [
      'upward-pay.goodtenants.io',
      'upward-api.goodtenants.io/api/v1',
      'upward.goodtenants.io'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
    },
    GoogleSignIn: {
      serverClientId: '451444317670-13vd5p8irblb8ptt3fkcljec1q8ekj5i.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
