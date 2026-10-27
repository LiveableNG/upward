import { request } from '@/lib/api-client'

export type UserContract = {
  uuid: string
  fileName: string
  fileUrl?: string
  createdAt: string
  fileSize?: number
  fileType?: string
  source?: string
  userProperty?: {
    uuid?: string
    location?: { address?: string | null }
  }
}

export async function getContracts(): Promise<UserContract[]> {
  const res = await request<{ contracts?: UserContract[] } | UserContract[]>('/user/contracts', {
    method: 'GET',
  })
  if (Array.isArray(res)) return res
  return res.contracts ?? []
}

export async function uploadContractFile(
  file: { uri: string; name: string; mimeType: string },
  propertyUuid?: string,
) {
  const formData = new FormData()
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob)
  if (propertyUuid) formData.append('propertyUuid', propertyUuid)
  formData.append('fileName', file.name)

  return request<UserContract>('/user/contracts/upload', {
    method: 'POST',
    body: formData,
  })
}
