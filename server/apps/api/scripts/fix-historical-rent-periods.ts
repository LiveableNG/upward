import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting historical rent period correction script...\n');

  // Parse arguments for --commit
  const isCommit = process.argv.includes('--commit');
  if (!isCommit) {
    console.log('*** DRY RUN MODE ***');
    console.log('No changes will be saved to the database. Run with --commit to apply changes.\n');
  } else {
    console.log('*** COMMIT MODE ***');
    console.log('Changes WILL be saved to the database.\n');
  }

  try {
    const units = await prisma.upward_pm_unit.findMany({
      where: {
        status: 'OCCUPIED',
      },
      include: {
        rentPayments: {
          where: {
            status: 'SUCCESS',
          },
          orderBy: {
            paymentDate: 'asc',
          },
        },
      },
    });

    console.log(`Found ${units.length} occupied units.\n`);
    let updatedCount = 0;

    for (const unit of units) {
      if (unit.rentAmount <= 0) {
        console.log(`[SKIP] Unit ${unit.uuid}: Rent amount is 0 or less.`);
        continue;
      }

      if (unit.rentPayments.length === 0) {
        console.log(`[SKIP] Unit ${unit.uuid}: No successful rent payments found.`);
        continue;
      }

      // 1. Calculate total paid
      const totalPaid = unit.rentPayments.reduce((acc, p) => acc + p.amount, 0);

      // 2. Determine full cycles paid
      const fullCyclesPaid = Math.floor(totalPaid / unit.rentAmount);

      // 3. Find the true baseline start date (the oldest payment's periodStart or the unit's current rentStartDate)
      const oldestPayment = unit.rentPayments[0];
      const baselineDateStr = oldestPayment?.periodStart || unit.rentStartDate;

      if (!baselineDateStr) {
        console.log(`[SKIP] Unit ${unit.uuid}: No baseline rentStartDate could be determined.`);
        continue;
      }

      const baselineDate = new Date(baselineDateStr);
      let newStartDate = new Date(baselineDate);
      let newDueDate = new Date(baselineDate);

      // 4. Advance dates based on renewals (first paid cycle covers baseline, so advancements = fullCyclesPaid - 1)
      const advancements = Math.max(0, fullCyclesPaid - 1);
      const rentInterval = unit.rentType; // e.g. "Monthly", "Annually"

      if (rentInterval.toLowerCase() === 'monthly') {
        newStartDate.setMonth(newStartDate.getMonth() + advancements);
        newDueDate.setMonth(newDueDate.getMonth() + advancements + 1);
      } else {
        // Assume Yearly/Annually
        newStartDate.setFullYear(newStartDate.getFullYear() + advancements);
        newDueDate.setFullYear(newDueDate.getFullYear() + advancements + 1);
      }

      // Check if dates actually drifted
      const currentDueDateStr = unit.rentDueDate ? new Date(unit.rentDueDate).toISOString() : 'None';
      const currentStartDateStr = unit.rentStartDate ? new Date(unit.rentStartDate).toISOString() : 'None';

      const needsUpdate = currentDueDateStr !== newDueDate.toISOString() || currentStartDateStr !== newStartDate.toISOString();

      if (needsUpdate) {
        console.log(`[FIX] Unit ${unit.uuid} (Tenant ${unit.tenantId}):`);
        console.log(`  - Total Paid: ${totalPaid} (Rent: ${unit.rentAmount})`);
        console.log(`  - Full Cycles Paid: ${fullCyclesPaid}`);
        console.log(`  - Baseline Date: ${baselineDate.toISOString()}`);
        console.log(`  - Old Start Date: ${currentStartDateStr} -> New Start Date: ${newStartDate.toISOString()}`);
        console.log(`  - Old Due Date: ${currentDueDateStr} -> New Due Date: ${newDueDate.toISOString()}`);

        if (isCommit) {
          await prisma.upward_pm_unit.update({
            where: { id: unit.id },
            data: {
              rentStartDate: newStartDate,
              rentDueDate: newDueDate,
            },
          });

          if (unit.userPropertyUuid) {
            await prisma.upward_user_property.updateMany({
              where: { uuid: unit.userPropertyUuid },
              data: {
                rentStartDate: newStartDate,
                rentEndDate: newDueDate,
              },
            });
            console.log(`  - Synced to UpwardPay user property ${unit.userPropertyUuid}`);
          }
          console.log(`  - Updated successfully.`);
          updatedCount++;
        }
      } else {
        console.log(`[OK] Unit ${unit.uuid}: Dates are already correct.`);
      }
    }

    console.log(`\nFinished. ${updatedCount} units were updated.`);

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
