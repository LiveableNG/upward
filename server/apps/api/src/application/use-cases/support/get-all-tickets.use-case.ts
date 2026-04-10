import { Injectable, Inject } from '@nestjs/common'
import { SUPPORT_TICKET_REPOSITORY, ISupportTicketRepository } from '../../../domains/support/support.repository'

@Injectable()
export class GetAllTicketsUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly supportRepo: ISupportTicketRepository,
  ) {}

  async execute() {
    return this.supportRepo.findAll()
  }
}
