import { request } from '@/lib/api-client'
import type {
  Complaint,
  Envelope,
  GtTransactionHistoryResponse,
  HomeDocument,
  Paginated,
  PendingBill,
  PendingPaymentInfo,
  UploadedHomeFile,
  Visitor,
  VisitorSearchHit,
} from '../types'

/**
 * Client → Upward API. The Upward API resolves the caller's property to a GT
 * externalUnitId server-side and forwards to the GT bridge; the browser never
 * sees or sends externalUnitId, and the GT bridge's shared-secret token stays
 * server-side.
 */
const BASE = '/tenant-app'

function withProperty(path: string, propertyUuid: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ propertyUuid, ...(params || {}) })
  return `${BASE}${path}?${query.toString()}`
}

export async function getComplaints(
  propertyUuid: string,
  page = 1,
  status?: string,
) {
  const params: Record<string, string> = { page: String(page) }
  if (status && status !== 'all') {
    params.status = status
  }

  return request<Paginated<Complaint>>(withProperty('/complaints', propertyUuid, params), {
    method: 'GET',
  })
}

export async function getComplaint(propertyUuid: string, complaintId: string) {
  return request<Envelope<Complaint>>(
    withProperty(`/complaints/${complaintId}`, propertyUuid),
    { method: 'GET' },
  )
}

export type CreateComplaintInput = {
  category: string
  details: string
  file_ids?: string[]
}

export async function createComplaint(propertyUuid: string, input: CreateComplaintInput) {
  return request<Envelope<Complaint>>(withProperty('/complaints', propertyUuid), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function uploadHomeFile(propertyUuid: string, file: File) {
  const form = new FormData()
  form.append('file_type', file.type.split('/')[0] || 'image')
  form.append('caption', file.name)
  form.append('file', file)

  return request<Envelope<UploadedHomeFile>>(withProperty('/files', propertyUuid), {
    method: 'POST',
    body: form,
  })
}

export async function getActiveVisitors(propertyUuid: string) {
  return request<Envelope<Visitor[]>>(withProperty('/visitors/active', propertyUuid), {
    method: 'GET',
  })
}

export async function getVisitorHistory(propertyUuid: string, page = 1) {
  return request<Paginated<Visitor>>(
    withProperty('/visitors/history', propertyUuid, { page: String(page) }),
    { method: 'GET' },
  )
}

export async function searchVisitors(propertyUuid: string, search: string) {
  return request<Envelope<VisitorSearchHit[]>>(
    withProperty('/visitors/search-list', propertyUuid, { search }),
    { method: 'GET' },
  )
}

export type GenerateVisitorInput = {
  name: string
  phone: string
  visitorType: string
  duration: number
  numberOfVisitors: number
  notes?: string
}

export async function generateVisitor(propertyUuid: string, input: GenerateVisitorInput) {
  return request<Envelope<Visitor>>(withProperty('/visitors/generate', propertyUuid), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function revokeVisitor(propertyUuid: string, accessId: string) {
  return request<Envelope<Visitor>>(withProperty(`/visitors/${accessId}`, propertyUuid), {
    method: 'DELETE',
  })
}

export async function getTransactions(propertyUuid: string, page = 1) {
  return request<GtTransactionHistoryResponse>(
    withProperty('/transactions', propertyUuid, { page: String(page) }),
    { method: 'GET' },
  )
}

export async function getPendingBills(propertyUuid: string) {
  return request<Envelope<PendingBill[]>>(withProperty('/transactions/pending', propertyUuid), {
    method: 'GET',
  })
}

export async function getPendingPaymentInfo(propertyUuid: string, billId: string) {
  return request<Envelope<PendingPaymentInfo>>(
    withProperty(`/transactions/pending/${billId}`, propertyUuid),
    { method: 'GET' },
  )
}

export async function checkTransactionStatus(propertyUuid: string, topupRequestId: string) {
  return request<Envelope<{ status: 'completed' | 'pending' }>>(
    withProperty('/transactions/check-status', propertyUuid, { topup_request_id: topupRequestId }),
    { method: 'GET' },
  )
}

export async function getDocuments(propertyUuid: string, page = 1) {
  return request<Paginated<HomeDocument>>(
    withProperty('/documents', propertyUuid, { page: String(page) }),
    { method: 'GET' },
  )
}

export async function markDocumentViewed(propertyUuid: string, documentId: string) {
  return request<Envelope<HomeDocument>>(
    withProperty(`/documents/${documentId}/view`, propertyUuid),
    { method: 'PATCH' },
  )
}

export async function markDocumentDownloaded(propertyUuid: string, documentId: string) {
  return request<Envelope<HomeDocument>>(
    withProperty(`/documents/${documentId}/download`, propertyUuid),
    { method: 'PATCH' },
  )
}

/*
 * The two below are answered with 501 by GT today.
 */

export async function getCoTenants(propertyUuid: string) {
  return request<Envelope<unknown[]>>(withProperty('/co-tenants', propertyUuid), { method: 'GET' })
}

export async function getLastInspectionResult(propertyUuid: string) {
  return request<Envelope<unknown>>(withProperty('/inspection/last-result', propertyUuid), {
    method: 'GET',
  })
}
