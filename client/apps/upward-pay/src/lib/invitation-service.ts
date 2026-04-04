import { cache } from 'react'

export interface InvitationData {
  companyId: string
  companyName: string
  companyLogo?: string
  firstName: string
  lastName: string
  email: string
}

// Simulated server-side fetch with caching
export const fetchInvitationData = cache(async (token: string): Promise<InvitationData | null> => {
  // In a real app, this would be:
  // const res = await fetch(`${process.env.INTERNAL_API_URL}/invitations/${token}`, { cache: 'force-cache' })
  // return res.json()

  // For now, we simulate the 1s delay and return mock data
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (token === 'error') throw new Error('Invalid or expired invitation token')

  if (token === 'mismatch') return null

  return {
    companyId: 'comp_123',
    companyName: 'Livable Properties',
    companyLogo: 'https://cdn-icons-png.flaticon.com/512/3670/3670151.png',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  }
})
