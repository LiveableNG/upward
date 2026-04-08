import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { BatchInviteUseCase, InviteRequest, CompanyInfo, ManagerInfo } from '@application/use-cases/external/batch-invite.use-case'

@Controller('external/invites')
export class ExternalInviteController {
  constructor(private readonly batchInviteUseCase: BatchInviteUseCase) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async batchInvite(@Body() data: { company: CompanyInfo; manager?: ManagerInfo; invites: InviteRequest[] | InviteRequest }) {
    // Support both single and batch uploads
    const invites = Array.isArray(data.invites) ? data.invites : [data.invites || (data as any)]
    
    const results = await this.batchInviteUseCase.execute({
        company: data.company,
        manager: data.manager,
        invites: invites
    })
    
    return {
      success: true,
      data: results
    }
  }
}
