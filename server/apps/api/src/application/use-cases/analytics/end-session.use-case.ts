import { Injectable, Logger, Inject } from '@nestjs/common'
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator'
import {
  SESSION_TRACKING_REPOSITORY,
  ISessionTrackingRepository,
} from '../../../domains/session-tracking/session-tracking.repository'

export class EndSessionDto {
  @IsNotEmpty()
  @IsString()
  sessionId!: string

  @IsOptional()
  @IsString()
  exitScreen?: string

  @IsOptional()
  @IsString()
  lastAction?: string

  @IsOptional()
  @IsString()
  dropOffStage?: string

  @IsOptional()
  @IsNumber()
  durationSeconds?: number
}

@Injectable()
export class EndSessionUseCase {
  private readonly logger = new Logger(EndSessionUseCase.name)

  constructor(
    @Inject(SESSION_TRACKING_REPOSITORY)
    private readonly sessionRepo: ISessionTrackingRepository,
  ) {}

  async execute(dto: EndSessionDto): Promise<{ success: boolean }> {
    try {
      if (!dto.sessionId) return { success: false }

      const existing = await this.sessionRepo.findSessionBySessionId(dto.sessionId)
      if (!existing) return { success: false }

      const now = new Date()
      let calculatedDuration = dto.durationSeconds
      if (!calculatedDuration && existing.startedAt) {
        calculatedDuration = Math.max(
          0,
          Math.floor((now.getTime() - existing.startedAt.getTime()) / 1000),
        )
      }

      let dropOff = dto.dropOffStage || existing.dropOffStage
      if (dropOff === 'ACTIVE') {
        dropOff = existing.lastAction === 'PAYMENT_SUCCESS' ? 'COMPLETED' : 'DROPPED_OFF'
      }

      const success = await this.sessionRepo.endSession(dto.sessionId, {
        endedAt: now,
        durationSeconds: calculatedDuration || existing.durationSeconds,
        exitScreen: dto.exitScreen || existing.exitScreen,
        lastAction: dto.lastAction || existing.lastAction,
        dropOffStage: dropOff,
      })

      return { success }
    } catch (err: any) {
      this.logger.error(`Failed to end session: ${err?.message || err}`, err?.stack)
      return { success: false }
    }
  }
}
