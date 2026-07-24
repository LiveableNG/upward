import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IPmPaymentRequestRepository, PmPaymentRequestEntity } from '../../../../domains/pm/IPropertyRepository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class PrismaPmPaymentRequestRepository implements IPmPaymentRequestRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) { }

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
        amount: li.totalAmount,
        amountPaid: li.amountPaid || 0,
        status: li.status || 'PENDING',
      })) || [],
      transactions: pr.paymentRequest?.transactions?.map((tx: any) => ({
        uuid: tx.uuid,
        amount: tx.amount,
        status: tx.status,
        method: tx.method || 'Bank Transfer',
        createdAt: tx.createdAt,
        reference: tx.reference
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
        paymentRequest: {
          include: {
            lineItemRecords: true,
            transactions: {
              where: { status: 'SUCCESS' },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
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

  async findAccessibleByPmId(pmId: number): Promise<PmPaymentRequestEntity[]> {
    // Team collaborations (ALL access)
    const teamCollabs = await (this.prisma as any).upward_pm_team_collaboration.findMany({
      where: { collaboratorPmId: pmId, status: 'ACCEPTED', accessLevel: 'ALL' }
    });
    
    const ownerPmIds = teamCollabs.map((tc: any) => tc.ownerPmId);
    
    // Custom property collaborations
    const propCollabs = await (this.prisma as any).upward_pm_property_collaboration.findMany({
      where: { collaboratorPmId: pmId }
    });
    
    const collabPropertyIds = propCollabs.map((pc: any) => pc.propertyId);

    const pmUnitCondition = {
      OR: [
        { property: { pmId } },
        { property: { pmId: { in: ownerPmIds } } },
        { propertyId: { in: collabPropertyIds } }
      ]
    };

    const requests = await this.prisma.upward_pm_payment_request.findMany({
      where: {
        OR: [
          { pmId },
          { pmId: { in: ownerPmIds } },
          { unit: { propertyId: { in: collabPropertyIds } } }
        ]
      },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        paymentRequest: { include: { lineItemRecords: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedPmRequests = requests.map(pr => this.mapPmPaymentRequest(pr));

    const manualRequests = await this.prisma.upward_payment_request.findMany({
      where: {
        isManual: true,
        userProperty: {
          pmUnit: pmUnitCondition
        }
      },
      include: {
        userProperty: {
          include: {
            pmUnit: { include: { property: true, tenant: true } }
          }
        },
        lineItemRecords: true,
        transactions: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedManualRequests = manualRequests.map(pr => {
      const pmUnit = pr.userProperty?.pmUnit;
      const pmTenant = pmUnit?.tenant;

      return {
        uuid: pr.uuid, // Use core UUID
        amount: pr.amount,
        currency: pr.currency,
        description: pr.description || 'Self Payment',
        dueDate: pr.dueDate,
        status: pr.status,
        amountPaid: pr.amountPaid,
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        pmId: pmUnit?.property?.pmId || pmId,
        unitId: pmUnit?.id || null,
        tenantId: pmTenant?.id || null,
        isSelfPayment: true,
        coreRequestUuid: pr.uuid,
        
        unit: pmUnit ? {
          ...pmUnit,
          property: pmUnit.property
        } : null,
        
        tenant: pmTenant ? {
          id: pmTenant.id,
          uuid: pmTenant.uuid,
          pmId: pmTenant.pmId,
          firstName: pmTenant.firstNameEncrypted ? this.encryption.decrypt(pmTenant.firstNameEncrypted) : null,
          lastName: pmTenant.lastNameEncrypted ? this.encryption.decrypt(pmTenant.lastNameEncrypted) : null,
          email: pmTenant.emailEncrypted ? this.encryption.decrypt(pmTenant.emailEncrypted) : null,
          phone: pmTenant.phoneEncrypted ? this.encryption.decrypt(pmTenant.phoneEncrypted) : null,
          inviteStatus: pmTenant.inviteStatus,
          inviteSentAt: pmTenant.inviteSentAt
        } : null,

        lineItems: pr.lineItemRecords?.map((li: any) => ({
          name: li.name,
          amount: li.totalAmount,
          amountPaid: li.amountPaid || 0,
          status: li.status || 'PENDING',
        })) || [],

        transactions: pr.transactions?.map((tx: any) => ({
          uuid: tx.uuid,
          amount: tx.amount,
          status: tx.status,
          method: tx.method || 'Bank Transfer',
          createdAt: tx.createdAt,
          reference: tx.reference
        })) || []
      } as any;
    });

    const allRequests = [...mappedPmRequests, ...mappedManualRequests];
    allRequests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return allRequests;
  }

  async findByUuid(uuid: string): Promise<PmPaymentRequestEntity | null> {
    const pr = await this.prisma.upward_pm_payment_request.findUnique({
      where: { uuid },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        paymentRequest: { 
          include: { 
            lineItemRecords: true,
            transactions: {
              where: { status: 'SUCCESS' },
              orderBy: { createdAt: 'desc' }
            }
          } 
        }
      },
    });
    if (pr) return this.mapPmPaymentRequest(pr);

    // Fallback: Check if it's a manual core request (Self Payment)
    const manualPr = await this.prisma.upward_payment_request.findUnique({
      where: { uuid },
      include: {
        userProperty: {
          include: {
            pmUnit: { include: { property: true, tenant: true } }
          }
        },
        lineItemRecords: true,
        transactions: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (manualPr && manualPr.isManual && manualPr.userProperty?.pmUnit) {
      const pmUnit = manualPr.userProperty.pmUnit;
      const pmTenant = pmUnit.tenant;

      return {
        uuid: manualPr.uuid,
        amount: manualPr.amount,
        currency: manualPr.currency,
        description: manualPr.description || 'Self Payment',
        dueDate: manualPr.dueDate,
        status: manualPr.status,
        amountPaid: manualPr.amountPaid,
        createdAt: manualPr.createdAt,
        updatedAt: manualPr.updatedAt,
        pmId: pmUnit.property.pmId,
        unitId: pmUnit.id,
        tenantId: pmTenant?.id || null,
        isSelfPayment: true,
        coreRequestUuid: manualPr.uuid,
        
        unit: {
          ...pmUnit,
          property: pmUnit.property
        },
        
        tenant: pmTenant ? {
          id: pmTenant.id,
          uuid: pmTenant.uuid,
          pmId: pmTenant.pmId,
          firstName: pmTenant.firstNameEncrypted ? this.encryption.decrypt(pmTenant.firstNameEncrypted) : null,
          lastName: pmTenant.lastNameEncrypted ? this.encryption.decrypt(pmTenant.lastNameEncrypted) : null,
          email: pmTenant.emailEncrypted ? this.encryption.decrypt(pmTenant.emailEncrypted) : null,
          phone: pmTenant.phoneEncrypted ? this.encryption.decrypt(pmTenant.phoneEncrypted) : null,
          inviteStatus: pmTenant.inviteStatus,
          inviteSentAt: pmTenant.inviteSentAt
        } : null,

        lineItems: manualPr.lineItemRecords?.map((li: any) => ({
          name: li.name,
          amount: li.totalAmount,
          amountPaid: li.amountPaid || 0,
          status: li.status || 'PENDING',
        })) || [],

        transactions: manualPr.transactions?.map((tx: any) => ({
          uuid: tx.uuid,
          amount: tx.amount,
          status: tx.status,
          method: tx.method || 'Bank Transfer',
          createdAt: tx.createdAt,
          reference: tx.reference
        })) || []
      } as any;
    }

    return null;
  }

  async findByPaymentRequestId(paymentRequestId: number, tx?: any): Promise<PmPaymentRequestEntity | null> {
    const prisma = tx || this.prisma;
    const pr = await prisma.upward_pm_payment_request.findFirst({
      where: { paymentRequestId },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        paymentRequest: { 
          include: { 
            lineItemRecords: true,
            transactions: {
              where: { status: 'SUCCESS' },
              orderBy: { createdAt: 'desc' }
            }
          } 
        }
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
        paymentRequest: {
          include: {
            lineItemRecords: true,
            transactions: {
              where: { status: 'SUCCESS' },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });
    return this.mapPmPaymentRequest(pr);
  }
}
