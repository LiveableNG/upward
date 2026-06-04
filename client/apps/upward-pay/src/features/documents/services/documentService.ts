import { request } from '@/lib/api-client'

export async function getMyDocuments() {
  return { receipts: [], contracts: [] }
}

export async function getContracts() {
  const res = await request<{ success: boolean; contracts: any[] }>('/user/contracts', { method: 'GET' })
  return res.contracts || []
}

export async function uploadContract(file: File, propertyUuid?: string, customFileName?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (propertyUuid) {
    formData.append('propertyUuid', propertyUuid)
  }
  if (customFileName) {
    formData.append('fileName', customFileName)
  }

  const res = await request<{ success: boolean; contract: any }>('/user/contracts/upload', {
    method: 'POST',
    body: formData,
  })
  return res.contract
}

export async function removeContract(uuid: string) {
  return request<{ success: boolean; message: string }>(`/user/contracts/${uuid}`, {
    method: 'DELETE',
  })
}

/** @deprecated Used for legacy direct uploads, use uploadContract instead. */
export async function getContractUploadUrl(fileName: string, fileType: string, fileSize?: number) {
  return { success: true, uuid: '', uploadUrl: '', fileUrl: '' }
}
