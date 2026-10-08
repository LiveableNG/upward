import { PrismaClient, UpwardPaymentStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../server/apps/api/.env') });

const prisma = new PrismaClient();

const PM_ID = 38;

async function prepareNormalBillingFlow() {
  console.log('\n====================================================================');
  console.log(`      PREPARING NORMAL BILLING SCENARIO FOR PM #${PM_ID}             `);
  console.log('====================================================================\n');

  const today = new Date();
  const todayDay = today.getDate(); // e.g. 24

  // 1. Ensure Subscription has anniversaryDate = todayDay, tier = TIER_3, status = ACTIVE
  const sub = await prisma.upward_subscription.update({
    where: { pmId: PM_ID },
    data: {
      tier: 'TIER_3',
      status: 'ACTIVE',
      anniversaryDate: todayDay,
      priceYearly: 2250,
      priceMonthly: 187.5,
      graceStartedAt: null,
    },
  });
  console.log(`✅ Step 1: Subscription updated for PM #${PM_ID}:`);
  console.log(`   - Tier: ${sub.tier}`);
  console.log(`   - Status: ${sub.status}`);
  console.log(`   - Anniversary Day: ${sub.anniversaryDate} (Today: ${todayDay})`);

  // 2. Ensure Wallet has sufficient balance
  const wallet = await prisma.upward_pm_wallet.findUnique({ where: { pmId: PM_ID } });
  if (!wallet) {
    await prisma.upward_pm_wallet.create({
      data: { pmId: PM_ID, balance: 57250, isActive: true },
    });
  } else if (wallet.balance < 1000) {
    await prisma.upward_pm_wallet.update({
      where: { pmId: PM_ID },
      data: { balance: 57250 },
    });
  }
  const currentWallet = await prisma.upward_pm_wallet.findUnique({ where: { pmId: PM_ID } });
  console.log(`✅ Step 2: PM Wallet balance verified -> ₦${currentWallet?.balance.toLocaleString()}`);

  // 3. Create a PENDING Subscription Invoice due for deduction today
  const unitCount = 1;
  const amount = 187.5; // Monthly rate for 1 unit at TIER_3

  const invoice = await prisma.upward_subscription_invoice.create({
    data: {
      pmId: PM_ID,
      unitCount,
      amount,
      invoiceDate: today,
      deductionDate: today,
      paymentStatus: UpwardPaymentStatus.PENDING,
    },
  });
  console.log(`✅ Step 3: Created PENDING Subscription Invoice:`);
  console.log(`   - Invoice ID #${invoice.id}`);
  console.log(`   - Amount: ₦${invoice.amount}`);
  console.log(`   - Deduction Date: ${invoice.deductionDate.toISOString().split('T')[0]}`);
  console.log(`   - Payment Status: ${invoice.paymentStatus}`);

  console.log('\n--------------------------------------------------------------------');
  console.log('🚀 READY TO RUN CRON JOB!');
  console.log('Run the cron test script or execute:');
  console.log('npx tsx scripts/run-subscription-cron.ts');
  console.log('--------------------------------------------------------------------\n');
}

prepareNormalBillingFlow()
  .catch((err) => console.error('Error preparing test scenario:', err))
  .finally(() => prisma.$disconnect());
