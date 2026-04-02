import { AdminRole } from '@upward/shared-types'

export interface AuthenticatedRequest {
  user: {
    id: string
    email: string
    role: AdminRole
  }
  headers: Record<string, string>
  ip: string
}
