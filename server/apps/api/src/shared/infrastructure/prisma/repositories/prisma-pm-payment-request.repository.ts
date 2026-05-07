import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IPmPaymentRequestRepository, PmPaymentRequestEntity } from '../../../../domains/pm/IPropertyRepository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class PrismaPmPaymentRequestRepository implements IPmPaymentRequestRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private mapPmPaymentRequest(pr: any): PmPaymentRequestEntity {
    return {
      ...pr,
      coreRequestUuid: pr.paymentRequest?.uuid || null,
      tenant: pr.tenant ? {
        id: pr.tenant.id,
        uuid: pr.tenant.uuid,
        pmId: pr.tenant.pmId,
        firstName: pr.tenant.firstNameEncrypted ? this.encryption.decrypt(pr.tenant.firstNameEncrypted) : null,
        lastName: pr.tenant.lastNameEncrypted ? this.encryption.decrypt(pr.tenant.lastNameEncrypted) : null,
        email: pr.tenant.emailEncrypted ? this.encryption.decrypt(pr.tenant.emailEncrypted) : null,
        phone: pr.tenant.phoneEncrypted ? this.encryption.decrypt(pr.tenant.phoneEncrypted) : null,
        inviteStatus: pr.tenant.inviteStatus,
        inviteSentAt: pr.tenant.inviteSentAt
      } : null,
      lineItems: pr.paymentRequest?.lineItemRecords?.map((li: any) => ({
        name: li.name,
        amount: li.totalAmount
      })) || []
    } as any;
  }

  async create(data: any, tx?: any): Promise<PmPaymentRequestEntity> {
    const prisma = tx || this.prisma;
    const pr = await prisma.upward_pm_payment_request.create({
      data,
      include: { 
        unit: { include: { property: true } }, 
        tenant: true, 
        paymentRequest: { include: { lineItemRecords: true } } 
      }
    });
    return this.mapPmPaymentRequest(pr);
  }

  async findByPmId(pmId: number): Promise<PmPaymentRequestEntity[]> {
    const requests = await this.prisma.upward_pm_payment_request.findMany({
      where: { pmId },
      include: { 
        unit: { include: { property: true } }, 
        tenant: true, 
        paymentRequest: { include: { lineItemRecords: true } } 
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map(pr => this.mapPmPaymentRequest(pr));
  }

  async findByUuid(uuid: string): Promise<PmPaymentRequestEntity | null> {
    const pr = await this.prisma.upward_pm_payment_request.findUnique({
      where: { uuid },
      include: { 
        unit: { include: { property: true } }, 
        tenant: true, 
        paymentRequest: { include: { lineItemRecords: true } } 
      },
    });
    return pr ? this.mapPmPaymentRequest(pr) : null;
  }

  async findByPaymentRequestId(paymentRequestId: number, tx?: any): Promise<PmPaymentRequestEntity | null> {
    const prisma = tx || this.prisma;
    const pr = await prisma.upward_pm_payment_request.findFirst({
      where: { paymentRequestId },
      include: { 
        unit: { include: { property: true } }, 
        tenant: true, 
        paymentRequest: { include: { lineItemRecords: true } } 
      },
    });
    return pr ? this.mapPmPaymentRequest(pr) : null;
  }

  async update(uuid: string, data: any, tx?: any): Promise<PmPaymentRequestEntity> {
    const prisma = tx || this.prisma;
    const pr = await prisma.upward_pm_payment_request.update({
      where: { uuid },
      data,
      include: { 
        unit: { include: { property: true } }, 
        tenant: true, 
        paymentRequest: { include: { lineItemRecords: true } } 
      }
    });
    return this.mapPmPaymentRequest(pr);
  }
}
