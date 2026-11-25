export const BULK_EMAIL_QUEUE = 'bulk-email'

export const BULK_EMAIL_JOBS = {
  SEND_RECIPIENT: 'send-campaign-recipient',
} as const

export interface BulkEmailRecipientJobData {
  campaignId: string
  recipientId: string
}
