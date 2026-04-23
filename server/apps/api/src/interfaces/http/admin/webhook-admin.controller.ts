import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { GetWebhookLogsUseCase } from '../../../application/use-cases/admin/get-webhook-logs.use-case'
import { RetryWebhookUseCase } from '../../../application/use-cases/admin/retry-webhook.use-case'

@Controller('admin/webhooks')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPERADMIN)
export class WebhookAdminController {
  constructor(
    private readonly getWebhookLogsUseCase: GetWebhookLogsUseCase,
    private readonly retryWebhookUseCase: RetryWebhookUseCase,
  ) {}

  @Get()
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.getWebhookLogsUseCase.execute({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      status,
    })
  }

  @Post(':id/retry')
  async retry(@Param('id') id: string) {
    await this.retryWebhookUseCase.execute(id)
    return { success: true }
  }
}
