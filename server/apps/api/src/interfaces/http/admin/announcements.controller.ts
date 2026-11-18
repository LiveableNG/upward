import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  BadRequestException,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { CreateAnnouncementUseCase } from '../../../application/use-cases/notifications/create-announcement.use-case'
import { DeactivateAnnouncementsUseCase } from '../../../application/use-cases/notifications/deactivate-announcements.use-case'
import {
  GetAdminAnnouncementsUseCase,
  SendNotificationUseCase,
} from '../../../application/use-cases/notifications/notification.use-cases'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { CreateAnnouncementDto } from '../dto/announcements.dto'
import { CreateNotificationDto } from '../dto/notifications.dto'

@Controller('admin/notifications')
@UseGuards(AdminJwtAuthGuard)
export class AdminAnnouncementsController {
  constructor(
    private readonly createAnnouncementUseCase: CreateAnnouncementUseCase,
    private readonly deactivateAnnouncementsUseCase: DeactivateAnnouncementsUseCase,
    private readonly getAdminAnnouncementsUseCase: GetAdminAnnouncementsUseCase,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
    private readonly notificationService: NotificationService,
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

  @Delete('announcements')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateAnnouncements() {
    await this.deactivateAnnouncementsUseCase.execute()
  }

  @Post('direct')
  @HttpCode(HttpStatus.CREATED)
  async sendDirectNotification(@Body() dto: CreateNotificationDto) {
    return { data: await this.sendNotificationUseCase.execute(dto) }
  }

  @Post('push-broadcast')
  @HttpCode(HttpStatus.OK)
  async broadcastPush(@Body() dto: { title: string; message: string; url?: string }) {
    if (!dto.title || !dto.message) {
      throw new BadRequestException('Title and message are required')
    }
    const result = await this.notificationService.broadcastPush({
      title: dto.title.trim(),
      message: dto.message.trim(),
      url: dto.url?.trim(),
      type: 'SYSTEM',
    })

    if (result.totalRecipients === 0) {
      return {
        success: true,
        message: 'No active mobile devices registered yet to receive notifications.',
        ...result,
      }
    }

    return {
      success: true,
      message: `Push notification broadcasted to ${result.sent} device(s)${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
      ...result,
    }
  }
}
