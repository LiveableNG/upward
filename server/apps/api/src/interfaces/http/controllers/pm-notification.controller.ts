import { Controller, Get, Post, Patch, Param, Req, UseGuards, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import {
  GetPmNotificationsUseCase,
  MarkPmNotificationReadUseCase,
  MarkAllPmNotificationsReadUseCase,
  GetUnreadPmPopupsUseCase,
} from '../../../application/pm/use-cases/notifications/pm-notification.use-cases';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Controller('pm/notifications')
@UseGuards(JwtAuthGuard)
export class PmNotificationController {
  constructor(
    private readonly getNotificationsUseCase: GetPmNotificationsUseCase,
    private readonly markReadUseCase: MarkPmNotificationReadUseCase,
    private readonly markAllReadUseCase: MarkAllPmNotificationsReadUseCase,
    private readonly getPopupsUseCase: GetUnreadPmPopupsUseCase,
    private readonly prisma: PrismaService,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  private async getActorContext(req: any): Promise<{ ownerPmId: number; isEmployee: boolean; employeeId?: number }> {
    if (req.user?.role === 'PM_EMPLOYEE') {
      let ownerPmId = req.user.ownerPmId;
      let employeeId = req.user.employeeId;
      if (!ownerPmId || !employeeId) {
        const employee = await (this.prisma as any).upward_pm_employee.findUnique({
          where: { uuid: req.user.sub },
          select: { id: true, ownerPmId: true },
        });
        if (employee) {
          ownerPmId = ownerPmId || employee.ownerPmId;
          employeeId = employeeId || employee.id;
        }
      }
      if (ownerPmId) {
        return {
          ownerPmId,
          isEmployee: true,
          employeeId,
        };
      }
    }
    const uuid = req.user?.sub;
    if (!uuid) throw new UnauthorizedException('Invalid user context');
    const pm = await this.pmRepository.findByUuid(uuid);
    if (!pm || !pm.id) throw new UnauthorizedException('Property Manager not found');
    return {
      ownerPmId: pm.id,
      isEmployee: false,
    };
  }

  @Get()
  async getNotifications(@Req() req: any) {
    const actor = await this.getActorContext(req);
    return this.getNotificationsUseCase.execute(actor.ownerPmId, actor.isEmployee ? actor.employeeId : undefined);
  }

  @Get('popups')
  async getPopups(@Req() req: any) {
    const actor = await this.getActorContext(req);
    return this.getPopupsUseCase.execute(actor.ownerPmId, actor.isEmployee ? actor.employeeId : undefined);
  }

  @Patch(':uuid/read')
  async markRead(@Req() req: any, @Param('uuid') uuid: string) {
    const actor = await this.getActorContext(req);
    return this.markReadUseCase.execute(actor.ownerPmId, uuid, actor.isEmployee ? actor.employeeId : undefined);
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    const actor = await this.getActorContext(req);
    return this.markAllReadUseCase.execute(actor.ownerPmId, actor.isEmployee ? actor.employeeId : undefined);
  }
}
