import { request } from '@/lib/api-client'
import { Unit, Tenant } from './propertyService'

export interface PmPaymentRequest {
  id: number;
  uuid: string;
  unitId: number;
  unit?: Unit;
  tenantId?: number;
  tenant?: Tenant;
  amount: number;
  currency: string;
  description: string | null;
  dueDate: string;
  rentStartDate?: string | null;
  rentEndDate?: string | null;
  status: 'PENDING' | 'SCHEDULED' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  amountPaid: number;
  allowPartial: boolean;
  minAmount: number | null;
  coreRequestUuid?: string | null;
  createdAt: string;
  updatedAt?: string;
  lineItems?: { name: string; amount: number }[];
  reminderFrequency?: string;
  scheduledAt?: string | null;
  isRecurring?: boolean;
  recurrenceInterval?: string | null;
  transactions?: any[];
}

export interface CreatePaymentRequestDto {
  unitUuid: string;
  amount: number;
  dueDate: string;
  rentStartDate?: string;
  rentEndDate?: string;
  description?: string;
  allowPartial?: boolean;
  minAmount?: number;
  lineItems?: { name: string; amount: number }[];
  reminderFrequency?: string;
  scheduledAt?: string | null;
  isRecurring?: boolean;
  recurrenceInterval?: string | null;
}

export interface UpdatePmPaymentRequestDto {
  amount?: number;
  dueDate?: string;
  rentStartDate?: string;
  rentEndDate?: string;
  description?: string;
  allowPartial?: boolean;
  minAmount?: number;
  lineItems?: { name: string; amount: number }[];
  reminderFrequency?: string;
  scheduledAt?: string | null;
  isRecurring?: boolean;
  recurrenceInterval?: string | null;
}

export const getPaymentRequests = () => {
  return request<PmPaymentRequest[]>('/pm/payment-requests')
}

export const createPaymentRequest = (data: CreatePaymentRequestDto) => {
  return request<PmPaymentRequest>('/pm/payment-requests', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const updatePaymentRequest = (uuid: string, data: UpdatePmPaymentRequestDto) => {
  return request<PmPaymentRequest>(`/pm/payment-requests/${uuid}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const getPaymentRequest = (uuid: string) => {
  return request<PmPaymentRequest>(`/pm/payment-requests/${uuid}`)
}

export const resendPaymentRequest = (uuid: string, email?: string, channels?: string[]) => {
  return request<{ success: boolean; message: string }>(`/pm/payment-requests/${uuid}/resend`, {
    method: 'POST',
    body: JSON.stringify({ email, channels })
  })
}

export const cancelPaymentRequest = (uuid: string) => {
  return request<{ success: boolean; message: string }>(`/pm/payment-requests/${uuid}`, {
    method: 'DELETE'
  })
}

export const getPayouts = () => {
  return request<any[]>('/pm/payouts')
}

export const getPayoutBreakdown = (uuid: string) => {
  return request<any>(`/pm/payouts/batch/${uuid}`)
}

export const getUnresolvedTransactions = () => {
  return request<any[]>('/pm/payments/unresolved')
}

export const resolveTransaction = (uuid: string, action: 'REFUND' | 'ACCEPT') => {
  return request<{ success: boolean; message: string }>(`/pm/payments/unresolved/${uuid}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ action })
  })
}
