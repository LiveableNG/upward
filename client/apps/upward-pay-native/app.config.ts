import type { ConfigContext, ExpoConfig } from 'expo/config'

const APP_SCHEME = 'goodtenants'
const GOOGLE_OAUTH_PATH = 'oauth/google'

function googleReservedClientId(iosClientId: string | undefined): string | undefined {
  if (!iosClientId?.endsWith('.apps.googleusercontent.com')) return undefined
  const idPart = iosClientId.replace('.apps.googleusercontent.com', '')
  return `com.googleusercontent.apps.${idPart}`
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosGoogleClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  const reservedClientId = googleReservedClientId(iosGoogleClientId)

  return {
    ...config,
    name: 'Upward Pay',
    slug: 'upward-pay',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: APP_SCHEME,
    userInterfaceStyle: 'light',
    ios: {
      bundleIdentifier: 'com.goodtenants.upward',
      supportsTablet: true,
      icon: './assets/expo.icon',
      usesAppleSignIn: true,
      infoPlist: reservedClientId
        ? {
            CFBundleURLTypes: [
              {
                CFBundleURLSchemes: [reservedClientId],
              },
            ],
          }
        : undefined,
    },
    android: {
      package: 'com.goodtenants.upward',
      adaptiveIcon: {
        backgroundColor: '#FAF9F5',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [
            {
              scheme: APP_SCHEME,
              pathPrefix: `/${GOOGLE_OAUTH_PATH}`,
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-font',
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FAF9F5',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      [
        'expo-system-ui',
        {
          backgroundColor: '#FAF9F5',
        },
      ],
      'expo-secure-store',
      'expo-notifications',
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Upward Pay to choose a photo for your profile picture.',
        },
      ],
      'expo-apple-authentication',
      '@react-native-community/datetimepicker',
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Allow Upward Pay to use Face ID to unlock the app.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      webUrl: process.env.EXPO_PUBLIC_WEB_URL,
      googleOAuthPath: GOOGLE_OAUTH_PATH,
      eas: {
        projectId: process.env.EAS_PROJECT_ID ?? '332f1d00-4c8b-4f33-ad53-7201716c7da9',
      },
    },
  }
}
