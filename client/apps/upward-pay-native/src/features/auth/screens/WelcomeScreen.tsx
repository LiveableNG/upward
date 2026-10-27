import { useEffect, useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'

import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/button/Button'
import { BodyText, HeadingText } from '@/components/text'
import { useAppTheme } from '@/theme'

const BENEFITS = [
  {
    color: '#C2501F',
    title: 'Earn Rewards',
    desc: 'Every on-time payment earns points you can redeem for rent discounts and perks.',
  },
  {
    color: '#22c55e',
    title: 'Build Your Credit',
    desc: 'Monthly rent payments help you build a verified rental track record.',
  },
  {
    color: '#6366f1',
    title: 'Verified Tenancy',
    desc: 'Get a tamper-proof digital record of your tenancy history.',
  },
  {
    color: '#0ea5e9',
    title: 'Secure Payments',
    desc: 'Bank-grade encryption on every transaction keeps your money protected.',
  },
] as const

const WEB_BASE = 'https://upward.goodtenants.io'

export function WelcomeScreen() {
  const router = useRouter()
  const { colors, spacing, radius } = useAppTheme()
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % BENEFITS.length), 3800)
    return () => clearInterval(id)
  }, [])

  const slide = BENEFITS[active] ?? BENEFITS[0]

  return (
    <AuthShell variant="welcome">
      <View style={{ flex: 1, justifyContent: 'space-between', gap: spacing[6] }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing[5],
            paddingHorizontal: spacing[2],
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.full,
              backgroundColor: `${slide.color}14`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: radius.full,
                backgroundColor: slide.color,
              }}
            />
          </View>
          <HeadingText align="center">{slide.title}</HeadingText>
          <BodyText align="center" color="textSecondary">
            {slide.desc}
          </BodyText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {BENEFITS.map((_, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Benefit slide ${index + 1}`}
                onPress={() => setActive(index)}
                style={{
                  width: index === active ? 20 : 8,
                  height: 8,
                  borderRadius: radius.full,
                  backgroundColor: index === active ? colors.clay : colors.borderSolid,
                }}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing[3] }}>
          <Button fullWidth size="pay" onPress={() => router.push('/signup')}>
            Create Account
          </Button>
          <Button variant="secondary" fullWidth onPress={() => router.push('/login')}>
            Log In
          </Button>
          <BodyText align="center" color="textMuted" style={{ marginTop: spacing[2] }}>
            By proceeding you agree to our{' '}
            <BodyText color="clay" onPress={() => void Linking.openURL(`${WEB_BASE}/legal/terms`)}>
              Terms
            </BodyText>{' '}
            and{' '}
            <BodyText
              color="clay"
              onPress={() => void Linking.openURL(`${WEB_BASE}/legal/privacy`)}
            >
              Privacy Policy
            </BodyText>
            .
          </BodyText>
        </View>
      </View>
    </AuthShell>
  )
}
