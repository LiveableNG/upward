import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
  Ip,
} from '@nestjs/common'
import { ActivityTrackingService } from '../../../shared/infrastructure/activity-tracking/activity-tracking.service'
import { IngestSessionEventsUseCase, IngestSessionEventsDto } from '../../../application/use-cases/analytics/ingest-session-events.use-case'
import { EndSessionUseCase, EndSessionDto } from '../../../application/use-cases/analytics/end-session.use-case'

@Controller('public/tracking')
export class PublicTrackingController {
  constructor(
    private readonly trackingService: ActivityTrackingService,
    private readonly ingestSessionEventsUseCase: IngestSessionEventsUseCase,
    private readonly endSessionUseCase: EndSessionUseCase,
  ) {}

  @Post('install')
  @HttpCode(HttpStatus.OK)
  async trackInstall(
    @Req() req: any,
    @Body() body: { platform: string; deviceModel?: string; osVersion?: string; installationId?: string },
  ) {
    const ipAddress = req.ip || req.raw?.ip;
    const userAgent = req.headers['user-agent'];

    this.trackingService.track({
      app: 'upward-pay',
      userRole: 'GUEST',
      action: 'APP_INSTALL',
      entityType: 'DEVICE',
      entityId: body.installationId || "N/A",
      description: `Mobile app installed/launched on ${body.platform || 'unknown'} (${body.deviceModel || 'unknown'} - OS: ${body.osVersion || 'unknown'})`,
      metadata: body,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  @Post('session/event')
  @HttpCode(HttpStatus.OK)
  async ingestEvents(
    @Body() dto: IngestSessionEventsDto,
    @Headers() headers: Record<string, any>,
    @Ip() clientIp: string,
  ) {
    return this.ingestSessionEventsUseCase.execute(dto, headers, clientIp);
  }

  @Post('session/end')
  @HttpCode(HttpStatus.OK)
  async endSession(@Body() dto: EndSessionDto) {
    return this.endSessionUseCase.execute(dto);
  }
}
