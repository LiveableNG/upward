import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPayoutBreakdownUseCase {
  constructor(private readonly prisma: PrismaService) { }

  async execute(batchUuid: string) {
    return this.prisma.upward_settlement_batch.findUnique({
      where: { uuid: batchUuid },
      include: {
        transactions: {
          include: {
            paymentRequest: {
              include: {
                userProperty: {
                  include: {
                    location: true
                  }
                }
              }
            }
          }
        }
      }
    })
  }
}
