import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { CreateAnnouncementUseCase } from '../../../application/use-cases/notifications/create-announcement.use-case'
import {
  GetAdminAnnouncementsUseCase,
  SendNotificationUseCase,
} from '../../../application/use-cases/notifications/notification.use-cases'
import { CreateAnnouncementDto } from '../dto/announcements.dto'
import { CreateNotificationDto } from '../dto/notifications.dto'

@Controller('admin/notifications')
@UseGuards(AdminJwtAuthGuard)
export class AdminAnnouncementsController {
  constructor(
    private readonly createAnnouncementUseCase: CreateAnnouncementUseCase,
    private readonly getAdminAnnouncementsUseCase: GetAdminAnnouncementsUseCase,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  @Post('announcements')
  @HttpCode(HttpStatus.CREATED)
  async createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return {
      data: await this.createAnnouncementUseCase.execute({
        ...dto,
        iconType: dto.iconType ?? 'sparkles',
      }),
    }
  }

  @Get('announcements')
  async getAnnouncements() {
    return { data: await this.getAdminAnnouncementsUseCase.execute() }
  }

  @Post('direct')
  @HttpCode(HttpStatus.CREATED)
  async sendDirectNotification(@Body() dto: CreateNotificationDto) {
    return { data: await this.sendNotificationUseCase.execute(dto) }
  }
}
