export interface UserProfile {
  id: number
  uuid: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  dateOfBirth?: string
  gender?: string
  address?: string
  rentEndDate?: string
  profilePic?: string
  profileSlug?: string | null
  bio?: string | null
  properties?: Array<{
    uuid?: string;
    address: string;
    rentStartDate?: string;
    rentEndDate: string;
    rentAmount?: number;
    isManaged?: boolean;
    companyName?: string;
    managerName?: string;
    location?: {
      area?: string;
      subarea?: string;
      address?: string;
      state?: string;
      country?: string;
    }
  }>
  isFromWaitlist: boolean
  isFromInvite: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  accessToken: string
  user: UserProfile
}
