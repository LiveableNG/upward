import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goodtenants.upward',
  appName: 'Upward Pay',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    hostname: 'localhost',
    allowNavigation: [
      '*.goodtenants.io',
      'goodtenants.io',
      '*.vercel.app',
      'vercel.app'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
    },
    GoogleSignIn: {
      clientId: '479168827275-1p91obpeaj1h3oapomikq12dc75fegaa.apps.googleusercontent.com',
      serverClientId: '479168827275-1p91obpeaj1h3oapomikq12dc75fegaa.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
