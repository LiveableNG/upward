import { request } from '@/lib/api-client'

export async function getMyDocuments() {
  return { receipts: [], contracts: [] }
}

export async function getContracts() {
  const res = await request<{ success: boolean; contracts: any[] }>('/user/contracts', { method: 'GET' })
  return res.contracts || []
}

export interface UploadContractPayload {
  uuid: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  propertyUuid?: string
  userPropertyId?: number
}

export async function getContractUploadUrl(fileName: string, fileType: string, fileSize?: number) {
  return request<{ success: boolean; uuid: string; uploadUrl: string; fileUrl: string }>('/user/contracts/upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, fileType, fileSize }),
  })
}

export async function uploadContract(payload: UploadContractPayload) {
  const res = await request<{ success: boolean; contract: any }>('/user/contracts/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.contract
}

export async function removeContract(uuid: string) {
  return request<{ success: boolean; message: string }>(`/user/contracts/${uuid}`, {
    method: 'DELETE',
  })
}
