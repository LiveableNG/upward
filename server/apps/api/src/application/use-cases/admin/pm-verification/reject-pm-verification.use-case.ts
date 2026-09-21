import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class RejectPmVerificationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(verificationId: number, reason: string) {
    const verification = await this.prisma.upward_pm_verification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    return this.prisma.upward_pm_verification.update({
      where: { id: verificationId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }
}
