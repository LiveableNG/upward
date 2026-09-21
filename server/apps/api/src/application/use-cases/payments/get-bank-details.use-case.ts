import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetBankDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userId },
    })

    if (!user) return null

    return this.prisma.upward_user_bank_details.findUnique({
      where: { userId: user.id },
    })
  }
}
