import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { FulfillCredibilityRequestUseCase } from '../../../application/use-cases/external/fulfill-credibility-request.use-case'
import { RejectCredibilityRequestUseCase } from '../../../application/use-cases/external/reject-credibility-request.use-case'
import { FulfillCredibilityRequestDto } from '../../../application/use-cases/external/external-api.dto'

@Controller('credibility')
export class ExternalCredibilityController {
  constructor(
    private readonly fulfillUseCase: FulfillCredibilityRequestUseCase,
    private readonly rejectUseCase: RejectCredibilityRequestUseCase
  ) {}

  @Post('request/:uuid/fulfill')
  @UseGuards(ApiKeyGuard)
  async fulfillRequest(
    @Param('uuid') uuid: string,
    @Body() body: FulfillCredibilityRequestDto
  ) {
    return this.fulfillUseCase.execute(uuid, body);
  }

  @Post('request/:uuid/reject')
  @UseGuards(ApiKeyGuard)
  async rejectRequest(@Param('uuid') uuid: string) {
    return this.rejectUseCase.execute(uuid);
  }
}
