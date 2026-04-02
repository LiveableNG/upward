import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { CreateWaitlistEntryDto } from '@upward/shared-types'

@Injectable()
export class UpdateWaitlistUserUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, data: Partial<CreateWaitlistEntryDto>) {
    return this.prisma.upward_waitlist.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  }
}
