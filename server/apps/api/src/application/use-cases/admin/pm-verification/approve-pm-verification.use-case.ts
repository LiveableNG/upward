import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class ApprovePmVerificationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(verificationId: number) {
    const verification = await this.prisma.upward_pm_verification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update verification status
      await tx.upward_pm_verification.update({
        where: { id: verificationId },
        data: { status: 'APPROVED' },
      });

      // Mark PM as verified
      const pm = await tx.upward_property_manager.update({
        where: { id: verification.pmId },
        data: { isVerified: true },
      });

      // Also mark all associated tenant properties (upward_user_property) as verified
      await tx.upward_user_property.updateMany({
        where: { pmId: verification.pmId },
        data: {
          isVerified: true,
          verificationStatus: 'VERIFIED',
        },
      });

      return pm;
    });
  }
}
