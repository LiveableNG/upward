import { Controller, Patch, Body, Param, UseGuards, Req } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { IdentifyExternalPropertyUseCase } from '../../../application/use-cases/external/identify-property.use-case'
import { IdentifyPropertyPayloadDto } from '../../../application/use-cases/external/external-api.dto'

@Controller('platform/properties')
export class PlatformPropertyController {
  constructor(
    private readonly identifyExternalPropertyUseCase: IdentifyExternalPropertyUseCase,
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
}
