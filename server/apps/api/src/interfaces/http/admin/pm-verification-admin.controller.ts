import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { GetPmVerificationsUseCase } from '../../../application/use-cases/admin/pm-verification/get-pm-verifications.use-case'
import { ApprovePmVerificationUseCase } from '../../../application/use-cases/admin/pm-verification/approve-pm-verification.use-case'
import { RejectPmVerificationUseCase } from '../../../application/use-cases/admin/pm-verification/reject-pm-verification.use-case'

@Controller('admin/pm-verifications')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class PmVerificationAdminController {
  constructor(
    private readonly getPmVerificationsUseCase: GetPmVerificationsUseCase,
    private readonly approvePmVerificationUseCase: ApprovePmVerificationUseCase,
    private readonly rejectPmVerificationUseCase: RejectPmVerificationUseCase,
  ) {}

  @Get()
  async getVerifications(
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.getPmVerificationsUseCase.execute({ status, page, limit })
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveVerification(@Param('id') id: string) {
    return this.approvePmVerificationUseCase.execute(parseInt(id, 10))
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectVerification(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.rejectPmVerificationUseCase.execute(parseInt(id, 10), body.reason)
  }
}
