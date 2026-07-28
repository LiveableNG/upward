import { Controller, Get, Post, Param, Query, UseGuards, Request, ParseIntPipe, ParseIntPipeOptions, DefaultValuePipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../application/auth/guards/roles.guard';
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { GetSequenceLogsUseCase } from '../../../application/use-cases/whatsapp-sequence/get-sequence-logs.use-case';
import { RetrySequenceUseCase } from '../../../application/use-cases/whatsapp-sequence/retry-sequence.use-case';
import { AdminRole } from '@upward/shared-types'

import { PreviewWhatsappSequenceUseCase } from '../../../application/use-cases/whatsapp-sequence/preview-whatsapp-sequence.use-case';

@Controller('admin/whatsapp-sequences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminWhatsappSequenceController {
  constructor(
    private readonly getSequenceLogsUseCase: GetSequenceLogsUseCase,
    private readonly retrySequenceUseCase: RetrySequenceUseCase,
    private readonly previewUseCase: PreviewWhatsappSequenceUseCase,
  ) {}

  @Get('preview')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async previewTemplate(
    @Query('stage') stage: string,
    @Query('name') name?: string,
  ) {
    return this.previewUseCase.execute({ stage, firstName: name });
  }

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async getSequenceLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('search') search?: string,
  ) {
    const defaultStage = stage || 'WELCOME';
    return this.getSequenceLogsUseCase.execute({ page, limit, status, stage: defaultStage, search });
  }

  @Post(':id/retry')
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  async retrySequence(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const adminId = req.user.uuid;
    await this.retrySequenceUseCase.execute(id, adminId);
    return { success: true, message: 'Sequence retry triggered successfully' };
  }
}
