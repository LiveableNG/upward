import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.upward.pay',
  appName: 'Upward Pay',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    hostname: 'localhost'
  }
};

export default config;
