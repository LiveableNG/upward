import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PlatformRatesSnapshot {
  savingsAnnualRatePct: number;
  insurancePremiumPct: number;
  savingsAnnualRateDecimal: number;
  savingsDailyRate: number;
  insurancePremiumRateDecimal: number;
  updatedAt: string | null;
}

const DEFAULT_SAVINGS_ANNUAL_RATE_PCT = 14.5;
const DEFAULT_INSURANCE_PREMIUM_PCT = 2.0;
const GLOBAL_KEY = 'GLOBAL';
const LEGACY_SAVINGS_CONFIG_KEY = 'GLOBAL_DAILY_INTEREST';

@Injectable()
export class PlatformRatesService implements OnModuleInit {
  private cachedSavingsAnnualRatePct = DEFAULT_SAVINGS_ANNUAL_RATE_PCT;
  private cachedInsurancePremiumPct = DEFAULT_INSURANCE_PREMIUM_PCT;
  private cachedUpdatedAt: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    try {
      const record = await this.prisma.upward_platform_rate_config.findUnique({
        where: { key: GLOBAL_KEY },
      });
      if (record) {
        this.cachedSavingsAnnualRatePct = record.savingsAnnualRatePct;
        this.cachedInsurancePremiumPct = record.insurancePremiumPct;
        this.cachedUpdatedAt = record.updatedAt;
      } else {
        const created = await this.prisma.upward_platform_rate_config.create({
          data: {
            key: GLOBAL_KEY,
            savingsAnnualRatePct: DEFAULT_SAVINGS_ANNUAL_RATE_PCT,
            insurancePremiumPct: DEFAULT_INSURANCE_PREMIUM_PCT,
          },
        });
        this.cachedSavingsAnnualRatePct = created.savingsAnnualRatePct;
        this.cachedInsurancePremiumPct = created.insurancePremiumPct;
        this.cachedUpdatedAt = created.updatedAt;
      }
    } catch {
      this.cachedSavingsAnnualRatePct = DEFAULT_SAVINGS_ANNUAL_RATE_PCT;
      this.cachedInsurancePremiumPct = DEFAULT_INSURANCE_PREMIUM_PCT;
    }
  }

  getCachedRates(): PlatformRatesSnapshot {
    const savingsAnnualRateDecimal = this.cachedSavingsAnnualRatePct / 100;
    const insurancePremiumRateDecimal = this.cachedInsurancePremiumPct / 100;
    return {
      savingsAnnualRatePct: this.cachedSavingsAnnualRatePct,
      insurancePremiumPct: this.cachedInsurancePremiumPct,
      savingsAnnualRateDecimal,
      savingsDailyRate: savingsAnnualRateDecimal / 365,
      insurancePremiumRateDecimal,
      updatedAt: this.cachedUpdatedAt ? this.cachedUpdatedAt.toISOString() : null,
    };
  }

  async getRates(): Promise<PlatformRatesSnapshot> {
    try {
      const record = await this.prisma.upward_platform_rate_config.findUnique({
        where: { key: GLOBAL_KEY },
      });
      if (record) {
        this.cachedSavingsAnnualRatePct = record.savingsAnnualRatePct;
        this.cachedInsurancePremiumPct = record.insurancePremiumPct;
        this.cachedUpdatedAt = record.updatedAt;
      }
    } catch {
      // Fall back to cached defaults
    }
    return this.getCachedRates();
  }

  async updateRates(params: {
    savingsAnnualRatePct?: number;
    insurancePremiumPct?: number;
    updatedByAdminId?: string;
  }): Promise<PlatformRatesSnapshot> {
    const current = await this.getRates();

    const nextSavingsPct =
      params.savingsAnnualRatePct !== undefined
        ? Number(params.savingsAnnualRatePct)
        : current.savingsAnnualRatePct;
    const nextInsurancePct =
      params.insurancePremiumPct !== undefined
        ? Number(params.insurancePremiumPct)
        : current.insurancePremiumPct;

    if (!Number.isFinite(nextSavingsPct) || nextSavingsPct < 0 || nextSavingsPct > 100) {
      throw new BadRequestException('Savings annual rate must be between 0% and 100%');
    }
    if (!Number.isFinite(nextInsurancePct) || nextInsurancePct < 0 || nextInsurancePct > 100) {
      throw new BadRequestException('Insurance premium percentage must be between 0% and 100%');
    }

    const updated = await this.prisma.upward_platform_rate_config.upsert({
      where: { key: GLOBAL_KEY },
      create: {
        key: GLOBAL_KEY,
        savingsAnnualRatePct: nextSavingsPct,
        insurancePremiumPct: nextInsurancePct,
        updatedByAdminId: params.updatedByAdminId || null,
      },
      update: {
        savingsAnnualRatePct: nextSavingsPct,
        insurancePremiumPct: nextInsurancePct,
        updatedByAdminId: params.updatedByAdminId || null,
      },
    });

    // Keep legacy wallet savings config synchronized
    try {
      const dailyRate = nextSavingsPct / 100 / 365;
      await this.prisma.upward_savings_config.upsert({
        where: { key: LEGACY_SAVINGS_CONFIG_KEY },
        create: {
          key: LEGACY_SAVINGS_CONFIG_KEY,
          dailyInterestRate: dailyRate,
          updatedByAdminId: params.updatedByAdminId || null,
        },
        update: {
          dailyInterestRate: dailyRate,
          updatedByAdminId: params.updatedByAdminId || null,
        },
      });
    } catch {
      // Non-blocking sync
    }

    this.cachedSavingsAnnualRatePct = updated.savingsAnnualRatePct;
    this.cachedInsurancePremiumPct = updated.insurancePremiumPct;
    this.cachedUpdatedAt = updated.updatedAt;

    return this.getCachedRates();
  }
}
