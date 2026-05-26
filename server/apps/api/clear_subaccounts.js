const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.resolve(__dirname, './.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts
        .join('=')
        .trim()
        .replace(/^["'](.*)["']$/, '$1');
      process.env[key.trim()] = value;
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting cleanup of subaccounts and Dedicated Virtual Accounts (DVA)...');

  try {
    // 1. Set subaccountId to null on upward_user_property
    console.log('🔄 Setting subaccountId to null on upward_user_property...');
    const updatedProperties = await prisma.upward_user_property.updateMany({
      data: {
        subaccountId: null,
      },
    });
    console.log(`✅ Updated ${updatedProperties.count} properties.`);

    // 2. Set subaccountId to null on upward_payment_request
    console.log('🔄 Setting subaccountId to null on upward_payment_request...');
    const updatedPaymentRequests = await prisma.upward_payment_request.updateMany({
      data: {
        subaccountId: null,
      },
    });
    console.log(`✅ Updated ${updatedPaymentRequests.count} payment requests.`);

    // 3. Set subaccountId to null on upward_saved_landlord
    console.log('🔄 Setting subaccountId to null on upward_saved_landlord...');
    const updatedLandlords = await prisma.upward_saved_landlord.updateMany({
      data: {
        subaccountId: null,
      },
    });
    console.log(`✅ Updated ${updatedLandlords.count} saved landlords.`);

    // 4. Delete all Dedicated Virtual Accounts (DVA)
    console.log('🗑️ Deleting all entries from Dedicated Virtual Accounts (DVA)...');
    const deletedDVAs = await prisma.upward_dedicated_virtual_account.deleteMany({});
    console.log(`✅ Deleted ${deletedDVAs.count} DVA records.`);

    // 5. Delete all Paystack subaccounts
    console.log('🗑️ Deleting all entries from Paystack subaccounts...');
    const deletedSubaccounts = await prisma.upward_paystack_subaccount.deleteMany({});
    console.log(`✅ Deleted ${deletedSubaccounts.count} subaccount records.`);

    console.log('🎉 Database cleanup complete! Ready for fresh DVA and subaccount creation.');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
