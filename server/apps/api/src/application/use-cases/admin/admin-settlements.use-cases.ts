import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { IsNotEmpty, IsOptional, IsNumber, IsString } from 'class-validator';

export class ResolveFlaggedSettlementDto {
  @IsOptional()
  @IsNumber()
  transactionId?: number;

  @IsOptional()
  @IsNumber()
  paymentRequestId?: number;

  @IsOptional()
  @IsNumber()
  manualAccountId?: number;

  @IsNotEmpty()
  @IsString()
  action!: 'BIND_MANUAL_ACCOUNT' | 'MARK_MANUALLY_SETTLED';

  @IsOptional()
  @IsString()
  note?: string;
}

@Injectable()
export class GetSettlementStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const [
      settledAgg,
      verifiedAgg,
      settledCount,
      totalBatches,
      lastBatch,
      verifiedTxs,
      titanDvaCount,
      wemaDvaCount,
      totalDvaCount,
    ] = await Promise.all([
      this.prisma.upward_transaction.aggregate({
        _sum: { amount: true },
        where: { settlementStatus: 'SETTLED', status: 'SUCCESS' },
      }),
      this.prisma.upward_transaction.aggregate({
        _sum: { amount: true },
        where: { settlementStatus: 'VERIFIED', status: 'SUCCESS', isManual: false },
      }),
      this.prisma.upward_transaction.count({
        where: { settlementStatus: 'SETTLED', status: 'SUCCESS' },
      }),
      this.prisma.upward_settlement_batch.count(),
      this.prisma.upward_settlement_batch.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upward_transaction.findMany({
        where: { settlementStatus: 'VERIFIED', status: 'SUCCESS', isManual: false },
        include: {
          paymentRequest: {
            include: {
              manualAccount: true,
              subaccount: true,
            },
          },
        },
      }),
      this.prisma.upward_dedicated_virtual_account.count({
        where: {
          OR: [
            { bankSlug: 'titan-paystack' },
            { bankName: { contains: 'Titan', mode: 'insensitive' } },
          ],
        },
      }),
      this.prisma.upward_dedicated_virtual_account.count({
        where: {
          OR: [
            { bankSlug: 'wema-bank' },
            { bankName: { contains: 'Wema', mode: 'insensitive' } },
          ],
        },
      }),
      this.prisma.upward_dedicated_virtual_account.count(),
    ]);

    // Calculate unrouted flagged count
    let flaggedCount = 0;
    for (const tx of verifiedTxs) {
      const pr = tx.paymentRequest;
      const hasManual = !!(pr?.manualAccount?.accountNumber && pr?.manualAccount?.bankCode);
      const hasSubaccount = !!(pr?.subaccount?.accountNumber && pr?.subaccount?.bankCode);
      if (!hasManual && !hasSubaccount) {
        flaggedCount++;
      }
    }

    return {
      totalSettledVolume: settledAgg._sum.amount || 0,
      pendingSettlementVolume: verifiedAgg._sum.amount || 0,
      settledTransactionsCount: settledCount,
      flaggedCount,
      totalBatches,
      dvaStats: {
        titanAccounts: titanDvaCount,
        wemaAccounts: wemaDvaCount,
        totalAccounts: totalDvaCount,
      },
      lastBatch: lastBatch
        ? {
            id: lastBatch.id,
            uuid: lastBatch.uuid,
            totalAmount: lastBatch.totalAmount,
            status: lastBatch.status,
            transferReference: lastBatch.transferReference,
            createdAt: lastBatch.createdAt,
          }
        : null,
    };
  }
}

@Injectable()
export class GetFlaggedSettlementsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptSafe(val: string | null | undefined): string {
    if (!val) return '';
    try {
      return val.includes(':') ? this.encryption.decrypt(val) : val;
    } catch {
      return val;
    }
  }

  async execute() {
    const verifiedTxs = await this.prisma.upward_transaction.findMany({
      where: {
        settlementStatus: 'VERIFIED',
        status: 'SUCCESS',
        isManual: false,
      },
      include: {
        paymentRequest: {
          include: {
            manualAccount: true,
            subaccount: true,
            userProperty: {
              include: {
                pm: {
                  include: {
                    manualAccounts: true,
                  },
                },
                manualAccount: true,
                pmUnit: {
                  include: {
                    property: {
                      include: {
                        manualAccount: true,
                        pm: {
                          include: {
                            manualAccounts: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const allManualAccounts = await this.prisma.upward_manual_account.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        pm: true,
      },
    });

    const flagged: any[] = [];

    for (const tx of verifiedTxs) {
      const pr = tx.paymentRequest;
      const hasManual = !!(pr?.manualAccount?.accountNumber && pr?.manualAccount?.bankCode);
      const hasSubaccount = !!(pr?.subaccount?.accountNumber && pr?.subaccount?.bankCode);

      if (!hasManual && !hasSubaccount) {
        const availableAccounts: any[] = [];
        const seen = new Set<number>();

        const addAcc = (acc: any, source: string) => {
          if (!acc || seen.has(acc.id)) return;
          seen.add(acc.id);
          availableAccounts.push({
            id: acc.id,
            accountName: this.decryptSafe(acc.accountName),
            accountNumber: this.decryptSafe(acc.accountNumber),
            bankName: acc.bankName,
            bankCode: acc.bankCode,
            source,
          });
        };

        const prop = pr?.userProperty;
        if (prop?.manualAccount) {
          addAcc(prop.manualAccount, 'Assigned Property Settlement Account');
        }
        if (prop?.pm?.manualAccounts) {
          prop.pm.manualAccounts.forEach((acc: any) => addAcc(acc, 'Property Manager Account'));
        }
        if (prop?.pmUnit?.property?.manualAccount) {
          addAcc(prop.pmUnit.property.manualAccount, 'PM Unit Property Account');
        }
        if (prop?.pmUnit?.property?.pm?.manualAccounts) {
          prop.pmUnit.property.pm.manualAccounts.forEach((acc: any) => addAcc(acc, 'PM Unit Manager Account'));
        }

        flagged.push({
          transactionId: tx.id,
          transactionUuid: tx.uuid,
          reference: tx.reference,
          amount: tx.amount,
          settlementStatus: tx.settlementStatus,
          paidAt: tx.createdAt,
          paymentRequestId: pr?.id || null,
          propertyAddress: tx.propertyAddress || prop?.locationId || 'N/A',
          tenant: {
            id: tx.user?.id,
            firstName: this.decryptSafe(tx.user?.firstName),
            lastName: this.decryptSafe(tx.user?.lastName),
            email: this.decryptSafe(tx.user?.email),
            phone: this.decryptSafe(tx.user?.phone),
          },
          missingReason: !pr
            ? 'No Payment Request associated with transaction'
            : 'Payment Request has no bound manual settlement account or subaccount',
          availableAccounts,
        });
      }
    }

    const decryptedAllAccounts = allManualAccounts.map((acc) => ({
      id: acc.id,
      accountName: this.decryptSafe(acc.accountName),
      accountNumber: this.decryptSafe(acc.accountNumber),
      bankName: acc.bankName,
      bankCode: acc.bankCode,
      pmName: acc.pm ? `${this.decryptSafe(acc.pm.firstName)} ${this.decryptSafe(acc.pm.lastName)}`.trim() : 'System',
    }));

    return {
      count: flagged.length,
      flagged,
      allManualAccounts: decryptedAllAccounts,
    };
  }
}

@Injectable()
export class GetSettlementBatchesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptSafe(val: string | null | undefined): string {
    if (!val) return '';
    try {
      return val.includes(':') ? this.encryption.decrypt(val) : val;
    } catch {
      return val;
    }
  }

  async execute(page = 1, limit = 20) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (p - 1) * l;

    const [total, batches] = await Promise.all([
      this.prisma.upward_settlement_batch.count(),
      this.prisma.upward_settlement_batch.findMany({
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            include: {
              user: true,
              paymentRequest: {
                include: {
                  manualAccount: true,
                  subaccount: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = batches.map((batch) => {
      const firstTx = batch.transactions[0];
      const pr = firstTx?.paymentRequest;
      let destination: any = null;

      if (pr?.manualAccount) {
        destination = {
          bankName: pr.manualAccount.bankName,
          bankCode: pr.manualAccount.bankCode,
          accountNumber: this.decryptSafe(pr.manualAccount.accountNumber),
          accountName: this.decryptSafe(pr.manualAccount.accountName),
          type: 'MANUAL_ACCOUNT',
        };
      } else if (pr?.subaccount) {
        destination = {
          bankName: 'Paystack Subaccount',
          bankCode: pr.subaccount.bankCode,
          accountNumber: this.decryptSafe(pr.subaccount.accountNumber),
          accountName: this.decryptSafe(pr.subaccount.businessName),
          type: 'SUBACCOUNT',
        };
      }

      return {
        id: batch.id,
        uuid: batch.uuid,
        totalAmount: batch.totalAmount,
        status: batch.status,
        transferReference: batch.transferReference,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
        transactionCount: batch.transactions.length,
        destination,
        transactions: batch.transactions.map((t) => ({
          id: t.id,
          reference: t.reference,
          amount: t.amount,
          paidAt: t.createdAt,
          tenant: {
            name: `${this.decryptSafe(t.user?.firstName)} ${this.decryptSafe(t.user?.lastName)}`.trim(),
            email: this.decryptSafe(t.user?.email),
          },
        })),
      };
    });

    return {
      batches: formatted,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    };
  }
}

@Injectable()
export class GetSettlementTransactionsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptSafe(val: string | null | undefined): string {
    if (!val) return '';
    try {
      return val.includes(':') ? this.encryption.decrypt(val) : val;
    } catch {
      return val;
    }
  }

  async execute(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: 'SUCCESS',
    };

    if (query.status && query.status !== 'ALL') {
      whereClause.settlementStatus = query.status;
    }

    if (query.search) {
      const search = query.search.trim();
      whereClause.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { propertyAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, txs]: [number, any[]] = await Promise.all([
      this.prisma.upward_transaction.count({ where: whereClause }),
      this.prisma.upward_transaction.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          settlementBatch: true,
          paymentRequest: {
            include: {
              manualAccount: true,
              subaccount: true,
              userProperty: {
                include: {
                  dedicatedAccounts: true,
                  manualAccount: true,
                  subaccount: true,
                  pm: {
                    include: {
                      manualAccounts: true,
                    },
                  },
                  pmUnit: {
                    include: {
                      property: {
                        include: {
                          manualAccount: true,
                          pm: {
                            include: {
                              manualAccounts: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      } as any),
    ]);

    const formatted = txs.map((tx) => {
      const pr = tx.paymentRequest;
      let destination: any = null;

      if (tx.isManual) {
        destination = {
          bankName: 'Manual Payment',
          bankCode: 'N/A',
          accountNumber: 'N/A',
          accountName: 'Settled Off-Platform (Direct)',
          type: 'MANUAL_PAYMENT',
        };
      } else if (pr?.manualAccount) {
        destination = {
          bankName: pr.manualAccount.bankName,
          bankCode: pr.manualAccount.bankCode,
          accountNumber: this.decryptSafe(pr.manualAccount.accountNumber),
          accountName: this.decryptSafe(pr.manualAccount.accountName),
          type: 'MANUAL_ACCOUNT',
        };
      } else if (pr?.subaccount) {
        destination = {
          bankName: 'Paystack Subaccount',
          bankCode: pr.subaccount.bankCode,
          accountNumber: this.decryptSafe(pr.subaccount.accountNumber),
          accountName: this.decryptSafe(pr.subaccount.businessName),
          type: 'SUBACCOUNT',
        };
      } else if (pr?.userProperty) {
        const prop = pr.userProperty;
        const manualAcc =
          prop.manualAccount ||
          prop.pm?.manualAccounts?.[0] ||
          prop.pmUnit?.property?.manualAccount ||
          prop.pmUnit?.property?.pm?.manualAccounts?.[0];

        if (manualAcc) {
          destination = {
            bankName: manualAcc.bankName,
            bankCode: manualAcc.bankCode,
            accountNumber: this.decryptSafe(manualAcc.accountNumber),
            accountName: this.decryptSafe(manualAcc.accountName),
            type: 'MANUAL_ACCOUNT',
          };
        } else if (prop.subaccount) {
          destination = {
            bankName: 'Paystack Subaccount',
            bankCode: prop.subaccount.bankCode,
            accountNumber: this.decryptSafe(prop.subaccount.accountNumber),
            accountName: this.decryptSafe(prop.subaccount.businessName),
            type: 'SUBACCOUNT',
          };
        }
      }

      // Resolve Inbound DVA details (Titan vs Wema vs other)
      const prop = pr?.userProperty;
      let dvaAccount: any = null;
      const dvas = prop?.dedicatedAccounts || prop?.pmUnit?.property?.dedicatedAccounts || [];
      if (dvas.length > 0) {
        let matched = dvas.find((d: any) => tx.narration && tx.narration.includes(d.accountNumber));
        if (!matched) {
          matched = dvas.find((d: any) => d.isDefault) || dvas[0];
        }
        if (matched) {
          const isTitan = matched.bankSlug === 'titan-paystack' || /titan/i.test(matched.bankName);
          const isWema = matched.bankSlug === 'wema-bank' || /wema/i.test(matched.bankName);
          dvaAccount = {
            bankName: matched.bankName,
            bankSlug: matched.bankSlug || (isTitan ? 'titan-paystack' : isWema ? 'wema-bank' : 'other'),
            accountNumber: matched.accountNumber,
            provider: isTitan ? 'Titan Trust Bank' : isWema ? 'Wema Bank' : matched.bankName,
          };
        }
      } else if (tx.narration) {
        if (/titan/i.test(tx.narration)) {
          dvaAccount = { bankName: 'Paystack-Titan', bankSlug: 'titan-paystack', provider: 'Titan Trust Bank' };
        } else if (/wema/i.test(tx.narration)) {
          dvaAccount = { bankName: 'Wema Bank', bankSlug: 'wema-bank', provider: 'Wema Bank' };
        }
      }

      return {
        id: tx.id,
        uuid: tx.uuid,
        reference: tx.reference,
        amount: tx.amount,
        settlementStatus: tx.settlementStatus,
        status: tx.status,
        paymentType: tx.paymentType,
        isManual: tx.isManual,
        propertyAddress: tx.propertyAddress,
        paidAt: tx.createdAt,
        narration: tx.narration,
        settlementBatch: tx.settlementBatch
          ? {
              id: tx.settlementBatch.id,
              uuid: tx.settlementBatch.uuid,
              transferReference: tx.settlementBatch.transferReference,
              status: tx.settlementBatch.status,
            }
          : null,
        destination,
        dvaAccount,
        tenant: {
          id: tx.user?.id,
          name: `${this.decryptSafe(tx.user?.firstName)} ${this.decryptSafe(tx.user?.lastName)}`.trim(),
          email: this.decryptSafe(tx.user?.email),
          phone: this.decryptSafe(tx.user?.phone),
        },
      };
    });

    return {
      transactions: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

@Injectable()
export class ResolveFlaggedSettlementUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: ResolveFlaggedSettlementDto) {
    if (dto.action === 'BIND_MANUAL_ACCOUNT') {
      if (!dto.manualAccountId) {
        throw new BadRequestException('manualAccountId is required when binding an account');
      }

      const manualAccount = await this.prisma.upward_manual_account.findUnique({
        where: { id: dto.manualAccountId },
      });
      if (!manualAccount) {
        throw new NotFoundException(`Manual account with ID ${dto.manualAccountId} not found`);
      }

      let paymentRequestId = dto.paymentRequestId;
      if (!paymentRequestId && dto.transactionId) {
        const tx = await this.prisma.upward_transaction.findUnique({
          where: { id: dto.transactionId },
        });
        if (!tx) {
          throw new NotFoundException(`Transaction ${dto.transactionId} not found`);
        }
        paymentRequestId = tx.paymentRequestId || undefined;
      }

      if (!paymentRequestId) {
        throw new BadRequestException('No payment request associated to bind this account to');
      }

      const updatedPr = await this.prisma.upward_payment_request.update({
        where: { id: paymentRequestId },
        data: { manualAccountId: dto.manualAccountId },
      });

      return {
        success: true,
        message: `Successfully bound settlement account (ID: ${dto.manualAccountId}) to Payment Request #${paymentRequestId}. It will be processed on the next settlement cycle.`,
        paymentRequest: updatedPr,
      };
    } else if (dto.action === 'MARK_MANUALLY_SETTLED') {
      if (!dto.transactionId) {
        throw new BadRequestException('transactionId is required to mark a transaction as manually settled');
      }

      const tx = await this.prisma.upward_transaction.findUnique({
        where: { id: dto.transactionId },
      });
      if (!tx) {
        throw new NotFoundException(`Transaction ${dto.transactionId} not found`);
      }

      const updatedTx = await this.prisma.upward_transaction.update({
        where: { id: dto.transactionId },
        data: {
          settlementStatus: 'SETTLED',
          narration: dto.note ? `${tx.narration || ''} [MANUAL_SETTLED: ${dto.note}]`.trim() : tx.narration,
        },
      });

      return {
        success: true,
        message: `Transaction ${tx.reference} marked as manually settled.`,
        transaction: updatedTx,
      };
    }

    throw new BadRequestException(`Unsupported action: ${dto.action}`);
  }
}
