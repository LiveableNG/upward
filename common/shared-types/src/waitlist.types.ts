import { type UserRole } from './user.types'

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
  abVariant?: string
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
  abVariant?: string
  alreadyExists?: boolean
}
