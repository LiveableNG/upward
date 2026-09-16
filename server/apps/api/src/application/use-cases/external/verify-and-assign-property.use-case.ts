import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { IPaymentGateway, PAYMENT_GATEWAY } from '../../../domains/payments/payment.repository';
import { IngestExternalRentHistoryUseCase } from './ingest-external-rent-history.use-case';
import { RentalPeriodService } from '../../services/rental-period.service';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { VerifyAndAssignPropertyDto } from './external-api.dto';

@Injectable()
export class VerifyAndAssignExternalPropertyUseCase {
  private readonly logger = new Logger(VerifyAndAssignExternalPropertyUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    private readonly ingestRentHistoryUseCase: IngestExternalRentHistoryUseCase,
    private readonly rentalPeriodService: RentalPeriodService,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(
    propertyUuid: string,
    dto: VerifyAndAssignPropertyDto,
    platform: any,
  ) {
    if (!propertyUuid) {
      throw new BadRequestException('Property UUID is required.');
    }

    const property = await this.prisma.upward_user_property.findUnique({
      where: { uuid: propertyUuid },
      include: {
        user: true,
        company: true,
        location: true,
        manualAccount: true,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with UUID '${propertyUuid}' not found.`);
    }

    // Security check: Platform ownership verification
    if (property.platformId && property.platformId !== platform.id) {
      throw new ForbiddenException('You do not have permission to verify this property.');
    }
    if (property.company?.platformId && property.company.platformId !== platform.id) {
      throw new ForbiddenException('This property is linked to another platform.');
    }

    // Check uniqueness constraint for [platformId, externalUnitId]
    const existingUnitMapping = await this.prisma.upward_user_property.findFirst({
      where: {
        platformId: platform.id,
        externalUnitId: dto.externalUnitId,
        id: { not: property.id },
      },
    });

    if (existingUnitMapping) {
      throw new BadRequestException(
        `External unit ID '${dto.externalUnitId}' is already mapped to another property record.`,
      );
    }

    // 1. Prepare updated property attributes
    const updateData: any = {
      platformId: platform.id,
      externalUnitId: dto.externalUnitId,
      externalPropertyId: dto.externalPropertyId || property.externalPropertyId,
      isVerified: true,
      verificationStatus: 'VERIFIED',
    };

    if (dto.rentAmount !== undefined && dto.rentAmount > 0) {
      updateData.rentAmount = dto.rentAmount;
    }
    if (dto.rentType) {
      updateData.rentType = dto.rentType;
    }
    if (dto.leaseYears !== undefined && dto.leaseYears > 0) {
      updateData.leaseYears = dto.leaseYears;
    }
    if (dto.rentStartDate) {
      const parsedStart = this.rentalPeriodService.parseCalendarDate(dto.rentStartDate);
      if (parsedStart) updateData.rentStartDate = parsedStart;
    }
    if (dto.rentEndDate) {
      const parsedEnd = this.rentalPeriodService.parseCalendarDate(dto.rentEndDate);
      if (parsedEnd) updateData.rentEndDate = parsedEnd;
    }

    // 2. Settlement Account Handling
    if (dto.settlementAccount) {
      const acctNum = (dto.settlementAccount.account_number || dto.settlementAccount.accountNumber || '').trim();
      const bankCode = (dto.settlementAccount.bank_code || dto.settlementAccount.bankCode || '').trim();
      const acctName = (dto.settlementAccount.account_name || dto.settlementAccount.accountName || 'Landlord Settlement').trim();
      const bankName = (dto.settlementAccount.bank_name || dto.settlementAccount.bankName || '').trim();

      if (acctNum && bankCode) {
        // Upsert manual account
        if (property.manualAccountId) {
          await this.prisma.upward_manual_account.update({
            where: { id: property.manualAccountId },
            data: {
              accountNumber: acctNum,
              accountName: acctName,
              bankName: bankName,
              bankCode: bankCode,
              isPrimary: true,
            },
          });
        } else {
          const manualAcct = await this.prisma.upward_manual_account.create({
            data: {
              accountNumber: acctNum,
              accountName: acctName,
              bankName: bankName,
              bankCode: bankCode,
              isPrimary: true,
            },
          });
          updateData.manualAccount = { connect: { id: manualAcct.id } };
        }

        // Provision / connect Paystack subaccount
        try {
          const subaccount = await this.paymentGateway.findOrCreateSubaccount({
            accountNumber: acctNum,
            bankCode: bankCode,
            businessName: acctName,
          });
          if (subaccount?.id) {
            updateData.subaccount = { connect: { id: subaccount.id } };
          }
        } catch (subErr: any) {
          this.logger.warn(`Failed to provision Paystack subaccount: ${subErr.message}`);
        }
      }
    }

    // 3. Save Property Updates (Strictly update in-place, NO duplicate created)
    const updatedProperty = await this.prisma.upward_user_property.update({
      where: { id: property.id },
      data: updateData,
      include: {
        location: true,
        company: true,
        user: true,
        manualAccount: true,
      },
    });

    // 4. Ingest Rent History if provided
    let recordsIngested = 0;
    if (dto.rentHistory && dto.rentHistory.length > 0) {
      const historyResult = await this.ingestRentHistoryUseCase.execute(
        updatedProperty.id,
        dto.rentHistory,
        platform.id,
      );
      recordsIngested = historyResult.recordsIngested;
    } else {
      await this.rentalPeriodService.syncPlatformPropertyState(updatedProperty.id);
    }

    // 5. Notify the tenant
    const decryptedUserEmail = property.user?.email
      ? (this.encryption.decrypt(property.user.email).includes('@')
          ? this.encryption.decrypt(property.user.email)
          : property.user.email)
      : undefined;
    const decryptedUserFirst = property.user?.firstName
      ? this.encryption.decrypt(property.user.firstName)
      : 'Tenant';
    const addressLabel = property.location?.address || property.location?.area || 'your rental property';

    await this.prisma.upward_notification.create({
      data: {
        userId: property.userId,
        title: 'Property Verified',
        message: `Your property at ${addressLabel} has been successfully verified by your management platform.`,
        type: 'PROPERTY_VERIFIED',
        url: '/dashboard/setup/rental',
      },
    }).catch((e: any) => this.logger.warn(`Failed to create tenant notification: ${e.message}`));

    if (decryptedUserEmail) {
      await this.unifiedCommService.processCommunication({
        recipientEmail: decryptedUserEmail,
        recipientName: decryptedUserFirst,
        recipientRole: 'TENANT',
        type: 'PROPERTY_VERIFIED_NOTIFICATION',
        context: {
          tenantName: decryptedUserFirst,
          propertyAddress: addressLabel,
          rentAmount: updatedProperty.rentAmount,
          verifiedAt: new Date().toLocaleDateString(),
        },
      }).catch((commErr: any) => this.logger.warn(`Failed to send verification notification email: ${commErr.message}`));
    }

    this.logger.log(
      `Property ${property.uuid} verified and assigned to externalUnitId '${dto.externalUnitId}' for platform ${platform.id}`,
    );

    return {
      success: true,
      message: 'Property successfully verified and assigned.',
      data: {
        propertyUuid: updatedProperty.uuid,
        externalUnitId: updatedProperty.externalUnitId,
        externalPropertyId: updatedProperty.externalPropertyId,
        isVerified: updatedProperty.isVerified,
        verificationStatus: updatedProperty.verificationStatus,
        rentAmount: updatedProperty.rentAmount,
        rentStartDate: updatedProperty.rentStartDate,
        rentEndDate: updatedProperty.rentEndDate,
        rentType: updatedProperty.rentType,
        recordsIngested,
      },
    };
  }
}
