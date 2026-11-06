import { request } from '@/lib/api-client'

export type BenefitsStatus = {
  isActive: boolean
  benefitsFee: number
  rentValue: number
  currency: string
  startsAt: string | null
  endsAt: string | null
  source: string | null
  packageName: string
  benefits: string[]
}

export async function getBenefitsStatus(): Promise<BenefitsStatus> {
  return request<BenefitsStatus>('/payments/benefits/status', { method: 'GET' })
}

export async function initializeBenefitsPayment(): Promise<{
  accessCode?: string
  reference?: string
}> {
  return request('/payments/benefits/initialize', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function confirmBenefitsPayment(reference: string) {
  return request('/payments/benefits/confirm', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  })
}
