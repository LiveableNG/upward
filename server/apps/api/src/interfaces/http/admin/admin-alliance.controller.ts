import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../../application/auth/guards/roles.guard';
import { AuthenticatedRequest } from '../../../application/auth/interfaces/authenticated-request.interface';
import {
  ToggleAllianceEnablementDto,
  CreateAllianceQualificationDto,
  UpdateAllianceQualificationDto,
  AssignPmQualificationDto,
} from '../../../application/alliance/dtos/alliance.dto';
import { TogglePmAllianceEnablementUseCase } from '../../../application/alliance/use-cases/toggle-pm-alliance-enablement.use-case';
import { CreateAllianceQualificationUseCase } from '../../../application/alliance/use-cases/create-alliance-qualification.use-case';
import { ListAllianceQualificationsUseCase } from '../../../application/alliance/use-cases/list-alliance-qualifications.use-case';
import { UpdateAllianceQualificationUseCase } from '../../../application/alliance/use-cases/update-alliance-qualification.use-case';
import { DeactivateAllianceQualificationUseCase } from '../../../application/alliance/use-cases/deactivate-alliance-qualification.use-case';
import { AssignPmQualificationUseCase } from '../../../application/alliance/use-cases/assign-pm-qualification.use-case';
import { RemovePmQualificationUseCase } from '../../../application/alliance/use-cases/remove-pm-qualification.use-case';
import { GetPmAssignedQualificationsUseCase } from '../../../application/alliance/use-cases/get-pm-assigned-qualifications.use-case';
import { GetPmAllianceProfileUseCase } from '../../../application/alliance/use-cases/get-pm-alliance-profile.use-case';

@Controller('admin/alliance')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminAllianceController {
  constructor(
    private readonly toggleEnablementUseCase: TogglePmAllianceEnablementUseCase,
    private readonly createQualificationUseCase: CreateAllianceQualificationUseCase,
    private readonly listQualificationsUseCase: ListAllianceQualificationsUseCase,
    private readonly updateQualificationUseCase: UpdateAllianceQualificationUseCase,
    private readonly deactivateQualificationUseCase: DeactivateAllianceQualificationUseCase,
    private readonly assignQualificationUseCase: AssignPmQualificationUseCase,
    private readonly removeQualificationUseCase: RemovePmQualificationUseCase,
    private readonly getAssignedQualificationsUseCase: GetPmAssignedQualificationsUseCase,
    private readonly getPmProfileUseCase: GetPmAllianceProfileUseCase,
  ) {}

  @Patch('pms/:pmUuid/enablement')
  @HttpCode(HttpStatus.OK)
  async toggleEnablement(
    @Param('pmUuid') pmUuid: string,
    @Body() body: ToggleAllianceEnablementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.toggleEnablementUseCase.execute(pmUuid, body.isEnabled, req.user?.id);
    return { data };
  }

  @Get('pms/:pmUuid')
  async getPmAllianceProfile(@Param('pmUuid') pmUuid: string) {
    const data = await this.getPmProfileUseCase.execute(pmUuid);
    return { data };
  }

  @Get('qualifications')
  async listQualifications(@Query('includeInactive') includeInactive?: string) {
    const data = await this.listQualificationsUseCase.execute({
      includeInactive: includeInactive === 'true',
    });
    return { data };
  }

  @Post('qualifications')
  async createQualification(@Body() body: CreateAllianceQualificationDto) {
    const data = await this.createQualificationUseCase.execute(body);
    return { data };
  }

  @Patch('qualifications/:id')
  async updateQualification(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAllianceQualificationDto,
  ) {
    const data = await this.updateQualificationUseCase.execute(id, body);
    return { data };
  }

  @Patch('qualifications/:id/deactivate')
  async deactivateQualification(@Param('id', ParseIntPipe) id: number) {
    const data = await this.deactivateQualificationUseCase.execute(id);
    return { data };
  }

  @Post('pms/:pmUuid/qualifications')
  async assignQualification(
    @Param('pmUuid') pmUuid: string,
    @Body() body: AssignPmQualificationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.assignQualificationUseCase.execute(
      pmUuid,
      Number(body.qualificationId),
      req.user?.id,
    );
    return { data };
  }

  @Delete('pms/:pmUuid/qualifications/:qualificationId')
  async removeQualification(
    @Param('pmUuid') pmUuid: string,
    @Param('qualificationId', ParseIntPipe) qualificationId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.removeQualificationUseCase.execute(pmUuid, qualificationId, req.user?.id);
    return { data };
  }

  @Get('pms/:pmUuid/qualifications')
  async getPmQualifications(@Param('pmUuid') pmUuid: string) {
    const data = await this.getAssignedQualificationsUseCase.execute(pmUuid);
    return { data };
  }
}
