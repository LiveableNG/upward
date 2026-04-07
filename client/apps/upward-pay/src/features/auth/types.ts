export interface UserProfile {
  id: number
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  dateOfBirth?: string
  gender?: string
  occupation?: string
  address?: string
  rentAnniversary?: string
  profilePic?: string
  profileSlug?: string | null
  bio?: string | null
  useBiometrics?: boolean
  isFromWaitlist: boolean
  isFromInvite: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  accessToken: string
  user: UserProfile
}
