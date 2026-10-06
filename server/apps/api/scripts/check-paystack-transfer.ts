import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function main() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || ''
  const reference = 'BATCH-SETTLE-d2ddea18f00665ce-RETRY-1790823600032'

  console.log(`Checking Paystack transfer status for: ${reference}`)

  const res = await fetch(`https://api.paystack.co/transfer/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()
  console.log('Paystack response HTTP:', res.status)
  console.log('Paystack body:', JSON.stringify(data, null, 2))
}

main().catch(console.error)
