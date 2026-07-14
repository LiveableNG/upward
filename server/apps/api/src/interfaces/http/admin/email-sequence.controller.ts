import { Controller, Get, Post, Query, Param, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { GetEmailSequenceLogsUseCase } from '../../../application/use-cases/email-sequence/get-email-sequence-logs.use-case'
import { RetryEmailSequenceUseCase } from '../../../application/use-cases/email-sequence/retry-email-sequence.use-case'

import { PreviewEmailSequenceUseCase } from '../../../application/use-cases/email-sequence/preview-email-sequence.use-case'

@Controller('admin/email-sequences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminEmailSequenceController {
  constructor(
    private readonly getLogsUseCase: GetEmailSequenceLogsUseCase,
    private readonly retryUseCase: RetryEmailSequenceUseCase,
    private readonly previewUseCase: PreviewEmailSequenceUseCase,
  ) {}

  @Get('preview')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async previewTemplate(
    @Query('stage') stage: string,
    @Query('name') name?: string,
  ) {
    return this.previewUseCase.execute({ stage, firstName: name })
  }

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async getLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('email') email?: string,
  ) {
    const defaultStage = stage || 'WELCOME';
    return this.getLogsUseCase.execute({ page, limit, status, stage: defaultStage, email });
  }

  @Post(':id/retry')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async retryLog(@Param('id', ParseIntPipe) id: number) {
    await this.retryUseCase.execute({ logId: id })
    return { success: true }
  }
}
