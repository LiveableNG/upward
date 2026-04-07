/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from '@/lib/api-client'

export async function getWallet() {
  return request<any>('/wallet', { method: 'GET' })
}

export async function fundWallet(data: { amount: number }) {
  return request<any>('/wallet/fund', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getSavingsGoals() {
  return request<any[]>('/savings/goals', { method: 'GET' })
}

export async function createSavingsGoal(data: any) {
  return request<any>('/savings/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateSavingsGoal(id: string, data: any) {
  return request<any>(`/savings/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
