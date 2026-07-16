/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from '@/lib/api-client'

export async function getWallet() {
  const res = await request<any>('/wallet', { method: 'GET' })
  return res.data
}

export async function fundWallet(data: { amount: number }) {
  const res = await request<any>('/wallet/fund', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function getSavingsGoals() {
  const res = await request<any>('/savings/goals', { method: 'GET' })
  return res.data
}

export async function createSavingsGoal(data: any) {
  const res = await request<any>('/savings/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateSavingsGoal(id: string, data: any) {
  const res = await request<any>(`/savings/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return res.data
}
