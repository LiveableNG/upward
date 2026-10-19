import { Controller, Get, Query } from '@nestjs/common'
import { CheckAppVersionUseCase } from '../../../application/use-cases/system/check-app-version.use-case'

@Controller('public/app')
export class PublicAppVersionController {
  constructor(private readonly checkAppVersionUseCase: CheckAppVersionUseCase) {}

  @Get('version-policy')
  async getVersionPolicy(
    @Query('platform') platform: string = 'android',
    @Query('version') version: string = '1.0.0',
    @Query('build') build?: string,
    @Query('app') app: string = 'upward-pay',
  ) {
    const result = await this.checkAppVersionUseCase.execute({
      platform,
      version,
      build: build ? parseInt(build, 10) : 1,
      app,
    })

    return {
      success: true,
      data: result,
    }
  }
}
