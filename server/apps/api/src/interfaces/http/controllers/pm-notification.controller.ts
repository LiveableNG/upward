import { Controller, Get, Post, Patch, Param, Req, UseGuards, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import {
  GetPmNotificationsUseCase,
  MarkPmNotificationReadUseCase,
  MarkAllPmNotificationsReadUseCase,
  GetUnreadPmPopupsUseCase,
} from '../../../application/pm/use-cases/notifications/pm-notification.use-cases';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';

@Controller('pm/notifications')
@UseGuards(JwtAuthGuard)
export class PmNotificationController {
  constructor(
    private readonly getNotificationsUseCase: GetPmNotificationsUseCase,
    private readonly markReadUseCase: MarkPmNotificationReadUseCase,
    private readonly markAllReadUseCase: MarkAllPmNotificationsReadUseCase,
    private readonly getPopupsUseCase: GetUnreadPmPopupsUseCase,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  private async getPmId(req: any): Promise<number> {
    const uuid = req.user?.sub;
    if (!uuid) throw new UnauthorizedException('Invalid user context');
    const pm = await this.pmRepository.findByUuid(uuid);
    if (!pm || !pm.id) throw new UnauthorizedException('Property Manager not found');
    return pm.id;
  }

  @Get()
  async getNotifications(@Req() req: any) {
    const pmId = await this.getPmId(req);
    return this.getNotificationsUseCase.execute(pmId);
  }

  @Get('popups')
  async getPopups(@Req() req: any) {
    const pmId = await this.getPmId(req);
    return this.getPopupsUseCase.execute(pmId);
  }

  @Patch(':uuid/read')
  async markRead(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getPmId(req);
    return this.markReadUseCase.execute(pmId, uuid);
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    const pmId = await this.getPmId(req);
    return this.markAllReadUseCase.execute(pmId);
  }
}
