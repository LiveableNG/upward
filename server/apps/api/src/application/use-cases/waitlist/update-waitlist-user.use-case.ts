import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { CreateWaitlistEntryDto } from '@upward/shared-types'

@Injectable()
export class UpdateWaitlistUserUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, data: Partial<CreateWaitlistEntryDto>) {
    if (data.phone && !/^\+?\d{7,15}$/.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
      throw new Error('Phone number must be a valid international phone number');
    }
    return this.prisma.upward_waitlist.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  }
}
