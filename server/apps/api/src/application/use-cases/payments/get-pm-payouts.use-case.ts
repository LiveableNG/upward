import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPmPayoutsUseCase {
  constructor(private readonly prisma: PrismaService) { }

  async execute(pmId: number) {
    // 1. Find all subaccounts linked to this PM's properties
    const properties = await this.prisma.upward_user_property.findMany({
      where: { pmId },
      select: { subaccountId: true },
      distinct: ['subaccountId']
    })

    const subaccountIds = properties
      .map(p => p.subaccountId)
      .filter((id): id is number => id !== null)

    if (subaccountIds.length === 0) return []

    const subaccounts = await this.prisma.upward_paystack_subaccount.findMany({
      where: { id: { in: subaccountIds } },
      select: { subaccountCode: true }
    })

    const subaccountCodes = subaccounts.map(s => s.subaccountCode)

    // 2. Fetch all payout batches for these subaccounts
    return this.prisma.upward_settlement_batch.findMany({
      where: { landlordId: { in: subaccountCodes } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })
  }
}
