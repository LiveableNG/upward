import { Injectable, Inject } from '@nestjs/common'
import { IsOptional, IsString } from 'class-validator'
import {
  SESSION_TRACKING_REPOSITORY,
  ISessionTrackingRepository,
  FunnelMetricsResult,
} from '../../../domains/session-tracking/session-tracking.repository'

export class GetSessionFunnelsQueryDto {
  @IsOptional()
  @IsString()
  platform?: string

  @IsOptional()
  days?: number

  @IsOptional()
  @IsString()
  app?: string
}

@Injectable()
export class GetSessionFunnelsUseCase {
  constructor(
    @Inject(SESSION_TRACKING_REPOSITORY)
    private readonly sessionRepo: ISessionTrackingRepository,
  ) {}

  async execute(query: GetSessionFunnelsQueryDto): Promise<FunnelMetricsResult> {
    return this.sessionRepo.getFunnelMetrics({
      platform: query.platform,
      days: query.days ? Number(query.days) : undefined,
      app: query.app,
    })
  }
}
