import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class AddUnitPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, unitUuid: string, data: any) {
    const unit = await this.unitRepository.findByUuid(unitUuid);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const paymentData: any = {
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      method: data.method || 'Bank Transfer',
      status: data.status || 'SUCCESS',
      notes: data.notes || '',
    };

    let effectivePeriodStart = unit.rentStartDate ? new Date(unit.rentStartDate) : null;
    let effectivePeriodEnd = unit.rentDueDate ? new Date(unit.rentDueDate) : null;

    let shouldIncrementUnitDates = false;
    let newUnitStart: Date | null = null;
    let newUnitEnd: Date | null = null;

    if (data.paymentType === 'CURRENT' && unit.rentStartDate && unit.rentDueDate && unit.rentAmount) {
      const allPayments = await this.unitRepository.getRentPayments(unitUuid);
      
      const samePeriodPayments = allPayments.filter(p => 
        p.tenantId === unit.tenantId && 
        p.periodStart && 
        new Date(p.periodStart).getTime() === new Date(unit.rentStartDate as Date).getTime()
      );

      const totalPaidForPeriod = samePeriodPayments.reduce((sum, p) => sum + p.amount, 0);
      const balanceBeforeThisPayment = unit.rentAmount - totalPaidForPeriod;

      if (balanceBeforeThisPayment <= 0) {
        // They were ALREADY fully paid for the current cycle.
        // This new payment is technically advancing the cycle.
        shouldIncrementUnitDates = true;

        const start = new Date(unit.rentStartDate);
        const end = new Date(start);
        
        if (unit.rentType === 'Monthly') {
          end.setMonth(end.getMonth() + 1);
        } else if (unit.rentType === 'Annually' || unit.rentType === 'Yearly') {
          end.setFullYear(end.getFullYear() + 1);
        }
        
        newUnitStart = new Date(end);
        newUnitStart.setDate(newUnitStart.getDate() + 1);
        
        newUnitEnd = new Date(newUnitStart);
        if (unit.rentType === 'Monthly') {
          newUnitEnd.setMonth(newUnitEnd.getMonth() + 1);
        } else if (unit.rentType === 'Annually' || unit.rentType === 'Yearly') {
          newUnitEnd.setFullYear(newUnitEnd.getFullYear() + 1);
        }
        newUnitEnd.setDate(newUnitEnd.getDate() - 1);

        effectivePeriodStart = newUnitStart;
        effectivePeriodEnd = newUnitEnd;
      }
    }

    if (data.paymentType === 'PAST') {
      paymentData.periodStart = data.periodStart ? new Date(data.periodStart) : null;
      paymentData.periodEnd = data.periodEnd ? new Date(data.periodEnd) : null;
      
      if (data.isForCurrentTenant) {
        paymentData.tenantId = unit.tenantId;
        paymentData.notes = 'Past Payment';
      } else {
        paymentData.notes = data.tenantName ? `Past Payment (Tenant: ${data.tenantName})` : 'Past Payment';
      }
    } else {
      paymentData.periodStart = effectivePeriodStart;
      paymentData.periodEnd = effectivePeriodEnd;
      paymentData.tenantId = unit.tenantId;
    }

    const payment = await this.unitRepository.addRentPayment(unitUuid, paymentData);

    if (shouldIncrementUnitDates && newUnitStart && newUnitEnd) {
      await this.unitRepository.update(unitUuid, {
        rentStartDate: newUnitStart,
        rentDueDate: newUnitEnd
      });

      if (unit.isSynced && unit.userPropertyUuid) {
        await this.prisma.upward_user_property.updateMany({
          where: { uuid: unit.userPropertyUuid },
          data: {
            rentStartDate: newUnitStart,
            rentEndDate: newUnitEnd
          }
        });
      }
    }

    if (unit.isSynced && unit.userPropertyUuid) {
      const userProperty = await this.prisma.upward_user_property.findUnique({
        where: { uuid: unit.userPropertyUuid }
      });

      if (userProperty) {
        await this.prisma.upward_rent_cycle.create({
          data: {
            userId: userProperty.userId,
            userPropertyId: userProperty.id,
            amountOwed: payment.amount,
            amountPaid: payment.amount,
            currency: unit.currency,
            dueDate: payment.periodEnd || payment.paymentDate,
            paidAt: payment.paymentDate,
            status: 'PAID',
            description: payment.notes || 'Manual rent record (PM Dashboard)',
            source: 'PM_SYNC',
          }
        });
      }
    }

    return payment;
  }
}
