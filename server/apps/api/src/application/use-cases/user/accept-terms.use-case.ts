import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class AcceptTermsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(userIdentifier: string | number, version: string = '2026-08-24') {
    let user = null
    if (typeof userIdentifier === 'number') {
      user = await this.userRepository.findById(userIdentifier)
    } else if (/^\d+$/.test(userIdentifier)) {
      user = await this.userRepository.findById(Number(userIdentifier))
    } else {
      user = await this.userRepository.findByUuid(userIdentifier)
    }

    if (!user || !user.id) {
      throw new NotFoundException('User not found')
    }

    const updatedUser = await this.userRepository.update(user.id, {
      termsAcceptedAt: new Date(),
      termsVersion: version,
    })

    return {
      success: true,
      termsAcceptedAt: updatedUser.termsAcceptedAt,
      termsVersion: updatedUser.termsVersion,
    }
  }
}
