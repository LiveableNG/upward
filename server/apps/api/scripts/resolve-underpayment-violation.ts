import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isCommit = process.argv.includes('--commit');
const isDryRun = !isCommit;

async function main() {
  console.log(`\n======================================================`);
  console.log(`MODE: ${isCommit ? '*** LIVE COMMIT ***' : '*** DRY RUN (NO DB CHANGES WILL BE SAVED) ***'}`);
  console.log(`======================================================\n`);

  const tx93Id = 93;
  const tx94Id = 94;
  const prId = 149;
  const userPropertyId = 455;
  const userId = 494;

  // Initial read
  const prBefore = await prisma.upward_payment_request.findUnique({
    where: { id: prId },
    include: { lineItemRecords: true, subaccount: true }
  });
  const tx93Before = await prisma.upward_transaction.findUnique({ where: { id: tx93Id } });
  const tx94Before = await prisma.upward_transaction.findUnique({ where: { id: tx94Id } });
  const propBefore = await prisma.upward_user_property.findUnique({ where: { id: userPropertyId } });
  const refundLogsBefore = await prisma.upward_refund_log.findMany({
    where: { transactionId: { in: [tx93Id, tx94Id] } }
  });

  console.log('--- CURRENT DATABASE STATE ---');
  console.log(`Payment Request #${prId}: Status=${prBefore?.status}, Amount=${prBefore?.amount}, Paid=${prBefore?.amountPaid}, AllowPartial=${prBefore?.allowPartial}`);
  console.log(`Tx #93: Ref=${tx93Before?.reference}, Amount=${tx93Before?.amount}, Status=${tx93Before?.status}, SettlementStatus=${tx93Before?.settlementStatus}`);
  console.log(`Tx #94: Ref=${tx94Before?.reference}, Amount=${tx94Before?.amount}, Status=${tx94Before?.status}, SettlementStatus=${tx94Before?.settlementStatus}`);
  console.log(`UserProperty #${userPropertyId}: Dates=${propBefore?.rentStartDate?.toISOString().split('T')[0]} to ${propBefore?.rentEndDate?.toISOString().split('T')[0]}, Paid=${propBefore?.amountPaid}, Remaining=${propBefore?.amountRemaining}`);
  console.log(`Refund Logs: ${refundLogsBefore.map(r => `[Log #${r.id}: Tx #${r.transactionId}, Status=${r.status}, Reason=${r.reason}]`).join(', ')}`);
  console.log('------------------------------\n');

  const finalPaidAt = new Date('2026-11-05T16:35:36.691Z');

  try {
    await prisma.$transaction(async (txClient) => {
      // 1. Tenancy Period (Year 2 Renewal: 2026-11-23 to 2027-11-22)
      const startDate = new Date('2026-11-23T00:00:00.000Z');
      const endDate = new Date('2027-11-22T00:00:00.000Z');

      let renewalPeriod = await txClient.upward_tenancy_period.findFirst({
        where: {
          userPropertyId,
          startDate,
          endDate,
        }
      });

      if (!renewalPeriod) {
        renewalPeriod = await txClient.upward_tenancy_period.create({
          data: {
            userPropertyId,
            startDate,
            endDate,
            rentAmount: 21600000,
            currency: 'NGN',
            sequenceNumber: 2,
            isInitial: false,
            status: 'SETTLED',
          }
        });
        console.log(`[ACTION] Created renewal upward_tenancy_period #${renewalPeriod.id} (2026-11-23 to 2027-11-22)`);
      } else {
        renewalPeriod = await txClient.upward_tenancy_period.update({
          where: { id: renewalPeriod.id },
          data: { status: 'SETTLED', rentAmount: 21600000 }
        });
        console.log(`[ACTION] Updated existing upward_tenancy_period #${renewalPeriod.id} to SETTLED`);
      }

      // 2. Update Payment Request 149
      const finalPaidAt = new Date('2026-11-05T16:35:36.691Z');
      const updatedPr = await txClient.upward_payment_request.update({
        where: { id: prId },
        data: {
          allowPartial: true,
          amountPaid: 21600000,
          status: 'PAID',
          paidAt: finalPaidAt,
          rentStartDate: startDate,
          rentEndDate: endDate,
          tenancyPeriodId: renewalPeriod.id,
        }
      });
      console.log(`[ACTION] Updated upward_payment_request #${prId}: status='PAID', amountPaid=21,600,000, rentStartDate=2026-11-23, rentEndDate=2027-11-22, tenancyPeriodId=${renewalPeriod.id}`);

      // 3. Update Line Item 201 ("Rent")
      const rentLineItem = await txClient.upward_payment_line_item.findFirst({
        where: { paymentRequestId: prId, name: { contains: 'rent', mode: 'insensitive' } }
      });
      if (rentLineItem) {
        await txClient.upward_payment_line_item.update({
          where: { id: rentLineItem.id },
          data: {
            amountPaid: 21600000,
            status: 'PAID',
          }
        });
        console.log(`[ACTION] Updated upward_payment_line_item #${rentLineItem.id} ("${rentLineItem.name}"): status='PAID', amountPaid=21,600,000`);
      }

      // 4. Update Tx 93 (₦21,000,000 - Tranche 1)
      const updatedTx93 = await txClient.upward_transaction.update({
        where: { id: tx93Id },
        data: {
          settlementStatus: 'VERIFIED',
          lineItems: [
            {
              name: 'Rent',
              label: 'Rent',
              amount: 21000000,
              category: 'Package',
            }
          ],
          rentStartDate: startDate,
          rentEndDate: endDate,
          totalInvoiceAmount: 21600000,
          historicalPaidToDate: 21000000,
          remainingBalance: 600000,
          isPartial: true,
          tenancyPeriodId: renewalPeriod.id,
        }
      });
      console.log(`[ACTION] Updated Tx #93: settlementStatus='VERIFIED', isPartial=true, historicalPaidToDate=21M, remainingBalance=600k`);

      // 5. Update Tx 94 (₦600,000 - Tranche 2, completes invoice)
      const updatedTx94 = await txClient.upward_transaction.update({
        where: { id: tx94Id },
        data: {
          settlementStatus: 'VERIFIED',
          lineItems: [
            {
              name: 'Rent',
              label: 'Rent',
              amount: 600000,
              category: 'Package',
            }
          ],
          rentStartDate: startDate,
          rentEndDate: endDate,
          totalInvoiceAmount: 21600000,
          historicalPaidToDate: 21600000,
          remainingBalance: 0,
          isPartial: false,
          tenancyPeriodId: renewalPeriod.id,
        }
      });
      console.log(`[ACTION] Updated Tx #94: settlementStatus='VERIFIED', isPartial=false, historicalPaidToDate=21.6M, remainingBalance=0`);

      // 6. Update User Property 455
      const updatedProp = await txClient.upward_user_property.update({
        where: { id: userPropertyId },
        data: {
          rentStartDate: startDate,
          rentEndDate: endDate,
          amountPaid: 21600000,
          amountRemaining: 0,
          isFirstRent: false,
        }
      });
      console.log(`[ACTION] Updated upward_user_property #${userPropertyId}: Dates advanced to ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}, Paid=21.6M, Remaining=0`);

      // 7. Upsert Rent Scoring Cycle (upward_rent_cycle)
      const existingCycle = await txClient.upward_rent_cycle.findFirst({
        where: { paymentRequestId: prId }
      });

      const cycleData = {
        userId,
        userPropertyId,
        paymentRequestId: prId,
        source: 'PAYMENT_REQUEST',
        amountOwed: 21600000,
        amountPaid: 21600000,
        currency: 'NGN',
        dueDate: new Date('2026-11-23T00:00:00.000Z'),
        paidAt: finalPaidAt,
        status: 'PAID_ON_TIME',
        description: 'Rent Payment for 4B Muri Okunola Extension',
      };

      if (existingCycle) {
        await txClient.upward_rent_cycle.update({
          where: { id: existingCycle.id },
          data: cycleData,
        });
        console.log(`[ACTION] Updated existing upward_rent_cycle #${existingCycle.id}: status='PAID_ON_TIME' (Score Protected)`);
      } else {
        const newCycle = await txClient.upward_rent_cycle.create({
          data: cycleData,
        });
        console.log(`[ACTION] Created new upward_rent_cycle #${newCycle.id}: status='PAID_ON_TIME', Due=2026-11-23, Paid=2026-11-05 (18 days early!)`);
      }

      // 8. Create Platform Rent Payment Ledgers
      const existingLedgers = await txClient.upward_platform_rent_payment.findMany({
        where: { userPropertyId, tenancyPeriodId: renewalPeriod.id }
      });

      if (existingLedgers.length === 0) {
        await txClient.upward_platform_rent_payment.create({
          data: {
            userPropertyId,
            amount: 21000000,
            rentAmountAtPayment: 21600000,
            paymentDate: tx93Before?.createdAt || new Date('2026-11-05T15:20:22.678Z'),
            method: 'PAYSTACK',
            status: 'SUCCESS',
            notes: 'Rent Payment (Tranche 1 - ₦21M) for 4B Muri Okunola Extension',
            periodStart: startDate,
            periodEnd: endDate,
            tenancyPeriodId: renewalPeriod.id,
          }
        });
        await txClient.upward_platform_rent_payment.create({
          data: {
            userPropertyId,
            amount: 600000,
            rentAmountAtPayment: 21600000,
            paymentDate: tx94Before?.createdAt || new Date('2026-11-05T16:35:36.691Z'),
            method: 'PAYSTACK',
            status: 'SUCCESS',
            notes: 'Rent Payment (Tranche 2 - ₦600k) for 4B Muri Okunola Extension',
            periodStart: startDate,
            periodEnd: endDate,
            tenancyPeriodId: renewalPeriod.id,
          }
        });
        console.log(`[ACTION] Created 2 upward_platform_rent_payment ledger entries (Tranche 1: ₦21M, Tranche 2: ₦600k)`);
      } else {
        console.log(`[INFO] Platform rent payment ledgers already exist (${existingLedgers.length} records), skipping creation`);
      }

      // 9. Update Refund Logs to PM_ACCEPTED
      for (const log of refundLogsBefore) {
        await txClient.upward_refund_log.update({
          where: { id: log.id },
          data: {
            status: 'PM_ACCEPTED',
            actionBy: 'ADMIN_OVERRIDE',
            resolvedAt: new Date(),
            metadata: {
              ...(log.metadata as any || {}),
              resolution: 'RESOLVED_AS_FULL_PAYMENT_CUMULATIVE',
              acceptedAt: new Date(),
              note: 'Tenant completed full payment of ₦21.6M across Tx 93 and Tx 94',
            }
          }
        });
        console.log(`[ACTION] Resolved refund log #${log.id} (Tx #${log.transactionId}): status='PM_ACCEPTED'`);
      }

      if (isDryRun) {
        console.log(`\n>>> [DRY RUN SUCCESSFUL] All queries validated successfully.`);
        console.log(`>>> Rolling back transaction now so database remains untouched.\n`);
        throw new Error('DRY_RUN_ROLLBACK');
      }
    }, { timeout: 30000 });

    const webhookPayload = {
      paymentUuid: prBefore?.uuid,
      transactionUuid: tx94Before?.uuid,
      reference: tx94Before?.reference,
      lineItems: {
        Rent: 21600000,
      },
      currency: 'NGN',
      status: 'PAID',
      paidAt: finalPaidAt,
      customerEmail: 'captzino@zinoaviation.com',
      externalUnitId: '10376',
      isUnderpayment: false,
      settlementStatus: 'VERIFIED',
    };

    if (isDryRun) {
      console.log(`\n--- WEBHOOK DISPATCH PREVIEW (Simulated) ---`);
      console.log(`Platform ID: 1 (GoodTenants)`);
      console.log(`Target URL: https://api.goodtenants.io/api-upward/v1/webhook`);
      console.log(`Event: payment.updated`);
      console.log(`Log table: upward_webhook_log (direction='OUTGOING', status='SENT')`);
      console.log(`Payload preview:\n${JSON.stringify({ event: 'payment.updated', data: webhookPayload }, null, 2)}`);
      console.log(`-------------------------------------------\n`);
    }

    if (isCommit) {
      console.log(`\n======================================================`);
      console.log(`[COMMIT COMPLETED] All database updates saved successfully!`);
      console.log(`======================================================\n`);

      console.log(`[ACTION] Logging and dispatching webhook to GoodTenants...`);
      const webhookLog = await prisma.upward_webhook_log.create({
        data: {
          platformId: 1,
          event: 'payment.updated',
          url: 'https://api.goodtenants.io/api-upward/v1/webhook',
          payload: {
            event: 'payment.updated',
            data: webhookPayload,
          },
          status: 'PENDING',
          retries: 0,
          direction: 'OUTGOING',
        }
      });

      try {
        const resp = await fetch('https://api.goodtenants.io/api-upward/v1/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment.updated',
            data: webhookPayload,
          }),
        });

        await prisma.upward_webhook_log.update({
          where: { id: webhookLog.id },
          data: {
            status: resp.ok ? 'SENT' : 'FAILED',
            responseCode: resp.status,
            lastTriedAt: new Date(),
            errorMessage: resp.ok ? null : `Platform returned HTTP ${resp.status}`,
          }
        });

        console.log(`[WEBHOOK SUCCESS] Delivered to GoodTenants! Status=${resp.ok ? 'SENT' : 'FAILED'}, HTTP ${resp.status}, Log ID=${webhookLog.id}`);
      } catch (webhookErr: any) {
        await prisma.upward_webhook_log.update({
          where: { id: webhookLog.id },
          data: {
            status: 'FAILED',
            errorMessage: webhookErr.message,
            lastTriedAt: new Date(),
          }
        });
        console.error(`[WEBHOOK WARNING] Dispatch failed, recorded in upward_webhook_log for retry: ${webhookErr.message}`);
      }
    }
  } catch (err: any) {
    if (err.message === 'DRY_RUN_ROLLBACK') {
      console.log(`Verification completed: Rollback confirmed. Database is unchanged.\n`);

      const webhookPayload = {
        paymentUuid: prBefore?.uuid,
        transactionUuid: tx94Before?.uuid,
        reference: tx94Before?.reference,
        lineItems: {
          Rent: 21600000,
        },
        currency: 'NGN',
        status: 'PAID',
        paidAt: finalPaidAt,
        customerEmail: 'captzino@zinoaviation.com',
        externalUnitId: '10376',
        isUnderpayment: false,
        settlementStatus: 'VERIFIED',
      };

      console.log(`--- WEBHOOK DISPATCH PREVIEW (Ready for --commit) ---`);
      console.log(`Platform ID: 1 (GoodTenants)`);
      console.log(`Target URL: https://api.goodtenants.io/api-upward/v1/webhook`);
      console.log(`Event: payment.updated`);
      console.log(`Table logged to: upward_webhook_log (direction='OUTGOING', status='SENT')`);
      console.log(`Payload preview:\n${JSON.stringify({ event: 'payment.updated', data: webhookPayload }, null, 2)}`);
      console.log(`------------------------------------------------------\n`);
    } else {
      console.error(`Transaction failed:`, err);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
