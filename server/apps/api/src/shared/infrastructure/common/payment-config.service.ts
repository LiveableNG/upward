import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentConfigurationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getProcessingFee(): number {
    return this.configService.get<number>('PAYMENT_PROCESSING_FEE') || 2000;
  }

  async getDynamicProcessingFee(userId: number, propertyId?: number | null): Promise<number> {
    const defaultFee = this.getProcessingFee();

    try {
      // 1. Resolve User
      const user = await this.prisma.upward_user.findUnique({
        where: { id: userId },
      });
      if (!user) return defaultFee;

      // Check User Override
      const userOverride = await this.prisma.upward_fee_override.findUnique({
        where: { targetType_targetId: { targetType: 'USER', targetId: user.uuid } },
      });
      if (userOverride) return userOverride.fee;

      // 2. Resolve Active Property
      let activePropertyId = propertyId;
      if (!activePropertyId) {
        const activeProp = await this.prisma.upward_user_property.findFirst({
          where: { userId: userId, isPastTenancy: false },
          orderBy: { createdAt: 'desc' },
        });
        activePropertyId = activeProp?.id;
      }

      if (activePropertyId) {
        const property = await this.prisma.upward_user_property.findUnique({
          where: { id: activePropertyId },
          include: {
            pm: true,
            company: {
              include: { platform: true },
            },
          },
        });

        if (property) {
          // Check PM Override
          if (property.pm) {
            const pmOverride = await this.prisma.upward_fee_override.findUnique({
              where: { targetType_targetId: { targetType: 'PM', targetId: property.pm.uuid } },
            });
            if (pmOverride) return pmOverride.fee;
          }

          // Check Company Override
          if (property.company) {
            const companyOverride = await this.prisma.upward_fee_override.findUnique({
              where: { targetType_targetId: { targetType: 'COMPANY', targetId: property.company.uuid } },
            });
            if (companyOverride) return companyOverride.fee;

            // Check Platform Override
            if (property.company.platform) {
              const platformOverride = await this.prisma.upward_fee_override.findUnique({
                where: { targetType_targetId: { targetType: 'PLATFORM', targetId: property.company.platform.uuid } },
              });
              if (platformOverride) return platformOverride.fee;
            }
          }
        }
      }
    } catch (error) {
    }

    return defaultFee;
  }

  getGatewayFee(): number {
    return this.configService.get<number>('PAYMENT_GATEWAY_FEE') || 300;
  }

  getNetRevenuePerTransaction(): number {
    return this.getProcessingFee() - this.getGatewayFee();
  }

  getMinPaymentAmount(): number {
    return this.configService.get<number>('MIN_PAYMENT_AMOUNT') || 1000;
  }
}
