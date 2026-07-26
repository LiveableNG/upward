import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class PmBulkRentReminderUseCase {
  private readonly logger = new Logger(PmBulkRentReminderUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number, landlordEmail: string): Promise<{ sentCount: number }> {
    this.logger.log(`Executing bulk rent reminders for landlord ${landlordEmail} (PM: ${pmId})`);

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { id: pmId },
      select: { uuid: true, businessName: true, firstName: true, lastName: true },
    });

    if (!pm) {
      throw new Error(`PM not found with ID ${pmId}`);
    }

    const pmName = pm.businessName || `${pm.firstName || ''} ${pm.lastName || ''}`.trim() || 'Property Manager';

    // 1. Find all properties for this landlord under this PM
    const properties = await this.prisma.upward_pm_property.findMany({
      where: {
        pmId,
        landlordEmailEncrypted: { not: null }
      },
      include: {
        units: {
          where: {
            status: 'OCCUPIED',
            tenantId: { not: null }
          },
          include: {
            tenant: true
          }
        }
      }
    });

    let sentCount = 0;

    for (const prop of properties) {
      for (const unit of prop.units) {
        if (unit.tenant) {
          const email = unit.tenant.emailEncrypted ? this.encryption.decrypt(unit.tenant.emailEncrypted) : null;
          const phone = unit.tenant.phoneEncrypted ? this.encryption.decrypt(unit.tenant.phoneEncrypted) : null;

          if (!email && !phone) continue;

          const tenantFirstName = unit.tenant.firstNameSearch || 'Tenant';
          const tenantLastName = unit.tenant.lastNameSearch || '';
          const tenantName = `${tenantFirstName} ${tenantLastName}`.trim() || 'Tenant';
          const amount = unit.rentAmount;
          const currency = unit.currency || 'NGN';
          const formattedAmount = `${currency} ${amount.toLocaleString()}`;

          await this.unifiedCommService.processCommunication({
            userId: unit.tenant.uuid,
            recipientEmail: email || undefined,
            recipientPhone: phone || undefined,
            recipientName: tenantName,
            recipientRole: 'TENANT',
            pmUuid: pm.uuid,
            type: 'PAYMENT_REQUEST',
            context: {
              displayName: tenantName,
              pmName,
              propertyName: prop.name,
              unitName: unit.unitName,
              amount,
              formattedAmount,
              dueDate: unit.rentDueDate ? new Date(unit.rentDueDate).toLocaleDateString() : 'Due Date',
              paymentLink: (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim() + `/pay/${unit.uuid}`,
              allowPartial: unit.rentReminderEnabled || false,
              currency,
              title: `Rent Reminder: ${unit.unitName}`,
            }
          }).catch(e => this.logger.error(`Failed to send bulk reminder to tenant ${unit.tenant?.uuid}: ${e.message}`));
          
          sentCount++;
        }
      }
    }

    return { sentCount };
  }
}
