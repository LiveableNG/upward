export interface VerificationToken {
  id?: number
  uuid: string
  token?: string | null
  otp?: string | null
  context: string // SIGNUP, LOGIN, INVITE, PAYMENT
  identifier: string // email or entity UUID
  metadata?: any
  resends: number
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface VerificationTokenRepository {
  create(token: Partial<VerificationToken>): Promise<VerificationToken>
  findByToken(token: string): Promise<VerificationToken | null>
  findByIdentifier(identifier: string, context: string): Promise<VerificationToken | null>
  delete(id: number): Promise<void>
  deleteOldTokens(identifier: string, context: string): Promise<void>
  update(id: number, data: Partial<VerificationToken>): Promise<VerificationToken>
}

export const VERIFICATION_TOKEN_REPOSITORY = Symbol('VERIFICATION_TOKEN_REPOSITORY')
