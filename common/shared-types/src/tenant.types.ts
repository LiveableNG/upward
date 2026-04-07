export interface User {
  id: number
  uuid: string
  email: string
  firstName: string
  lastName: string
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
  firstName: string
  lastName: string
  phone?: string
}
