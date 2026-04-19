import { Controller, Get, Param, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GetCredibilityRequestDetailsUseCase } from '../../../application/use-cases/external/get-credibility-request-details.use-case';
import { FulfillCredibilityRequestUseCase } from '../../../application/use-cases/external/fulfill-credibility-request.use-case';
import { RenewPropertyUseCase } from '../../../application/use-cases/external/renew-property.use-case';

@Controller('public/credibility')
export class PublicCredibilityController {
  constructor(
    private readonly getDetailsUseCase: GetCredibilityRequestDetailsUseCase,
    private readonly fulfillUseCase: FulfillCredibilityRequestUseCase,
    private readonly renewPropertyUseCase: RenewPropertyUseCase
  ) {}

  @Get('request/:uuid')
  @HttpCode(HttpStatus.OK)
  async getDetails(@Param('uuid') uuid: string) {
    return this.getDetailsUseCase.execute(uuid);
  }

  @Post('request/:uuid/fulfill')
  @HttpCode(HttpStatus.OK)
  async fulfillRequest(
    @Param('uuid') uuid: string,
    @Body() body: { records: any[] }
  ) {
    return this.fulfillUseCase.execute(uuid, body);
  }

  @Post('property/:uuid/renew')
  @HttpCode(HttpStatus.OK)
  async renewProperty(@Param('uuid') uuid: string) {
    return this.renewPropertyUseCase.execute(uuid);
  }
}
