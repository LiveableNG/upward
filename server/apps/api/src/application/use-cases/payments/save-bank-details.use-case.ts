import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class SaveBankDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, data: any) {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userId },
    })

    if (!user) throw new Error('User not found')

    return this.prisma.upward_user_bank_details.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankCode: data.bankCode,
        bankName: data.bankName,
      },
      update: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankCode: data.bankCode,
        bankName: data.bankName,
      },
    })
  }
}
