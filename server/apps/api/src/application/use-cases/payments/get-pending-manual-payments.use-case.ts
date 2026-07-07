import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPendingManualPaymentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId?: number) {
    const proofs = await this.prisma.upward_payment_proof.findMany({
      where: {
        status: 'PENDING',
        ...(pmId ? {
          OR: [
            { userProperty: { pmId } },
            { paymentRequest: { userProperty: { pmId } } }
          ]
        } : {})
      },
      include: {
        userProperty: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            location: true
          }
        },
        paymentRequest: {
          include: {
            userProperty: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                location: true
              }
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    
    return proofs
  }
}
