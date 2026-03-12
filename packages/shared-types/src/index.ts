
export enum UserRole {
    TENANT = 'TENANT',
    PROPERTY_MANAGER = 'PROPERTY_MANAGER',
}

export enum WaitlistBenefit {
    RENT_PASSPORT = 'RENT_PASSPORT',
    LOW_COST_FINANCING = 'LOW_COST_FINANCING',
    HOME_OWNERSHIP = 'HOME_OWNERSHIP',
    EXCLUSIVE_PERKS = 'EXCLUSIVE_PERKS',
}

export interface CreateWaitlistEntryDto {
    email: string
    name?: string
    phone?: string
    role?: UserRole
    benefits?: WaitlistBenefit[]
    acceptTerms: boolean
    wantsAmbassador?: boolean
}

export interface WaitlistEntryResponse {
    id: string
    email: string
    createdAt: string
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
