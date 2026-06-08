import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const prUuid = '69e2fcb5-83bf-4c02-b9ba-0550c0fa5174'
  console.log(`Searching for payment request with UUID: ${prUuid}\n`)

  const pr = await prisma.upward_payment_request.findUnique({
    where: { uuid: prUuid },
    include: {
      user: true,
      lineItemRecords: true,
      transactions: true
    }
  })

  if (!pr) {
    console.log('Payment Request not found!')
    return
  }

  console.log('=== PAYMENT REQUEST ===')
  console.log(JSON.stringify({
    id: pr.id,
    uuid: pr.uuid,
    amount: pr.amount,
    amountPaid: pr.amountPaid,
    status: pr.status
  }, null, 2))

  console.log('\n=== LINE ITEMS ===')
  console.log(JSON.stringify(pr.lineItemRecords, null, 2))

  console.log('\n=== TRANSACTIONS ===')
  console.log(JSON.stringify(pr.transactions, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
