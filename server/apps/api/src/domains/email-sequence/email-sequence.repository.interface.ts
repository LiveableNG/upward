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
    lastName?: string | null
    email?: string | null
    phone?: string | null
  }
}

export interface IEmailSequenceRepository {
  createMany(data: EmailSequenceLog[]): Promise<void>
  findLogsBeforeByStatus(status: string, date: Date, limit: number): Promise<EmailSequenceLog[]>
  updateStatus(id: number, status: 'SENT' | 'FAILED', errorReason?: string, sentAt?: Date): Promise<void>
  findAll(filters: { skip?: number; take?: number; status?: string; stage?: string; email?: string }): Promise<{ data: EmailSequenceLog[]; total: number }>
  findById(id: number): Promise<EmailSequenceLog | null>
  getStats(stage: string): Promise<{ total: number; sent: number; failed: number; pending: number }>
}
