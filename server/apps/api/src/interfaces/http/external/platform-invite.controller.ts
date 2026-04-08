import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { CreatePlatformUseCase } from '@application/use-cases/platform/create-platform.use-case'

@Controller('platform/get-key')
export class PlatformAdminController {
  constructor(private readonly createPlatformUseCase: CreatePlatformUseCase) {}

  @Post()
  async create(@Body() body: { name: string; email: string; address?: string; webhookUrl?: string }) {
    return this.createPlatformUseCase.execute(body)
  }
}
