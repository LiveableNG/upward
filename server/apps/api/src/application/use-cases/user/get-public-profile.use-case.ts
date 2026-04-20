import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { CalculateRentScoreUseCase } from './calculate-rent-score.use-case'

@Injectable()
export class GetPublicProfileUseCase {
  private readonly logger = new Logger(GetPublicProfileUseCase.name)

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly calculateRentScore: CalculateRentScoreUseCase,
  ) {}

  async execute(slug: string) {
    this.logger.log(`Fetching public score profile for slug: ${slug}`)

    let user = await this.userRepository.findBySlug(slug)

    // Fallback: If not found by slug, try finding by UUID (in case the link used the ID)
    if (!user) {
      user = await this.userRepository.findByUuid(slug)
    }

    if (!user) {
      throw new NotFoundException(`Profile with identifier "${slug}" not found`)
    }

    // Reuse the existing scoring logic but with the user found
    return this.calculateRentScore.execute(user.uuid)
  }
}
