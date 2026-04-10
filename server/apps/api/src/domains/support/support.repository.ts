export interface SupportTicket {
  id: number
  uuid: string
  userId: number
  message: string
  status: string
  resolvedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  user?: any
}

export interface ISupportTicketRepository {
  create(data: Omit<SupportTicket, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'user'>): Promise<SupportTicket>
  findById(id: number): Promise<SupportTicket | null>
  findAll(): Promise<SupportTicket[]>
  findByUserId(userId: number): Promise<SupportTicket[]>
  update(id: number, data: Partial<SupportTicket>): Promise<SupportTicket>
}

export const SUPPORT_TICKET_REPOSITORY = Symbol('SUPPORT_TICKET_REPOSITORY')
