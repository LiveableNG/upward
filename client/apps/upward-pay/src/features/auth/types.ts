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
  address?: string
  rentAnniversary?: string
  membershipLevel: string
  hasCompletedOnboarding: boolean
  savingsBalance: number
  savingsGoal: number
  hasDismissedAppBanner: boolean
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  tenant: TenantProfile
}
