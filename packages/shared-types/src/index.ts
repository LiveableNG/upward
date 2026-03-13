export enum UserRole {
  TENANT = 'TENANT',
  OWNER = 'OWNER',
}

export enum WaitlistBenefit {
  HISTORY = 'HISTORY',
  OWNERSHIP = 'OWNERSHIP',
  FINANCING = 'FINANCING',
  PRIORITY = 'PRIORITY',
  CREDIT = 'CREDIT',
  TITLE = 'TITLE',
}

export interface CreateWaitlistEntryDto {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: UserRole
  benefits?: WaitlistBenefit[]
  acceptTerms?: boolean
  wantsAmbassador?: boolean
  country?: string
  city?: string
  selectedSession?: string
}

export interface WaitlistEntryResponse {
  id: string
  email: string
  createdAt: string
  updatedAt?: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: UserRole
  benefits?: WaitlistBenefit[]
  acceptTerms?: boolean
  wantsAmbassador?: boolean
  country?: string
  city?: string
  selectedSession?: string
  alreadyExists?: boolean
}

export interface BaseUser {
  id: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface ApiSuccess<T> {
  data: T
  message?: string
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error?: string
}

export interface Country {
  id: string
  name: string
}
