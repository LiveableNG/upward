import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const reference = '1778946952310ax3xdt24tmp8j31bq'
  console.log(`Searching for transaction with reference: ${reference}`)

  const tx = await prisma.upward_transaction.findUnique({
    where: { reference },
    include: {
      user: true,
      paymentRequest: {
        include: {
          lineItemRecords: true
        }
      }
    }
  })

  if (!tx) {
    console.log('Transaction not found!')
  } else {
    console.log('--- Transaction Found ---')
    console.log(`Amount: ${tx.amount}`)
    console.log(`Status: ${tx.status}`)
    console.log('Line Items recorded on Transaction (What shows on receipt):')
    console.log(JSON.stringify(tx.lineItems, null, 2))
    
    console.log('\n--- Associated Payment Request Line Items (DB State) ---')
    if (tx.paymentRequest) {
      for (const item of tx.paymentRequest.lineItemRecords) {
        console.log(`Item: ${item.name} | Total: ${item.totalAmount} | Paid: ${item.amountPaid}`)
      }
    }
  }

}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
