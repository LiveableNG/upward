import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Param,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import {
  GetUserNotificationsUseCase,
  UpdateAnnouncementStateUseCase,
  MarkNotificationReadUseCase,
} from '../../../application/use-cases/notifications/notification.use-cases'
import { UpdateAnnouncementStateDto } from '../dto/announcements.dto'

interface FastifyRequest {
  user?: {
    id: string
    email: string
    role: string
  }
}

@Controller('user/notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationsController {
  constructor(
    private readonly getUserNotificationsUseCase: GetUserNotificationsUseCase,
    private readonly updateAnnouncementStateUseCase: UpdateAnnouncementStateUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
  ) {}

  @Get()
  async getNotifications(@Req() req: FastifyRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException()
    }
    return { data: await this.getUserNotificationsUseCase.execute(req.user.id) }
  }

  @Patch('announcements/state')
  @HttpCode(HttpStatus.OK)
  async updateAnnouncementState(
    @Req() req: FastifyRequest,
    @Body() dto: UpdateAnnouncementStateDto,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException()
    }
    return {
      data: await this.updateAnnouncementStateUseCase.execute({
        ...dto,
        userId: req.user.id,
      }),
    }
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Req() req: FastifyRequest, @Param('id') id: string) {
    if (!req.user?.id) {
      throw new UnauthorizedException()
    }
    return { data: await this.markNotificationReadUseCase.execute(id) }
  }
}
