import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetLandlordPayoutsUseCase {
  constructor(private readonly prisma: PrismaService) { }

  async execute(subaccountCode: string) {
    return this.prisma.upward_settlement_batch.findMany({
      where: { landlordId: subaccountCode },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })
  }
}
