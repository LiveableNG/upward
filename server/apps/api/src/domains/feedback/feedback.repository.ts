export interface Feedback {
  id: number
  uuid: string
  userId?: number | null
  pmId?: number | null
  email?: string | null
  name?: string | null
  type: string
  message: string
  createdAt: Date
  updatedAt: Date
}

export interface IFeedbackRepository {
  create(data: Omit<Feedback, 'id' | 'uuid' | 'createdAt' | 'updatedAt'> & { pmUuid?: string | null }): Promise<Feedback>
  findAll(): Promise<Feedback[]>
}

export const FEEDBACK_REPOSITORY = Symbol('FEEDBACK_REPOSITORY')
