import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

function parseCalendarDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const datePart = trimmed.includes('T') ? trimmed.split('T')[0]! : trimmed;
    const [y, m, d] = datePart.split('-').map(Number);
    if (y && m && d) {
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
    }
    return null;
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
}

function calculatePeriodEnd(startDate: Date, rentType?: string | null, leaseYears?: number | null): Date {
  const normalizedRentType = (rentType || '').toUpperCase();
  if (normalizedRentType === 'MONTHLY') {
    return new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, startDate.getUTCDate() - 1, 0, 0, 0, 0));
  }
  const years = Math.max(1, leaseYears || 1);
  return new Date(Date.UTC(startDate.getUTCFullYear() + years, startDate.getUTCMonth(), startDate.getUTCDate() - 1, 0, 0, 0, 0));
}

async function backfillTenancyPeriods() {
  console.log('===============================================================');
  console.log('📦 HISTORICAL BACKFILL: UPWARD TENANCY PERIODS');
  console.log('===============================================================\n');

  const properties = await prisma.upward_user_property.findMany({
    include: {
      paymentRequests: {
        orderBy: { rentStartDate: 'asc' },
      },
      platformRentPayments: {
        orderBy: { periodStart: 'asc' },
      },
      pmUnit: {
        include: {
          rentPayments: {
            where: { status: 'SUCCESS' },
            orderBy: { periodStart: 'asc' },
          },
        },
      },
    },
  });

  console.log(`Processing ${properties.length} user properties...\n`);

  let totalCreated = 0;
  let totalAlreadyExisted = 0;
  let totalAmbiguous = 0;

  for (const prop of properties) {
    const periodMap = new Map<number, {
      startDate: Date;
      endDate: Date;
      rentAmount: number;
      isInitial: boolean;
      status: string;
      prIds: number[];
    }>();

    // 1. Collect from Payment Requests
    for (const pr of prop.paymentRequests) {
      const start = parseCalendarDate(pr.rentStartDate);
      if (!start) continue;
      let end = parseCalendarDate(pr.rentEndDate);
      if (!end || end.getTime() <= start.getTime()) {
        end = calculatePeriodEnd(start, prop.rentType, (prop as any).leaseYears);
      }
      const key = start.getTime();
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          startDate: start,
          endDate: end,
          rentAmount: pr.amount || prop.rentAmount || 0,
          isInitial: false,
          status: pr.status === 'PAID' ? 'SETTLED' : 'ACTIVE',
          prIds: [pr.id],
        });
      } else {
        periodMap.get(key)!.prIds.push(pr.id);
      }
    }

    // 2. Collect from Platform Rent Payments
    for (const rp of prop.platformRentPayments) {
      const start = parseCalendarDate(rp.periodStart);
      if (!start) continue;
      let end = parseCalendarDate(rp.periodEnd);
      if (!end || end.getTime() <= start.getTime()) {
        end = calculatePeriodEnd(start, prop.rentType, (prop as any).leaseYears);
      }
      const key = start.getTime();
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          startDate: start,
          endDate: end,
          rentAmount: rp.rentAmountAtPayment || prop.rentAmount || 0,
          isInitial: false,
          status: 'SETTLED',
          prIds: [],
        });
      }
    }

    // 3. Collect from PM Unit Rent Payments
    if (prop.pmUnit && prop.pmUnit.rentPayments) {
      for (const p of prop.pmUnit.rentPayments) {
        const start = parseCalendarDate(p.periodStart);
        if (!start) continue;
        let end = parseCalendarDate(p.periodEnd);
        if (!end || end.getTime() <= start.getTime()) {
          end = calculatePeriodEnd(start, prop.rentType, (prop as any).leaseYears);
        }
        const key = start.getTime();
        if (!periodMap.has(key)) {
          periodMap.set(key, {
            startDate: start,
            endDate: end,
            rentAmount: p.rentAmountAtPayment || prop.rentAmount || 0,
            isInitial: false,
            status: 'SETTLED',
            prIds: [],
          });
        }
      }
    }

    // 4. Ensure current active property period is included
    const currentStart = parseCalendarDate(prop.rentStartDate);
    const currentEnd = parseCalendarDate(prop.rentEndDate);

    if (currentStart && currentEnd && currentEnd.getTime() > currentStart.getTime()) {
      const key = currentStart.getTime();
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          startDate: currentStart,
          endDate: currentEnd,
          rentAmount: prop.rentAmount || 0,
          isInitial: false,
          status: prop.amountRemaining === 0 ? 'SETTLED' : 'ACTIVE',
          prIds: [],
        });
      }
    } else if (periodMap.size === 0) {
      totalAmbiguous++;
      continue;
    }

    const sortedPeriods = Array.from(periodMap.values()).sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime(),
    );

    // Mark the earliest period as initial
    if (sortedPeriods.length > 0) {
      sortedPeriods[0]!.isInitial = true;
    }

    // Insert or link each period
    for (let i = 0; i < sortedPeriods.length; i++) {
      const p = sortedPeriods[i]!;
      const sequenceNumber = i + 1;

      let existing = await (prisma as any).upward_tenancy_period.findFirst({
        where: {
          userPropertyId: prop.id,
          startDate: p.startDate,
          endDate: p.endDate,
        },
      });

      if (existing) {
        totalAlreadyExisted++;
      } else {
        existing = await (prisma as any).upward_tenancy_period.create({
          data: {
            userPropertyId: prop.id,
            startDate: p.startDate,
            endDate: p.endDate,
            rentAmount: p.rentAmount,
            currency: prop.currency || 'NGN',
            sequenceNumber,
            isInitial: p.isInitial,
            status: p.status,
          },
        });
        totalCreated++;
      }

      // Link payment requests to this tenancy period
      if (p.prIds.length > 0 && existing) {
        await prisma.upward_payment_request.updateMany({
          where: { id: { in: p.prIds }, tenancyPeriodId: null },
          data: { tenancyPeriodId: existing.id },
        });

        await prisma.upward_transaction.updateMany({
          where: { paymentRequestId: { in: p.prIds }, tenancyPeriodId: null },
          data: { tenancyPeriodId: existing.id },
        });
      }
    }
  }

  console.log('===============================================================');
  console.log('📊 BACKFILL SUMMARY:');
  console.log(`  - Tenancy Periods Created:         ${totalCreated}`);
  console.log(`  - Tenancy Periods Already Existed: ${totalAlreadyExisted}`);
  console.log(`  - Ambiguous / Skipped Properties:  ${totalAmbiguous}`);
  console.log('===============================================================');
}

backfillTenancyPeriods()
  .catch((e) => console.error(e))
  .finally(async () => prisma.$disconnect());
