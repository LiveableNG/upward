import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { SingleInviteUseCase, InviteRequest } from '@application/use-cases/external/single-invite.use-case'

@Controller('single/invite')
export class ExternalInviteController {
  constructor(private readonly singleInviteUseCase: SingleInviteUseCase) { }

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
}
