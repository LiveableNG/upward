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
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  amountPaid: number;
  allowPartial: boolean;
  minAmount: number | null;
  coreRequestUuid?: string | null;
  createdAt: string;
}

export interface CreatePaymentRequestDto {
  unitUuid: string;
  amount: number;
  dueDate: string;
  description?: string;
  allowPartial?: boolean;
  minAmount?: number;
  lineItems?: { name: string; amount: number }[];
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
