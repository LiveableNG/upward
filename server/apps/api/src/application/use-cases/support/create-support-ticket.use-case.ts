import { Injectable, Inject } from '@nestjs/common'
import { SUPPORT_TICKET_REPOSITORY, ISupportTicketRepository } from '../../../domains/support/support.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class CreateSupportTicketUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly supportRepo: ISupportTicketRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(userUuid: string, message: string) {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new Error('User not found')

    return this.supportRepo.create({
      userId: user.id!,
      message,
      status: 'OPEN',
    })
  }
}
