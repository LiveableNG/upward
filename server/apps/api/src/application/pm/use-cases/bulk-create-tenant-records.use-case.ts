import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { RENT_CYCLE_REPOSITORY, IRentCycleRepository } from '../../../domains/scoring/rent-cycle.repository';
import { SendNotificationUseCase } from '../../use-cases/notifications/notification.use-cases';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { randomUUID } from 'crypto';

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
    @Inject(RENT_CYCLE_REPOSITORY) private readonly rentCycleRepo: IRentCycleRepository,
    private readonly sendNotification: SendNotificationUseCase,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly encryption: EncryptionService
  ) { }

  async execute(input: BulkCreateInput) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { id: input.pmId } });
    if (!pm) throw new Error('PM not found');

    const pmFirstName = this.encryption.decrypt(pm.firstName);
    const pmLastName = this.encryption.decrypt(pm.lastName);
    const pmName = `${pmFirstName} ${pmLastName}`;

    if (!input.email) throw new Error('Email is required');

    const emailLower = input.email.toLowerCase().trim();
    const emailHash = this.encryption.hash(emailLower);

    // 1. Handle Core Shadow User (for notifications & rent cycles)
    let user = await this.prisma.upward_user.findFirst({
      where: { emailHash }
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
          phoneHash: input.phone ? this.encryption.hash(input.phone) : null,
          passwordHash: 'SHADOW_USER_PENDING_ONBOARDING',
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

    // 3. Add Rent Cycle Records and PM Rent Payment Records
    for (const record of input.records) {
      const dueDate = new Date(record.dueDate);
      const paidDate = new Date(record.paidDate);
      const isPaidOnTime = paidDate <= dueDate;
      const status = isPaidOnTime ? 'PAID_ON_TIME' : 'PAID_LATE';

      // Global credibility record
      await this.rentCycleRepo.create({
        userId: user.id,
        source: 'PAST_RECORD',
        amountOwed: record.amount,
        amountPaid: record.amount,
        currency: 'NGN',
        dueDate: dueDate,
        paidAt: paidDate,
        status: status,
        description: `Rent Payment (Imported by PM)`
      });

      // Unit payment history
      if (unitId) {
        await this.prisma.upward_pm_rent_payment.create({
          data: {
            unitId,
            amount: record.amount,
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

      await this.emailService.sendNewUserRecordsEmail({
        email: emailLower,
        pmName,
        propertyAddress: input.propertyAddress,
        completeProfileLink
      });
    } else {
      await this.sendNotification.execute({
        userId: user.uuid,
        title: 'Past records added!',
        message: `${pmName} just added past payment records to your profile for ${input.propertyAddress}.`,
        type: 'SYSTEM'
      }).catch((e: any) => console.error('Failed to send notification:', e));
    }

    return { success: true, recordsAdded, isNewUser };
  }
}
