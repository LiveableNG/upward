import { useRouter } from 'expo-router'
import { AlertTriangle, Check, ChevronLeft, Home, Shield } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { CheckboxField } from '@/components/form/CheckboxField'
import { Input } from '@/components/input/Input'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  RSI_CONSENT_ITEMS,
  RSI_COVERED_BENEFITS,
  RSI_EXCLUSIONS,
  RSI_INTRO_PERIOD_DAYS,
  RSI_KEY_LIMITS,
  RSI_MAX_ENTRY_AGE,
  RSI_MAX_SUM_ASSURED,
  RSI_PRODUCT_NAME,
} from '@/features/rent-support-insurance/constants'
import { useRsiEnrolment } from '@/features/rent-support-insurance/hooks/useRsiEnrolment'
import { clearRsiEnrolment, saveRsiEnrolment } from '@/features/rent-support-insurance/storage'
import type {
  RsiEnrolmentFormData,
  RsiEnrolmentRecord,
  RsiFlowStep,
} from '@/features/rent-support-insurance/types'
import {
  buildDefaultFormData,
  calculateAnnualPremium,
  isWithinEntryAge,
  parseAnnualRent,
} from '@/features/rent-support-insurance/utils'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { formatCurrency, formatDate, formatRentAmountInput } from '@/lib/format'
import { useAppTheme } from '@/theme'

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 }}
    >
      <CaptionText color="textMuted">{label}</CaptionText>
      <BodyText style={{ flex: 1, textAlign: 'right' }}>{value}</BodyText>
    </View>
  )
}

export function RentSupportInsuranceScreen() {
  const router = useRouter()
  const { goToHome } = useDashboardNavigation()
  const { user } = useAuth()
  const { colors, spacing, radius } = useAppTheme()
  const { enrolments, loaded, setEnrolments } = useRsiEnrolment()

  const [step, setStep] = useState<RsiFlowStep>('property')
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState('')
  const [submittedEnrolment, setSubmittedEnrolment] = useState<RsiEnrolmentRecord | null>(null)
  const [consent, setConsent] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState<RsiEnrolmentFormData | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const activeProperties = useMemo(
    () => (user?.properties || []).filter((p) => !p.isPastTenancy),
    [user?.properties],
  )

  const selectedEnrolment =
    enrolments.find((r) => r.form.propertyUuid === selectedPropertyUuid) ?? null

  const updateForm = <K extends keyof RsiEnrolmentFormData>(
    key: K,
    value: RsiEnrolmentFormData[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleBack = () => {
    if (step === 'details') {
      setSelectedPropertyUuid('')
      setStep('property')
      return
    }
    if (step === 'consent') {
      setStep('details')
      return
    }
    if (step === 'form') {
      setStep('consent')
      return
    }
    router.back()
  }

  const startForm = () => {
    setForm(buildDefaultFormData(user, selectedPropertyUuid))
    setStep('form')
  }

  const submitEnrolment = async () => {
    if (!form) return
    setFormError(null)
    const annualRent = parseAnnualRent(form.annualRent)
    if (!form.fullName.trim()) {
      setFormError('Enter your full name.')
      return
    }
    if (!form.dateOfBirth || !isWithinEntryAge(form.dateOfBirth)) {
      setFormError(`Date of birth required. Maximum entry age is ${RSI_MAX_ENTRY_AGE} years.`)
      return
    }
    if (!form.gender) {
      setFormError('Select your gender.')
      return
    }
    if (!form.address.trim() || !form.occupation.trim() || !form.employmentType) {
      setFormError('Complete address, occupation, and employment type.')
      return
    }
    if (!form.rentStartDate || !annualRent || !form.landlordName.trim()) {
      setFormError('Complete rental details including landlord name and annual rent.')
      return
    }
    const record = await saveRsiEnrolment(form)
    setEnrolments((current) => [
      ...current.filter((item) => item.form.propertyUuid !== form.propertyUuid),
      record,
    ])
    setSubmittedEnrolment(record)
    setStep('success')
  }

  if (!loaded) {
    return (
      <Screen background="shell">
        <BodyText color="textSecondary">Loading…</BodyText>
      </Screen>
    )
  }

  if (selectedEnrolment && step !== 'success') {
    const annualRent = parseAnnualRent(selectedEnrolment.form.annualRent)
    const premium = calculateAnnualPremium(annualRent)
    const employmentLabel =
      EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === selectedEnrolment.form.employmentType)
        ?.label ?? selectedEnrolment.form.employmentType

    return (
      <Screen scroll background="shell">
        <Pressable
          onPress={() => setSelectedPropertyUuid('')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <ChevronLeft size={22} color={colors.textSecondary} />
          <BodyText color="textSecondary">Back</BodyText>
        </Pressable>
        <EyebrowText color="clay">{RSI_PRODUCT_NAME}</EyebrowText>
        <TitleText>Enrolment status</TitleText>
        <Card tone="tint" style={{ gap: spacing[2], flexDirection: 'row', alignItems: 'center' }}>
          <Shield size={22} color={colors.clay} />
          <View style={{ flex: 1, gap: 4 }}>
            <BodyText weight="semibold">Pending activation</BodyText>
            <CaptionText color="textSecondary">
              Waiting for landlord premium payment and policy inception.
            </CaptionText>
          </View>
        </Card>
        <Card style={{ gap: spacing[1] }}>
          <SummaryRow label="Life assured" value={selectedEnrolment.form.fullName} />
          <SummaryRow label="Policyholder" value={selectedEnrolment.form.landlordName} />
          <SummaryRow label="Sum assured" value={formatCurrency(annualRent)} />
          <SummaryRow label="Annual premium" value={formatCurrency(premium)} />
          <SummaryRow label="Employment" value={employmentLabel} />
          <SummaryRow label="Submitted" value={formatDate(selectedEnrolment.submittedAt)} />
        </Card>
        {__DEV__ ? (
          <Button
            variant="outline"
            onPress={async () => {
              await clearRsiEnrolment(selectedPropertyUuid)
              setEnrolments((c) => c.filter((i) => i.form.propertyUuid !== selectedPropertyUuid))
              setStep('details')
            }}
          >
            Re-enrol (dev only)
          </Button>
        ) : null}
      </Screen>
    )
  }

  return (
    <Screen scroll background="shell" avoidKeyboard>
      <Pressable
        onPress={handleBack}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Tenancy protection</EyebrowText>
      <TitleText>{RSI_PRODUCT_NAME}</TitleText>

      {step === 'property' ? (
        <View style={{ gap: spacing[3] }}>
          <BodyText color="textSecondary">Select the rental property you want to insure.</BodyText>
          {activeProperties.length === 0 ? (
            <Card>
              <BodyText weight="semibold">No active property</BodyText>
              <CaptionText color="textSecondary">
                Link an active tenancy before enrolling in Rent Support Insurance.
              </CaptionText>
              <Button size="sm" onPress={() => router.push(DASHBOARD_HREF.setupRental)}>
                Add rental details
              </Button>
            </Card>
          ) : (
            activeProperties.map((property) => {
              const propertyUuid = property.uuid || String(property.id)
              const enrolled = enrolments.some((r) => r.form.propertyUuid === propertyUuid)
              const address = [
                property.location?.address || property.address,
                property.location?.area,
              ]
                .filter(Boolean)
                .join(', ')
              return (
                <Pressable
                  key={propertyUuid}
                  onPress={() => {
                    setSelectedPropertyUuid(propertyUuid)
                    setStep('details')
                  }}
                >
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.md,
                        backgroundColor: colors.shellTint,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Home size={20} color={colors.clay} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <BodyText weight="semibold">
                        {property.unitName ||
                          property.location?.area ||
                          property.address ||
                          'Property'}
                      </BodyText>
                      <CaptionText color="textSecondary">{address}</CaptionText>
                      {enrolled ? <CaptionText color="clay">Enrolled</CaptionText> : null}
                    </View>
                  </Card>
                </Pressable>
              )
            })
          )}
        </View>
      ) : null}

      {step === 'details' ? (
        <View style={{ gap: spacing[3] }}>
          <Card tone="tint" style={{ gap: spacing[2], flexDirection: 'row' }}>
            <Shield size={22} color={colors.clay} />
            <BodyText color="textSecondary" style={{ flex: 1 }}>
              An insurance policy taken on your life. Your landlord is the policyholder and
              qualifying benefits are paid to them for rent-related obligations.
            </BodyText>
          </Card>
          <Card style={{ gap: spacing[2] }}>
            <BodyText weight="semibold">What is covered</BodyText>
            {RSI_COVERED_BENEFITS.map((item) => (
              <View key={item.title} style={{ flexDirection: 'row', gap: 8 }}>
                <Check size={16} color={colors.clay} />
                <View style={{ flex: 1 }}>
                  <BodyText weight="semibold">{item.title}</BodyText>
                  <CaptionText color="textSecondary">{item.description}</CaptionText>
                </View>
              </View>
            ))}
          </Card>
          <Card style={{ gap: spacing[2] }}>
            <BodyText weight="semibold">Key limits</BodyText>
            {RSI_KEY_LIMITS.map((item) => (
              <SummaryRow key={item.label} label={item.label} value={item.value} />
            ))}
          </Card>
          <Card style={{ gap: spacing[2] }}>
            <BodyText weight="semibold">What is not covered</BodyText>
            {RSI_EXCLUSIONS.map((item) => (
              <CaptionText key={item} color="textSecondary">
                • {item}
              </CaptionText>
            ))}
          </Card>
          <Button fullWidth onPress={() => setStep('consent')}>
            Continue
          </Button>
        </View>
      ) : null}

      {step === 'consent' ? (
        <View style={{ gap: spacing[3] }}>
          <BodyText color="textSecondary">
            Because insurance is being taken on your life, confirm you understand the following.
          </BodyText>
          <Card style={{ gap: spacing[3] }}>
            {RSI_CONSENT_ITEMS.map((item) => (
              <CheckboxField
                key={item.id}
                checked={!!consent[item.id]}
                onChange={(checked) => setConsent((prev) => ({ ...prev, [item.id]: checked }))}
                label={<BodyText>{item.label}</BodyText>}
              />
            ))}
          </Card>
          <Button
            fullWidth
            disabled={!RSI_CONSENT_ITEMS.every((item) => consent[item.id])}
            onPress={startForm}
          >
            Continue to enrolment
          </Button>
        </View>
      ) : null}

      {step === 'form' && form ? (
        <View style={{ gap: spacing[3] }}>
          <Card style={{ gap: spacing[3] }}>
            <HeadingText>Personal details</HeadingText>
            <Input
              label="Full name"
              value={form.fullName}
              onChangeText={(v) => updateForm('fullName', v)}
            />
            <Input
              label="Date of birth"
              value={form.dateOfBirth}
              onChangeText={(v) => updateForm('dateOfBirth', v)}
              placeholder="YYYY-MM-DD"
            />
            <OptionPicker
              label="Gender"
              value={form.gender}
              options={[...GENDER_OPTIONS]}
              onChange={(v) => updateForm('gender', v)}
              placeholder="Select gender"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChangeText={(v) => updateForm('phone', v)}
              keyboardType="phone-pad"
            />
            <Input
              label="Address"
              value={form.address}
              onChangeText={(v) => updateForm('address', v)}
            />
          </Card>
          <Card style={{ gap: spacing[3] }}>
            <HeadingText>Employment</HeadingText>
            <Input
              label="Occupation"
              value={form.occupation}
              onChangeText={(v) => updateForm('occupation', v)}
            />
            <OptionPicker
              label="Employment type"
              value={
                EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === form.employmentType)?.label ?? ''
              }
              options={EMPLOYMENT_TYPE_OPTIONS.map((o) => o.label)}
              onChange={(label) => {
                const match = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.label === label)
                updateForm('employmentType', match?.value ?? '')
              }}
              placeholder="Select type"
            />
            {form.employmentType &&
            !EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === form.employmentType)?.jolEligible ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#ca8a04" />
                <CaptionText color="textSecondary" style={{ flex: 1 }}>
                  Involuntary loss of job cover does not apply to your employment type. Other
                  benefits may still apply.
                </CaptionText>
              </View>
            ) : null}
          </Card>
          <Card style={{ gap: spacing[3] }}>
            <HeadingText>Rental details</HeadingText>
            <Input
              label="Landlord / policyholder"
              value={form.landlordName}
              onChangeText={(v) => updateForm('landlordName', v)}
            />
            <Input
              label="Property address"
              value={form.propertyAddress}
              onChangeText={(v) => updateForm('propertyAddress', v)}
            />
            <Input
              label="Rent start date"
              value={form.rentStartDate}
              onChangeText={(v) => updateForm('rentStartDate', v)}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="Annual rent / sum assured (₦)"
              value={form.annualRent}
              onChangeText={(v) => updateForm('annualRent', formatRentAmountInput(v))}
              keyboardType="number-pad"
            />
            {parseAnnualRent(form.annualRent) > RSI_MAX_SUM_ASSURED ? (
              <CaptionText color="textSecondary">
                Rent exceeds max sum assured — premium calculated on{' '}
                {formatCurrency(RSI_MAX_SUM_ASSURED)}.
              </CaptionText>
            ) : null}
            {parseAnnualRent(form.annualRent) > 0 ? (
              <BodyText weight="semibold">
                Estimated annual premium (landlord):{' '}
                {formatCurrency(calculateAnnualPremium(parseAnnualRent(form.annualRent)))}
              </BodyText>
            ) : null}
          </Card>
          {formError ? <CaptionText color="error">{formError}</CaptionText> : null}
          <Button fullWidth onPress={() => void submitEnrolment()}>
            Submit enrolment
          </Button>
        </View>
      ) : null}

      {step === 'success' && submittedEnrolment ? (
        <View style={{ gap: spacing[3] }}>
          <Card tone="tint" style={{ gap: spacing[2], alignItems: 'center' }}>
            <Check size={32} color="#16a34a" />
            <TitleText style={{ textAlign: 'center' }}>Enrolment submitted</TitleText>
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              Cover is not active yet — your landlord must complete premium payment before the
              policy incepts.
            </BodyText>
          </Card>
          <CaptionText color="textMuted">
            Once active, a {RSI_INTRO_PERIOD_DAYS}-day introductory period applies (accidental death
            exempt).
          </CaptionText>
          <Button fullWidth onPress={() => goToHome()}>
            Back to dashboard
          </Button>
        </View>
      ) : null}
    </Screen>
  )
}
