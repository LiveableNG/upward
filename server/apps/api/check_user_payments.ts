import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('--- Printing all transactions ---')
  const transactions = await prisma.upward_transaction.findMany({
    include: {
      user: true,
      paymentRequest: true
    }
  })
  console.log(JSON.stringify(transactions, null, 2))

  console.log('--- Printing all refund logs ---')
  const refundLogs = await prisma.upward_refund_log.findMany()
  console.log(JSON.stringify(refundLogs, null, 2))

  console.log('--- Printing all payment requests ---')
  const paymentRequests = await prisma.upward_payment_request.findMany({
    include: {
      lineItemRecords: true
    }
  })
  console.log(JSON.stringify(paymentRequests, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
