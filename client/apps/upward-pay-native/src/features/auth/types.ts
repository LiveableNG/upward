export type UserPropertyLocation = {
  area?: string
  subarea?: string
  address?: string
  state?: string
  country?: string
}

export type UserProperty = {
  id?: number
  uuid?: string
  address: string
  rentEndDate?: string
  rentStartDate?: string
  rentAmount?: number
  rentType?: string
  managerName?: string
  companyName?: string
  unitName?: string
  externalUnitId?: string | null
  isPastTenancy?: boolean
  location?: UserPropertyLocation
}

export type UserProfile = {
  id: number
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  profilePic?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  address?: string | null
  profileSlug?: string | null
  isIdentityVerified?: boolean
  verificationOn?: boolean
  properties?: UserProperty[]
  termsAcceptedAt?: string | null
}

export type AuthResponse = {
  accessToken: string
  refreshToken?: string
  user: UserProfile
  isNewUser?: boolean
}
