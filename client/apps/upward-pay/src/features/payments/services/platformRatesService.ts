import { request } from '@/lib/api-client'

export type SavingsMode = 'COMING_SOON' | 'OPT_IN_ONLY' | 'LIVE'

export interface PlatformRates {
  savingsEnabled: boolean
  savingsMode?: SavingsMode
  savingsAnnualRatePct: number
  flexibleSavingsAnnualRatePct: number
  rentProtecRatePct: number
  insurancePremiumPct: number
  rentProtecMinMonths: number
  maxSavingsMonths: number
  savingsAnnualRateDecimal: number
  flexibleSavingsAnnualRateDecimal: number
  rentProtecRateDecimal: number
  savingsDailyRate: number
  flexibleSavingsDailyRate: number
  rentProtecDailyRate: number
  insurancePremiumRateDecimal: number
  partnerName?: string
  partnerShortName?: string
  fundName?: string
  fundCode?: string
  updatedAt: string | null
}

function getEffectiveDailyRate(annualRateDecimal: number): number {
  return Math.pow(1 + Math.max(0, annualRateDecimal), 1 / 365) - 1
}

export const DEFAULT_PLATFORM_RATES: PlatformRates = {
  savingsEnabled: true,
  savingsMode: 'LIVE',
  savingsAnnualRatePct: 16.0,
  flexibleSavingsAnnualRatePct: 12.0,
  rentProtecRatePct: 10.0,
  insurancePremiumPct: 2.0,
  rentProtecMinMonths: 6,
  maxSavingsMonths: 11,
  savingsAnnualRateDecimal: 0.16,
  flexibleSavingsAnnualRateDecimal: 0.12,
  rentProtecRateDecimal: 0.1,
  savingsDailyRate: getEffectiveDailyRate(0.16),
  flexibleSavingsDailyRate: getEffectiveDailyRate(0.12),
  rentProtecDailyRate: getEffectiveDailyRate(0.1),
  insurancePremiumRateDecimal: 0.02,
  partnerName: 'Asset & Resource Management Holding Company (ARM)',
  partnerShortName: 'ARM',
  fundName: 'ARM Money Market Fund',
  fundCode: 'ARMMMF',
  updatedAt: null,
}

export async function getPlatformRates(): Promise<PlatformRates> {
  const res = await request<{ data?: PlatformRates } | PlatformRates>('/payments/platform-rates', {
    method: 'GET',
  })
  const raw = ('data' in res && res.data ? res.data : res) as Partial<PlatformRates>
  const flexiblePct = raw.flexibleSavingsAnnualRatePct ?? DEFAULT_PLATFORM_RATES.flexibleSavingsAnnualRatePct
  return {
    ...DEFAULT_PLATFORM_RATES,
    ...raw,
    flexibleSavingsAnnualRatePct: flexiblePct,
    flexibleSavingsAnnualRateDecimal: raw.flexibleSavingsAnnualRateDecimal ?? flexiblePct / 100,
    flexibleSavingsDailyRate:
      raw.flexibleSavingsDailyRate ?? getEffectiveDailyRate(flexiblePct / 100),
  }
}
