import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetPendingManualPaymentsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService
  ) {}

  async execute(pmUuid?: string) {
    const proofs = await this.prisma.upward_payment_proof.findMany({
      where: {
        status: 'PENDING',
        ...(pmUuid ? {
          OR: [
            { userProperty: { pm: { uuid: pmUuid } } },
            { paymentRequest: { userProperty: { pm: { uuid: pmUuid } } } }
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
    
    return proofs.map(proof => {
      if (proof.userProperty?.user) {
        proof.userProperty.user.firstName = proof.userProperty.user.firstName ? this.encryptionService.decrypt(proof.userProperty.user.firstName) : proof.userProperty.user.firstName
        proof.userProperty.user.lastName = proof.userProperty.user.lastName ? this.encryptionService.decrypt(proof.userProperty.user.lastName) : proof.userProperty.user.lastName
      }
      if (proof.paymentRequest?.userProperty?.user) {
        proof.paymentRequest.userProperty.user.firstName = proof.paymentRequest.userProperty.user.firstName ? this.encryptionService.decrypt(proof.paymentRequest.userProperty.user.firstName) : proof.paymentRequest.userProperty.user.firstName
        proof.paymentRequest.userProperty.user.lastName = proof.paymentRequest.userProperty.user.lastName ? this.encryptionService.decrypt(proof.paymentRequest.userProperty.user.lastName) : proof.paymentRequest.userProperty.user.lastName
      }
      if (proof.paymentRequest?.user) {
        proof.paymentRequest.user.firstName = proof.paymentRequest.user.firstName ? this.encryptionService.decrypt(proof.paymentRequest.user.firstName) : proof.paymentRequest.user.firstName
        proof.paymentRequest.user.lastName = proof.paymentRequest.user.lastName ? this.encryptionService.decrypt(proof.paymentRequest.user.lastName) : proof.paymentRequest.user.lastName
      }
      return proof
    })
  }
}
