import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SavingsMode = 'COMING_SOON' | 'OPT_IN_ONLY' | 'LIVE';

export interface PlatformRatesSnapshot {
  savingsEnabled: boolean;
  savingsMode: SavingsMode;
  savingsAnnualRatePct: number;
  rentProtecRatePct: number;
  insurancePremiumPct: number;
  rentProtecMinMonths: number;
  maxSavingsMonths: number;
  savingsAnnualRateDecimal: number;
  rentProtecRateDecimal: number;
  savingsDailyRate: number;
  rentProtecDailyRate: number;
  insurancePremiumRateDecimal: number;
  partnerName: string;
  partnerShortName: string;
  fundName: string;
  fundCode: string;
  updatedAt: string | null;
}

const DEFAULT_SAVINGS_ENABLED = true;
const DEFAULT_SAVINGS_MODE: SavingsMode = 'LIVE';
const DEFAULT_SAVINGS_ANNUAL_RATE_PCT = 16.0;
const DEFAULT_RENT_PROTEC_RATE_PCT = 10.0;
const DEFAULT_INSURANCE_PREMIUM_PCT = 2.0;
const DEFAULT_RENT_PROTEC_MIN_MONTHS = 6;
const DEFAULT_MAX_SAVINGS_MONTHS = 11;
const DEFAULT_PARTNER_NAME =
  process.env.INVESTMENT_PARTNER_NAME || 'Asset & Resource Management Holding Company (ARM)';
const DEFAULT_PARTNER_SHORT_NAME =
  process.env.INVESTMENT_PARTNER_SHORT_NAME || 'ARM';
const DEFAULT_FUND_NAME =
  process.env.INVESTMENT_FUND_NAME || 'ARM Money Market Fund';
const DEFAULT_FUND_CODE =
  process.env.INVESTMENT_FUND_CODE || 'ARMMMF';
const GLOBAL_KEY = 'GLOBAL';
const LEGACY_SAVINGS_CONFIG_KEY = 'GLOBAL_DAILY_INTEREST';

@Injectable()
export class PlatformRatesService implements OnModuleInit {
  private cachedSavingsEnabled = DEFAULT_SAVINGS_ENABLED;
  private cachedSavingsMode: SavingsMode = DEFAULT_SAVINGS_MODE;
  private cachedSavingsAnnualRatePct = DEFAULT_SAVINGS_ANNUAL_RATE_PCT;
  private cachedRentProtecRatePct = DEFAULT_RENT_PROTEC_RATE_PCT;
  private cachedInsurancePremiumPct = DEFAULT_INSURANCE_PREMIUM_PCT;
  private cachedRentProtecMinMonths = DEFAULT_RENT_PROTEC_MIN_MONTHS;
  private cachedMaxSavingsMonths = DEFAULT_MAX_SAVINGS_MONTHS;
  private cachedPartnerName = DEFAULT_PARTNER_NAME;
  private cachedPartnerShortName = DEFAULT_PARTNER_SHORT_NAME;
  private cachedUpdatedAt: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private normalizeSavingsMode(mode?: string | null, savingsEnabled?: boolean | null): SavingsMode {
    if (mode === 'COMING_SOON' || mode === 'OPT_IN_ONLY' || mode === 'LIVE') {
      return mode;
    }
    if (savingsEnabled === false) return 'COMING_SOON';
    return DEFAULT_SAVINGS_MODE;
  }

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    try {
      const record = await this.prisma.upward_platform_rate_config.findUnique({
        where: { key: GLOBAL_KEY },
      });
      if (record) {
        this.cachedSavingsMode = this.normalizeSavingsMode(
          (record as any).savingsMode,
          record.savingsEnabled,
        );
        this.cachedSavingsEnabled = this.cachedSavingsMode !== 'COMING_SOON';
        this.cachedSavingsAnnualRatePct = record.savingsAnnualRatePct;
        this.cachedRentProtecRatePct = record.rentProtecRatePct;
        this.cachedInsurancePremiumPct = record.insurancePremiumPct;
        this.cachedRentProtecMinMonths = record.rentProtecMinMonths;
        this.cachedMaxSavingsMonths = record.maxSavingsMonths;
        this.cachedUpdatedAt = record.updatedAt;
      } else {
        const created = await this.prisma.upward_platform_rate_config.create({
          data: {
            key: GLOBAL_KEY,
            savingsEnabled: DEFAULT_SAVINGS_ENABLED,
            savingsMode: DEFAULT_SAVINGS_MODE,
            savingsAnnualRatePct: DEFAULT_SAVINGS_ANNUAL_RATE_PCT,
            rentProtecRatePct: DEFAULT_RENT_PROTEC_RATE_PCT,
            insurancePremiumPct: DEFAULT_INSURANCE_PREMIUM_PCT,
            rentProtecMinMonths: DEFAULT_RENT_PROTEC_MIN_MONTHS,
            maxSavingsMonths: DEFAULT_MAX_SAVINGS_MONTHS,
          },
        });
        this.cachedSavingsMode = this.normalizeSavingsMode(
          (created as any).savingsMode,
          created.savingsEnabled,
        );
        this.cachedSavingsEnabled = this.cachedSavingsMode !== 'COMING_SOON';
        this.cachedSavingsAnnualRatePct = created.savingsAnnualRatePct;
        this.cachedRentProtecRatePct = created.rentProtecRatePct;
        this.cachedInsurancePremiumPct = created.insurancePremiumPct;
        this.cachedRentProtecMinMonths = created.rentProtecMinMonths;
        this.cachedMaxSavingsMonths = created.maxSavingsMonths;
        this.cachedUpdatedAt = created.updatedAt;
      }
    } catch {
      this.cachedSavingsEnabled = DEFAULT_SAVINGS_ENABLED;
      this.cachedSavingsMode = DEFAULT_SAVINGS_MODE;
      this.cachedSavingsAnnualRatePct = DEFAULT_SAVINGS_ANNUAL_RATE_PCT;
      this.cachedRentProtecRatePct = DEFAULT_RENT_PROTEC_RATE_PCT;
      this.cachedInsurancePremiumPct = DEFAULT_INSURANCE_PREMIUM_PCT;
      this.cachedRentProtecMinMonths = DEFAULT_RENT_PROTEC_MIN_MONTHS;
      this.cachedMaxSavingsMonths = DEFAULT_MAX_SAVINGS_MONTHS;
    }
  }

  getCachedRates(): PlatformRatesSnapshot {
    const savingsAnnualRateDecimal = this.cachedSavingsAnnualRatePct / 100;
    const rentProtecRateDecimal = this.cachedRentProtecRatePct / 100;
    const insurancePremiumRateDecimal = this.cachedInsurancePremiumPct / 100;
    return {
      savingsEnabled: this.cachedSavingsEnabled,
      savingsMode: this.cachedSavingsMode,
      savingsAnnualRatePct: this.cachedSavingsAnnualRatePct,
      rentProtecRatePct: this.cachedRentProtecRatePct,
      insurancePremiumPct: this.cachedInsurancePremiumPct,
      rentProtecMinMonths: this.cachedRentProtecMinMonths,
      maxSavingsMonths: this.cachedMaxSavingsMonths,
      savingsAnnualRateDecimal,
      rentProtecRateDecimal,
      savingsDailyRate: savingsAnnualRateDecimal / 365,
      rentProtecDailyRate: rentProtecRateDecimal / 365,
      insurancePremiumRateDecimal,
      partnerName: this.cachedPartnerName,
      partnerShortName: this.cachedPartnerShortName,
      fundName: DEFAULT_FUND_NAME,
      fundCode: DEFAULT_FUND_CODE,
      updatedAt: this.cachedUpdatedAt ? this.cachedUpdatedAt.toISOString() : null,
    };
  }

  async getRates(): Promise<PlatformRatesSnapshot> {
    try {
      const record = await this.prisma.upward_platform_rate_config.findUnique({
        where: { key: GLOBAL_KEY },
      });
      if (record) {
        this.cachedSavingsMode = this.normalizeSavingsMode(
          (record as any).savingsMode,
          record.savingsEnabled,
        );
        this.cachedSavingsEnabled = this.cachedSavingsMode !== 'COMING_SOON';
        this.cachedSavingsAnnualRatePct = record.savingsAnnualRatePct;
        this.cachedRentProtecRatePct = record.rentProtecRatePct;
        this.cachedInsurancePremiumPct = record.insurancePremiumPct;
        this.cachedRentProtecMinMonths = record.rentProtecMinMonths;
        this.cachedMaxSavingsMonths = record.maxSavingsMonths;
        this.cachedUpdatedAt = record.updatedAt;
      }
    } catch {
      // Fall back to cached defaults
    }
    return this.getCachedRates();
  }

  async updateRates(params: {
    savingsEnabled?: boolean;
    savingsMode?: SavingsMode;
    savingsAnnualRatePct?: number;
    rentProtecRatePct?: number;
    insurancePremiumPct?: number;
    rentProtecMinMonths?: number;
    maxSavingsMonths?: number;
    partnerName?: string;
    partnerShortName?: string;
    updatedByAdminId?: string;
  }): Promise<PlatformRatesSnapshot> {
    const current = await this.getRates();

    let nextSavingsMode: SavingsMode = current.savingsMode;
    if (params.savingsMode !== undefined) {
      if (
        params.savingsMode !== 'COMING_SOON' &&
        params.savingsMode !== 'OPT_IN_ONLY' &&
        params.savingsMode !== 'LIVE'
      ) {
        throw new BadRequestException(
          'savingsMode must be COMING_SOON, OPT_IN_ONLY, or LIVE',
        );
      }
      nextSavingsMode = params.savingsMode;
    } else if (params.savingsEnabled !== undefined) {
      nextSavingsMode = params.savingsEnabled ? 'LIVE' : 'COMING_SOON';
    }
    const nextSavingsEnabled = nextSavingsMode !== 'COMING_SOON';
    const nextSavingsPct =
      params.savingsAnnualRatePct !== undefined
        ? Number(params.savingsAnnualRatePct)
        : current.savingsAnnualRatePct;
    const nextRentProtecPct =
      params.rentProtecRatePct !== undefined
        ? Number(params.rentProtecRatePct)
        : current.rentProtecRatePct;
    const nextInsurancePct =
      params.insurancePremiumPct !== undefined
        ? Number(params.insurancePremiumPct)
        : current.insurancePremiumPct;
    const nextMinMonths =
      params.rentProtecMinMonths !== undefined
        ? Math.round(Number(params.rentProtecMinMonths))
        : current.rentProtecMinMonths;
    const nextMaxMonths =
      params.maxSavingsMonths !== undefined
        ? Math.round(Number(params.maxSavingsMonths))
        : current.maxSavingsMonths;

    if (!Number.isFinite(nextSavingsPct) || nextSavingsPct < 0 || nextSavingsPct > 100) {
      throw new BadRequestException('Save & Earn annual rate must be between 0% and 100%');
    }
    if (!Number.isFinite(nextRentProtecPct) || nextRentProtecPct < 0 || nextRentProtecPct > 100) {
      throw new BadRequestException('Rent Protec annual rate must be between 0% and 100%');
    }
    if (!Number.isFinite(nextInsurancePct) || nextInsurancePct < 0 || nextInsurancePct > 100) {
      throw new BadRequestException('Insurance premium percentage must be between 0% and 100%');
    }
    if (!Number.isFinite(nextMinMonths) || nextMinMonths < 1 || nextMinMonths > 12) {
      throw new BadRequestException('Rent Protec minimum advance months must be between 1 and 12');
    }
    if (!Number.isFinite(nextMaxMonths) || nextMaxMonths < 1 || nextMaxMonths > 11) {
      throw new BadRequestException('Max savings horizon must be between 1 and 11 months');
    }

    const updated = await this.prisma.upward_platform_rate_config.upsert({
      where: { key: GLOBAL_KEY },
      create: {
        key: GLOBAL_KEY,
        savingsEnabled: nextSavingsEnabled,
        savingsMode: nextSavingsMode,
        savingsAnnualRatePct: nextSavingsPct,
        rentProtecRatePct: nextRentProtecPct,
        insurancePremiumPct: nextInsurancePct,
        rentProtecMinMonths: nextMinMonths,
        maxSavingsMonths: nextMaxMonths,
        updatedByAdminId: params.updatedByAdminId || null,
      },
      update: {
        savingsEnabled: nextSavingsEnabled,
        savingsMode: nextSavingsMode,
        savingsAnnualRatePct: nextSavingsPct,
        rentProtecRatePct: nextRentProtecPct,
        insurancePremiumPct: nextInsurancePct,
        rentProtecMinMonths: nextMinMonths,
        maxSavingsMonths: nextMaxMonths,
        updatedByAdminId: params.updatedByAdminId || null,
      },
    });

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

    this.cachedSavingsMode = this.normalizeSavingsMode(
      (updated as any).savingsMode,
      updated.savingsEnabled,
    );
    this.cachedSavingsEnabled = this.cachedSavingsMode !== 'COMING_SOON';
    this.cachedSavingsAnnualRatePct = updated.savingsAnnualRatePct;
    this.cachedRentProtecRatePct = updated.rentProtecRatePct;
    this.cachedInsurancePremiumPct = updated.insurancePremiumPct;
    this.cachedRentProtecMinMonths = updated.rentProtecMinMonths;
    this.cachedMaxSavingsMonths = updated.maxSavingsMonths;
    if (params.partnerName !== undefined && params.partnerName.trim()) {
      this.cachedPartnerName = params.partnerName.trim();
    }
    if (params.partnerShortName !== undefined && params.partnerShortName.trim()) {
      this.cachedPartnerShortName = params.partnerShortName.trim();
    }
    this.cachedUpdatedAt = updated.updatedAt;

    return this.getCachedRates();
  }
}
