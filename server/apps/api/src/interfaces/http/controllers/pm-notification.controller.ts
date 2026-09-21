import { Controller, Get, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import {
  GetPmNotificationsUseCase,
  MarkPmNotificationReadUseCase,
  MarkAllPmNotificationsReadUseCase,
  GetUnreadPmPopupsUseCase,
} from '../../../application/pm/use-cases/notifications/pm-notification.use-cases';

@Controller('pm/notifications')
@UseGuards(JwtAuthGuard)
export class PmNotificationController {
  constructor(
    private readonly getNotificationsUseCase: GetPmNotificationsUseCase,
    private readonly markReadUseCase: MarkPmNotificationReadUseCase,
    private readonly markAllReadUseCase: MarkAllPmNotificationsReadUseCase,
    private readonly getPopupsUseCase: GetUnreadPmPopupsUseCase,
  ) {}

  @Get()
  async getNotifications(@CurrentPmActor() actor: PmActorContext) {
    return this.getNotificationsUseCase.execute(actor.ownerPmId, actor.isEmployee ? actor.employeeId : undefined);
  }

  @Get('popups')
  async getPopups(@CurrentPmActor() actor: PmActorContext) {
    return this.getPopupsUseCase.execute(actor.ownerPmId, actor.isEmployee ? actor.employeeId : undefined);
  }

  @Patch(':uuid/read')
  async markRead(@CurrentPmActor() actor: PmActorContext, @Param('uuid') uuid: string) {
    return this.markReadUseCase.execute(actor.ownerPmId, uuid, actor.isEmployee ? actor.employeeId : undefined);
  }

  @Post('read-all')
  async markAllRead(@CurrentPmActor() actor: PmActorContext) {
    return this.markAllReadUseCase.execute(actor.ownerPmId, actor.isEmployee ? actor.employeeId : undefined);
  }
}
