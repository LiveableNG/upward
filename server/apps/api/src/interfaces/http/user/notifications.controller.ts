import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
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
  MarkNotificationsByCategoryReadUseCase,
} from '../../../application/use-cases/notifications/notification.use-cases'
import {
  RegisterDeviceTokenUseCase,
  UnregisterDeviceTokenUseCase,
} from '../../../application/use-cases/push/push.use-cases'
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
    private readonly markNotificationsByCategoryReadUseCase: MarkNotificationsByCategoryReadUseCase,
    private readonly registerDeviceTokenUseCase: RegisterDeviceTokenUseCase,
    private readonly unregisterDeviceTokenUseCase: UnregisterDeviceTokenUseCase,
  ) {}

  @Get()
  async getNotifications(@Req() req: FastifyRequest) {
    if (!req.user?.id) throw new UnauthorizedException()
    return { data: await this.getUserNotificationsUseCase.execute(req.user.id) }
  }

  @Patch('announcements/state')
  @HttpCode(HttpStatus.OK)
  async updateAnnouncementState(
    @Req() req: FastifyRequest,
    @Body() dto: UpdateAnnouncementStateDto,
  ) {
    if (!req.user?.id) throw new UnauthorizedException()
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
    if (!req.user?.id) throw new UnauthorizedException()
    return { data: await this.markNotificationReadUseCase.execute(req.user.id, id) }
  }

  @Post('mark-category-read')
  @HttpCode(HttpStatus.OK)
  async markCategoryRead(
    @Req() req: FastifyRequest,
    @Body() body: { category: string },
  ) {
    if (!req.user?.id) throw new UnauthorizedException()
    await this.markNotificationsByCategoryReadUseCase.execute(req.user.id, body.category)
    return { success: true }
  }

  @Post('device-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerToken(
    @Req() req: FastifyRequest,
    @Body() body: { token: string; platform: string },
  ) {
    if (!req.user?.id) throw new UnauthorizedException()
    await this.registerDeviceTokenUseCase.execute(req.user.id, body.token, body.platform)
  }

  @Delete('device-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregisterToken(
    @Req() req: FastifyRequest,
    @Body() body: { token: string },
  ) {
    if (!req.user?.id) throw new UnauthorizedException()
    await this.unregisterDeviceTokenUseCase.execute(req.user.id, body.token)
  }
}

