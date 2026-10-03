import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as crypto from 'crypto'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

// Encryption helper
function decrypt(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.includes(':')) {
    return ciphertext
  }
  try {
    const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
    const key = Buffer.from(hexKey, 'hex')
    const parts = ciphertext.split(':')
    if (parts.length !== 3) return ciphertext
    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return ciphertext
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseCliArgs() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')

  let limit: number | undefined
  const limitArg = args.find((a) => a.startsWith('--limit='))
  if (limitArg) {
    limit = parseInt(limitArg.split('=')[1], 10)
  }

  let delayMs = 600
  const delayArg = args.find((a) => a.startsWith('--delay='))
  if (delayArg) {
    delayMs = parseInt(delayArg.split('=')[1], 10) || 600
  }

  let targetUserId: number | undefined
  const userIdArg = args.find((a) => a.startsWith('--user-id='))
  if (userIdArg) {
    targetUserId = parseInt(userIdArg.split('=')[1], 10)
  }

  let targetPropertyId: number | undefined
  const propertyIdArg = args.find((a) => a.startsWith('--property-id='))
  if (propertyIdArg) {
    targetPropertyId = parseInt(propertyIdArg.split('=')[1], 10)
  }

  return { isDryRun, limit, delayMs, targetUserId, targetPropertyId }
}

async function getOrCreatePaystackCustomer(
  baseUrl: string,
  headers: Record<string, string>,
  data: { email: string; firstName: string; lastName: string; phone?: string },
): Promise<string> {
  const res = await fetch(`${baseUrl}/customer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      metadata: { source_app: 'upward' },
    }),
  })

  const responseData = await res.json()
  let customerCode = ''

  if (res.ok && responseData.data?.customer_code) {
    customerCode = responseData.data.customer_code
  } else if (responseData.data?.customer_code) {
    customerCode = responseData.data.customer_code
  }

  if (!customerCode) {
    const listRes = await fetch(`${baseUrl}/customer?email=${encodeURIComponent(data.email)}`, {
      method: 'GET',
      headers,
    })
    const listData = await listRes.json()
    if (listRes.ok && listData.status && Array.isArray(listData.data) && listData.data.length > 0) {
      customerCode = listData.data[0].customer_code
    }
  }

  if (!customerCode) {
    throw new Error(responseData.message || 'Failed to create or resolve Paystack customer')
  }

  return customerCode
}

async function createTitanDva(
  baseUrl: string,
  headers: Record<string, string>,
  customerCode: string,
  subaccountCode?: string,
): Promise<any> {
  const res = await fetch(`${baseUrl}/dedicated_account`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer: customerCode,
      subaccount: subaccountCode,
      preferred_bank: 'titan-paystack',
    }),
  })

  const responseData = await res.json()
  if (!res.ok || !responseData.status || !responseData.data) {
    throw new Error(responseData.message || `DVA creation failed with HTTP ${res.status}`)
  }
  return responseData.data
}

async function main() {
  const { isDryRun, limit, delayMs, targetUserId, targetPropertyId } = parseCliArgs()

  console.log('===========================================================')
  console.log('   PAYSTACK TITAN DVA UPGRADE SCRIPT (WEMA -> TITAN)      ')
  console.log('===========================================================')
  console.log(`Execution Mode     : ${isDryRun ? 'DRY RUN (Preview only, no changes committed)' : 'LIVE EXECUTION'}`)
  console.log(`Target Filter      : All User Properties with WEMA DVA & NO Titan DVA`)
  console.log(`Request Delay      : ${delayMs}ms between Paystack calls`)
  if (limit) console.log(`Batch Limit        : ${limit} records`)
  if (targetUserId) console.log(`Target User ID     : ${targetUserId}`)
  if (targetPropertyId) console.log(`Target Property ID : ${targetPropertyId}`)
  console.log('-----------------------------------------------------------\n')

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY || ''
  if (!paystackSecret && !isDryRun) {
    console.error('❌ Error: PAYSTACK_SECRET_KEY is not defined in environment variables.')
    process.exit(1)
  }

  const baseUrl = 'https://api.paystack.co'
  const headers = {
    Authorization: `Bearer ${paystackSecret}`,
    'Content-Type': 'application/json',
  }

  try {
    // Target all user properties that currently have a Wema DVA and do NOT have a Titan DVA
    const whereClause: any = {
      dedicatedAccounts: {
        some: {
          OR: [
            { bankSlug: 'wema-bank' },
            { bankName: { contains: 'wema', mode: 'insensitive' } },
          ],
        },
        none: {
          OR: [
            { bankSlug: 'titan-paystack' },
            { bankName: { contains: 'titan', mode: 'insensitive' } },
            { bankName: { contains: 'paystack', mode: 'insensitive' } },
          ],
        },
      },
    }

    if (targetPropertyId) whereClause.id = targetPropertyId
    if (targetUserId) whereClause.userId = targetUserId

    console.log('🔍 Scanning database for user properties with only WEMA DVA...')
    const candidateProperties = await prisma.upward_user_property.findMany({
      where: whereClause,
      include: {
        user: true,
        subaccount: true,
        dedicatedAccounts: true,
      },
      orderBy: { id: 'asc' },
      take: limit,
    })

    console.log(`Found ${candidateProperties.length} user property record(s) with only WEMA DVA.\n`)

    if (candidateProperties.length === 0) {
      console.log('✅ All user properties with DVAs already have a Paystack-Titan account. Nothing to do.')
      return
    }

    let successCount = 0
    let failureCount = 0
    let skippedCount = 0

    for (let i = 0; i < candidateProperties.length; i++) {
      const prop = candidateProperties[i]
      const user = prop.user
      const indexStr = `[${i + 1}/${candidateProperties.length}]`

      if (!user) {
        console.warn(`${indexStr} ⚠️ Skipping Property ID ${prop.id}: No linked user record found.`)
        skippedCount++
        continue
      }

      // Decrypt tenant info
      const rawEmail = decrypt(user.email || '')
      const firstName = decrypt(user.firstName || '') || 'Tenant'
      const lastName = decrypt(user.lastName || '') || `Property-${prop.id}`
      const phone = decrypt(user.phone || '')

      const baseEmail = rawEmail || `prop-${prop.id}@upward.ng`
      const [local, domain] = baseEmail.includes('@') ? baseEmail.split('@') : [baseEmail, 'upward.ng']
      const customerEmail = `${local}+p${prop.id}@${domain}`

      const wemaAccount = prop.dedicatedAccounts.find((a) => {
        const slug = (a.bankSlug || '').toLowerCase()
        const name = (a.bankName || '').toLowerCase()
        return slug === 'wema-bank' || name.includes('wema')
      })

      console.log(`${indexStr} Property ID: ${prop.id} | User ID: ${user.id} (${rawEmail})`)
      console.log(`    Customer Name  : ${firstName} ${lastName}`)
      console.log(`    Customer Email : ${customerEmail}`)
      console.log(`    Current WEMA   : ${wemaAccount ? `${wemaAccount.bankName} (${wemaAccount.accountNumber})` : 'None'}`)

      if (isDryRun) {
        console.log(`    Action [DRY-RUN]: Would create Paystack-Titan DVA and promote it as primary default (retaining WEMA as fallback).\n`)
        successCount++
        continue
      }

      try {
        console.log(`    1. Resolving Paystack customer (${customerEmail})...`)
        const customerCode = await getOrCreatePaystackCustomer(baseUrl, headers, {
          email: customerEmail,
          firstName,
          lastName,
          phone: phone || undefined,
        })

        console.log(`    2. Provisioning Paystack-Titan DVA for customer ${customerCode}...`)
        const subaccountCode = prop.subaccount?.subaccountCode
        const account = await createTitanDva(baseUrl, headers, customerCode, subaccountCode)

        const bankName = account.bank?.name || 'Paystack-Titan'
        const bankSlug = 'titan-paystack'

        console.log(`    3. Saving Titan DVA to database (${account.account_number} - ${bankName})...`)

        // Demote existing Wema account to isDefault: false
        await prisma.upward_dedicated_virtual_account.updateMany({
          where: { userPropertyId: prop.id },
          data: { isDefault: false },
        })

        // Upsert the new Titan DVA with isDefault: true
        await prisma.upward_dedicated_virtual_account.upsert({
          where: { accountNumber: account.account_number },
          update: {
            accountName: account.account_name,
            bankName,
            bankCode: account.bank?.slug || account.bank?.id?.toString() || '',
            bankSlug,
            isDefault: true,
            metadata: account,
            userPropertyId: prop.id,
          },
          create: {
            accountNumber: account.account_number,
            accountName: account.account_name,
            bankName,
            bankCode: account.bank?.slug || account.bank?.id?.toString() || '',
            bankSlug,
            isDefault: true,
            accountCode: account.dedicated_account_code || account.account_number,
            paystackCustomerId: customerCode,
            userPropertyId: prop.id,
            metadata: account,
          },
        })

        console.log(`    ✅ SUCCESS: Titan DVA (${account.account_number}) is now primary default!\n`)
        successCount++

        // Throttling between Paystack API calls
        if (i < candidateProperties.length - 1 && delayMs > 0) {
          await sleep(delayMs)
        }
      } catch (err: any) {
        console.error(`    ❌ FAILED: ${err?.message || err}\n`)
        failureCount++
      }
    }

    console.log('===========================================================')
    console.log('                     EXECUTION SUMMARY                     ')
    console.log('===========================================================')
    console.log(`Total Inspected : ${candidateProperties.length}`)
    console.log(`Successful      : ${successCount}`)
    console.log(`Failed          : ${failureCount}`)
    console.log(`Skipped         : ${skippedCount}`)
    console.log('===========================================================\n')

  } catch (err: any) {
    console.error('Fatal error during script execution:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Unhandled script error:', err)
  process.exit(1)
})
