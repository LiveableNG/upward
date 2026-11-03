import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { AbExperimentService } from '../../../shared/infrastructure/experiment/ab-experiment.service'

class EvaluateExperimentDto {
  experimentKey!: string
  userUuid?: string
  email?: string
}

@Controller('public/experiments')
export class PublicExperimentController {
  constructor(private readonly abExperimentService: AbExperimentService) {}

  @Get('config')
  async getConfig() {
    const data = this.abExperimentService.getPublicConfigs()
    return {
      success: true,
      data,
    }
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluate(@Body() body: EvaluateExperimentDto) {
    const result = this.abExperimentService.evaluate(
      body.experimentKey,
      body.userUuid,
      body.email,
    )
    return {
      success: true,
      data: result,
    }
  }
}
