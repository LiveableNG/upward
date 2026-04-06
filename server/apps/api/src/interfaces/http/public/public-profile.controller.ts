import { Controller, Get, Param, NotFoundException } from '@nestjs/common'
import { GetPublicProfileUseCase } from '@application/use-cases/tenant/get-public-profile.use-case'

@Controller('public/profile')
export class PublicProfileController {
  constructor(private readonly getPublicProfile: GetPublicProfileUseCase) {}

  @Get(':slug')
  async getProfile(@Param('slug') slug: string) {
    const profile = await this.getPublicProfile.execute(slug)

    if (!profile) {
      throw new NotFoundException(`Profile with slug "${slug}" not found`)
    }

    return profile
  }
}
