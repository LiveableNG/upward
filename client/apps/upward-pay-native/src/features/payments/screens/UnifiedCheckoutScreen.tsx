import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import { Check, Copy, ShieldCheck } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { CheckboxField } from '@/components/form/CheckboxField'
import { Input } from '@/components/input/Input'
import { PasswordInput } from '@/components/input/PasswordInput'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { acceptInvite, isAuthPayload } from '@/features/auth/services/onboardingLinksService'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { ManualProofForm } from '@/features/payments/components/ManualProofForm'
import { RentDepositApplyCard } from '@/features/payments/components/RentDepositApplyCard'
import { useUnifiedCheckout } from '@/features/payments/hooks/useUnifiedCheckout'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type UnifiedCheckoutScreenProps = {
  paymentUuid: string
  onDone?: () => void
  mode?: 'inApp' | 'public'
}

export function UnifiedCheckoutScreen({
  paymentUuid,
  onDone,
  mode = 'inApp',
}: UnifiedCheckoutScreenProps) {
  const router = useRouter()
  const { signIn, isLoggedIn } = useAuth()
  const { openTab, go } = useDashboardNavigation()
  const { colors, spacing, radius } = useAppTheme()
  const [copied, setCopied] = useState(false)
  const checkout = useUnifiedCheckout(paymentUuid)
  const isPublic = mode === 'public'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)

  useEffect(() => {
    const u = checkout.paymentRequest?.user
    if (!u) return
    setFirstName(u.firstName ?? '')
    setLastName(u.lastName ?? '')
    setPhone(u.phone ?? '')
  }, [checkout.paymentRequest?.user])

  const finish = () => {
    if (onDone) onDone()
    else router.back()
  }

  if (checkout.step === 'loading') {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  if (checkout.step === 'activation') {
    const token = checkout.activationInviteToken
    const email = checkout.paymentRequest?.user?.email ?? ''

    const activate = async () => {
      if (!token || !email) {
        setActivationError('Unable to activate account for this payment.')
        return
      }
      if (password.length < 8) {
        setActivationError('Password must be at least 8 characters.')
        return
      }
      if (password !== confirmPassword) {
        setActivationError('Passwords do not match.')
        return
      }
      setActivating(true)
      setActivationError(null)
      try {
        const res = await acceptInvite(token, {
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email,
        })
        if (isAuthPayload(res)) {
          await signIn({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user)
          router.replace('/dashboard')
          return
        }
        router.replace('/login')
      } catch (err) {
        setActivationError(getErrorMessage(err))
      } finally {
        setActivating(false)
      }
    }

    return (
      <Screen scroll background="shell" avoidKeyboard>
        <EyebrowText color="clay">Almost done</EyebrowText>
        <TitleText>Set your password</TitleText>
        <BodyText color="textSecondary">
          Payment received. Create a password to access your Rent Passport and track this payment in
          the app.
        </BodyText>
        <Card style={{ gap: spacing[3] }}>
          <Input label="First name" value={firstName} onChangeText={setFirstName} />
          <Input label="Last name" value={lastName} onChangeText={setLastName} />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <PasswordInput label="Password" value={password} onChangeText={setPassword} />
          <PasswordInput
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {activationError ? <CaptionText color="error">{activationError}</CaptionText> : null}
          <Button fullWidth loading={activating} onPress={() => void activate()}>
            Activate account
          </Button>
          <Button variant="ghost" fullWidth onPress={() => router.replace('/login')}>
            Sign in instead
          </Button>
        </Card>
      </Screen>
    )
  }

  if (checkout.step === 'success') {
    const paid = checkout.successAmount ?? 0
    return (
      <Screen scroll background="shell">
        <Card tone="tint" style={{ gap: spacing[4], alignItems: 'center' }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.full,
              backgroundColor: 'rgba(22, 163, 74, 0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={28} color="#16a34a" />
          </View>
          <EyebrowText color="clay">Payment verified</EyebrowText>
          <TitleText style={{ textAlign: 'center' }}>Thank you</TitleText>
          {paid > 0 ? (
            <HeadingText style={{ textAlign: 'center' }}>{formatCurrency(paid)}</HeadingText>
          ) : null}
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            Your payment was recorded. Your Rent Passport score and activity feed will update
            shortly.
          </BodyText>
          {isPublic && !isLoggedIn ? (
            <>
              <Button
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: '/login',
                    params: { redirect: `/pay/${paymentUuid}` },
                  })
                }
              >
                Sign in to track payment
              </Button>
              <Button variant="secondary" fullWidth onPress={() => router.replace('/welcome')}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button fullWidth onPress={() => openTab(DASHBOARD_HREF.home)}>
                Back to dashboard
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onPress={() => openTab(DASHBOARD_HREF.transactions)}
              >
                View activity
              </Button>
            </>
          )}
        </Card>
      </Screen>
    )
  }

  if (checkout.step === 'already-paid') {
    return (
      <Screen scroll background="shell">
        <Card>
          <HeadingText>Already paid</HeadingText>
          <BodyText color="textSecondary">This invoice has no remaining balance.</BodyText>
          <Button variant="secondary" fullWidth onPress={finish}>
            Go back
          </Button>
        </Card>
      </Screen>
    )
  }

  if (checkout.step === 'error') {
    return (
      <Screen scroll background="shell">
        <Card tone="tint">
          <HeadingText>Something went wrong</HeadingText>
          <BodyText color="error">{checkout.error}</BodyText>
          <Button fullWidth onPress={() => checkout.refetch()}>
            Try again
          </Button>
          {isPublic && !isLoggedIn ? (
            <Button
              variant="secondary"
              fullWidth
              onPress={() =>
                router.push({
                  pathname: '/login',
                  params: { redirect: `/pay/${paymentUuid}` },
                })
              }
            >
              Sign in
            </Button>
          ) : null}
        </Card>
      </Screen>
    )
  }

  if (checkout.step === 'checkout' && checkout.dvaConfig) {
    const dva = checkout.dvaConfig
    return (
      <Screen scroll background="shell" avoidKeyboard>
        <EyebrowText color="clay">Bank transfer</EyebrowText>
        <TitleText>Pay {formatCurrency(parseFloat(checkout.amountInput) || 0)}</TitleText>
        <BodyText color="textSecondary">
          Transfer exactly this amount to the dedicated account below. We&apos;ll detect your
          payment automatically.
        </BodyText>

        <Card>
          <CaptionText color="textMuted">Bank</CaptionText>
          <BodyText weight="semibold">{dva.bankName}</BodyText>
          <View style={{ height: spacing[3] }} />
          <CaptionText color="textMuted">Account number</CaptionText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <HeadingText>{dva.accountNumber}</HeadingText>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(dva.accountNumber)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              accessibilityRole="button"
              style={{
                padding: 8,
                borderRadius: radius.md,
                backgroundColor: colors.shellTint,
              }}
            >
              {copied ? (
                <Check size={18} color={colors.clay} />
              ) : (
                <Copy size={18} color={colors.clay} />
              )}
            </Pressable>
          </View>
          <CaptionText color="textMuted" style={{ marginTop: spacing[2] }}>
            {dva.accountName}
          </CaptionText>
        </Card>

        {checkout.error ? <CaptionText color="error">{checkout.error}</CaptionText> : null}

        <Button fullWidth loading={checkout.loading} onPress={() => checkout.retryVerify()}>
          I&apos;ve sent the transfer
        </Button>
        <Button variant="ghost" fullWidth onPress={finish}>
          Cancel
        </Button>
      </Screen>
    )
  }

  const payment = checkout.payment
  const title = payment?.company_name || payment?.description || 'Rent payment'

  return (
    <Screen scroll background="shell" avoidKeyboard>
      <EyebrowText color="clay">Unified checkout</EyebrowText>
      <TitleText>{title}</TitleText>
      {payment?.property_address ? (
        <BodyText color="textSecondary">{payment.property_address}</BodyText>
      ) : null}

      <Card>
        <HeadingText>Breakdown</HeadingText>
        {checkout.lineItems.map((row) => {
          const remaining = Math.max(0, row.totalAmount - row.amountPaid)
          if (remaining <= 0) return null
          return (
            <View
              key={row.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: spacing[2],
                borderBottomWidth: 1,
                borderBottomColor: colors.shellBorder,
              }}
            >
              <BodyText color="textSecondary">{row.name}</BodyText>
              <BodyText>{formatCurrency(remaining)}</BodyText>
            </View>
          )
        })}
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] }}
        >
          <BodyText weight="semibold">Total due</BodyText>
          <BodyText weight="semibold">{formatCurrency(checkout.totalOwed)}</BodyText>
        </View>
      </Card>

      <Input
        label="Amount to pay (₦)"
        value={checkout.amountInput}
        onChangeText={checkout.setAmountInput}
        keyboardType="decimal-pad"
      />

      {checkout.benefitsAvailable ? (
        <CheckboxField
          checked={checkout.benefitsOptIn}
          onChange={checkout.setBenefitsOptIn}
          label={<BodyText>Include Tenant Protection (Upward Benefits)</BodyText>}
        />
      ) : null}

      {!(isPublic && !isLoggedIn) ? (
        <RentDepositApplyCard
          paymentRequestUuid={paymentUuid}
          totalOwed={checkout.totalOwed}
          onSettled={(txUuid) => {
            if (txUuid) go(DASHBOARD_HREF.receipt(txUuid))
            else finish()
          }}
        />
      ) : null}

      <ManualProofForm
        paymentRequestUuid={paymentUuid}
        defaultAmount={parseFloat(checkout.amountInput) || checkout.totalOwed}
        onSubmitted={finish}
      />

      <Button fullWidth loading={checkout.loading} onPress={() => checkout.startCheckout()}>
        Pay with Card / Bank App
      </Button>
      <CaptionText color="textMuted">
        Opens secure Paystack checkout, or shows a dedicated virtual account when assigned by your
        bank profile.
      </CaptionText>
    </Screen>
  )
}
