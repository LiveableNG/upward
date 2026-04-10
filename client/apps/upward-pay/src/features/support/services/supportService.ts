import { request } from '@/lib/api-client'

export const createSupportTicket = async (message: string) => {
  return request<{ success: boolean; ticket: any }>('/user/support', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export const getMyTickets = async () => {
  return request<{ success: boolean; tickets: any[] }>('/user/support', {
    method: 'GET',
  })
}
