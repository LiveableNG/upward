import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'

export interface GetPlatformPaymentProofFileDto {
  proofId: number
  platformId: number
}

@Injectable()
export class GetPlatformPaymentProofFileUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(dto: GetPlatformPaymentProofFileDto) {
    const proof = await this.prisma.upward_payment_proof.findUnique({
      where: { id: dto.proofId },
      include: {
        paymentRequest: { include: { userProperty: { include: { company: true } } } },
        userProperty: { include: { company: true } },
      },
    })

    if (!proof) {
      throw new NotFoundException('Proof of payment not found')
    }

    const platformIdOnProof =
      proof.paymentRequest?.userProperty?.company?.platformId ??
      proof.userProperty?.company?.platformId

    if (platformIdOnProof !== dto.platformId) {
      throw new NotFoundException('Proof of payment not found')
    }

    if (!proof.fileUrl) {
      throw new NotFoundException('This payment proof does not have an attached file')
    }

    const url = await this.s3Service.getDownloadUrl(proof.fileUrl)

    return {
      url,
      fileName: proof.fileName,
      proofId: proof.id,
    }
  }
}
