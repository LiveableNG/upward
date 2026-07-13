export const EMAIL_SEQUENCE_REPOSITORY = Symbol('EMAIL_SEQUENCE_REPOSITORY')

export interface EmailSequenceLog {
  id?: number
  uuid?: string
  userId: number
  email: string
  stage: 'WELCOME' | 'DAY_2' | 'DAY_5' | 'DAY_9' | 'DAY_14'
  status: 'PENDING' | 'SENT' | 'FAILED'
  scheduledFor: Date
  sentAt?: Date | null
  errorReason?: string | null
  templateName: string
  templateData?: any | null
  createdAt?: Date
  updatedAt?: Date
  user?: {
    firstName?: string | null
  }
}

export interface IEmailSequenceRepository {
  createMany(data: EmailSequenceLog[]): Promise<void>
  findPendingLogsBefore(date: Date, limit: number): Promise<EmailSequenceLog[]>
  updateStatus(id: number, status: 'SENT' | 'FAILED', errorReason?: string, sentAt?: Date): Promise<void>
  findAll(filters: { status?: string; stage?: string; email?: string }): Promise<EmailSequenceLog[]>
  findById(id: number): Promise<EmailSequenceLog | null>
}
