import { Controller, Patch, Post, Body, Param, UseGuards, Req } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { IdentifyExternalPropertyUseCase } from '../../../application/use-cases/external/identify-property.use-case'
import { IngestExternalRentHistoryUseCase } from '../../../application/use-cases/external/ingest-external-rent-history.use-case'
import { VerifyAndAssignExternalPropertyUseCase } from '../../../application/use-cases/external/verify-and-assign-property.use-case'
import { IdentifyPropertyPayloadDto, IngestExternalRentHistoryDto, VerifyAndAssignPropertyDto } from '../../../application/use-cases/external/external-api.dto'

@Controller('platform/properties')
export class PlatformPropertyController {
  constructor(
    private readonly identifyExternalPropertyUseCase: IdentifyExternalPropertyUseCase,
    private readonly ingestExternalRentHistoryUseCase: IngestExternalRentHistoryUseCase,
    private readonly verifyAndAssignExternalPropertyUseCase: VerifyAndAssignExternalPropertyUseCase,
  ) { }

  @Patch(':uuid/identify')
  @UseGuards(ApiKeyGuard)
  async identify(@Param('uuid') uuid: string, @Body() payload: IdentifyPropertyPayloadDto, @Req() req: any) {
    const platformId = req.platformId
    const result = await this.identifyExternalPropertyUseCase.execute(uuid, platformId, payload)
    return {
      success: true,
      data: result
    }
  }

  @Post(':uuid/rent-history')
  @UseGuards(ApiKeyGuard)
  async ingestRentHistory(
    @Param('uuid') uuid: string,
    @Body() payload: IngestExternalRentHistoryDto,
    @Req() req: any
  ) {
    const platformId = req.platformId
    const result = await this.ingestExternalRentHistoryUseCase.execute(uuid, payload.records, platformId)
    return result
  }

  @Post(':uuid/verify-and-assign')
  @UseGuards(ApiKeyGuard)
  async verifyAndAssign(
    @Param('uuid') uuid: string,
    @Body() payload: VerifyAndAssignPropertyDto,
    @Req() req: any
  ) {
    const platform = { id: req.platformId }
    const result = await this.verifyAndAssignExternalPropertyUseCase.execute(uuid, payload, platform)
    return result
  }
}
