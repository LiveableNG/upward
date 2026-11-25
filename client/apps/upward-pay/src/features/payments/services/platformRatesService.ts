import { request } from '@/lib/api-client'

export type SavingsMode = 'COMING_SOON' | 'OPT_IN_ONLY' | 'LIVE'

export interface PlatformRates {
  savingsEnabled: boolean
  savingsMode?: SavingsMode
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
  partnerName?: string
  partnerShortName?: string
  fundName?: string
  fundCode?: string
  updatedAt: string | null
}

export const DEFAULT_PLATFORM_RATES: PlatformRates = {
  savingsEnabled: true,
  savingsMode: 'LIVE',
  savingsAnnualRatePct: 16.0,
  rentProtecRatePct: 10.0,
  insurancePremiumPct: 2.0,
  rentProtecMinMonths: 6,
  maxSavingsMonths: 11,
  savingsAnnualRateDecimal: 0.16,
  rentProtecRateDecimal: 0.1,
  savingsDailyRate: 0.16 / 365,
  rentProtecDailyRate: 0.1 / 365,
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
  return ('data' in res && res.data ? res.data : res) as PlatformRates
}
