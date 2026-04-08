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
  rentEndDate?: string
  profilePic?: string
  profileSlug?: string | null
  bio?: string | null
  properties?: Array<{
    uuid?: string;
    address: string;
    rentEndDate: string;
    rentAmount?: number;
    companyName?: string;
    managerName?: string;
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
