import { request } from '@/lib/api-client'

export async function createSupportTicket(message: string) {
  return request<{ success: boolean }>('/user/support', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function getMySupportTickets() {
  return request<{ tickets: Array<{ id: string; message: string; status?: string }> }>(
    '/user/support',
    { method: 'GET' },
  )
}
