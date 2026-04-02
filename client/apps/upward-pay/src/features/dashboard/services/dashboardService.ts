import { request } from '@/lib/api-client'
import { type DashboardData } from '../types'

export async function getDashboardData() {
  return request<DashboardData>('/tenant-auth/me')
}
