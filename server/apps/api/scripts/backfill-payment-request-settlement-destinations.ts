import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const prisma = new PrismaClient();

async function main() {
  console.log('=== Evidence-Based Settlement Destination Backfill ===\n');

  const pendingTxs = await prisma.upward_transaction.findMany({
    where: {
      settlementStatus: 'VERIFIED',
      status: 'SUCCESS'
    },
    include: {
      paymentRequest: {
        include: {
          manualAccount: true,
          subaccount: true,
          userProperty: {
            include: {
              manualAccount: true,
              subaccount: true,
              pmUnit: {
                include: {
                  property: {
                    include: {
                      manualAccount: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  console.log(`Found ${pendingTxs.length} verified transactions to evaluate for backfill.\n`);

  let backfilledCount = 0;
  let flaggedCount = 0;
  let alreadyBoundCount = 0;

  for (const tx of pendingTxs) {
    const pr = tx.paymentRequest;
    if (!pr) {
      console.log(`[FLAGGED] Tx ${tx.reference} (ID: ${tx.id}): No linked Payment Request.`);
      flaggedCount++;
      continue;
    }

    if (pr.manualAccountId || pr.subaccountId) {
      console.log(`[OK] Tx ${tx.reference} (ID: ${tx.id}, PR: ${pr.id}): Already bound to ${pr.manualAccountId ? `manualAccount ${pr.manualAccountId}` : `subaccount ${pr.subaccountId}`}.`);
      alreadyBoundCount++;
      continue;
    }

    // Check for unambiguous historical evidence:
    // 1. PM Payment Request linked to this PR
    const pmPR = await prisma.upward_pm_payment_request.findFirst({
      where: { paymentRequestId: pr.id }
    });

    if (pmPR?.manualAccountId) {
      await prisma.upward_payment_request.update({
        where: { id: pr.id },
        data: { manualAccountId: pmPR.manualAccountId }
      });
      console.log(`[BACKFILLED via PM_PR] Tx ${tx.reference} (ID: ${tx.id}, PR: ${pr.id}) -> bound to manualAccount ${pmPR.manualAccountId}`);
      backfilledCount++;
      continue;
    }

    // 2. Property settlement account configuration at the unit/property level
    const userProp = pr.userProperty;
    const propertyManualAccId = userProp?.manualAccountId || userProp?.pmUnit?.property?.manualAccountId;
    const propertySubaccId = userProp?.subaccountId;

    if (propertyManualAccId) {
      await prisma.upward_payment_request.update({
        where: { id: pr.id },
        data: { manualAccountId: propertyManualAccId }
      });
      console.log(`[BACKFILLED via UserProperty] Tx ${tx.reference} (ID: ${tx.id}, PR: ${pr.id}) -> bound to manualAccount ${propertyManualAccId}`);
      backfilledCount++;
      continue;
    }

    if (propertySubaccId) {
      await prisma.upward_payment_request.update({
        where: { id: pr.id },
        data: { subaccountId: propertySubaccId }
      });
      console.log(`[BACKFILLED via UserProperty Subaccount] Tx ${tx.reference} (ID: ${tx.id}, PR: ${pr.id}) -> bound to subaccount ${propertySubaccId}`);
      backfilledCount++;
      continue;
    }

    // No evidence found: DO NOT GUESS -> FLAG FOR MANUAL REVIEW
    console.log(`[FLAGGED_FOR_REVIEW] Tx ${tx.reference} (ID: ${tx.id}, PR: ${pr.id}): No historical settlement account evidence found. Left unassigned.`);
    flaggedCount++;
  }

  console.log(`\n=== Backfill Summary ===`);
  console.log(`Total Evaluated: ${pendingTxs.length}`);
  console.log(`Already Bound: ${alreadyBoundCount}`);
  console.log(`Successfully Backfilled: ${backfilledCount}`);
  console.log(`Flagged for Manual Review: ${flaggedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
