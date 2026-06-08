import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const txId = 223
  const reference = '1780914059328hjluj25rmq528ytc'

  console.log(`Checking logs and refund logs for Transaction ID: ${txId} / Reference: ${reference}\n`)

  const refundLogs = await prisma.upward_refund_log.findMany({
    where: { transactionId: txId }
  })
  console.log('=== REFUND LOGS ===')
  console.log(JSON.stringify(refundLogs, null, 2))

  const activityLogs = await prisma.upward_app_activity_log.findMany({
    where: {
      OR: [
        { description: { contains: reference } },
        { description: { contains: '223' } },
        { entityId: String(txId) },
        { entityId: '4188bf64-7aa2-4d1b-b50f-61e94cc2b423' }
      ]
    }
  })
  console.log('\n=== ACTIVITY LOGS ===')
  console.log(JSON.stringify(activityLogs, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
