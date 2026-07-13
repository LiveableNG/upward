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

export async function getBenefitsStatus() {
  const res = await request<any>('/payments/benefits/status', { method: 'GET' })
  return (res.data || res) as BenefitsStatus
}

export async function initializeBenefitsPayment() {
  const res = await request<any>('/payments/benefits/initialize', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  return res.data || res
}

export async function confirmBenefitsPayment(reference: string) {
  const res = await request<any>('/payments/benefits/confirm', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  })
  return res.data || res
}
