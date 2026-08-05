import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function applyDiscountAndFundWallet(pmEmail: string, isDryRun: boolean) {
  console.log(`\n--- Starting process for ${pmEmail} [${isDryRun ? 'DRY RUN' : 'COMMIT'}] ---`);
  
  // Calculate the deterministic email hash used in the database
  const emailHash = crypto.createHash('sha256').update(pmEmail.toLowerCase().trim()).digest('hex');

  const pm = await prisma.upward_property_manager.findUnique({
    where: { emailHash },
    include: { wallet: true, subscription: true }
  });

  if (!pm) {
    console.error("❌ PM not found in the database (hashed search failed).");
    return;
  }

  if (!pm.wallet) {
    console.error("❌ Wallet not found for PM.");
    return;
  }

  if (!pm.subscription) {
    console.error("❌ Subscription not found for PM.");
    return;
  }

  const amountPaid = 95000;
  const newRate = 1900;

  console.log('\n🔍 CURRENT STATE:');
  console.log(`- PM ID: ${pm.id}`);
  console.log(`- Current Wallet Balance: NGN ${pm.wallet.balance}`);
  console.log(`- Current Subscription Tier: ${pm.subscription.tier}`);
  console.log(`- Current Price Yearly: NGN ${pm.subscription.priceYearly}`);
  console.log(`- Current Initial Deposit Paid: ${pm.subscription.isInitialDepositPaid}`);

  console.log('\n✨ PROPOSED CHANGES:');
  console.log(`- Wallet Balance: NGN ${pm.wallet.balance} -> NGN ${pm.wallet.balance + amountPaid}`);
  console.log(`- Add Wallet Transaction: DEPOSIT of NGN ${amountPaid} (Manual payment deposit)`);
  console.log(`- Subscription Price Yearly: NGN ${pm.subscription.priceYearly} -> NGN ${newRate}`);
  console.log(`- Subscription Price Monthly: NGN ${pm.subscription.priceMonthly} -> NGN ${newRate / 12}`);
  console.log(`- Subscription Initial Deposit Paid: ${pm.subscription.isInitialDepositPaid} -> true`);
  console.log(`- Discount Applied: FIXED value of 350 (2250 - 1900)`);

  if (isDryRun) {
    console.log('\n✅ DRY RUN COMPLETE. No changes were made to the database.');
    return;
  }

  console.log('\n⏳ Committing changes to the database...');
  await prisma.$transaction(async (tx) => {
    // 1. Add the 95,000 NGN payment to their wallet
    await tx.upward_pm_wallet.update({
      where: { id: pm.wallet.id },
      data: { balance: pm.wallet.balance + amountPaid },
    });

    await tx.upward_pm_wallet_transaction.create({
      data: {
        walletId: pm.wallet.id,
        pmId: pm.id,
        type: 'DEPOSIT',
        amount: amountPaid,
        narration: 'Manual payment deposit',
        status: 'SUCCESS'
      },
    });

    // 2. Apply the custom rate of 1900/unit/year and mark initial deposit as paid
    await tx.upward_subscription.update({
      where: { id: pm.subscription.id },
      data: { 
        priceYearly: newRate,
        priceMonthly: newRate / 12,
        isInitialDepositPaid: true,
        // Since we explicitly set the new rate, we don't need to add a discount field, 
        // to prevent double-discounting.
        discountType: null,
        discountValue: null,
        discountReason: 'Custom negotiated rate: 1900/unit/year'
      },
    });
  });

  console.log(`\n🎉 COMMIT SUCCESSFUL! Credited NGN ${amountPaid} and applied custom rate of NGN ${newRate} to ${pmEmail}.`);
}

const targetEmail = 'o.adenekanandco@gmail.com';
const isDryRun = !process.argv.includes('--commit'); // Defaults to dry run unless --commit is passed

applyDiscountAndFundWallet(targetEmail, isDryRun)
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
