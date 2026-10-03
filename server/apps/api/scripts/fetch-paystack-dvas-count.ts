import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  const isQuick = process.argv.includes('--quick')

  console.log('===========================================================')
  console.log('        PAYSTACK DEDICATED VIRTUAL ACCOUNTS AUDIT          ')
  console.log('===========================================================')
  console.log(`Timestamp : ${new Date().toISOString()}`)
  console.log(`Mode      : ${isQuick ? 'Quick Summary' : 'Full Reconciliation (Paystack + DB)'}`)
  console.log('-----------------------------------------------------------\n')

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY || ''
  if (!paystackSecret) {
    console.error('❌ Error: PAYSTACK_SECRET_KEY not found in environment variables.')
    process.exit(1)
  }

  const isTestKey = paystackSecret.startsWith('sk_test_')
  console.log(`Environment Key : ${isTestKey ? 'TEST MODE (sk_test_...)' : 'LIVE PRODUCTION (sk_live_...)'}\n`)

  const headers = {
    Authorization: `Bearer ${paystackSecret}`,
    'Content-Type': 'application/json',
  }

  const baseUrl = 'https://api.paystack.co'

  // 1. Fetch first page to inspect total meta from Paystack
  console.log('📡 Calling Paystack API: GET /dedicated_account ...')
  const initialRes = await fetch(`${baseUrl}/dedicated_account?perPage=100&page=1`, {
    method: 'GET',
    headers,
  })

  if (!initialRes.ok) {
    const errorText = await initialRes.text()
    console.error(`❌ Paystack API Error (${initialRes.status}): ${errorText}`)
    process.exit(1)
  }

  const initialData = await initialRes.json()
  if (!initialData.status) {
    console.error(`❌ Failed to retrieve DVAs: ${initialData.message || 'Unknown error'}`)
    process.exit(1)
  }

  const totalPaystackCount = initialData.meta?.total ?? initialData.data?.length ?? 0
  const pageCount = initialData.meta?.pageCount ?? 1

  console.log(`\n📊 PAYSTACK API METRICS:`)
  console.log(` - Total DVAs Registered on Paystack : ${totalPaystackCount}`)
  console.log(` - Total Pages (100 per page)        : ${pageCount}`)

  // 2. Breakdown by bank provider on Paystack
  const paystackBankCounts: Record<string, number> = {}
  let activeAccounts = 0
  let inactiveAccounts = 0

  if (!isQuick && pageCount > 0) {
    console.log(`\n⏳ Paginating through ${pageCount} page(s) on Paystack to categorize banks...`)

    let currentPage = 1
    let hasMore = true

    while (hasMore && currentPage <= pageCount) {
      process.stdout.write(`   Fetching page ${currentPage} of ${pageCount}... \r`)
      
      const res = currentPage === 1
        ? initialData
        : await (await fetch(`${baseUrl}/dedicated_account?perPage=100&page=${currentPage}`, { method: 'GET', headers })).json()

      if (res.status && Array.isArray(res.data)) {
        for (const item of res.data) {
          const bankName = item.bank?.name || item.bank?.slug || 'Unknown Bank'
          paystackBankCounts[bankName] = (paystackBankCounts[bankName] || 0) + 1

          if (item.active) {
            activeAccounts++
          } else {
            inactiveAccounts++
          }
        }
      }

      currentPage++
      if (currentPage > pageCount) hasMore = false
    }
    console.log(`\n   Done fetching all pages.`)
  }

  // 3. Local Database metrics
  console.log('\n🔍 Querying local database (upward_dedicated_virtual_account)...')
  const [totalDbDvas, titanDbCount, wemaDbCount, defaultDvas] = await Promise.all([
    prisma.upward_dedicated_virtual_account.count(),
    prisma.upward_dedicated_virtual_account.count({
      where: {
        OR: [
          { bankSlug: 'titan-paystack' },
          { bankName: { contains: 'titan', mode: 'insensitive' } },
          { bankName: { contains: 'paystack', mode: 'insensitive' } },
        ],
      },
    }),
    prisma.upward_dedicated_virtual_account.count({
      where: {
        OR: [
          { bankSlug: 'wema-bank' },
          { bankName: { contains: 'wema', mode: 'insensitive' } },
        ],
      },
    }),
    prisma.upward_dedicated_virtual_account.count({
      where: { isDefault: true },
    }),
  ])

  console.log('\n===========================================================')
  console.log('                 RECONCILIATION SUMMARY                    ')
  console.log('===========================================================')
  console.log(`PAYSTACK (REMOTE GATEWAY):`)
  console.log(`  Total Dedicated Accounts : ${totalPaystackCount}`)
  if (!isQuick) {
    console.log(`  Active Accounts          : ${activeAccounts}`)
    console.log(`  Inactive Accounts        : ${inactiveAccounts}`)
    console.log(`  Bank Breakdown on Paystack:`)
    for (const [bank, count] of Object.entries(paystackBankCounts)) {
      console.log(`    • ${bank.padEnd(25)} : ${count}`)
    }
  }

  console.log(`\nLOCAL DATABASE (UPWARD DB):`)
  console.log(`  Total Dedicated Accounts : ${totalDbDvas}`)
  console.log(`  Paystack-Titan Accounts  : ${titanDbCount}`)
  console.log(`  Wema Bank Accounts       : ${wemaDbCount}`)
  console.log(`  Active Primary (Default) : ${defaultDvas}`)

  console.log('\n===========================================================\n')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Unhandled script error:', err)
  process.exit(1)
})
