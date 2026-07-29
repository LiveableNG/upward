import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { SingleInviteUseCase, InviteRequest } from '../../../application/use-cases/external/single-invite.use-case'
import { AddPropertyUseCase } from '../../../application/use-cases/external/add-property.use-case'
import { Param } from '@nestjs/common'

@Controller('single/invite')
export class ExternalInviteController {
  constructor(
    private readonly singleInviteUseCase: SingleInviteUseCase,
    private readonly addPropertyUseCase: AddPropertyUseCase
  ) { }

  @Post()
  @UseGuards(ApiKeyGuard)
  async generateInvite(@Body() data: InviteRequest, @Req() req: any) {
    const platformId = req.platformId

    const result = await this.singleInviteUseCase.execute(data, platformId)

    return {
      success: true,
      message: 'Created',
      data: result
    }
  }

  @Post(':userUuid/properties')
  @UseGuards(ApiKeyGuard)
  async addProperties(@Param('userUuid') userUuid: string, @Body() data: any, @Req() req: any) {
    const platformId = req.platformId

    const result = await this.addPropertyUseCase.execute({
      ...data,
      userUuid
    }, platformId)

    return {
      success: true,
      message: 'Properties added',
      data: result
    }
  }
}
