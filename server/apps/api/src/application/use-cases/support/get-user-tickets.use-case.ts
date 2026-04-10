import { Injectable, Inject } from '@nestjs/common'
import { SUPPORT_TICKET_REPOSITORY, ISupportTicketRepository } from '../../../domains/support/support.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class GetUserTicketsUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly supportRepo: ISupportTicketRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(userUuid: string) {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new Error('User not found')
    
    return this.supportRepo.findByUserId(user.id!)
  }
}
