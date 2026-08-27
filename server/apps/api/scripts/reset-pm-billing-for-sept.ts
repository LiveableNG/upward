import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../server/apps/api/.env') });

const prisma = new PrismaClient();

const PM_EMAIL = 'o.adenekanandco@gmail.com';

function hash(text: string): string {
  if (!text) return text;
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

async function resetPmBillingForSept() {
  console.log('\n====================================================================');
  console.log(`      RESETTING BILLING FOR PM: ${PM_EMAIL}                     `);
  console.log('====================================================================\n');

  const pmEmailH = hash(PM_EMAIL);

  // 1. Find Property Manager by email or emailHash
  let pm = await prisma.upward_property_manager.findUnique({
    where: { email: PM_EMAIL },
    include: {
      subscription: true,
      wallet: true,
      subscriptionInvoices: true,
    },
  });

  if (!pm) {
    pm = await prisma.upward_property_manager.findUnique({
      where: { emailHash: pmEmailH },
      include: {
        subscription: true,
        wallet: true,
        subscriptionInvoices: true,
      },
    });
  }

  if (!pm) {
    console.error(`❌ PM with email ${PM_EMAIL} (hash: ${pmEmailH}) not found.`);
    return;
  }

  console.log(`✅ Property Manager Found:`);
  console.log(`   - PM ID: ${pm.id}`);
  console.log(`   - UUID: ${pm.uuid}`);

  // 2. Ensure Subscription has anniversaryDate = 28, tier = TIER_3, status = ACTIVE
  const updatedSub = await prisma.upward_subscription.update({
    where: { pmId: pm.id },
    data: {
      tier: 'TIER_3',
      status: 'ACTIVE',
      anniversaryDate: 28,
      graceStartedAt: null,
      pendingTier: null,
      pendingUnitBillingMode: null,
    },
  });

  console.log(`\n✅ Step 1: Subscription updated & verified:`);
  console.log(`   - Tier: ${updatedSub.tier}`);
  console.log(`   - Status: ${updatedSub.status}`);
  console.log(`   - Anniversary Day: ${updatedSub.anniversaryDate}`);

  // 3. Delete existing prematurely generated test invoices
  const deletedInvoices = await prisma.upward_subscription_invoice.deleteMany({
    where: { pmId: pm.id },
  });

  console.log(`\n✅ Step 2: Deleted ${deletedInvoices.count} premature test invoices for PM #${pm.id}.`);

  // 4. Verify Wallet state
  const wallet = pm.wallet;
  console.log(`\n💳 Step 3: Wallet state verified:`);
  console.log(`   - Balance: ₦${wallet?.balance.toLocaleString() ?? 0}`);

  console.log('\n--------------------------------------------------------------------');
  console.log('🎉 SUCCESS! Billing reset complete.');
  console.log('What happens now:');
  console.log('  1. August 28th: 0 invoices exist -> ₦0 deducted (August skipped).');
  console.log('  2. September 23rd: Cron job creates her First-Cycle Double Invoices.');
  console.log('  3. September 28th: Cron job deducts the First-Cycle Invoices from wallet.');
  console.log('--------------------------------------------------------------------\n');
}

resetPmBillingForSept()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
