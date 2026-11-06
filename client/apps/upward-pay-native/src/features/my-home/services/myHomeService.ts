import { request } from '@/lib/api-client'

import type {
  Complaint,
  ComplaintFeedbackItem,
  Envelope,
  GtTransactionHistoryResponse,
  HomeDocument,
  Paginated,
  PendingBill,
  UploadedHomeFile,
  Visitor,
} from '@/features/my-home/types'

const BASE = '/tenant-app'

function withProperty(path: string, propertyUuid: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ propertyUuid, ...(params ?? {}) })
  return `${BASE}${path}?${query.toString()}`
}

export async function getComplaint(propertyUuid: string, complaintId: string) {
  return request<Envelope<Complaint> | Complaint>(
    withProperty(`/complaints/${encodeURIComponent(complaintId)}`, propertyUuid),
    { method: 'GET' },
  )
}

export async function getComplaints(propertyUuid: string, page = 1, status?: string) {
  const params: Record<string, string> = { page: String(page) }
  if (status && status !== 'all') params.status = status
  return request<Paginated<Complaint> | Complaint[]>(
    withProperty('/complaints', propertyUuid, params),
    { method: 'GET' },
  )
}

export async function createComplaint(
  propertyUuid: string,
  input: { category: string; details: string; file_ids?: string[] },
) {
  return request<Envelope<Complaint> | Complaint>(withProperty('/complaints', propertyUuid), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type DisputeComplaintInput = {
  reason: string
  preferredResolution: string
  impact?: string
  file_ids?: string[]
}

export async function disputeComplaint(
  propertyUuid: string,
  complaintId: string,
  input: DisputeComplaintInput,
) {
  return request<Envelope<Complaint> | Complaint>(
    withProperty(`/complaints/${encodeURIComponent(complaintId)}/dispute`, propertyUuid),
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function submitComplaintFeedback(
  propertyUuid: string,
  complaintId: string,
  feedback: ComplaintFeedbackItem[],
) {
  return request<Envelope<Complaint> | Complaint>(
    withProperty(`/complaints/${encodeURIComponent(complaintId)}/feedback`, propertyUuid),
    {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    },
  )
}

export async function uploadHomeFile(
  propertyUuid: string,
  file: { uri: string; name: string; mimeType: string },
) {
  const mimeRoot = file.mimeType.split('/')[0] || 'image'
  const fileType = file.mimeType === 'application/pdf' ? 'pdf' : mimeRoot
  const formData = new FormData()
  formData.append('file_type', fileType)
  formData.append('caption', file.name)
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob)

  return request<Envelope<UploadedHomeFile> | UploadedHomeFile>(
    withProperty('/files', propertyUuid),
    {
      method: 'POST',
      body: formData,
    },
  )
}

export async function getActiveVisitors(propertyUuid: string) {
  return request<Envelope<Visitor[]> | Visitor[]>(withProperty('/visitors/active', propertyUuid), {
    method: 'GET',
  })
}

export async function generateVisitor(
  propertyUuid: string,
  input: {
    name: string
    phone: string
    visitorType: string
    duration: number
    numberOfVisitors: number
    notes?: string
  },
) {
  return request<Envelope<Visitor> | Visitor>(withProperty('/visitors/generate', propertyUuid), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function revokeVisitor(propertyUuid: string, accessId: string) {
  return request<unknown>(withProperty(`/visitors/${accessId}`, propertyUuid), {
    method: 'DELETE',
  })
}

export async function getPendingBills(propertyUuid: string) {
  return request<Envelope<PendingBill[]> | PendingBill[]>(
    withProperty('/transactions/pending', propertyUuid),
    { method: 'GET' },
  )
}

export async function getDocuments(propertyUuid: string, page = 1) {
  return request<Paginated<HomeDocument> | HomeDocument[]>(
    withProperty('/documents', propertyUuid, { page: String(page) }),
    { method: 'GET' },
  )
}

export async function markDocumentViewed(propertyUuid: string, documentId: string) {
  return request<unknown>(withProperty(`/documents/${documentId}/view`, propertyUuid), {
    method: 'PATCH',
  })
}

export async function getTransactions(propertyUuid: string, page = 1) {
  return request<GtTransactionHistoryResponse>(
    withProperty('/transactions', propertyUuid, { page: String(page) }),
    { method: 'GET' },
  )
}
