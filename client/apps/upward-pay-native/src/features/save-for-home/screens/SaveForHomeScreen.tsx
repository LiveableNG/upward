import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { CheckCircle2, Home } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { getUserDisplayName } from '@/features/auth/session'
import { submitFeedback } from '@/features/auth/services/authService'
import {
  SAVE_FOR_HOME_BUDGETS,
  SAVE_FOR_HOME_TIMELINES,
  type SaveForHomeBudget,
  type SaveForHomeTimeline,
} from '@/features/save-for-home/constants'
import { SetupPageShell } from '@/features/setup/components/SetupPageShell'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

export function SaveForHomeScreen() {
  const router = useRouter()
  const { goToHome } = useDashboardNavigation()
  const { user } = useAuth()
  const { colors, spacing } = useAppTheme()

  const [timeline, setTimeline] = useState<SaveForHomeTimeline | ''>('')
  const [budget, setBudget] = useState<SaveForHomeBudget | ''>('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isValid = !!timeline && !!budget

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user.email) {
        throw new Error('Sign in to submit your home savings goals.')
      }
      await submitFeedback({
        userId: user.id,
        email: user.email,
        name: getUserDisplayName(user),
        type: 'SAVE_FOR_HOME',
        message: JSON.stringify({ timeline, budget }),
      })
    },
    onSuccess: () => {
      setFormError(null)
      setIsSuccess(true)
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  if (isSuccess) {
    return (
      <SetupPageShell title="Save for Home" onBack={() => goToHome()}>
        <View style={{ alignItems: 'center', gap: spacing[4], paddingTop: spacing[6] }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(22, 163, 74, 0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={40} color="#16a34a" />
          </View>
          <TitleText style={{ textAlign: 'center' }}>
            Awesome! We will share updates soon.
          </TitleText>
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            Thanks for letting us know your home savings goals. We&apos;ll keep you posted as this
            feature takes shape.
          </BodyText>
          <Button fullWidth onPress={() => goToHome()}>
            Back to dashboard
          </Button>
        </View>
      </SetupPageShell>
    )
  }

  return (
    <SetupPageShell
      title="Save for Home"
      subtitle="Tell us your timeline and budget while we build dedicated home savings tools."
      onBack={() => router.back()}
      footer={
        <Button
          fullWidth
          loading={submitMutation.isPending}
          disabled={!isValid}
          onPress={() => submitMutation.mutate()}
        >
          Submit
        </Button>
      }
    >
      <Card tone="tint" style={{ gap: spacing[3] }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.shellTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Home size={22} color={colors.clay} />
        </View>
        <BodyText color="textSecondary">
          We&apos;re happy to see you&apos;re interested in saving toward your future home.
          We&apos;re working on this already.
        </BodyText>
      </Card>

      <OptionPicker
        label="How long are you looking at?"
        value={timeline}
        options={[...SAVE_FOR_HOME_TIMELINES]}
        placeholder="Select a timeline"
        onChange={(value) => setTimeline(value as SaveForHomeTimeline)}
      />

      <OptionPicker
        label="What's your budget?"
        value={budget}
        options={[...SAVE_FOR_HOME_BUDGETS]}
        placeholder="Select a budget range"
        onChange={(value) => setBudget(value as SaveForHomeBudget)}
      />

      {formError ? (
        <CaptionText color="error" style={{ textAlign: 'center' }}>
          {formError}
        </CaptionText>
      ) : null}
    </SetupPageShell>
  )
}
