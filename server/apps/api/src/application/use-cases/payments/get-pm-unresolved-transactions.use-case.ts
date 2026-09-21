import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetPmUnresolvedTransactionsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) { }

  async execute(pmId: number) {
    const properties = await this.prisma.upward_user_property.findMany({
      where: {
        OR: [
          { pmId },
          { pmUnit: { property: { pmId } } }
        ]
      },
      select: { id: true }
    });

    const propertyIds = properties.map(p => p.id);

    const txs = await this.prisma.upward_transaction.findMany({
      where: {
        settlementStatus: 'PENDING_REFUND',
        status: 'SUCCESS',
        paymentRequest: {
          userPropertyId: { in: propertyIds }
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            bankDetails: true
          }
        },
        paymentRequest: {
          include: {
            userProperty: {
              include: {
                location: true,
                pmUnit: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return txs.map(tx => {
      if (tx.user) {
        return {
          ...tx,
          user: {
            ...tx.user,
            firstName: tx.user.firstName ? this.encryption.decrypt(tx.user.firstName) : '',
            lastName: tx.user.lastName ? this.encryption.decrypt(tx.user.lastName) : '',
            email: tx.user.email ? this.encryption.decrypt(tx.user.email) : ''
          }
        };
      }
      return tx;
    });
  }
}
