import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { WAITLIST_REPOSITORY, WaitlistRepository } from '@domains/waitlist/waitlist.repository'
import { AdminLogService } from '@shared/infrastructure/admin-log/admin-log.service'

@Injectable()
export class DeleteWaitlistEntryUseCase {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitlistRepo: WaitlistRepository,
    // AdminLogService should ideally be behind an interface, but we'll use it directly for now
    // as per phase constraints.
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(id: string, adminId: string, ip?: string, ua?: string): Promise<void> {
    const entry = await this.waitlistRepo.findById(id)
    if (!entry) {
      throw new NotFoundException('Waitlist user not found')
    }

    await this.waitlistRepo.delete(id)

    await this.adminLogService.logAction(
      adminId,
      'DELETE_WAITLIST_USER',
      `Deleted user: ${entry.email}`,
      ip,
      ua,
    )
  }
}
