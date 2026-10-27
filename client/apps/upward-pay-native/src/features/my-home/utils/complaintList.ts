import type { Complaint } from '@/features/my-home/types'

export type ComplaintListMeta = {
  current_page: number
  last_page: number
  per_page?: number
  total?: number
}

export type ComplaintListPage = {
  data: Complaint[]
  meta?: ComplaintListMeta
}

export function parseComplaintListPage(res: unknown): ComplaintListPage {
  if (Array.isArray(res)) {
    return { data: res as Complaint[] }
  }
  if (res && typeof res === 'object') {
    const body = res as Record<string, unknown>
    const data = body.data
    const meta = body.meta as ComplaintListMeta | undefined
    if (Array.isArray(data)) {
      return { data: data as Complaint[], meta }
    }
  }
  return { data: [] }
}
