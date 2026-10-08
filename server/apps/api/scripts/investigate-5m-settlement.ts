import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('--- Investigating 5M Transaction around Sept 30 ---')

  // Find transactions around 5,000,000
  const txs = await prisma.upward_transaction.findMany({
    where: {
      amount: {
        gte: 4900000,
        lte: 5100000,
      },
    },
    include: {
      paymentRequest: {
        include: {
          manualAccount: true,
          subaccount: true,
          userProperty: {
            include: {
              pm: true,
              pmUnit: true,
            },
          },
        },
      },
      user: true,
      settlementBatch: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  console.log(`Found ${txs.length} transaction(s) matching ~5M:`)
  for (const t of txs) {
    console.log(JSON.stringify({
      id: t.id,
      uuid: t.uuid,
      reference: t.reference,
      amount: t.amount,
      status: t.status,
      settlementStatus: t.settlementStatus,
      settlementBatchId: t.settlementBatchId,
      batchStatus: t.settlementBatch?.status,
      batchReference: t.settlementBatch?.transferReference,
      narration: t.narration,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      paymentRequestId: t.paymentRequestId,
      manualAccount: t.paymentRequest?.manualAccount,
      subaccount: t.paymentRequest?.subaccount,
      pm: t.paymentRequest?.userProperty?.pm ? {
        id: t.paymentRequest.userProperty.pm.id,
        businessName: t.paymentRequest.userProperty.pm.businessName,
      } : null,
    }, null, 2))
  }

  // Also find any settlement batches with ~5M or around Sept 30
  console.log('\n--- Settlement Batches around 5M ---')
  const batches = await prisma.upward_settlement_batch.findMany({
    where: {
      totalAmount: {
        gte: 4900000,
        lte: 5100000,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  console.log(`Found ${batches.length} batch(es):`)
  for (const b of batches) {
    console.log(JSON.stringify(b, null, 2))
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
