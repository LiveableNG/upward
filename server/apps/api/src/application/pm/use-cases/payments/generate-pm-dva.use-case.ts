import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../../domains/payments/payment.repository';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GeneratePmDvaUseCase {
  private readonly logger = new Logger(GeneratePmDvaUseCase.name);

  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('pm.registered', { async: true })
  async handlePmRegisteredEvent(payload: { pmUuid: string }) {
    this.logger.log(`Asynchronously generating PM DVA for registered PM UUID: ${payload.pmUuid}`);
    try {
      await this.execute(payload.pmUuid);
    } catch (error: any) {
      this.logger.error(`Asynchronous DVA creation during signup failed for PM UUID ${payload.pmUuid}: ${error.message}`);
    }
  }

  async execute(pmUuid: string): Promise<any> {
    const pm = await this.pmRepo.findByUuid(pmUuid);
    if (!pm) {
      throw new NotFoundException('Property manager not found');
    }

    const existingDva = await this.prisma.upward_pm_dedicated_virtual_account.findUnique({
      where: { pmId: pm.id! },
    });

    if (existingDva) {
      return existingDva;
    }

    try {
      const emailParts = pm.email.split('@');
      const aliasEmail = emailParts.length === 2 
        ? `${emailParts[0]}+pm@${emailParts[1]}`
        : `pm-${pm.id!}@upward.com`; 

      const customerCode = await this.paymentGateway.createCustomer({
        email: aliasEmail,
        firstName: pm.businessName || pm.firstName,
        lastName: pm.lastName || 'PM',
        phone: pm.phone ?? undefined,
      });

      const dvaResponse = await this.paymentGateway.createDedicatedAccount({
        customerCode,
      });

      const bankDetails = dvaResponse?.data?.bank;
      if (!bankDetails || !dvaResponse?.data?.account_number) {
        throw new BadRequestException('Failed to generate virtual account details from Paystack');
      }

      const newDva = await this.prisma.upward_pm_dedicated_virtual_account.create({
        data: {
          pmId: pm.id!,
          accountNumber: dvaResponse.data.account_number,
          accountName: dvaResponse.data.account_name,
          bankName: bankDetails.name || 'Wema Bank',
          bankCode: bankDetails.id?.toString() || bankDetails.slug || '',
          paystackCustomerId: customerCode,
        },
      });

      this.logger.log(`Successfully generated PM DVA for PM ID ${pm.id!}`);
      return newDva;
    } catch (error: any) {
      this.logger.error(`Failed to generate PM DVA: ${error.message}`, error.stack);
      throw new BadRequestException(`Could not provision dedicated virtual account: ${error.message}`);
    }
  }
}
