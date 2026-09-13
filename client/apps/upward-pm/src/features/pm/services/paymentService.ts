import { request } from '@/lib/api-client'
import { Unit, Tenant } from './propertyService'

export interface SettlementAccount {
  id: number;
  uuid: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string | null;
  pmId?: number | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  pmProperties?: { id: number; uuid: string; name: string }[];
}

export interface CreateSettlementAccountDto {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  isPrimary?: boolean;
}

export interface UpdateSettlementAccountDto {
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  bankCode?: string;
  isPrimary?: boolean;
}

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
  manualAccountId?: number | null;
  settlementAccount?: SettlementAccount | null;
  createdBy?: {
    isEmployee: boolean;
    name: string;
    role: string;
    id?: number;
  };
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
  settlementAccountUuid?: string;
  silent?: boolean;
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

export const getSettlementAccounts = () => {
  return request<SettlementAccount[]>('/pm/settlement-accounts')
}

export const createSettlementAccount = (data: CreateSettlementAccountDto) => {
  return request<SettlementAccount>('/pm/settlement-accounts', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const updateSettlementAccount = (uuid: string, data: UpdateSettlementAccountDto) => {
  return request<SettlementAccount>(`/pm/settlement-accounts/${uuid}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const setDefaultSettlementAccount = (uuid: string) => {
  return request<SettlementAccount>(`/pm/settlement-accounts/${uuid}/default`, {
    method: 'PATCH'
  })
}

export const linkPropertiesToSettlementAccount = (uuid: string, propertyUuids: string[]) => {
  return request<{ success: boolean }>(`/pm/settlement-accounts/${uuid}/link-properties`, {
    method: 'POST',
    body: JSON.stringify({ propertyUuids })
  })
}

export const deleteSettlementAccount = (uuid: string) => {
  return request<{ success: boolean }>(`/pm/settlement-accounts/${uuid}`, {
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

export const getPendingManualPayments = () => {
  return request<any[]>('/payments/manual/proof')
}

export const reviewManualPayment = (id: string, status: 'APPROVED' | 'REJECTED', remarks?: string) => {
  return request<{ success: boolean; message: string }>(`/payments/manual/proof/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status, remarks })
  })
}

export const downloadManualPaymentProof = (id: string) => {
  return request<Blob>(`/payments/manual/proof/${id}`, {
    method: 'GET'
  })
}

export const addManualAccount = (data: { propertyId: number; bankName: string; bankCode: string; accountNumber: string; accountName: string }) => {
  return request<{ success: boolean; message: string }>('/payments/manual/account', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
