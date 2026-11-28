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
  ChevronDown,
  Pencil,
  Unlock,
  Lock,
  Calendar,
} from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import {
  useSimulateRentSavings,
  useSavingsOnboardingPrefill,
  useOnboardSavingsInvestor,
  useCreateRentVault,
  useVerifyVaultFunding,
} from '../hooks/useRentSavings'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import {
  calculatePayLessPlan,
  getRentProtecMinimumDepositPct,
  verifyRentVaultFunding,
  type SavingsCadence,
  type SavingsLockMode,
  type SavingsPlanPattern,
  type SavingsProductOption,
} from '../services/savingsService'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { PayPageShell, PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { loadSetupDraft, patchSetupDraft } from '@/features/dashboard/setup/setupDraft'
import { readSavingsRentPlan } from '../utils/savingsRentPlan'
import { ordinalDay, REMINDER_DAYS } from '../utils/reminderDay'
import { ArmInvestorKycForm, type ArmInvestorKycSubmitData, type KycFormStep } from './ArmInvestorKycForm'
import { SAVINGS_FUND_CODE, SAVINGS_FUND_NAME } from '../constants/savingsLegal'

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
        const plan = readSavingsRentPlan(user?.id)
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
        const plan = readSavingsRentPlan(user?.id)
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
  const activePropertyDueDate = activeProperty?.rentEndDate
    ? activeProperty.rentEndDate.split('T')[0]
    : ''
  const hasSavedRent = Boolean(
    (activeProperty?.rentAmount && activePropertyDueDate && activePropertyDueDate >= tomorrow) ||
    (targetAmountNaira > 0 && contractualDueDate && contractualDueDate >= tomorrow)
  )
  const [rentConfirmed, setRentConfirmed] = useState(false)
  const hasRentDetails = hasSavedRent || rentConfirmed

  // Flow Stage State: Users with existing rental info (e.g. GoodTenants or onboarding)
  // start on PROTECTION so they always see and choose their savings option first.
  const [initialStage, setInitialStage] = useState<Stage>(() =>
    hasSavedRent ? 'PROTECTION' : 'RENT_INPUT',
  )
  const [stage, setStage] = useState<Stage>(initialStage)
  const [protectionFromBenefit, setProtectionFromBenefit] = useState(false)
  const [rentInputFromBenefit, setRentInputFromBenefit] = useState(false)

  // If activeProperty finishes hydrating after mount while untouched on RENT_INPUT, advance to PROTECTION
  if (
    hasSavedRent &&
    initialStage === 'RENT_INPUT' &&
    stage === 'RENT_INPUT' &&
    !rentConfirmed &&
    !rentInputFromBenefit
  ) {
    setInitialStage('PROTECTION')
    setStage('PROTECTION')
  }

  const canConfirmRent =
    targetAmountNaira > 0 && Boolean(contractualDueDate) && contractualDueDate >= tomorrow

  const selectedCadence: SavingsCadence = 'MONTHLY'
  const [selectedProductOption, setSelectedProductOption] =
    useState<SavingsProductOption | null>(null)
  const [selectedLockMode, setSelectedLockMode] = useState<SavingsLockMode | null>(null)
  const [preferredPaydayDay, setPreferredPaydayDay] = useState<number>(() => {
    const saved = readSavingsRentPlan()
    if (saved?.paydayDayOfMonth && saved.paydayDayOfMonth >= 1 && saved.paydayDayOfMonth <= 31) {
      return saved.paydayDayOfMonth
    }
    return 28
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
  const chosenProductOption: SavingsProductOption | null =
    selectedProductOption === 'RENT_PROTEC' && !isRentProtecEligible
      ? null
      : selectedProductOption
  const activeProductOption: SavingsProductOption = chosenProductOption ?? 'SAVE_AND_EARN'
  const effectiveLockMode: SavingsLockMode =
    activeProductOption === 'RENT_PROTEC'
      ? 'LOCKED'
      : selectedLockMode === 'FLEXIBLE'
        ? 'FLEXIBLE'
        : 'LOCKED'
  const effectivePlanPattern: SavingsPlanPattern =
    activeProductOption === 'RENT_PROTEC' ? 'INITIAL_DEPOSIT' : planPattern

  // KYC Prefill & Form State
  const { data: prefill } = useSavingsOnboardingPrefill(true)
  const isRepeatSaver = Boolean(
    prefill?.has_completed_arm_kyc &&
      (prefill?.is_repeat_saver || prefill?.has_signed_consent || prefill?.has_previous_vault),
  )
  const availableCashbackNgn = Math.round(prefill?.available_cashback_ngn || 0)
  const hasWaitingCashback = availableCashbackNgn > 0

  // If the server prefill has a newer next-cycle due date (e.g. rolled +1 year after paying the
  // current rent cycle in full), supersede stale localStorage dates automatically and hydrate
  // repeat-saver defaults (rent amount, payday, and skip RENT_INPUT).
  const [appliedPrefillDueDate, setAppliedPrefillDueDate] = useState<string | null>(null)
  const prefillDueDate = prefill?.rent_due_date ? prefill.rent_due_date.split('T')[0] : null
  if (
    prefillDueDate &&
    prefillDueDate !== appliedPrefillDueDate &&
    !activeProperty?.rentEndDate &&
    (!contractualDueDate || prefillDueDate > contractualDueDate)
  ) {
    setAppliedPrefillDueDate(prefillDueDate)
    setContractualDueDate(prefillDueDate)
    if (!targetAmountRaw && prefill?.target_rent && prefill.target_rent > 0) {
      setTargetAmountRaw(formatCurrencyInput(prefill.target_rent))
    }
    if (prefill?.previous_payday_day && prefill.previous_payday_day >= 1 && prefill.previous_payday_day <= 28) {
      setPreferredPaydayDay(prefill.previous_payday_day)
    }
  }
  const onboardMutation = useOnboardSavingsInvestor()
  const createVaultMutation = useCreateRentVault()
  const verifyFundingMutation = useVerifyVaultFunding()
  const [successVerifyNotice, setSuccessVerifyNotice] = useState<string | null>(null)
  const [isArmKycFormValid, setIsArmKycFormValid] = useState(false)
  const [kycStep, setKycStep] = useState<KycFormStep>(1)
  const [isKycStepValid, setIsKycStepValid] = useState(false)
  const [kycError, setKycError] = useState<string | null>(null)
  const fundDisplayName = platformRates.fundName || SAVINGS_FUND_NAME

  const [createdDva, setCreatedDva] = useState<{
    bank_name: string
    account_number: string
    account_name: string
  } | null>(null)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [showComparePlans, setShowComparePlans] = useState(false)
  const [showCompareBenefits, setShowCompareBenefits] = useState(false)
  const [customInitialDeposit, setCustomInitialDeposit] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const plan = readSavingsRentPlan(user?.id)
        const baseRent = activeProperty?.rentAmount || Number(plan?.rentAmount || 0)
        const savedInit = Number(plan?.initialDeposit || 0)
        const matchesPropertyRent =
          !activeProperty?.rentAmount || Number(plan?.rentAmount || 0) === activeProperty.rentAmount
        if (
          plan?.planPattern === 'INITIAL_DEPOSIT' &&
          savedInit > 0 &&
          matchesPropertyRent &&
          (baseRent <= 0 || savedInit <= baseRent * 0.5)
        ) {
          return formatCurrencyInput(savedInit)
        }
      } catch {}
    }
    return null
  })

  const [prevPropForDeposit, setPrevPropForDeposit] = useState<number | string | undefined>(
    activeProperty?.id,
  )
  if (activeProperty?.id !== prevPropForDeposit) {
    setPrevPropForDeposit(activeProperty?.id)
    setCustomInitialDeposit(null)
  }
  const [stepInputMode, setStepInputMode] = useState<'START' | 'INCREMENT' | null>(null)
  const [customStepStart, setCustomStepStart] = useState<string | null>(null)
  const [customStepIncrement, setCustomStepIncrement] = useState<string | null>(null)

  const simData = simulateMutation.data
  const defaultRatePct =
    activeProductOption === 'RENT_PROTEC'
      ? platformRates.rentProtecRatePct
      : effectiveLockMode === 'FLEXIBLE'
        ? platformRates.flexibleSavingsAnnualRatePct
        : platformRates.savingsAnnualRatePct
  const savingsAnnualRatePct =
    simData?.product_option === activeProductOption &&
    (simData?.lock_mode ?? 'LOCKED') === effectiveLockMode &&
    simData?.net_annual_yield_rate
      ? Math.round(simData.net_annual_yield_rate * 1000) / 10
      : defaultRatePct
  const daysRemaining = simData ? simData.days_remaining : Math.max(1, rawDaysRemaining - 30)

  const previewRentAmount = targetAmountNaira || 2_500_000

  // Formula-derived minimum upfront deposit for Rent Protec (20% for 7-11mo, 33% for 6mo)
  const minRentProtecDepositPct = getRentProtecMinimumDepositPct(rawDaysRemaining)
  const minRentProtecDepositNaira =
    activeProductOption === 'RENT_PROTEC'
      ? Math.round(previewRentAmount * (minRentProtecDepositPct / 100))
      : 0

  const defaultUpfrontForInitialPattern =
    activeProductOption === 'RENT_PROTEC'
      ? minRentProtecDepositNaira
      : Math.round(previewRentAmount * 0.25)

  const rawTypedDepositNaira =
    effectivePlanPattern === 'INITIAL_DEPOSIT'
      ? customInitialDeposit !== null
        ? (parseCurrencyInput(customInitialDeposit) || 0)
        : defaultUpfrontForInitialPattern
      : 0

  const isRentProtecDepositBelowFloor =
    activeProductOption === 'RENT_PROTEC' &&
    rawTypedDepositNaira < minRentProtecDepositNaira

  const currentDepositNairaForCalc =
    activeProductOption === 'RENT_PROTEC'
      ? Math.max(rawTypedDepositNaira, minRentProtecDepositNaira)
      : rawTypedDepositNaira

  const planDepositMetrics = useMemo(() => {
    const initialNaira =
      customInitialDeposit !== null
        ? (parseCurrencyInput(customInitialDeposit) || 0)
        : defaultUpfrontForInitialPattern
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
        rawDaysToDueDate: rawDaysRemaining,
        contractualDueDate: contractualDueDate || undefined,
        paydayDayOfMonth: preferredPaydayDay,
      },
    )
  }, [
    previewRentAmount,
    customInitialDeposit,
    defaultUpfrontForInitialPattern,
    daysRemaining,
    rawDaysRemaining,
    contractualDueDate,
    preferredPaydayDay,
    selectedCadence,
    savingsAnnualRatePct,
    activeProductOption,
    platformRates,
  ])

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
        rawDaysToDueDate: rawDaysRemaining,
        contractualDueDate: contractualDueDate || undefined,
        paydayDayOfMonth: preferredPaydayDay,
      },
    )
  }, [
    previewRentAmount,
    daysRemaining,
    rawDaysRemaining,
    contractualDueDate,
    preferredPaydayDay,
    selectedCadence,
    savingsAnnualRatePct,
    activeProductOption,
    platformRates,
  ])

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
        rawDaysToDueDate: rawDaysRemaining,
        contractualDueDate: contractualDueDate || undefined,
        paydayDayOfMonth: preferredPaydayDay,
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
    rawDaysRemaining,
    contractualDueDate,
    preferredPaydayDay,
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
    effectivePlanPattern === 'EQUAL'
      ? planEqualMetrics
      : effectivePlanPattern === 'STEP_UP'
        ? planStepUpMetrics
        : planDepositMetrics

  const isSimDataCurrent =
    simData &&
    simData.product_option === activeProductOption &&
    (simData.lock_mode ?? 'LOCKED') === effectiveLockMode &&
    simData.plan_pattern === effectivePlanPattern &&
    effectivePlanPattern !== 'STEP_UP' &&
    (effectivePlanPattern !== 'INITIAL_DEPOSIT' ||
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
      effectivePlanPattern === 'INITIAL_DEPOSIT'
        ? currentDepositNairaForCalc
        : 0
    const initialDepositKobo = Math.round(currentDepositNaira * 100)

    mutateSimulate({
      target_amount_kobo: Math.round(targetAmountNaira * 100),
      contractual_due_date: contractualDueDate,
      initial_deposit_kobo: initialDepositKobo,
      cadence: selectedCadence,
      product_option: activeProductOption,
      lock_mode: effectiveLockMode,
      plan_pattern: effectivePlanPattern,
      payday_day_of_month: preferredPaydayDay,
    })

    const persistedDepositNaira =
      effectivePlanPattern === 'INITIAL_DEPOSIT'
        ? currentDepositNaira
        : effectivePlanPattern === 'EQUAL'
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
            lockMode: effectiveLockMode,
            planPattern: effectivePlanPattern,
            initialDeposit: persistedDepositNaira,
            paydayDayOfMonth: preferredPaydayDay,
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
    effectiveLockMode,
    effectivePlanPattern,
    currentDepositNairaForCalc,
    preferredPaydayDay,
    planEqualMetrics.periodicDepositNaira,
    planStepUpMetrics.periodicDepositNaira,
    planStepUpMetrics.stepIncrementNaira,
    selectedCadence,
    hasRentDetails,
    mutateSimulate,
    user?.id,
  ])

  const defaultInitialDepositNaira = useMemo(() => {
    if (effectivePlanPattern === 'INITIAL_DEPOSIT') {
      return defaultUpfrontForInitialPattern
    }
    if (effectivePlanPattern === 'EQUAL') {
      return planEqualMetrics.periodicDepositNaira
    }
    return planStepUpMetrics.periodicDepositNaira
  }, [
    effectivePlanPattern,
    defaultUpfrontForInitialPattern,
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
            rawDaysToDueDate: rawDaysRemaining,
            contractualDueDate: contractualDueDate || undefined,
            paydayDayOfMonth: preferredPaydayDay,
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

  const handleSubmitKyc = async (kycData: ArmInvestorKycSubmitData) => {
    setKycError(null)

    try {
      const res = await onboardMutation.mutateAsync({
        ...kycData,
        next_of_kin_email: prefill?.next_of_kin_email || undefined,
        next_of_kin_address: prefill?.next_of_kin_address || undefined,
        settlement_bank_code:
          kycData.settlement_bank_code ||
          prefill?.settlement_bank?.bank_code ||
          prefill?.settlement_bank_code ||
          undefined,
        settlement_account_number:
          kycData.settlement_account_number ||
          prefill?.settlement_bank?.account_number ||
          prefill?.settlement_account_number ||
          undefined,
        settlement_account_name:
          kycData.settlement_account_name ||
          prefill?.settlement_bank?.account_name ||
          prefill?.settlement_account_name ||
          undefined,
        settlement_bank_name:
          kycData.settlement_bank_name ||
          prefill?.settlement_bank?.bank_name ||
          prefill?.settlement_bank_name ||
          undefined,
        target_amount: targetAmountNaira,
        rent_due_date: contractualDueDate,
        cadence: 'MONTHLY',
        product_option: activeProductOption,
        lock_mode: effectiveLockMode,
        plan_pattern: effectivePlanPattern,
        initial_deposit_kobo:
          effectivePlanPattern === 'INITIAL_DEPOSIT'
            ? Math.round(currentDepositNairaForCalc * 100)
            : 0,
        planned_monthly_deposit_kobo: Math.round(localPlan.periodicDepositNaira * 100),
        payday_day_of_month: preferredPaydayDay,
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

  const handleActivateRepeatSaverVault = async () => {
    setKycError(null)
    try {
      const res = (await createVaultMutation.mutateAsync({
        target_amount_kobo: Math.round(targetAmountNaira * 100),
        contractual_due_date: contractualDueDate,
        cadence: 'MONTHLY',
        preferred_funding_method: 'DVA',
        product_option: activeProductOption,
        lock_mode: effectiveLockMode,
        plan_pattern: effectivePlanPattern,
        initial_deposit_kobo:
          effectivePlanPattern === 'INITIAL_DEPOSIT'
            ? Math.round(currentDepositNairaForCalc * 100)
            : 0,
        planned_monthly_deposit_kobo: Math.round(localPlan.periodicDepositNaira * 100),
        payday_day_of_month: preferredPaydayDay,
        consent_accepted: true,
      })) as {
        dedicated_account?: {
          bank_name: string
          account_number: string
          account_name: string
        } | null
        dva_account_number?: string
        dva_bank_name?: string
        dva_account_name?: string
      }

      const dva =
        res?.dedicated_account ||
        (res?.dva_account_number
          ? {
              bank_name: res.dva_bank_name || 'Wema Bank',
              account_number: res.dva_account_number,
              account_name:
                res.dva_account_name ||
                `Upward / ${user?.firstName || 'Tenant'} ${user?.lastName || ''}`.trim(),
            }
          : prefill?.previous_dva || null)

      if (dva?.account_number) {
        setCreatedDva(dva)
      }

      setStage('SUCCESS')
      toastSuccess(
        hasWaitingCashback
          ? `Plan activated! ${formatCurrency(availableCashbackNgn, 'NGN')} cashback has been added to your balance.`
          : 'Next rent savings plan activated — your dedicated rent account is ready!',
      )
      await refreshUser().catch(() => {})
    } catch (err: unknown) {
      const error = err as { message?: string }
      const msg = error?.message || 'Could not activate your next savings plan. Please try again.'
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

  const handleSuccessConfirmTransfer = async () => {
    setSuccessVerifyNotice(null)
    try {
      const res = await verifyFundingMutation.mutateAsync()
      if (res.detected || res.current_balance_kobo > 0) {
        toastSuccess('Deposit received and credited to your Rent Savings wallet!')
        await handleFinish()
        return
      }
      setSuccessVerifyNotice(
        `No bank transfer detected on ${createdDva?.account_number || 'your account'} yet. Once your bank completes the transfer, your wallet will credit automatically.`,
      )
    } catch {
      setSuccessVerifyNotice(
        'No bank transfer detected yet. Once your bank completes the transfer, your wallet will credit automatically.',
      )
    }
  }

  // Auto-detect incoming transfer while on SUCCESS stage
  useEffect(() => {
    if (stage !== 'SUCCESS') return
    let cancelled = false

    const handleSseUpdate = () => {
      if (cancelled) return
      toastSuccess('Deposit detected and credited to your Rent Savings!')
      handleFinish()
    }
    window.addEventListener('upward:rent-vault.updated', handleSseUpdate)

    const interval = setInterval(async () => {
      if (cancelled) return
      try {
        const res = await verifyRentVaultFunding()
        if (!cancelled && (res.detected || res.current_balance_kobo > 0)) {
          toastSuccess('Deposit detected and credited to your Rent Savings!')
          handleFinish()
        }
      } catch {}
    }, 6000)

    return () => {
      cancelled = true
      window.removeEventListener('upward:rent-vault.updated', handleSseUpdate)
      clearInterval(interval)
    }
  }, [stage])

  const handleRentInputBack = () => {
    if (rentInputFromBenefit) {
      setRentInputFromBenefit(false)
      setStage('BENEFIT')
      return
    }
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
              setRentInputFromBenefit(false)
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

  // STAGE 1.5: Expandable 2-Card / 3-Option Selector (Nov 26 Kunle Spec)
  // - Neither plan is preselected, no "Recommended" badge, no made-up Naira returns
  // - Tapping Save & Earn expands in-place to reveal Flexible (12%, ₦0 exit fee) vs Full Lock (16%, locked until 30 days before rent day)
  // - Eliminates late-stage lock/penalty surprises by showing access rules upfront on Page 1
  if (stage === 'PROTECTION') {
    const isSaveAndEarnExpanded = chosenProductOption === 'SAVE_AND_EARN'
    const canContinuePlan =
      chosenProductOption === 'RENT_PROTEC' ||
      (chosenProductOption === 'SAVE_AND_EARN' && selectedLockMode !== null)

    const continuePlanLabel = canContinuePlan ? 'Continue' : 'Choose a plan'

    const compareRows = [
      {
        label: 'Yearly Interest',
        flexible: `${platformRates.flexibleSavingsAnnualRatePct}% p.a.`,
        locked: `${platformRates.savingsAnnualRatePct}% p.a.`,
        rentProtec: `${platformRates.rentProtecRatePct}% p.a.`,
      },
      {
        label: 'Early Withdrawal',
        flexible: 'Anytime · ₦0 fee',
        locked: 'Not available',
        rentProtec: '30 days before rent day',
      },
      {
        label: 'Rent Protection',
        flexible: 'Savings only',
        locked: 'Savings only',
        rentProtec: 'Up to 100% rent cover',
      },
      {
        label: 'Min. Timeline',
        flexible: 'No minimum',
        locked: 'No minimum',
        rentProtec: `${platformRates.rentProtecMinMonths}+ months`,
      },
    ]

    return (
      <>
        <PayPageShell
          title="Choose Your Savings Plan"
          showBack
          onBack={handleProtectionBack}
          pinFooter
          footer={
            <PayFlowPrimaryButton
              disabled={!canContinuePlan}
              onClick={() => {
                if (!canContinuePlan) return
                setProtectionFromBenefit(false)
                setCustomInitialDeposit(null)
                setStage('BENEFIT')
              }}
            >
              {continuePlanLabel}
              {canContinuePlan && <ArrowRight size={18} aria-hidden />}
            </PayFlowPrimaryButton>
          }
        >
          {hasWaitingCashback && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 12,
                background: '#fff7ed',
                border: '1px solid rgba(194, 80, 31, 0.2)',
                marginBottom: 12,
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}
            >
              <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0 }} />
              <span>
                <strong style={{ color: 'var(--clay)' }}>
                  You have {formatCurrency(availableCashbackNgn, 'NGN')} cashback
                </strong>{' '}
                · Added to your balance when you activate
              </span>
            </div>
          )}

          <div className="plan-cards">
            {/* Card 1: Save & Earn — Expands in-place to reveal Flexible vs Full Lock */}
            <div
              className={`plan-card plan-card--expandable ${
                isSaveAndEarnExpanded ? 'plan-card--active' : ''
              }`}
            >
              <button
                type="button"
                className="plan-card__trigger"
                onClick={() => {
                  setSelectedProductOption('SAVE_AND_EARN')
                }}
                aria-expanded={isSaveAndEarnExpanded}
                aria-pressed={isSaveAndEarnExpanded}
              >
                <div className="plan-card__top">
                  <div className="plan-card__title-group">
                    <span className="plan-card__radio" aria-hidden />
                    <TrendingUp size={18} className="plan-card__icon" aria-hidden />
                    <span className="plan-card__name">Save &amp; Earn</span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span className="plan-card__rate">
                      {platformRates.flexibleSavingsAnnualRatePct}%–{platformRates.savingsAnnualRatePct}% p.a.
                    </span>
                    <ChevronDown
                      size={16}
                      className={`plan-card__chevron ${
                        isSaveAndEarnExpanded ? 'plan-card__chevron--open' : ''
                      }`}
                      aria-hidden
                    />
                  </div>
                </div>

                {!isSaveAndEarnExpanded && (
                  <p className="plan-card__desc">
                    Withdraw anytime, or lock in a higher rate.
                  </p>
                )}
              </button>

              {isSaveAndEarnExpanded && (
                <div className="plan-card__suboptions" role="radiogroup" aria-label="Save and Earn access options">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedLockMode === 'FLEXIBLE'}
                    onClick={() => setSelectedLockMode('FLEXIBLE')}
                    className={`plan-suboption ${
                      selectedLockMode === 'FLEXIBLE' ? 'plan-suboption--active' : ''
                    }`}
                  >
                    <div className="plan-suboption__top">
                      <div className="plan-suboption__title-group">
                        <span className="plan-suboption__radio" aria-hidden />
                        <Unlock size={15} className="plan-suboption__icon" aria-hidden />
                        <span className="plan-suboption__name">Flexible Access</span>
                      </div>
                      <span className="plan-suboption__rate">
                        {platformRates.flexibleSavingsAnnualRatePct}% p.a.
                      </span>
                    </div>
                    <p className="plan-suboption__desc">Withdraw anytime. No fee.</p>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedLockMode === 'LOCKED'}
                    onClick={() => setSelectedLockMode('LOCKED')}
                    className={`plan-suboption ${
                      selectedLockMode === 'LOCKED' ? 'plan-suboption--active' : ''
                    }`}
                  >
                    <div className="plan-suboption__top">
                      <div className="plan-suboption__title-group">
                        <span className="plan-suboption__radio" aria-hidden />
                        <Lock size={15} className="plan-suboption__icon" aria-hidden />
                        <span className="plan-suboption__name">Full Lock</span>
                      </div>
                      <span className="plan-suboption__rate">
                        {platformRates.savingsAnnualRatePct}% p.a.
                      </span>
                    </div>
                    <p className="plan-suboption__desc">
                      Held until 30 days before rent day.
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Card 2: Rent Protec */}
            <button
              type="button"
              onClick={() => {
                setSelectedProductOption('RENT_PROTEC')
                setSelectedLockMode('LOCKED')
                setPlanPattern('INITIAL_DEPOSIT')
                setCustomInitialDeposit(null)
              }}
              disabled={!isRentProtecEligible}
              aria-pressed={chosenProductOption === 'RENT_PROTEC'}
              className={`plan-card ${
                chosenProductOption === 'RENT_PROTEC' ? 'plan-card--active' : ''
              } ${!isRentProtecEligible ? 'plan-card--disabled' : ''}`}
            >
              <div className="plan-card__top">
                <div className="plan-card__title-group">
                  <span className="plan-card__radio" aria-hidden />
                  <ShieldCheck size={18} className="plan-card__icon" aria-hidden />
                  <span className="plan-card__name">Rent Protec</span>
                </div>
                <span className="plan-card__rate">{platformRates.rentProtecRatePct}% p.a. + Cover</span>
              </div>

              <p className="plan-card__desc">
                Rent cover up to your full annual rent.
              </p>

              <ul className="plan-card__bullets">
                <li>
                  <Check size={14} aria-hidden />
                  <span>Job loss, serious illness, or loss of a breadwinner</span>
                </li>
                <li>
                  <Check size={14} aria-hidden />
                  <span>Held until 30 days before rent day</span>
                </li>
              </ul>

              {!isRentProtecEligible && (
                <div className="plan-card__ineligible">
                  Requires at least {platformRates.rentProtecMinMonths} months before rent is due.
                </div>
              )}
            </button>

            {/* Compare Benefits & Lock Terms Trigger */}
            <button
              type="button"
              className="plan-cards__compare-btn"
              onClick={() => setShowCompareBenefits(true)}
            >
              <span>Compare the 3 options</span>
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </PayPageShell>

        <BottomSheetModal
          isOpen={showCompareBenefits}
          onClose={() => setShowCompareBenefits(false)}
          title="Compare Savings Options"
          subtitle="Flexible vs. Full Lock vs. Rent Protec"
          maxWidth="520px"
        >
          <div className="plan-table plan-table--4col" role="table" aria-label="Compare savings options">
            <div className="plan-table__row plan-table__row--4col plan-table__row--head" role="row">
              <div className="plan-table__label plan-table__label--head" role="columnheader">
                Feature
              </div>
              <div className="plan-table__modal-head" role="columnheader">
                Flexible
              </div>
              <div className="plan-table__modal-head" role="columnheader">
                Full Lock
              </div>
              <div className="plan-table__modal-head" role="columnheader">
                Rent Protec
              </div>
            </div>

            {compareRows.map((row) => (
              <div key={row.label} className="plan-table__row plan-table__row--4col" role="row">
                <div className="plan-table__label" role="rowheader">
                  {row.label}
                </div>
                <div className="plan-table__cell" role="cell">
                  {row.flexible}
                </div>
                <div className="plan-table__cell" role="cell">
                  {row.locked}
                </div>
                <div className="plan-table__cell" role="cell">
                  {row.rentProtec}
                </div>
              </div>
            ))}
          </div>

        </BottomSheetModal>
      </>
    )
  }

  // STAGE 2: Clear Benefit Showcase
  if (stage === 'BENEFIT') {
    const activePlanTitle =
      effectivePlanPattern === 'INITIAL_DEPOSIT'
        ? activeProductOption === 'RENT_PROTEC'
          ? 'Upfront deposit + fixed monthly plan'
          : 'Deposit now, save monthly'
        : effectivePlanPattern === 'EQUAL'
          ? 'Equal monthly'
          : 'Start small & step up'

    const activeTrackLabel =
      activeProductOption === 'RENT_PROTEC'
        ? 'Rent Protec'
        : effectiveLockMode === 'FLEXIBLE'
          ? 'Save & Earn · Flexible'
          : 'Save & Earn · Full Lock'

    return (
      <>
        <PayPageShell
          title="Pay Less for Your Next Rent"
          subtitle="Let compound interest help pay your rent."
          showBack
          onBack={handleBenefitBack}
          pinFooter
          footer={
            <PayFlowPrimaryButton
              disabled={isRentProtecDepositBelowFloor || createVaultMutation.isPending}
              loading={createVaultMutation.isPending}
              onClick={() => {
                if (isRentProtecDepositBelowFloor) return
                if (isRepeatSaver) {
                  handleActivateRepeatSaverVault()
                  return
                }
                setStage('KYC')
              }}
            >
              {isRepeatSaver
                ? createVaultMutation.isPending
                  ? 'Activating...'
                  : hasWaitingCashback
                    ? `Activate & Claim ${formatCurrency(availableCashbackNgn, 'NGN')}`
                    : 'Activate Plan'
                : hasWaitingCashback
                  ? `Continue & Claim ${formatCurrency(availableCashbackNgn, 'NGN')}`
                  : 'Continue'}
              {!createVaultMutation.isPending && <ArrowRight size={18} aria-hidden />}
            </PayFlowPrimaryButton>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 24 }}>
            {hasWaitingCashback ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: '#fff7ed',
                  border: '1px solid rgba(194, 80, 31, 0.2)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--clay)' }}>
                    {formatCurrency(availableCashbackNgn, 'NGN')} cashback included
                  </strong>{' '}
                  · Added to your new plan{isRepeatSaver ? ' · No KYC needed' : ''}
                </span>
              </div>
            ) : isRepeatSaver ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#047857',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>Already verified · Activate in one tap</span>
              </div>
            ) : null}
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
                  onClick={() => {
                    setRentInputFromBenefit(true)
                    setStage('RENT_INPUT')
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
                  ) : effectiveLockMode === 'FLEXIBLE' ? (
                    <Unlock size={14} color="#059669" />
                  ) : (
                    <TrendingUp size={14} color="#059669" />
                  )}
                  <span>
                    <strong style={{ color: 'var(--text)' }}>{activeTrackLabel}</strong>{' '}
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

            {/* Single Airy Plan Card */}
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
              {/* Plan Header — Hide "Change savings plan" completely on RENT_PROTEC */}
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

                {activeProductOption !== 'RENT_PROTEC' && (
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
                    Change plan
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {/* Exact Contributions Section — Clear Input Textboxes vs Read-Only Output */}
              {effectivePlanPattern === 'INITIAL_DEPOSIT' && (
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
                      Upfront deposit
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#ffffff',
                        border: isRentProtecDepositBelowFloor
                          ? '1.5px solid var(--error, #dc2626)'
                          : '1.5px solid #cbc2b7',
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

                    {isRentProtecDepositBelowFloor && (
                      <div className="rent-protec-boost__error" role="alert">
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>
                          Minimum is <strong>{formatCurrency(minRentProtecDepositNaira, 'NGN')}</strong>.
                        </span>
                      </div>
                    )}

                    {activeProductOption === 'RENT_PROTEC' && (
                      <div className="rent-protec-boost">
                        <div className="rent-protec-boost__pills">
                          {[50_000, 100_000, 250_000].map((inc) => (
                            <button
                              key={inc}
                              type="button"
                              className="rent-protec-boost__pill"
                              onClick={() => {
                                const base = Math.max(rawTypedDepositNaira, minRentProtecDepositNaira)
                                const next = Math.min(previewRentAmount, base + inc)
                                setCustomInitialDeposit(formatCurrencyInput(next))
                              }}
                            >
                              +₦{(inc / 1000).toLocaleString()}k
                            </button>
                          ))}
                          {rawTypedDepositNaira !== minRentProtecDepositNaira && (
                            <button
                              type="button"
                              className="rent-protec-boost__reset"
                              onClick={() =>
                                setCustomInitialDeposit(formatCurrencyInput(minRentProtecDepositNaira))
                              }
                            >
                              Min ({formatCurrency(minRentProtecDepositNaira, 'NGN')})
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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
                        Fixed monthly deposit
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

              {effectivePlanPattern === 'EQUAL' && (
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

              {effectivePlanPattern === 'STEP_UP' && (
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

              <div className="rent-protec-payday">
                <div className="rent-protec-payday__row">
                  <span className="rent-protec-payday__label">
                    <Calendar size={13} color="var(--clay)" />
                    <span>Remind me on</span>
                  </span>
                  <select
                    aria-label="Preferred monthly savings day"
                    className="rent-protec-payday__select"
                    value={preferredPaydayDay}
                    onChange={(e) => setPreferredPaydayDay(Number(e.target.value))}
                  >
                    {REMINDER_DAYS.map((day) => (
                      <option key={day} value={day}>
                        {ordinalDay(day)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="rent-protec-payday__hint">
                  You can save any day. This only sets the reminder.
                </p>
              </div>

              {/* Total Contributions vs Expected Returns Summary */}
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
                    Expected returns
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

        {/* Change Savings Plan Modal */}
        <BottomSheetModal
          isOpen={showComparePlans}
          onClose={() => setShowComparePlans(false)}
          title="Choose Your Savings Plan"
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
                  Expected +{formatCurrency(planDepositMetrics.projectedYieldNaira)}
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
              disabled={activeProductOption === 'RENT_PROTEC'}
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
                cursor: activeProductOption === 'RENT_PROTEC' ? 'not-allowed' : 'pointer',
                opacity: activeProductOption === 'RENT_PROTEC' ? 0.5 : 1,
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
                  Expected +{formatCurrency(planEqualMetrics.projectedYieldNaira)}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <strong style={{ color: 'var(--clay)' }}>
                  {formatCurrency(planEqualMetrics.periodicDepositNaira)}/mo
                </strong>{' '}
                · ₦0 upfront
              </div>
              {activeProductOption === 'RENT_PROTEC' && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Available on Save &amp; Earn — Rent Protec activates at{' '}
                  {rawDaysRemaining >= 210 ? '20%' : '25%'} initial deposit.
                </div>
              )}
            </button>

            {/* Plan 3: Start Small & Step Up */}
            <button
              type="button"
              disabled={activeProductOption === 'RENT_PROTEC'}
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
                cursor: activeProductOption === 'RENT_PROTEC' ? 'not-allowed' : 'pointer',
                opacity: activeProductOption === 'RENT_PROTEC' ? 0.5 : 1,
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
                  Expected +{formatCurrency(planStepUpMetrics.projectedYieldNaira)}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Custom start &amp; monthly increase (from{' '}
                <strong style={{ color: 'var(--clay)' }}>
                  {formatCurrency(planStepUpMetrics.periodicDepositNaira)}/mo
                </strong>
                )
              </div>
              {activeProductOption === 'RENT_PROTEC' && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Available on Save &amp; Earn — Rent Protec activates at{' '}
                  {rawDaysRemaining >= 210 ? '20%' : '25%'} initial deposit.
                </div>
              )}
            </button>
          </div>
        </BottomSheetModal>
      </>
    )
  }

  // STAGE 3: KYC & Consent Step (3-Step Guided Onboarding)
  if (stage === 'KYC') {
    const kycTitle = kycStep === 1 ? 'Identity' : kycStep === 2 ? 'Address' : 'Review'
    const kycCtaLabel = kycStep < 3 ? 'Continue' : 'Activate'
    const isFooterDisabled =
      kycStep < 3
        ? !isKycStepValid || onboardMutation.isPending
        : !isArmKycFormValid || onboardMutation.isPending

    return (
      <PayPageShell
        title={kycTitle}
        showBack
        onBack={() => {
          if (kycStep > 1) {
            setKycStep((kycStep - 1) as KycFormStep)
          } else {
            setStage('BENEFIT')
          }
        }}
        pinFooter
        footer={
          <PayFlowPrimaryButton
            type="button"
            onClick={() => {
              if (kycStep < 3) {
                const nextBtn = document.getElementById(
                  'rent-calc-arm-kyc-next',
                ) as HTMLButtonElement | null
                nextBtn?.click()
              } else {
                const formEl = document.getElementById(
                  'rent-calc-arm-kyc-form',
                ) as HTMLFormElement | null
                formEl?.requestSubmit()
              }
            }}
            disabled={isFooterDisabled}
            loading={onboardMutation.isPending}
          >
            {kycCtaLabel}
            <ArrowRight size={18} aria-hidden />
          </PayFlowPrimaryButton>
        }
      >
        <ArmInvestorKycForm
          formId="rent-calc-arm-kyc-form"
          nextTriggerId="rent-calc-arm-kyc-next"
          prefill={prefill}
          annualRatePct={savingsAnnualRatePct}
          fundName={fundDisplayName}
          lockMode={effectiveLockMode}
          productOption={activeProductOption}
          serverError={kycError}
          isSubmitting={onboardMutation.isPending}
          hideSubmitButton
          step={kycStep}
          onStepChange={setKycStep}
          onStepValidityChange={setIsKycStepValid}
          onValidityChange={setIsArmKycFormValid}
          onSubmit={handleSubmitKyc}
        />
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
            <PayFlowPrimaryButton
              onClick={handleSuccessConfirmTransfer}
              loading={verifyFundingMutation.isPending}
              disabled={verifyFundingMutation.isPending}
            >
              {verifyFundingMutation.isPending ? 'Checking Transfer...' : 'I Have Transferred'}
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
                {effectivePlanPattern === 'STEP_UP' && (
                  <>
                    Start Month 1 with{' '}
                    <strong style={{ color: 'var(--clay)' }}>
                      {formatCurrency(parsedSuccessDeposit, 'NGN')}
                    </strong>
                    , stepping up by +{formatCurrency(planStepUpMetrics.stepIncrementNaira, 'NGN')}/mo{' '}
                  </>
                )}
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  (expected +{formatCurrency(successProjectedYieldNaira, 'NGN')} in returns)
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

          {/* Partner Info & Zero-Delay Verification Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(217, 119, 87, 0.05)',
              border: '1px solid rgba(217, 119, 87, 0.12)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            <ShieldCheck size={16} color="var(--clay)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              {platformRates.savingsMode === 'OPT_IN_ONLY' ? (
                <>
                  <strong>Activation Opt-In Complete!</strong> Your investor profile for{' '}
                  <strong>
                    {fundDisplayName} ({SAVINGS_FUND_CODE})
                  </strong>{' '}
                  is submitted. Live deposits open shortly — you will be notified as soon as funding
                  is enabled.
                </>
              ) : (
                <>
                  Your dedicated rent savings account is ready — you can deposit anytime.{' '}
                  <strong>
                    {platformRates.partnerShortName || 'ARM'}
                  </strong>{' '}
                  verification completes within <strong>24 hours to 3 business days</strong>, after
                  which your funds earn daily compounding returns in{' '}
                  <strong>
                    {fundDisplayName} ({SAVINGS_FUND_CODE})
                  </strong>
                  .
                </>
              )}
            </span>
          </div>

          {createdDva?.account_number && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                padding: '2px 2px 0',
              }}
            >
              <Loader2 size={13} className="animate-spin" color="var(--clay)" style={{ flexShrink: 0 }} />
              <span>Your deposit will be detected automatically once your transfer completes.</span>
            </div>
          )}

          {successVerifyNotice && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(194, 80, 31, 0.06)',
                border: '1px solid rgba(194, 80, 31, 0.2)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}
            >
              {successVerifyNotice}
            </div>
          )}
        </div>
      </PayPageShell>
    )
  }

  return null
}
