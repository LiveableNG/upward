import { request } from '@/lib/api-client'

export interface PlatformRates {
  savingsAnnualRatePct: number
  rentProtecRatePct: number
  insurancePremiumPct: number
  rentProtecMinMonths: number
  maxSavingsMonths: number
  savingsAnnualRateDecimal: number
  rentProtecRateDecimal: number
  savingsDailyRate: number
  rentProtecDailyRate: number
  insurancePremiumRateDecimal: number
  updatedAt: string | null
}

export const DEFAULT_PLATFORM_RATES: PlatformRates = {
  savingsAnnualRatePct: 14.0,
  rentProtecRatePct: 10.0,
  insurancePremiumPct: 2.0,
  rentProtecMinMonths: 6,
  maxSavingsMonths: 11,
  savingsAnnualRateDecimal: 0.14,
  rentProtecRateDecimal: 0.1,
  savingsDailyRate: 0.14 / 365,
  rentProtecDailyRate: 0.1 / 365,
  insurancePremiumRateDecimal: 0.02,
  updatedAt: null,
}

export async function getPlatformRates(): Promise<PlatformRates> {
  const res = await request<{ data?: PlatformRates } | PlatformRates>('/payments/platform-rates', {
    method: 'GET',
  })
  return ('data' in res && res.data ? res.data : res) as PlatformRates
}
