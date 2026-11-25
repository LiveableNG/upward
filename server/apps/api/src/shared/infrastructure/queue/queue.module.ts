import { Global, Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { BULK_EMAIL_QUEUE } from './queue.constants'

function parseRedisConnection(config: ConfigService) {
  const logger = new Logger('QueueModule')
  const redisUrl = config.get<string>('REDIS_URL')

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl)
      return {
        host: parsed.hostname || '127.0.0.1',
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        password: parsed.password || undefined,
        username: parsed.username || undefined,
        db: parsed.pathname && parsed.pathname.length > 1 ? parseInt(parsed.pathname.slice(1), 10) || 0 : 0,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times: number) => Math.min(times * 500, 10_000),
      }
    } catch {
      logger.warn(`Invalid REDIS_URL format; falling back to REDIS_HOST/REDIS_PORT`)
    }
  }

  return {
    host: config.get<string>('REDIS_HOST') || '127.0.0.1',
    port: parseInt(config.get<string>('REDIS_PORT') || '6379', 10),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    db: parseInt(config.get<string>('REDIS_DB') || '0', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => Math.min(times * 500, 10_000),
  }
}

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: parseRedisConnection(config),
        prefix: config.get<string>('BULLMQ_PREFIX') || 'upward',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 30_000, // 30s -> 60s -> 120s
          },
          removeOnComplete: {
            count: 1000,
            age: 3600, // keep completed job keys for 1h max
          },
          removeOnFail: {
            count: 5000,
            age: 86_400, // keep failed job keys for 24h max
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: BULK_EMAIL_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
