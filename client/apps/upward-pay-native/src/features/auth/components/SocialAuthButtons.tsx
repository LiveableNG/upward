import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { useRouter, type Href } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { BodyText, CaptionText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { socialSignIn } from '@/features/auth/services/authService'
import { getPostAuthSetupPath, needsProfileSetup } from '@/features/auth/session'
import { getErrorMessage } from '@/lib/errors'
import { getGoogleOAuthSetupHints, getGoogleRedirectUri } from '@/lib/googleOAuth'
import { getGoogleClientIds, isAppleAuthEnabled, isGoogleAuthEnabled } from '@/lib/socialAuthConfig'
import { useAppTheme } from '@/theme'

WebBrowser.maybeCompleteAuthSession()

type SocialAuthButtonsProps = {
  disabled?: boolean
  redirectPath?: string | null
}

function GoogleGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  )
}

export function SocialAuthButtons({ disabled, redirectPath }: SocialAuthButtonsProps) {
  const router = useRouter()
  const { signIn } = useAuth()
  const { colors, spacing, radius } = useAppTheme()
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const googleIds = getGoogleClientIds()
  const googleEnabled = isGoogleAuthEnabled()
  const appleEnabled = isAppleAuthEnabled() && Platform.OS === 'ios'
  const googleRedirectUri = getGoogleRedirectUri()

  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    webClientId: googleIds.web,
    iosClientId: googleIds.ios ?? googleIds.web,
    androidClientId: googleIds.android ?? googleIds.web,
    redirectUri: googleRedirectUri,
  })

  useEffect(() => {
    if (!__DEV__ || !googleEnabled) return
    console.log(
      '[Upward Pay] Google OAuth redirect URIs for this build — add in Google Cloud Console:',
      getGoogleOAuthSetupHints().join(', '),
    )
  }, [googleEnabled])

  useEffect(() => {
    if (!appleEnabled) return
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
  }, [appleEnabled])

  const finishAuth = async (result: Awaited<ReturnType<typeof socialSignIn>>) => {
    await signIn(
      { accessToken: result.accessToken, refreshToken: result.refreshToken },
      result.user,
    )
    const path =
      redirectPath ??
      (needsProfileSetup(result.user) ? getPostAuthSetupPath(result.user) : '/dashboard')
    router.replace(path as Href)
  }

  useEffect(() => {
    if (googleResponse?.type !== 'success') return
    const idToken = googleResponse.params.id_token ?? googleResponse.authentication?.idToken
    if (!idToken) {
      setError('Google sign-in did not return an ID token.')
      setBusy(null)
      return
    }
    void (async () => {
      try {
        const result = await socialSignIn({ provider: 'google', idToken })
        await finishAuth(result)
      } catch (err) {
        setError(getErrorMessage(err, 'Google sign-in failed'))
      } finally {
        setBusy(null)
      }
    })()
  }, [googleResponse])

  const signInWithApple = async () => {
    if (disabled || busy) return
    setError(null)
    setBusy('apple')
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) {
        setError('Apple sign-in did not return an identity token.')
        return
      }
      const result = await socialSignIn({
        provider: 'apple',
        idToken: credential.identityToken,
        firstName: credential.fullName?.givenName ?? undefined,
        lastName: credential.fullName?.familyName ?? undefined,
      })
      await finishAuth(result)
    } catch (err) {
      const e = err as { code?: string }
      if (e.code === 'ERR_REQUEST_CANCELED') return
      setError(getErrorMessage(err, 'Apple sign-in failed'))
    } finally {
      setBusy(null)
    }
  }

  const signInWithGoogle = async () => {
    if (disabled || busy || !googleEnabled) return
    setError(null)
    setBusy('google')
    try {
      await promptGoogle()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not open Google sign-in'))
      setBusy(null)
    }
  }

  if (!googleEnabled && !(appleEnabled && appleAvailable)) {
    return null
  }

  return (
    <View style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.shellBorder }} />
        <CaptionText color="textMuted">or continue with</CaptionText>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.shellBorder }} />
      </View>

      {googleEnabled ? (
        <Pressable
          onPress={() => void signInWithGoogle()}
          disabled={disabled || busy !== null}
          accessibilityRole="button"
          style={{
            minHeight: 48,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.shellBorder,
            backgroundColor: colors.bg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {busy === 'google' ? <ActivityIndicator color={colors.clay} /> : <GoogleGlyph />}
          <BodyText weight="semibold">Continue with Google</BodyText>
        </Pressable>
      ) : null}

      {appleEnabled && appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.md}
          style={{ width: '100%', height: 48 }}
          onPress={() => void signInWithApple()}
        />
      ) : null}

      {error ? <CaptionText color="error">{error}</CaptionText> : null}
    </View>
  )
}
