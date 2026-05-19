import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common'
import { ActivityTrackingService } from '../../../shared/infrastructure/activity-tracking/activity-tracking.service'

@Controller('public/tracking')
export class PublicTrackingController {
  constructor(
    private readonly trackingService: ActivityTrackingService,
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
      app: 'upward-pay', // Always upward-pay for mobile app installations
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
}
