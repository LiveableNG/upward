import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goodtenants.upward.pm',
  appName: 'Upward PM',
  webDir: 'out',
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID', // Placeholder, needs actual ID
      forceCodeForRefreshToken: true,
    },
  },
  server: {
    cleartext: true
  }
};

export default config;
