import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentConfigurationService implements OnModuleInit {
  private cachedGlobalFee: number | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache() {
    try {
      const globalOverride = await this.prisma.upward_fee_override.findUnique({
        where: { targetType_targetId: { targetType: 'SYSTEM', targetId: 'GLOBAL' } },
      });
      this.cachedGlobalFee = globalOverride ? globalOverride.fee : null;
    } catch (e) {
      this.cachedGlobalFee = null;
    }
  }

  setCachedGlobalFee(fee: number | null) {
    this.cachedGlobalFee = fee;
  }

  getProcessingFee(): number {
    if (this.cachedGlobalFee !== null) {
      return this.cachedGlobalFee;
    }
    return this.configService.get<number>('PAYMENT_PROCESSING_FEE') || 2000;
  }

  calculateRatesForRent(rentAmount: number): { transactionFee: number; benefitsFee: number } {
    if (rentAmount < 1000000) {
      return { transactionFee: 500, benefitsFee: 1000 };
    } else if (rentAmount >= 1000000 && rentAmount <= 2000000) {
      return { transactionFee: 1000, benefitsFee: 1000 };
    } else if (rentAmount > 2000000 && rentAmount <= 4000000) {
      return { transactionFee: 1000, benefitsFee: 1500 };
    } else {
      return { transactionFee: 1000, benefitsFee: 2000 };
    }
  }

  async hasPaidBenefitsInCurrentTenure(userId: number, propertyId: number): Promise<boolean> {
    try {
      const payments = await this.prisma.upward_transaction.findMany({
        where: {
          userId,
          status: 'SUCCESS',
          paymentRequest: {
            userPropertyId: propertyId,
          },
        },
      });

      for (const p of payments) {
        if (p.lineItems) {
          const items = typeof p.lineItems === 'string' ? JSON.parse(p.lineItems) : p.lineItems;
          if (Array.isArray(items)) {
            const hasBenefits = items.some(
              (item: any) =>
                item.name === 'Upward Benefits' &&
                (item.amount > 0 || item.amountPaid > 0 || item.allocated > 0)
            );
            if (hasBenefits) return true;
          }
        }
      }
    } catch (e) {
      // Return false if check fails
    }
    return false;
  }

  async hasPaidBenefitsForRequest(paymentRequestId: number): Promise<boolean> {
    try {
      const payments = await this.prisma.upward_transaction.findMany({
        where: {
          paymentRequestId,
          status: 'SUCCESS',
        },
      });

      for (const p of payments) {
        if (p.lineItems) {
          const items = typeof p.lineItems === 'string' ? JSON.parse(p.lineItems) : p.lineItems;
          if (Array.isArray(items)) {
            const hasBenefits = items.some(
              (item: any) =>
                item.name === 'Upward Benefits' &&
                (item.amount > 0 || item.amountPaid > 0 || item.allocated > 0)
            );
            if (hasBenefits) return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

  async getDynamicProcessingRates(
    userId: number,
    propertyId?: number | null,
    paymentRequestId?: number | null
  ): Promise<{ transactionFee: number; benefitsFee: number; rentValue: number; benefitsPaid?: boolean; benefitsPaidForRequest?: boolean }> {
    let rentValue = 0;
    try {
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
        });
        if (property && property.rentAmount) {
          rentValue = property.rentAmount;
        }
      }
    } catch (err) {}

    const defaultRates = this.calculateRatesForRent(rentValue);

    try {
      // 1. Resolve User
      const user = await this.prisma.upward_user.findUnique({
        where: { id: userId },
      });
      if (!user) return { ...defaultRates, rentValue };

      // Check User Override
      const userOverride = await this.prisma.upward_fee_override.findUnique({
        where: { targetType_targetId: { targetType: 'USER', targetId: user.uuid } },
      });
      if (userOverride) {
        return { transactionFee: userOverride.fee, benefitsFee: 0, rentValue };
      }

      // Check if benefits are already paid for this tenure
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
            if (pmOverride) return { transactionFee: pmOverride.fee, benefitsFee: 0, rentValue };
          }

          // Check Company Override
          if (property.company) {
            const companyOverride = await this.prisma.upward_fee_override.findUnique({
              where: { targetType_targetId: { targetType: 'COMPANY', targetId: property.company.uuid } },
            });
            if (companyOverride) return { transactionFee: companyOverride.fee, benefitsFee: 0, rentValue };

            // Check Platform Override
            if (property.company.platform) {
              const platformOverride = await this.prisma.upward_fee_override.findUnique({
                where: { targetType_targetId: { targetType: 'PLATFORM', targetId: property.company.platform.uuid } },
              });
              if (platformOverride) return { transactionFee: platformOverride.fee, benefitsFee: 0, rentValue };
            }
          }

          const benefitsPaidForRequest = paymentRequestId ? await this.hasPaidBenefitsForRequest(paymentRequestId) : false;
          const benefitsPaid = benefitsPaidForRequest;
          return { ...defaultRates, rentValue, benefitsPaid, benefitsPaidForRequest };
        }
      }
    } catch (error) {}

    return { ...defaultRates, rentValue, benefitsPaid: false, benefitsPaidForRequest: false };
  }

  async getDynamicProcessingFee(userId: number, propertyId?: number | null, paymentRequestId?: number | null): Promise<number> {
    const rates = await this.getDynamicProcessingRates(userId, propertyId, paymentRequestId);
    const activeBenefitsFee = (rates as any).benefitsPaid ? 0 : rates.benefitsFee;
    return rates.transactionFee + activeBenefitsFee;
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
