import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SendNotificationUseCase } from '../../use-cases/notifications/notification.use-cases';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { randomUUID } from 'crypto';
import { PASS_PLACEHOLDERS } from '../../../domains/users/user.repository';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';

interface BulkCreateInput {
  pmId: number;
  propertyAddress: string;
  unitUuid?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  records: {
    amount: number;
    dueDate: string;
    paidDate: string;
  }[];
}

@Injectable()
export class BulkCreateTenantRecordsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sendNotification: SendNotificationUseCase,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly configService: ConfigService,
    private readonly encryption: EncryptionService,
    private readonly activityLog: ActivityLogService,
  ) { }

  async execute(input: BulkCreateInput, actor?: any) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { id: input.pmId } });
    if (!pm) throw new Error('PM not found');

    const pmFirstName = this.encryption.decrypt(pm.firstName);
    const pmLastName = this.encryption.decrypt(pm.lastName);
    const pmName = `${pmFirstName} ${pmLastName}`;

    if (!input.email) throw new Error('Email is required');

    const emailLower = input.email.toLowerCase().trim();
    const emailHash = this.encryption.hash(emailLower);

    const phoneHash = input.phone ? this.encryption.hash(input.phone) : null;

    // 1. Handle Core Shadow User (preventing duplicate records by checking email or phone)
    let user = await this.prisma.upward_user.findFirst({
      where: {
        OR: [
          { emailHash },
          ...(phoneHash ? [{ phoneHash }] : [])
        ]
      },
      orderBy: { id: 'desc' }
    });

    let isNewUser = false;

    if (!user) {
      user = await this.prisma.upward_user.create({
        data: {
          firstName: this.encryption.encrypt(input.firstName || ''),
          lastName: this.encryption.encrypt(input.lastName || ''),
          email: this.encryption.encrypt(emailLower),
          phone: input.phone ? this.encryption.encrypt(input.phone) : null,
          firstNameHash: this.encryption.hash(input.firstName || ''),
          lastNameHash: this.encryption.hash(input.lastName || ''),
          emailHash: emailHash,
          phoneHash: phoneHash,
          passwordHash: PASS_PLACEHOLDERS.SHADOW,
        }
      });
      isNewUser = true;
    }

    // 2. Fetch Unit (if provided) to add PM rent payment history
    let unitId: number | undefined;
    if (input.unitUuid) {
      const unit = await this.prisma.upward_pm_unit.findUnique({
        where: { uuid: input.unitUuid }
      });
      if (unit) {
        unitId = unit.id;
      }
    }

    let recordsAdded = 0;

    // 3. Add PM Rent Payment Records
    for (const record of input.records) {
      const dueDate = new Date(record.dueDate);
      const paidDate = new Date(record.paidDate);

      // Unit payment history
      if (unitId) {
        await this.prisma.upward_pm_rent_payment.create({
          data: {
            unitId,
            amount: record.amount,
            rentAmountAtPayment: record.amount,
            paymentDate: paidDate,
            periodStart: dueDate, // Storing due date as period start for reference
            status: 'SUCCESS',
            method: 'Other',
            notes: 'Imported historical record'
          }
        });
      }

      recordsAdded++;
    }

    // 4. Send Communications
    if (isNewUser) {
      const upwardPayUrl = this.configService.get<string>('PAY_APP_URL') || 'http://localhost:3000';
      const completeProfileLink = `${upwardPayUrl}/signup?email=${encodeURIComponent(emailLower)}`;

      await this.unifiedCommService.processCommunication({
        recipientEmail: emailLower,
        recipientName: input.firstName || 'Tenant',
        recipientRole: 'TENANT',
        type: 'NEW_USER_RECORDS',
        context: {
          pmName,
          propertyAddress: input.propertyAddress,
          completeProfileLink,
        },
      });
    } else {
      await this.sendNotification.execute({
        userId: user.uuid,
        title: 'Past records added!',
        message: `${pmName} just added past payment records to your profile for ${input.propertyAddress}.`,
        type: 'SYSTEM'
      }).catch((e: any) => console.error('Failed to send notification:', e));
    }

    try {
      await this.activityLog.log({
        pmId: input.pmId,
        ownerPmId: input.pmId,
        employeeId: actor?.employeeId,
        action: ActivityAction.ADD_RENT_HISTORY,
        entityType: 'TENANT',
        entityId: user?.uuid,
        description: `Imported ${recordsAdded} historical rent record(s) for ${input.firstName} ${input.lastName}`,
        metadata: {
          propertyAddress: input.propertyAddress,
          recordsAdded,
          tenantName: `${input.firstName} ${input.lastName}`.trim(),
        },
      });
    } catch (logErr) {
      console.error('Failed to log past records activity:', logErr);
    }

    return { success: true, recordsAdded, isNewUser };
  }
}
