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
import { CampaignService } from '@application/services/campaign.service'
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@application/auth/guards/roles.guard'
import { AdminRole } from '@upward/shared-types'

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
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  async getCampaigns() {
    return { data: await this.campaignService.getCampaigns() }
  }

  @Get('preview')
  async previewAudience() {
    return { data: await this.campaignService.previewCampaignAudience() }
  }

  @Get(':weekNumber')
  async getCampaign(@Param('weekNumber', ParseIntPipe) weekNumber: number) {
    return { data: await this.campaignService.getCampaignByWeek(weekNumber) }
  }

  @Post()
  async upsertCampaign(
    @Body()
    body: {
      weekNumber: number
      subject: string
      htmlContent: string
      textContent?: string
      label?: string
      isActive?: boolean
    },
  ) {
    return { data: await this.campaignService.upsertCampaign(body) }
  }

  @Patch(':weekNumber/toggle')
  async toggleCampaign(
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
    @Body('isActive') isActive: boolean,
  ) {
    return { data: await this.campaignService.toggleCampaign(weekNumber, isActive) }
  }

  @Delete(':weekNumber')
  async deleteCampaign(@Param('weekNumber', ParseIntPipe) weekNumber: number) {
    return { data: await this.campaignService.deleteCampaign(weekNumber) }
  }

  @Post('trigger')
  async triggerCampaign(@Req() req: AuthenticatedRequest) {
    return { data: await this.campaignService.runTuesdayCampaign(req.user.id) }
  }
}
