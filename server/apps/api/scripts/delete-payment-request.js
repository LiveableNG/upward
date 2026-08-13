const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prId = 23;

  // 1. Fetch the payment request to confirm it exists
  const pr = await prisma.upward_payment_request.findUnique({
    where: { id: prId },
    include: {
      transactions: true,
      rentCycles: true,
      overpayments: true,
      pmPaymentRequests: true,
      paymentProofs: true,
      lineItemRecords: true,
    }
  });

  if (!pr) {
    console.log(`Payment Request with ID ${prId} not found.`);
    return;
  }

  console.log(`Found Payment Request:`);
  console.log(JSON.stringify(pr, null, 2));

  console.log(`\nStarting deletion process...`);

  // 2. Disconnect related models that don't have cascade delete configured on the DB level
  if (pr.transactions.length > 0) {
    console.log(`Disconnecting ${pr.transactions.length} transactions...`);
    await prisma.upward_transaction.updateMany({
      where: { paymentRequestId: prId },
      data: { paymentRequestId: null },
    });
  }

  if (pr.rentCycles.length > 0) {
    console.log(`Disconnecting ${pr.rentCycles.length} rent cycles...`);
    await prisma.upward_rent_cycle.updateMany({
      where: { paymentRequestId: prId },
      data: { paymentRequestId: null },
    });
  }

  if (pr.overpayments.length > 0) {
    console.log(`Disconnecting ${pr.overpayments.length} overpayments...`);
    await prisma.upward_overpayment.updateMany({
      where: { paymentRequestId: prId },
      data: { paymentRequestId: null },
    });
  }

  if (pr.pmPaymentRequests.length > 0) {
    console.log(`Disconnecting ${pr.pmPaymentRequests.length} PM payment requests...`);
    await prisma.upward_pm_payment_request.updateMany({
      where: { paymentRequestId: prId },
      data: { paymentRequestId: null },
    });
  }

  // 3. Delete the main Payment Request (line items and payment proofs will cascade delete)
  console.log(`Deleting Payment Request ID ${prId}...`);
  await prisma.upward_payment_request.delete({
    where: { id: prId },
  });

  console.log(`Successfully deleted Payment Request ID ${prId}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Error deleting payment request:", e);
    prisma.$disconnect();
    process.exit(1);
  });
