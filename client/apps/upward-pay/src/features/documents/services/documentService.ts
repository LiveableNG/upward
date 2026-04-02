import { request } from '@/lib/api-client'
import { type DocumentsData, type ReceiptData } from '../types'

export async function getMyDocuments() {
  return request<DocumentsData>('/documents/mine')
}

export async function getReceipt(uuid: string) {
  return request<ReceiptData>(`/documents/receipt/${uuid}`)
}
