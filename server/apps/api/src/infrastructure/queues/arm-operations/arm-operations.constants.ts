import type { ConnectionOptions } from 'bullmq'

export const ARM_OPERATIONS_QUEUE_NAME = 'arm-operations'
export const ARM_NOTIFICATIONS_QUEUE_NAME = 'arm-notifications'

export const ARM_JOB_DEFAULT_MAX_ATTEMPTS = 5
export const ARM_JOB_INITIAL_BACKOFF_MS = 15_000
export const ARM_JOB_WORKER_LOCK_DURATION_MS = 120_000
export const ARM_JOB_STALE_PROCESSING_MS = 10 * 60 * 1000 // 10 minutes
export const ARM_JOB_OUTBOX_GRACE_MS = 90 * 1000 // 90 seconds

export const ARM_NOTIFICATION_MAX_ATTEMPTS = 6
export const ARM_NOTIFICATION_INITIAL_BACKOFF_MS = 30_000 // 30s -> 1m -> 2m -> 4m -> 8m -> 16m
export const ARM_NOTIFICATION_LOCK_DURATION_MS = 60_000

/**
 * BullMQ v5 forbids colons (`:`) in custom job IDs.
 * Convert arbitrary idempotency keys into deterministic BullMQ-safe job IDs.
 */
export function toBullMqJobId(idempotencyKey: string): string {
  return idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '__')
}

export function isWorkerDisabledEnvironment(): boolean {
  const isServerless = Boolean(
    process.env['VERCEL'] ||
      process.env['VERCEL_ENV'] ||
      process.env['AWS_LAMBDA_FUNCTION_NAME'],
  )
  const isTest =
    process.env['NODE_ENV'] === 'test' || Boolean(process.env['JEST_WORKER_ID'])
  const explicitlyDisabled = process.env['DISABLE_BULLMQ_WORKER'] === 'true'
  return isServerless || isTest || explicitlyDisabled
}

export function isQueueDisabledEnvironment(): boolean {
  return process.env['NODE_ENV'] === 'test' || Boolean(process.env['JEST_WORKER_ID'])
}

export function buildRedisConnectionOptions(redisUrl?: string): ConnectionOptions {
  const raw = (redisUrl || process.env['REDIS_URL'] || '').trim()

  if (raw) {
    try {
      const parsed = new URL(raw)
      const isTls = parsed.protocol === 'rediss:'
      const dbSegment = parsed.pathname?.replace(/^\//, '')
      const db = dbSegment && /^\d+$/.test(dbSegment) ? parseInt(dbSegment, 10) : 0

      const opts: ConnectionOptions = {
        host: parsed.hostname || '127.0.0.1',
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        db,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times: number) {
          return Math.min(times * 500, 10_000)
        },
      }

      if (parsed.username) {
        opts.username = decodeURIComponent(parsed.username)
      }
      if (parsed.password) {
        opts.password = decodeURIComponent(parsed.password)
      }
      if (isTls) {
        opts.tls = { rejectUnauthorized: false }
      }

      return opts
    } catch {
      // Fall through to REDIS_HOST / REDIS_PORT configuration
    }
  }

  const host = (process.env['REDIS_HOST'] || '127.0.0.1').trim()
  const port = parseInt(process.env['REDIS_PORT'] || '6379', 10) || 6379
  const db = parseInt(process.env['REDIS_DB'] || '0', 10) || 0
  const password = process.env['REDIS_PASSWORD']?.trim() || undefined

  return {
    host,
    port,
    db,
    ...(password ? { password } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      return Math.min(times * 500, 10_000)
    },
  }
}
