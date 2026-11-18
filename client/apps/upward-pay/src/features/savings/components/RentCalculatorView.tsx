'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ChevronRight,
  Pencil,
} from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import {
  useSimulateRentSavings,
  useSavingsOnboardingPrefill,
  useOnboardSavingsInvestor,
} from '../hooks/useRentSavings'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import {
  calculatePayLessPlan,
  type SavingsCadence,
  type SavingsPlanPattern,
  type SavingsProductOption,
} from '../services/savingsService'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { PayPageShell, PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { loadSetupDraft, patchSetupDraft } from '@/features/dashboard/setup/setupDraft'
import { readSavingsRentPlan } from '../utils/savingsRentPlan'

type Stage = 'RENT_INPUT' | 'PROTECTION' | 'BENEFIT' | 'KYC' | 'SUCCESS'

interface RentCalculatorViewProps {
  onSuccess?: () => void
  onProceedToSetup?: (config: {
    targetAmountKobo: number
    contractualDueDate: string
    cadence: SavingsCadence
    periodicDepositKobo: number
    productOption?: SavingsProductOption
  }) => void
  onOpenKycModal?: () => void
  isKycModalOpen?: boolean
}

export function RentCalculatorView({
  onSuccess,
  onProceedToSetup,
}: RentCalculatorViewProps) {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()

  // Single source of truth: Settings active rental property
  const activeProperty = (user?.properties || []).find(
    (p: {
      id?: number | string
      isPastTenancy?: boolean
      rentAmount?: number
      rentEndDate?: string
      title?: string
      address?: string
    }) => !p.isPastTenancy && p.rentAmount,
  )

  const [targetAmountRaw, setTargetAmountRaw] = useState<string>(() => {
    if (activeProperty?.rentAmount) return formatCurrencyInput(activeProperty.rentAmount)
    if (typeof window !== 'undefined') {
      try {
        const draft = loadSetupDraft()
        const draftAmount = draft?.formData?.rentAmount ? (parseCurrencyInput(draft.formData.rentAmount) || 0) : 0
        if (draftAmount > 0) return formatCurrencyInput(draftAmount)
        const plan = readSavingsRentPlan()
        if (plan?.rentAmount) return formatCurrencyInput(Number(plan.rentAmount))
      } catch {}
    }
    return ''
  })
  const [nowTimestamp] = useState(() => Date.now())
  const [contractualDueDate, setContractualDueDate] = useState<string>(() => {
    if (activeProperty?.rentEndDate) {
      return activeProperty.rentEndDate.split('T')[0]
    }
    if (typeof window !== 'undefined') {
      try {
        const draft = loadSetupDraft()
        if (draft?.formData?.rentEndDate) return draft.formData.rentEndDate.split('T')[0]
        const plan = readSavingsRentPlan()
        if (plan?.dueDate) return plan.dueDate.split('T')[0]
      } catch {}
    }
    return ''
  })

  const [prevPropertyId, setPrevPropertyId] = useState<number | string | undefined>(
    activeProperty?.id,
  )
  if (activeProperty?.id !== prevPropertyId) {
    setPrevPropertyId(activeProperty?.id)
    if (activeProperty?.rentAmount) {
      setTargetAmountRaw(formatCurrencyInput(activeProperty.rentAmount))
    }
    if (activeProperty?.rentEndDate) {
      setContractualDueDate(activeProperty.rentEndDate.split('T')[0])
    }
  }

  const targetAmountNaira = parseCurrencyInput(targetAmountRaw) || 0
  const tomorrow = new Date(nowTimestamp + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const hasSavedRent = Boolean(
    (activeProperty?.rentAmount && activeProperty?.rentEndDate) ||
    (targetAmountNaira > 0 && contractualDueDate && contractualDueDate >= tomorrow)
  )
  const [rentConfirmed, setRentConfirmed] = useState(false)
  const hasRentDetails = hasSavedRent || rentConfirmed

  // Flow Stage State
  const [initialStage] = useState<Stage>(() => (hasSavedRent ? 'BENEFIT' : 'RENT_INPUT'))
  const [stage, setStage] = useState<Stage>(initialStage)
  const [protectionFromBenefit, setProtectionFromBenefit] = useState(false)

  const canConfirmRent =
    targetAmountNaira > 0 && Boolean(contractualDueDate) && contractualDueDate >= tomorrow

  const selectedCadence: SavingsCadence = 'MONTHLY'
  const [selectedProductOption, setSelectedProductOption] =
    useState<SavingsProductOption>(() => {
      const saved = readSavingsRentPlan()
      return saved?.productOption === 'SAVE_AND_EARN' ? 'SAVE_AND_EARN' : 'RENT_PROTEC'
    })
  const [planPattern, setPlanPattern] = useState<SavingsPlanPattern>(() => {
    const saved = readSavingsRentPlan()
    if (saved?.planPattern === 'EQUAL' || saved?.planPattern === 'STEP_UP') {
      return saved.planPattern
    }
    return 'INITIAL_DEPOSIT'
  })

  const simulateMutation = useSimulateRentSavings()
  const mutateSimulate = simulateMutation.mutate

  const { rates: platformRates } = usePlatformRates()
  const rawDaysRemaining = contractualDueDate
    ? Math.max(
        1,
        Math.ceil(
          (new Date(contractualDueDate).getTime() - nowTimestamp) / (1000 * 60 * 60 * 24),
        ),
      )
    : 330
  const isRentProtecEligible = rawDaysRemaining >= (platformRates.rentProtecMinMonths || 6) * 28
  const activeProductOption: SavingsProductOption =
    selectedProductOption === 'RENT_PROTEC' && !isRentProtecEligible
      ? 'SAVE_AND_EARN'
      : selectedProductOption

  // KYC Prefill & Form State
  const { data: prefill } = useSavingsOnboardingPrefill(true)
  const onboardMutation = useOnboardSavingsInvestor()

  const hasVerifiedBvnOnFile = Boolean(prefill?.has_verified_bvn || user?.isIdentityVerified)
  const [bvn, setBvn] = useState(() => prefill?.bvn || '')
  const [mothersMaidenName, setMothersMaidenName] = useState(() => prefill?.mothers_maiden_name || '')
  const [occupation, setOccupation] = useState(() => prefill?.occupation || '')
  const [sourceOfFunds, setSourceOfFunds] = useState<'Salary' | 'Business' | 'Savings' | 'Investment'>(
    () => prefill?.source_of_funds || 'Salary',
  )
  const [nextOfKinName, setNextOfKinName] = useState(() => prefill?.next_of_kin_name || '')
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState(
    () => prefill?.next_of_kin_relationship || 'Spouse',
  )
  const [nextOfKinPhone, setNextOfKinPhone] = useState(() => prefill?.next_of_kin_phone || '')
  const [agreeToLock, setAgreeToLock] = useState(false)
  const [kycError, setKycError] = useState<string | null>(null)

  const [prevPrefill, setPrevPrefill] = useState<typeof prefill | null>(null)
  if (prefill && prefill !== prevPrefill) {
    setPrevPrefill(prefill)
    if (prefill.bvn && !bvn) setBvn(prefill.bvn)
    if (prefill.mothers_maiden_name && !mothersMaidenName) {
      setMothersMaidenName(prefill.mothers_maiden_name)
    }
    if (prefill.occupation && !occupation) setOccupation(prefill.occupation)
    if (prefill.source_of_funds && (!sourceOfFunds || sourceOfFunds === 'Salary')) {
      setSourceOfFunds(prefill.source_of_funds)
    }
    if (prefill.next_of_kin_name && !nextOfKinName) setNextOfKinName(prefill.next_of_kin_name)
    if (prefill.next_of_kin_relationship && (!nextOfKinRelationship || nextOfKinRelationship === 'Spouse')) {
      setNextOfKinRelationship(prefill.next_of_kin_relationship)
    }
    if (prefill.next_of_kin_phone && !nextOfKinPhone) setNextOfKinPhone(prefill.next_of_kin_phone)
  }

  const [createdDva, setCreatedDva] = useState<{
    bank_name: string
    account_number: string
    account_name: string
  } | null>(null)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [showComparePlans, setShowComparePlans] = useState(false)
  const [customInitialDeposit, setCustomInitialDeposit] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const plan = readSavingsRentPlan()
        if (plan?.planPattern === 'INITIAL_DEPOSIT' && plan.initialDeposit && Number(plan.initialDeposit) > 0) {
          return formatCurrencyInput(Number(plan.initialDeposit))
        }
      } catch {}
    }
    return null
  })
  const [stepInputMode, setStepInputMode] = useState<'START' | 'INCREMENT' | null>(null)
  const [customStepStart, setCustomStepStart] = useState<string | null>(null)
  const [customStepIncrement, setCustomStepIncrement] = useState<string | null>(null)

  const simData = simulateMutation.data
  const defaultRatePct =
    activeProductOption === 'RENT_PROTEC'
      ? platformRates.rentProtecRatePct
      : platformRates.savingsAnnualRatePct
  const savingsAnnualRatePct = simData?.net_annual_yield_rate
    ? Math.round(simData.net_annual_yield_rate * 1000) / 10
    : defaultRatePct
  const daysRemaining = simData ? simData.days_remaining : Math.max(1, rawDaysRemaining - 30)

  const previewRentAmount = targetAmountNaira || 2_500_000

  // Pre-calculate metrics for all 3 savings plans (Kunle specification)
  const currentDepositNairaForCalc =
    planPattern === 'INITIAL_DEPOSIT'
      ? (customInitialDeposit !== null
          ? (parseCurrencyInput(customInitialDeposit) || 0)
          : Math.round(previewRentAmount * 0.25))
      : 0

  const planDepositMetrics = useMemo(() => {
    const initialNaira =
      customInitialDeposit !== null
        ? (parseCurrencyInput(customInitialDeposit) || 0)
        : Math.round(previewRentAmount * 0.25)
    return calculatePayLessPlan(
      previewRentAmount,
      daysRemaining,
      selectedCadence,
      initialNaira,
      savingsAnnualRatePct,
      {
        productOption: activeProductOption,
        planPattern: 'INITIAL_DEPOSIT',
        maxMonths: platformRates.maxSavingsMonths,
        minRentProtecMonths: platformRates.rentProtecMinMonths,
        insurancePremiumPct: platformRates.insurancePremiumPct,
      },
    )
  }, [previewRentAmount, customInitialDeposit, daysRemaining, selectedCadence, savingsAnnualRatePct, activeProductOption, platformRates])

  const planEqualMetrics = useMemo(() => {
    return calculatePayLessPlan(
      previewRentAmount,
      daysRemaining,
      selectedCadence,
      0,
      savingsAnnualRatePct,
      {
        productOption: activeProductOption,
        planPattern: 'EQUAL',
        maxMonths: platformRates.maxSavingsMonths,
        minRentProtecMonths: platformRates.rentProtecMinMonths,
        insurancePremiumPct: platformRates.insurancePremiumPct,
      },
    )
  }, [previewRentAmount, daysRemaining, selectedCadence, savingsAnnualRatePct, activeProductOption, platformRates])

  const planStepUpMetrics = useMemo(() => {
    return calculatePayLessPlan(
      previewRentAmount,
      daysRemaining,
      selectedCadence,
      0,
      savingsAnnualRatePct,
      {
        productOption: activeProductOption,
        planPattern: 'STEP_UP',
        maxMonths: platformRates.maxSavingsMonths,
        minRentProtecMonths: platformRates.rentProtecMinMonths,
        insurancePremiumPct: platformRates.insurancePremiumPct,
        customStepStartNaira:
          stepInputMode === 'START' && customStepStart !== null
            ? (parseCurrencyInput(customStepStart) || 0)
            : undefined,
        customStepIncrementNaira:
          stepInputMode === 'INCREMENT' && customStepIncrement !== null
            ? (parseCurrencyInput(customStepIncrement) || 0)
            : undefined,
      },
    )
  }, [
    previewRentAmount,
    daysRemaining,
    selectedCadence,
    savingsAnnualRatePct,
    activeProductOption,
    platformRates,
    stepInputMode,
    customStepStart,
    customStepIncrement,
  ])

  const stepStartDisplayRaw =
    stepInputMode === 'START' && customStepStart !== null
      ? customStepStart
      : planStepUpMetrics.periodicDepositNaira > 0
        ? formatCurrencyInput(planStepUpMetrics.periodicDepositNaira)
        : ''

  const stepIncrementDisplayRaw =
    stepInputMode === 'INCREMENT' && customStepIncrement !== null
      ? customStepIncrement
      : planStepUpMetrics.stepIncrementNaira > 0
        ? formatCurrencyInput(planStepUpMetrics.stepIncrementNaira)
        : '0'

  const localPlan =
    planPattern === 'EQUAL'
      ? planEqualMetrics
      : planPattern === 'STEP_UP'
        ? planStepUpMetrics
        : planDepositMetrics

  const isSimDataCurrent =
    simData &&
    simData.plan_pattern === planPattern &&
    planPattern !== 'STEP_UP' &&
    (planPattern !== 'INITIAL_DEPOSIT' ||
      Math.abs((simData.required_initial_deposit_kobo ?? 0) - Math.round(currentDepositNairaForCalc * 100)) < 200)

  const totalTenantContributionNaira = isSimDataCurrent
    ? simData.total_tenant_contribution_kobo / 100
    : localPlan.totalTenantContributionNaira
  const projectedYieldNaira = isSimDataCurrent
    ? simData.projected_yield_kobo / 100
    : localPlan.projectedYieldNaira

  // Simulate compound savings & persist exact plan details
  useEffect(() => {
    if (!targetAmountNaira || !contractualDueDate) return
    if (!hasRentDetails) return

    const currentDepositNaira =
      planPattern === 'INITIAL_DEPOSIT'
        ? (customInitialDeposit !== null
            ? (parseCurrencyInput(customInitialDeposit) || 0)
            : Math.round(targetAmountNaira * 0.25))
        : 0
    const initialDepositKobo = Math.round(currentDepositNaira * 100)

    mutateSimulate({
      target_amount_kobo: Math.round(targetAmountNaira * 100),
      contractual_due_date: contractualDueDate,
      initial_deposit_kobo: initialDepositKobo,
      cadence: selectedCadence,
      product_option: activeProductOption,
      plan_pattern: planPattern,
    })

    const persistedDepositNaira =
      planPattern === 'INITIAL_DEPOSIT'
        ? currentDepositNaira
        : planPattern === 'EQUAL'
          ? planEqualMetrics.periodicDepositNaira
          : planStepUpMetrics.periodicDepositNaira

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'upward_savings_rent_plan',
          JSON.stringify({
            userId: user?.id,
            source: 'user',
            rentAmount: targetAmountNaira,
            dueDate: contractualDueDate,
            cadence: selectedCadence,
            productOption: activeProductOption,
            planPattern: planPattern,
            initialDeposit: persistedDepositNaira,
            stepStartNaira: planStepUpMetrics.periodicDepositNaira,
            stepIncrementNaira: planStepUpMetrics.stepIncrementNaira,
          }),
        )
      } catch {}

      if (targetAmountNaira > 0) {
        const computedStart = contractualDueDate
          ? new Date(new Date(contractualDueDate).getTime() - 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          : ''
        patchSetupDraft({
          formData: {
            rentAmount: formatCurrencyInput(targetAmountNaira),
            ...(contractualDueDate ? { rentEndDate: contractualDueDate, rentStartDate: computedStart } : {}),
          },
        })
      }
    }
  }, [
    targetAmountNaira,
    contractualDueDate,
    activeProductOption,
    planPattern,
    customInitialDeposit,
    planEqualMetrics.periodicDepositNaira,
    planStepUpMetrics.periodicDepositNaira,
    planStepUpMetrics.stepIncrementNaira,
    selectedCadence,
    hasRentDetails,
    mutateSimulate,
    user?.id,
  ])

  const defaultInitialDepositNaira = useMemo(() => {
    if (planPattern === 'INITIAL_DEPOSIT') {
      return Math.round(previewRentAmount * 0.25)
    }
    if (planPattern === 'EQUAL') {
      return planEqualMetrics.periodicDepositNaira
    }
    return planStepUpMetrics.periodicDepositNaira
  }, [
    planPattern,
    previewRentAmount,
    planEqualMetrics.periodicDepositNaira,
    planStepUpMetrics.periodicDepositNaira,
  ])

  const initialDepositRaw =
    planPattern === 'INITIAL_DEPOSIT'
      ? customInitialDeposit !== null
        ? customInitialDeposit
        : defaultInitialDepositNaira > 0
          ? formatCurrencyInput(defaultInitialDepositNaira)
          : ''
      : customInitialDeposit !== null
        ? customInitialDeposit
        : defaultInitialDepositNaira > 0
          ? formatCurrencyInput(defaultInitialDepositNaira)
          : ''

  const parsedSuccessDeposit = parseCurrencyInput(initialDepositRaw) || 0
  const successDynamicPlan =
    planPattern === 'INITIAL_DEPOSIT'
      ? calculatePayLessPlan(
          previewRentAmount,
          daysRemaining,
          selectedCadence,
          parsedSuccessDeposit,
          savingsAnnualRatePct,
          {
            productOption: activeProductOption,
            planPattern: 'INITIAL_DEPOSIT',
            maxMonths: platformRates.maxSavingsMonths,
            minRentProtecMonths: platformRates.rentProtecMinMonths,
            insurancePremiumPct: platformRates.insurancePremiumPct,
          },
        )
      : localPlan
  const successPeriodicDepositNaira = successDynamicPlan.periodicDepositNaira
  const successProjectedYieldNaira = successDynamicPlan.projectedYieldNaira

  const effectiveTotalTarget = totalTenantContributionNaira + projectedYieldNaira
  const contributionPct =
    effectiveTotalTarget > 0
      ? Math.max(0, Math.min(100, Math.round((totalTenantContributionNaira / effectiveTotalTarget) * 100)))
      : 95
  const yieldPct = Math.max(0, 100 - contributionPct)

  const handleSelectPlan = (pattern: SavingsPlanPattern) => {
    setPlanPattern(pattern)
    setCustomInitialDeposit(null)
    setStepInputMode(null)
    setCustomStepStart(null)
    setCustomStepIncrement(null)
    setShowComparePlans(false)
  }

  const formattedDueDate = contractualDueDate
    ? new Date(contractualDueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'in 12 months'

  const handleCopyAccountNumber = async (accNum: string) => {
    try {
      await navigator.clipboard.writeText(accNum)
      setCopiedAccount(true)
      setTimeout(() => setCopiedAccount(false), 2500)
    } catch {}
  }

  const isBvnValid = hasVerifiedBvnOnFile || bvn.trim().length === 11
  const isMaidenNameValid = mothersMaidenName.trim().length > 0
  const isOccupationValid = occupation.trim().length > 0
  const isNextOfKinValid = nextOfKinName.trim().length > 0 && nextOfKinPhone.trim().length >= 10
  const isKycValid =
    isBvnValid && isMaidenNameValid && isOccupationValid && isNextOfKinValid && agreeToLock

  const handleSubmitKyc = async () => {
    if (!isKycValid) return
    setKycError(null)

    try {
      const res = await onboardMutation.mutateAsync({
        bvn: bvn.length === 11 ? bvn : undefined,
        mothers_maiden_name: mothersMaidenName.trim(),
        occupation: occupation.trim(),
        source_of_funds: sourceOfFunds,
        next_of_kin_name: nextOfKinName.trim(),
        next_of_kin_relationship: nextOfKinRelationship || 'Spouse',
        next_of_kin_phone: nextOfKinPhone.trim(),
        target_amount: targetAmountNaira,
        rent_due_date: contractualDueDate,
        cadence: 'MONTHLY',
        product_option: activeProductOption,
        plan_pattern: planPattern,
        initial_deposit_kobo:
          planPattern === 'INITIAL_DEPOSIT'
            ? Math.round(
                (customInitialDeposit !== null
                  ? (parseCurrencyInput(customInitialDeposit) || 0)
                  : Math.round(targetAmountNaira * 0.25)) * 100,
              )
            : 0,
      })

      const dva = res?.dedicated_account
      if (dva?.account_number) {
        setCreatedDva(dva)
      } else if (process.env.NODE_ENV !== 'production') {
        const fallbackAccSuffix = nowTimestamp.toString().slice(-8)
        setCreatedDva({
          bank_name: 'Wema Bank',
          account_number: `02${fallbackAccSuffix}`,
          account_name: `Upward / ${user?.firstName || 'Tenant'} ${user?.lastName || ''}`.trim(),
        })
      } else {
        setCreatedDva(null)
      }

      setStage('SUCCESS')
      toastSuccess('Account verified and dedicated rent bank account ready!')
      await refreshUser().catch(() => {})
    } catch (err: unknown) {
      const error = err as { message?: string }
      const msg = error?.message || 'Verification failed. Please check your information.'
      setKycError(msg)
      toastError(msg)
    }
  }

  const handleFinish = async () => {
    await refreshUser().catch(() => {})
    if (onSuccess) {
      onSuccess()
    } else {
      router.push('/dashboard')
    }
  }

  const handleRentInputBack = () => {
    router.push('/dashboard')
  }

  const handleProtectionBack = () => {
    if (protectionFromBenefit) {
      setProtectionFromBenefit(false)
      setStage('BENEFIT')
      return
    }
    if (initialStage === 'RENT_INPUT') {
      setStage('RENT_INPUT')
    } else {
      router.push('/dashboard')
    }
  }

  const handleBenefitBack = () => {
    if (initialStage === 'BENEFIT') {
      router.push('/dashboard')
    } else {
      setProtectionFromBenefit(false)
      setStage('PROTECTION')
    }
  }

  // STAGE 1: Rent Details Input
  if (stage === 'RENT_INPUT') {
    return (
      <PayPageShell
        title="Set Up Rent Savings"
        subtitle="Tell us the rent you are saving towards and when it is due."
        showBack
        onBack={handleRentInputBack}
        pinFooter
        footer={
          <PayFlowPrimaryButton
            disabled={!canConfirmRent}
            onClick={() => {
              if (targetAmountNaira > 0) {
                const computedStartDate = contractualDueDate
                  ? new Date(new Date(contractualDueDate).getTime() - 365 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split('T')[0]
                  : ''
                patchSetupDraft({
                  formData: {
                    rentAmount: formatCurrencyInput(targetAmountNaira),
                    ...(contractualDueDate ? { rentEndDate: contractualDueDate, rentStartDate: computedStartDate } : {}),
                  },
                })
                try {
                  const currentPlan = readSavingsRentPlan() || {}
                  localStorage.setItem(
                    'upward_savings_rent_plan',
                    JSON.stringify({
                      ...currentPlan,
                      userId: user?.id,
                      source: 'user',
                      rentAmount: targetAmountNaira,
                      dueDate: contractualDueDate || currentPlan.dueDate,
                    }),
                  )
                } catch {}
              }
              setRentConfirmed(true)
              setProtectionFromBenefit(false)
              setStage('PROTECTION')
            }}
          >
            Continue
            <ArrowRight size={18} aria-hidden />
          </PayFlowPrimaryButton>
        }
      >
        <div className="rent-calculator__section" style={{ marginTop: 0 }}>
          <div className="rent-calculator__field">
            <label className="rent-calculator__label" htmlFor="rent-calc-amount">
              Annual rent
            </label>
            <div className="rent-calculator__input-wrapper">
              <span className="rent-calculator__input-prefix">₦</span>
              <input
                id="rent-calc-amount"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 2,500,000"
                className="rent-calculator__input"
                value={targetAmountRaw}
                onChange={(e) => {
                  const parsed = parseCurrencyInput(e.target.value)
                  setTargetAmountRaw(parsed ? formatCurrencyInput(parsed) : '')
                }}
              />
            </div>
          </div>

          <div className="rent-calculator__field" style={{ marginTop: 14 }}>
            <label className="rent-calculator__label" htmlFor="rent-calc-due-date">
              Rent due date
            </label>
            <div className="rent-calculator__input-wrapper">
              <input
                id="rent-calc-due-date"
                type="date"
                min={tomorrow}
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={contractualDueDate}
                onChange={(e) => setContractualDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </PayPageShell>
    )
  }

  // STAGE 1.5: Savings Track / Protection Plan Selection (Nov 16 Spec: before schedule breakdown)
  if (stage === 'PROTECTION') {
    return (
      <PayPageShell
        title="Choose Your Plan Track"
        subtitle="Include rent protection or earn higher pure interest towards your rent."
        showBack
        onBack={handleProtectionBack}
        pinFooter
        footer={
          <PayFlowPrimaryButton
            onClick={() => {
              setProtectionFromBenefit(false)
              setStage('BENEFIT')
            }}
          >
            Continue
            <ArrowRight size={18} aria-hidden />
          </PayFlowPrimaryButton>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
          {/* Option 1: Rent Protec (Recommended) */}
          <button
            type="button"
            onClick={() => setSelectedProductOption('RENT_PROTEC')}
            disabled={!isRentProtecEligible}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '18px',
              borderRadius: '16px',
              border:
                activeProductOption === 'RENT_PROTEC'
                  ? '2px solid var(--clay)'
                  : '1.5px solid var(--shell-border, #f0e9df)',
              background:
                activeProductOption === 'RENT_PROTEC'
                  ? '#fffaf7'
                  : 'var(--surface, #ffffff)',
              cursor: isRentProtecEligible ? 'pointer' : 'not-allowed',
              opacity: isRentProtecEligible ? 1 : 0.45,
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="var(--clay)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
                  Rent Protec
                </span>
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: 'var(--shell-tint, #fbede5)',
                    color: 'var(--clay)',
                  }}
                >
                  Recommended
                </span>
              </div>

              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#059669' }}>
                {platformRates.rentProtecRatePct}% p.a.
              </span>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45, paddingLeft: '26px' }}>
              Earn compound returns plus Upward rent coverage in case of job loss or illness.
            </div>

            {!isRentProtecEligible && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '26px' }}>
                Requires at least {platformRates.rentProtecMinMonths} months before rent is due.
              </div>
            )}
          </button>

          {/* Option 2: Save & Earn (Basic Savings Only) */}
          <button
            type="button"
            onClick={() => setSelectedProductOption('SAVE_AND_EARN')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '18px',
              borderRadius: '16px',
              border:
                activeProductOption === 'SAVE_AND_EARN'
                  ? '2px solid var(--clay)'
                  : '1.5px solid var(--shell-border, #f0e9df)',
              background:
                activeProductOption === 'SAVE_AND_EARN'
                  ? '#fffaf7'
                  : 'var(--surface, #ffffff)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: activeProductOption === 'SAVE_AND_EARN' ? 'var(--clay)' : 'var(--text)',
                  }}
                >
                  Save &amp; Earn
                </span>
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    background: 'var(--surface2, #efefef)',
                    padding: '2px 7px',
                    borderRadius: '999px',
                  }}
                >
                  Savings only
                </span>
              </div>

              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#059669' }}>
                {platformRates.savingsAnnualRatePct}% p.a.
              </span>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.45, paddingLeft: '26px' }}>
              Earn maximum compound returns towards your rent without insurance coverage.
            </div>
          </button>
        </div>
      </PayPageShell>
    )
  }

  // STAGE 2: Clear Benefit Showcase (Kunle Specification: Spacious, One Plan Per Screen + Compare Plans)
  if (stage === 'BENEFIT') {
    const activePlanTitle =
      planPattern === 'INITIAL_DEPOSIT'
        ? 'Deposit now, save monthly'
        : planPattern === 'EQUAL'
          ? 'Equal monthly'
          : 'Start small & step up'

    return (
      <>
        <PayPageShell
          title="Pay Less for Your Next Rent"
          subtitle="Let compound interest help pay your rent."
          showBack
          onBack={handleBenefitBack}
          pinFooter
          footer={
            <PayFlowPrimaryButton onClick={() => setStage('KYC')}>
              Continue to Activate Account
              <ArrowRight size={18} aria-hidden />
            </PayFlowPrimaryButton>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 24 }}>
            {/* Compact Target + Track Summary Bar */}
            <div
              style={{
                borderRadius: '14px',
                background: 'var(--oat, #faf9f5)',
                border: '1px solid var(--shell-border, #f0e9df)',
                padding: '11px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Target: <strong style={{ color: 'var(--text)' }}>{formatCurrency(targetAmountNaira, 'NGN')}</strong> due{' '}
                  <strong style={{ color: 'var(--text)' }}>{formattedDueDate}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setStage('RENT_INPUT')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--clay)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  Change
                </button>
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                  paddingTop: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {activeProductOption === 'RENT_PROTEC' ? (
                    <ShieldCheck size={14} color="var(--clay)" />
                  ) : (
                    <TrendingUp size={14} color="#059669" />
                  )}
                  <span>
                    <strong style={{ color: 'var(--text)' }}>
                      {activeProductOption === 'RENT_PROTEC' ? 'Rent Protec' : 'Save & Earn'}
                    </strong>{' '}
                    ({savingsAnnualRatePct}% p.a.)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProtectionFromBenefit(true)
                    setStage('PROTECTION')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--clay)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  Switch
                </button>
              </div>
            </div>

            {/* Single Airy Plan Card (Uncrowded per Kunle Spec) */}
            <div
              style={{
                padding: '20px 18px',
                borderRadius: '18px',
                background: 'linear-gradient(180deg, #faf9f5 0%, #f6f3ee 100%)',
                border: '1px solid var(--shell-border, #f0e9df)',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
              }}
            >
              {/* Plan Header + Compare Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text)' }}>
                  {activePlanTitle}
                </span>

                <button
                  type="button"
                  onClick={() => setShowComparePlans(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    background: '#ffffff',
                    border: '1px solid var(--shell-border, #e5dfd7)',
                    borderRadius: '999px',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--clay)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Compare plans
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Exact Contributions Section — Clear Input Textboxes vs Read-Only Output */}
              {planPattern === 'INITIAL_DEPOSIT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label
                      htmlFor="upfront-deposit-amount"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Today&apos;s upfront deposit
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#ffffff',
                        border: '1.5px solid #cbc2b7',
                        borderRadius: '12px',
                        height: 48,
                        padding: '0 14px',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-muted)', flexShrink: 0 }}>
                        ₦
                      </span>
                      <input
                        id="upfront-deposit-amount"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={initialDepositRaw}
                        onChange={(e) => {
                          const parsed = parseCurrencyInput(e.target.value)
                          setCustomInitialDeposit(parsed ? formatCurrencyInput(parsed) : '')
                        }}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          fontSize: '1.3125rem',
                          fontWeight: 800,
                          color: 'var(--text)',
                          letterSpacing: '-0.02em',
                        }}
                      />
                      <Pencil size={14} color="var(--clay)" style={{ flexShrink: 0, opacity: 0.75 }} aria-hidden />
                    </div>
                  </div>

                  {/* Read-Only Calculated Monthly Output */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(194, 80, 31, 0.06)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>
                        Then save monthly
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        For {planDepositMetrics.numberOfPayments} months
                      </div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clay)' }}>
                      {formatCurrency(planDepositMetrics.periodicDepositNaira)}
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>/mo</span>
                    </div>
                  </div>
                </div>
              )}

              {planPattern === 'EQUAL' && (
                <div
                  style={{
                    background: 'rgba(194, 80, 31, 0.06)',
                    borderRadius: '14px',
                    padding: '20px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                      Save monthly
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                      {planEqualMetrics.numberOfPayments} months · ₦0 upfront
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: 'var(--clay)',
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatCurrency(planEqualMetrics.periodicDepositNaira)}
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>/mo</span>
                  </div>
                </div>
              )}

              {planPattern === 'STEP_UP' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label
                        htmlFor="stepup-start-amount"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          display: 'block',
                          marginBottom: 6,
                        }}
                      >
                        Start (Month 1)
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#ffffff',
                          border: '1.5px solid #cbc2b7',
                          borderRadius: '12px',
                          height: 46,
                          padding: '0 10px',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          ₦
                        </span>
                        <input
                          id="stepup-start-amount"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={stepStartDisplayRaw}
                          onChange={(e) => {
                            const parsed = parseCurrencyInput(e.target.value)
                            setStepInputMode('START')
                            setCustomStepStart(parsed ? formatCurrencyInput(parsed) : '')
                          }}
                          style={{
                            width: '100%',
                            minWidth: 0,
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            fontSize: '1rem',
                            fontWeight: 800,
                            color: 'var(--text)',
                          }}
                        />
                        <Pencil size={12} color="var(--clay)" style={{ flexShrink: 0, opacity: 0.75 }} aria-hidden />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="stepup-increment-amount"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          display: 'block',
                          marginBottom: 6,
                        }}
                      >
                        Monthly step-up
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#ffffff',
                          border: '1.5px solid #cbc2b7',
                          borderRadius: '12px',
                          height: 46,
                          padding: '0 10px',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--clay)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          +₦
                        </span>
                        <input
                          id="stepup-increment-amount"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={stepIncrementDisplayRaw}
                          onChange={(e) => {
                            const parsed = parseCurrencyInput(e.target.value)
                            setStepInputMode('INCREMENT')
                            setCustomStepIncrement(parsed ? formatCurrencyInput(parsed) : '')
                          }}
                          style={{
                            width: '100%',
                            minWidth: 0,
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            fontSize: '1rem',
                            fontWeight: 800,
                            color: 'var(--clay)',
                          }}
                        />
                        <Pencil size={12} color="var(--clay)" style={{ flexShrink: 0, opacity: 0.75 }} aria-hidden />
                      </div>
                    </div>
                  </div>

                  {/* Concise Read-Only Progression Line (no repeated Month 1 / step-up figures) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(194, 80, 31, 0.06)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    <span>Final month (Month {planStepUpMetrics.numberOfPayments})</span>
                    <strong style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                      {formatCurrency(planStepUpMetrics.lastPeriodDepositNaira)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Total Contributions vs Estimated Returns Summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  alignItems: 'baseline',
                  paddingTop: 4,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 700,
                      display: 'block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    You contribute
                  </span>
                  <div
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: 'var(--text)',
                      marginTop: 2,
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatCurrency(totalTenantContributionNaira)}
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: '#059669',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 700,
                      display: 'block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Est. returns
                  </span>
                  <div
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: '#059669',
                      marginTop: 2,
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +{formatCurrency(projectedYieldNaira)}
                  </div>
                </div>
              </div>

              {/* Visual Breakdown Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  overflow: 'hidden',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    width: `${contributionPct}%`,
                    background: 'var(--clay)',
                    borderRadius: '999px 0 0 999px',
                    transition: 'width 0.3s ease',
                  }}
                />
                <div
                  style={{
                    width: `${yieldPct}%`,
                    background: '#059669',
                    borderRadius: '0 999px 999px 0',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </PayPageShell>

        {/* Compare Other Savings Plans Modal (Kunle Spec) */}
        <BottomSheetModal
          isOpen={showComparePlans}
          onClose={() => setShowComparePlans(false)}
          title="Compare Savings Plans"
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
            {/* Plan 1: Deposit + Save Equally */}
            <button
              type="button"
              onClick={() => handleSelectPlan('INITIAL_DEPOSIT')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: '14px',
                border:
                  planPattern === 'INITIAL_DEPOSIT'
                    ? '2px solid var(--clay)'
                    : '1.5px solid var(--shell-border, #e5dfd7)',
                background: planPattern === 'INITIAL_DEPOSIT' ? '#fffaf7' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text)' }}>
                    Deposit now, save monthly
                  </span>
                  <span
                    style={{
                      fontSize: '0.5625rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '999px',
                      background: 'var(--shell-tint, #fbede5)',
                      color: 'var(--clay)',
                    }}
                  >
                    Default
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Est. +{formatCurrency(planDepositMetrics.projectedYieldNaira)}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {formatCurrency(planDepositMetrics.requiredInitialDepositNaira)} today +{' '}
                <strong style={{ color: 'var(--clay)' }}>
                  {formatCurrency(planDepositMetrics.periodicDepositNaira)}/mo
                </strong>
              </div>
            </button>

            {/* Plan 2: Equal Monthly */}
            <button
              type="button"
              onClick={() => handleSelectPlan('EQUAL')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: '14px',
                border:
                  planPattern === 'EQUAL'
                    ? '2px solid var(--clay)'
                    : '1.5px solid var(--shell-border, #e5dfd7)',
                background: planPattern === 'EQUAL' ? '#fffaf7' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text)' }}>
                  Equal monthly
                </span>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Est. +{formatCurrency(planEqualMetrics.projectedYieldNaira)}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <strong style={{ color: 'var(--clay)' }}>
                  {formatCurrency(planEqualMetrics.periodicDepositNaira)}/mo
                </strong>{' '}
                · ₦0 upfront
              </div>
            </button>

            {/* Plan 3: Start Small & Step Up */}
            <button
              type="button"
              onClick={() => handleSelectPlan('STEP_UP')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: '14px',
                border:
                  planPattern === 'STEP_UP'
                    ? '2px solid var(--clay)'
                    : '1.5px solid var(--shell-border, #e5dfd7)',
                background: planPattern === 'STEP_UP' ? '#fffaf7' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text)' }}>
                  Start small &amp; step up
                </span>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Est. +{formatCurrency(planStepUpMetrics.projectedYieldNaira)}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Custom start &amp; monthly increase (from{' '}
                <strong style={{ color: 'var(--clay)' }}>
                  {formatCurrency(planStepUpMetrics.periodicDepositNaira)}/mo
                </strong>
                )
              </div>
            </button>
          </div>
        </BottomSheetModal>
      </>
    )
  }

  // STAGE 3: KYC Step
  if (stage === 'KYC') {
    return (
      <PayPageShell
        title="Activate Rent Account"
        subtitle="Link your BVN to generate your personal rent account."
        showBack
        onBack={() => setStage('BENEFIT')}
        pinFooter
        footer={
          <PayFlowPrimaryButton
            disabled={!isKycValid || onboardMutation.isPending}
            loading={onboardMutation.isPending}
            onClick={handleSubmitKyc}
          >
            Activate Account
            <ArrowRight size={18} aria-hidden />
          </PayFlowPrimaryButton>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {kycError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '0.75rem',
                color: 'var(--error)',
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{kycError}</span>
            </div>
          )}

          {/* BVN */}
          {hasVerifiedBvnOnFile ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10b981',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>
                Identity Verified · BVN ({prefill?.masked_bvn || '••••' + (user?.phone?.slice(-4) || '1234')}) on file
              </span>
            </div>
          ) : (
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Bank Verification Number (BVN)</label>
              <div className="rent-calculator__input-wrapper">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 11-digit BVN"
                  className="rent-calculator__input rent-calculator__input--no-prefix"
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                />
              </div>
            </div>
          )}

          {/* Mother's Maiden Name */}
          <div className="rent-calculator__field">
            <label className="rent-calculator__label">Mother&apos;s Maiden Name</label>
            <div className="rent-calculator__input-wrapper">
              <input
                type="text"
                placeholder="Mother's birth family name"
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={mothersMaidenName}
                onChange={(e) => setMothersMaidenName(e.target.value)}
              />
            </div>
          </div>

          {/* Occupation & Source of Funds */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Occupation</label>
              <input
                type="text"
                placeholder="e.g. Consultant"
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />
            </div>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Source of Funds</label>
              <select
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={sourceOfFunds}
                onChange={(e) =>
                  setSourceOfFunds(
                    e.target.value as 'Salary' | 'Business' | 'Savings' | 'Investment',
                  )
                }
              >
                <option value="Salary">Salary</option>
                <option value="Business">Business</option>
                <option value="Savings">Savings</option>
                <option value="Investment">Investment</option>
              </select>
            </div>
          </div>

          {/* Next of Kin */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Next of Kin Name</label>
              <input
                type="text"
                placeholder="Full name"
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={nextOfKinName}
                onChange={(e) => setNextOfKinName(e.target.value)}
              />
            </div>
            <div className="rent-calculator__field">
              <label className="rent-calculator__label">Next of Kin Phone</label>
              <input
                type="tel"
                placeholder="08012345678"
                className="rent-calculator__input rent-calculator__input--no-prefix"
                value={nextOfKinPhone}
                onChange={(e) =>
                  setNextOfKinPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 14))
                }
              />
            </div>
          </div>

          {/* Lock Agreement */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 6,
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreeToLock}
              onChange={(e) => setAgreeToLock(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--clay)', cursor: 'pointer' }}
            />
            <span>I agree to lock my rent savings until 30 days before rent day.</span>
          </label>
        </div>
      </PayPageShell>
    )
  }

  // STAGE 4: Dedicated Account Ready / Deposit
  if (stage === 'SUCCESS') {
    return (
      <PayPageShell
        title="Make a Deposit"
        subtitle="Transfer from your banking app to your dedicated rent account."
        showBack={false}
        pinFooter
        footer={
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PayFlowPrimaryButton onClick={handleFinish}>
              I Have Transferred
            </PayFlowPrimaryButton>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try {
                    sessionStorage.setItem('upward_dismissed_initial_deposit_prompt', 'true')
                  } catch {}
                }
                handleFinish()
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '0.75rem',
                fontWeight: 500,
                opacity: 0.6,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '6px 8px',
                margin: '0 auto',
                transition: 'opacity 0.15s ease',
              }}
            >
              I&apos;ll fund later
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0 8px' }}>
          {/* Amount input */}
          <div>
            <label
              htmlFor="initial-deposit-amount"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--text)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              {planPattern === 'INITIAL_DEPOSIT'
                ? 'Initial Down Deposit'
                : planPattern === 'EQUAL'
                  ? 'First Monthly Contribution'
                  : 'First Month Contribution'}
            </label>
            <div className="vault-sandbox-card__input-wrapper" style={{ height: 44 }}>
              <span className="vault-sandbox-card__currency-prefix" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                ₦
              </span>
              <input
                id="initial-deposit-amount"
                type="text"
                inputMode="numeric"
                className="vault-sandbox-card__input"
                style={{ fontSize: '1.2rem', fontWeight: 700 }}
                placeholder="e.g. 1,000,000"
                value={initialDepositRaw}
                onChange={(e) => {
                  const parsed = parseCurrencyInput(e.target.value)
                  setCustomInitialDeposit(parsed ? formatCurrencyInput(parsed) : '')
                }}
              />
            </div>

            {/* Punchy 1-line benefit pitch */}
            {parsedSuccessDeposit > 0 && previewRentAmount > 0 && (
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  marginTop: 6,
                  padding: '0 2px',
                }}
              >
                {planPattern === 'INITIAL_DEPOSIT' && (
                  <>
                    Deposit <strong>{formatCurrency(parsedSuccessDeposit, 'NGN')}</strong> to start, then save{' '}
                    <strong style={{ color: 'var(--clay)' }}>
                      {formatCurrency(successPeriodicDepositNaira, 'NGN')}
                    </strong>{' '}
                    monthly{' '}
                  </>
                )}
                {planPattern === 'EQUAL' && (
                  <>
                    Save{' '}
                    <strong style={{ color: 'var(--clay)' }}>
                      {formatCurrency(parsedSuccessDeposit, 'NGN')}
                    </strong>{' '}
                    monthly for {successDynamicPlan.numberOfPayments} months{' '}
                  </>
                )}
                {planPattern === 'STEP_UP' && (
                  <>
                    Start Month 1 with{' '}
                    <strong style={{ color: 'var(--clay)' }}>
                      {formatCurrency(parsedSuccessDeposit, 'NGN')}
                    </strong>
                    , stepping up by +{formatCurrency(planStepUpMetrics.stepIncrementNaira, 'NGN')}/mo{' '}
                  </>
                )}
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  (est. +{formatCurrency(successProjectedYieldNaira, 'NGN')} returns)
                </span>
                .
              </div>
            )}
          </div>

          {/* Compact Account Card */}
          {createdDva ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'var(--surface2, #fbf9f6)',
                border: '1px solid var(--border-solid, #eee7df)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '0.02em', lineHeight: 1.2 }}>
                  {createdDva.account_number}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {createdDva.bank_name || 'Wema Bank'} · {createdDva.account_name}
                </div>
              </div>
              <button
                type="button"
                className={`vault-dva-card__copy-btn ${copiedAccount ? 'vault-dva-card__copy-btn--copied' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', height: 32, flexShrink: 0 }}
                onClick={() => handleCopyAccountNumber(createdDva.account_number)}
              >
                {copiedAccount ? (
                  <>
                    <Check size={13} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy
                  </>
                )}
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'var(--surface2, #fbf9f6)',
                border: '1px solid var(--border-solid, #eee7df)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
              }}
            >
              <Loader2 size={16} className="animate-spin" color="var(--clay)" style={{ flexShrink: 0 }} />
              <span>Provisioning your dedicated funding account... Check your dashboard in a moment.</span>
            </div>
          )}

          {/* Partner Info Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(217, 119, 87, 0.05)',
              border: '1px solid rgba(217, 119, 87, 0.12)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldCheck size={16} color="var(--clay)" style={{ flexShrink: 0 }} />
            <span>
              Funds are invested in a <strong>Money Market Fund (MMF)</strong> managed by{' '}
              <strong>{platformRates.partnerName || 'Asset & Resource Management Holding Company (ARM)'}</strong>.
            </span>
          </div>
        </div>
      </PayPageShell>
    )
  }

  return null
}
