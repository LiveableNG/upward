export type ArmJobType = 'SUBSCRIBE' | 'REDEEM' | 'ONBOARD'

export type ArmJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface ArmJobRecord {
  id: number
  uuid: string
  idempotencyKey: string
  jobType: ArmJobType
  status: ArmJobStatus
  vaultId?: number | null
  userId?: number | null
  transactionId?: number | null
  amountKobo?: bigint | null
  reference: string
  armTransactionId: string
  armInstructionId?: string | null
  payload: Record<string, unknown>
  result?: Record<string, unknown> | null
  attempts: number
  maxAttempts: number
  lastError?: string | null
  lockedAt?: Date | null
  completedAt?: Date | null
  failedAt?: Date | null
  notifiedUserAt?: Date | null
  notifiedAdminAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ArmJobQueueDescriptor {
  id: number
  uuid: string
  idempotencyKey: string
  jobType: ArmJobType
}

export interface ArmJobQueueData {
  armJobId: number
  armJobUuid: string
  idempotencyKey: string
  jobType: ArmJobType
}

export interface ArmReconciliationSummary {
  requeued: number
  recoveredStale: number
  failedStale: number
  requeuedNotifications?: number
  processedViaFallback?: number
  processedNotificationsViaFallback?: number
  redisReachable?: boolean
}

export type ArmNotificationKind = 'USER_SUCCESS' | 'ADMIN_SUCCESS' | 'ADMIN_FAILURE'

export interface ArmNotificationJobData {
  armJobId: number
  armJobUuid: string
  kind: ArmNotificationKind
  errorMessage?: string
  attemptCount?: number
}

export interface IArmNotificationQueue {
  enqueueNotification(data: ArmNotificationJobData): Promise<boolean>
}

export interface IArmJobQueue {
  enqueueJob(
    job: ArmJobQueueDescriptor,
    options?: { allowReplaceFailed?: boolean },
  ): Promise<boolean>
  reconcilePendingJobs(): Promise<ArmReconciliationSummary>
}

export const ARM_JOB_QUEUE = Symbol('ARM_JOB_QUEUE')
export const ARM_NOTIFICATION_QUEUE = Symbol('ARM_NOTIFICATION_QUEUE')
