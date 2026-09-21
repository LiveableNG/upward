import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

export interface SubmitPmVerificationDto {
  pmId: number
  idType: string
  idNumber: string
  idImage: string
}

@Injectable()
export class SubmitPmVerificationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: SubmitPmVerificationDto) {
    return this.prisma.upward_pm_verification.upsert({
      where: { pmId: dto.pmId },
      create: {
        pmId: dto.pmId,
        idType: dto.idType,
        idNumber: dto.idNumber,
        idImage: dto.idImage,
        status: 'PENDING',
      },
      update: {
        idType: dto.idType,
        idNumber: dto.idNumber,
        idImage: dto.idImage,
        status: 'PENDING',
      },
    })
  }
}
