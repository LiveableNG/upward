export interface TenantProfile {
  id: string
  email: string
  fullName: string
  phone: string
  signupStatus: string
  dateOfBirth?: string
  gender?: string
  occupation?: string
  maritalStatus?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  address?: string
  rentAnniversary?: string
  membershipLevel: string
  totalInvites: number
  hasCompletedOnboarding: boolean
  savingsBalance: number
  savingsGoal: number
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  tenant: TenantProfile
}
