const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prUuid = '65f7d8fe-e8ef-483b-85a2-bf2954cbf690';
  console.log(`Searching for payment request with UUID: ${prUuid}`);

  const pr = await prisma.upward_payment_request.findUnique({
    where: { uuid: prUuid },
    include: {
      user: true
    }
  });

  if (!pr) {
    console.log('Payment request not found!');
    return;
  }

  const user = pr.user;
  if (!user) {
    console.log(`No user associated with payment request ID: ${pr.id}`);
    return;
  }

  const userId = user.id;
  const userUuid = user.uuid;
  console.log(`\n=== FOUND USER TO DELETE ===`);
  console.log(`ID: ${userId}`);
  console.log(`UUID: ${userUuid}`);
  console.log(`Email: ${user.email}`);

  // Get user properties and payment requests to delete dependent records
  const userProperties = await prisma.upward_user_property.findMany({ where: { userId } });
  const userPropertiesIds = userProperties.map(p => p.id);
  console.log(`Found ${userPropertiesIds.length} properties for this user.`);

  const userPaymentRequests = await prisma.upward_payment_request.findMany({ where: { userId } });
  const userPaymentRequestsIds = userPaymentRequests.map(r => r.id);
  console.log(`Found ${userPaymentRequestsIds.length} payment requests for this user.`);

  console.log('\n--- DELETING DEPENDENT RECORDS ---');

  // Helper function to safely delete and log
  const safeDelete = async (modelName, whereClause) => {
    try {
      if (typeof prisma[modelName]?.deleteMany === 'function') {
        const { count } = await prisma[modelName].deleteMany({ where: whereClause });
        console.log(`Deleted ${count} records from ${modelName}`);
        return count;
      } else {
        console.log(`Model ${modelName} not found in prisma client`);
      }
    } catch (err) {
      console.error(`Error deleting from ${modelName}:`, err.message);
    }
    return 0;
  };

  // 1. pm payment requests referencing user's payment requests
  if (userPaymentRequestsIds.length > 0) {
    await safeDelete('upward_pm_payment_request', { paymentRequestId: { in: userPaymentRequestsIds } });
  }

  // 2. dedicated virtual accounts referencing user's properties
  if (userPropertiesIds.length > 0) {
    await safeDelete('upward_dedicated_virtual_account', { userPropertyId: { in: userPropertiesIds } });
    await safeDelete('upward_property_infraction', { userPropertyId: { in: userPropertiesIds } });
    await safeDelete('upward_property_inspection', { userPropertyId: { in: userPropertiesIds } });
  }

  // 3. line items referencing user's payment requests
  if (userPaymentRequestsIds.length > 0) {
    await safeDelete('upward_payment_line_item', { paymentRequestId: { in: userPaymentRequestsIds } });
  }

  // 4. rent cycles
  await safeDelete('upward_rent_cycle', {
    OR: [
      { userId },
      ...(userPropertiesIds.length > 0 ? [{ userPropertyId: { in: userPropertiesIds } }] : []),
      ...(userPaymentRequestsIds.length > 0 ? [{ paymentRequestId: { in: userPaymentRequestsIds } }] : [])
    ]
  });

  // 5. transactions & overpayments
  await safeDelete('upward_overpayment', { userId });
  await safeDelete('upward_transaction', { userId });

  // 6. user contracts & other user-specific tables
  await safeDelete('upward_user_contract', { userId });
  await safeDelete('upward_auth_session', { userId });
  await safeDelete('upward_device_token', { userId });
  await safeDelete('upward_notification', { userId });
  await safeDelete('upward_user_announcement_state', { userId });
  await safeDelete('upward_feedback', { userId });
  await safeDelete('upward_user_bank_details', { userId });
  await safeDelete('upward_email_log', { userId });
  await safeDelete('upward_company_user', { userId });
  await safeDelete('upward_credibility_request', { userId });

  // 7. delete payment requests and user properties
  await safeDelete('upward_payment_request', { userId });
  await safeDelete('upward_user_property', { userId });

  // 8. delete the user itself
  console.log(`\nDeleting user ID ${userId} from upward_user...`);
  const userDeleteCount = await safeDelete('upward_user', { id: userId });
  
  if (userDeleteCount > 0) {
    console.log(`\nSuccessfully deleted user with UUID ${userUuid} and all associated payment and property data!`);
  } else {
    console.log(`\nFailed to delete user with ID ${userId}.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
