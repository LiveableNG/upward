import { request } from '@/lib/api-client'

export async function getMyDocuments() {
  return { receipts: [], contracts: [] }
}

export async function getContracts() {
  return request<any[]>('/tenant/contracts', { method: 'GET' })
}

export async function uploadContract(formData: FormData) {
  return request<any>('/tenant/contracts/upload', {
    method: 'POST',
    body: formData,
    headers: {}, // Browser set boundary
  })
}
