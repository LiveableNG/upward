import { request } from '@/lib/api-client'

export async function getMyDocuments() {
  return { receipts: [], contracts: [] }
}

export async function getContracts() {
  const res = await request<{ success: boolean; contracts: any[] }>('/user/contracts', { method: 'GET' })
  return res.contracts || []
}

export async function uploadContract(formData: FormData) {
  const res = await request<{ success: boolean; contract: any }>('/user/contracts/upload', {
    method: 'POST',
    body: formData,
    headers: {}, // Browser set boundary
  })
  return res.contract
}

export async function removeContract(uuid: string) {
  return request<{ success: boolean; message: string }>(`/user/contracts/${uuid}`, {
    method: 'DELETE',
  })
}
