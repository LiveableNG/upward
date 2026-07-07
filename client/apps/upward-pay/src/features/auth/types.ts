export interface BankDetails {
  accountNumber?: string
  accountName?: string
  bankCode?: string
  bankName?: string
}

export interface UserProfile {
  id: number
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  dateOfBirth?: string
  isIdentityVerified?: boolean
  verificationOn?: boolean
  gender?: string
  address?: string
  rentEndDate?: string
  profilePic?: string
  profileSlug?: string | null
  bio?: string | null
  properties?: Array<{
    id: number;
    uuid?: string;
    address: string;
    rentStartDate?: string;
    rentEndDate: string;
    rentAmount?: number;
    isManaged?: boolean;
    isVerified?: boolean;
    isPmVerified?: boolean;
    isPlatformLinked?: boolean;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
    companyName?: string;
    companyPhone?: string;
    companyEmail?: string;
    isPastTenancy?: boolean;
    location?: {
      area?: string;
      subarea?: string;
      address?: string;
      state?: string;
      country?: string;
    }
    manualAccount?: {
      accountNumber: string;
      accountName: string;
      bankName: string;
      bankCode?: string;
    }
  }>
  isFromWaitlist: boolean
  isFromInvite: boolean
  createdAt: string
  updatedAt: string
  bankDetails?: BankDetails | null
}

export interface AuthResponse {
  accessToken: string
  user: UserProfile
}
