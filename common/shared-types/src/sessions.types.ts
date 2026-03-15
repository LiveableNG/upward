import { type WaitlistEntryResponse } from './waitlist.types'

export interface Session {
  id: string
  name: string
  googleMeetLink: string
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface Attendance {
  id: string
  sessionId: string
  userId: string
  attended: boolean
  createdAt: string
  updatedAt: string
  user?: WaitlistEntryResponse
  session?: Session
}

export interface EmailLog {
  id: string
  userId: string
  subject: string
  sessionId?: string
  sentAt: string
  status: 'SENT' | 'FAILED'
  createdAt: string
  user?: WaitlistEntryResponse
  session?: Session
}
