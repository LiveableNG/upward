import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter, type Href } from 'expo-router'
import { Fingerprint, ShieldCheck } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { verifyKyc } from '@/features/auth/services/authService'
import { SetupPageShell } from '@/features/setup/components/SetupPageShell'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type IdType = 'BVN' | 'NIN'

export function VerifyIdentityScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ redirect?: string }>()
  const { user, refreshUser } = useAuth()
  const { colors, spacing, radius } = useAppTheme()
  const [idType, setIdType] = useState<IdType>('BVN')
  const [idNumber, setIdNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => verifyKyc({ type: idType, idNumber }),
    onSuccess: async (res) => {
      if (res.success) {
        setSuccess(res.message || 'Identity verified successfully.')
        setError(null)
        await refreshUser()
        setTimeout(() => {
          const redirect = typeof params.redirect === 'string' ? params.redirect : null
          if (redirect) router.replace(redirect as Href)
          else router.back()
        }, 1500)
      } else {
        setError(res.message || 'Verification failed.')
      }
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  if (user?.isIdentityVerified) {
    return (
      <SetupPageShell title="Identity verified" onBack={() => router.back()}>
        <Card tone="tint" style={{ gap: spacing[3], alignItems: 'center' }}>
          <ShieldCheck size={40} color="#16a34a" />
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            Your BVN/NIN verification is active. You can pay rent and build your Rent Passport.
          </BodyText>
        </Card>
      </SetupPageShell>
    )
  }

  return (
    <SetupPageShell
      title="Verify identity"
      subtitle="Required to pay rent and unlock vault yield. Your ID is encrypted and never shared."
      onBack={() => router.back()}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.shellBorder,
        }}
      >
        {(['BVN', 'NIN'] as const).map((type) => {
          const active = idType === type
          return (
            <Pressable
              key={type}
              onPress={() => {
                setIdType(type)
                setIdNumber('')
                setError(null)
              }}
              style={{
                flex: 1,
                paddingVertical: spacing[2],
                borderRadius: radius.md,
                backgroundColor: active ? colors.bg : 'transparent',
                alignItems: 'center',
              }}
            >
              <BodyText weight={active ? 'semibold' : undefined}>{type}</BodyText>
            </Pressable>
          )
        })}
      </View>

      <Input
        label={`${idType} (11 digits)`}
        value={idNumber}
        onChangeText={(t) => setIdNumber(t.replace(/\D/g, '').slice(0, 11))}
        keyboardType="number-pad"
        placeholder="00000000000"
      />

      <Card tone="tint" style={{ flexDirection: 'row', gap: spacing[3] }}>
        <Fingerprint size={20} color={colors.clay} />
        <CaptionText color="textSecondary" style={{ flex: 1 }}>
          We verify with licensed identity partners. Only verification status is stored on your
          profile.
        </CaptionText>
      </Card>

      {error ? <CaptionText color="error">{error}</CaptionText> : null}
      {success ? <CaptionText style={{ color: '#16a34a' }}>{success}</CaptionText> : null}

      <Button
        fullWidth
        loading={mutation.isPending}
        disabled={idNumber.length !== 11}
        onPress={() => mutation.mutate()}
      >
        Verify {idType}
      </Button>
    </SetupPageShell>
  )
}
