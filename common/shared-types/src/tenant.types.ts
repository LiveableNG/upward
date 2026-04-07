export interface User {
  id: string
  email: string
  fullName: string
  phone?: string | null
  
  createdAt: Date
  updatedAt: Date
}

export interface UserAuthResponse {
  accessToken: string
  user: User
}

export interface SignupDto {
  email: string
  passwordHash: string
  fullName: string
  phone?: string
}
