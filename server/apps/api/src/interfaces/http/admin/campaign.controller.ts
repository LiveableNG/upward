import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { AdminRole } from '@upward/shared-types'

import { GetCampaignsUseCase } from '../../../application/use-cases/campaign/get-campaigns.use-case'
import { GetCampaignByWeekUseCase } from '../../../application/use-cases/campaign/get-campaign-by-week.use-case'
import {
  UpsertCampaignUseCase,
  UpsertCampaignDto,
} from '../../../application/use-cases/campaign/upsert-campaign.use-case'
import { DeleteCampaignUseCase } from '../../../application/use-cases/campaign/delete-campaign.use-case'
import { ToggleCampaignUseCase } from '../../../application/use-cases/campaign/toggle-campaign.use-case'
import { PreviewCampaignAudienceUseCase } from '../../../application/use-cases/campaign/preview-campaign-audience.use-case'
import { RunTuesdayCampaignUseCase } from '../../../application/use-cases/campaign/run-tuesday-campaign.use-case'

interface AuthenticatedRequest {
  user: {
    id: string
    email: string
    role: AdminRole
  }
}

@Controller('admin/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignController {
  constructor(
    private readonly getCampaignsUseCase: GetCampaignsUseCase,
    private readonly getByWeekUseCase: GetCampaignByWeekUseCase,
    private readonly upsertUseCase: UpsertCampaignUseCase,
    private readonly deleteUseCase: DeleteCampaignUseCase,
    private readonly toggleUseCase: ToggleCampaignUseCase,
    private readonly previewUseCase: PreviewCampaignAudienceUseCase,
    private readonly runTuesdayUseCase: RunTuesdayCampaignUseCase,
  ) {}

  @Get()
  async getCampaigns() {
    return { data: await this.getCampaignsUseCase.execute() }
  }

  @Get('preview')
  async previewAudience() {
    return { data: await this.previewUseCase.execute() }
  }

  @Get(':weekNumber')
  async getCampaign(@Param('weekNumber', ParseIntPipe) weekNumber: number) {
    return { data: await this.getByWeekUseCase.execute(weekNumber) }
  }

  @Post()
  async upsertCampaign(@Body() body: UpsertCampaignDto) {
    return { data: await this.upsertUseCase.execute(body) }
  }

  @Patch(':weekNumber/toggle')
  async toggleCampaign(
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
    @Body('isActive') isActive: boolean,
  ) {
    return { data: await this.toggleUseCase.execute(weekNumber, isActive) }
  }

  @Delete(':weekNumber')
  async deleteCampaign(@Param('weekNumber', ParseIntPipe) weekNumber: number) {
    return { data: await this.deleteUseCase.execute(weekNumber) }
  }

  @Post('trigger')
  async triggerCampaign(@Req() req: AuthenticatedRequest) {
    return { data: await this.runTuesdayUseCase.execute(req.user.id) }
  }
}
