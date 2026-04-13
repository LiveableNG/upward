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

    const user = await this.userRepository.findBySlug(slug)

    if (!user) {
      throw new NotFoundException(`Profile with slug "${slug}" not found`)
    }

    // Reuse the existing scoring logic but with the user found by slug
    return this.calculateRentScore.execute(user.uuid)
  }
}
