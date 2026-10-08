import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const envPath = path.join(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envRaw = fs.readFileSync(envPath, 'utf8')
  envRaw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf('=')
    if (idx === -1) return
    const key = trimmed.slice(0, idx)
    let val = trimmed.slice(idx + 1)
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    process.env[key] = val
  })
}

const prisma = new PrismaClient()

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

async function cleanUserPayments(targetEmails: string[]) {
  console.log('=== Starting Payment Clean-up Script ===\n')

  for (const rawEmail of targetEmails) {
    const email = rawEmail.trim().toLowerCase()
    const emailHash = hashEmail(email)

    console.log(`Processing cleanup for email: "${email}" (hash: ${emailHash.slice(0, 10)}...)...`)

    // 1. Locate User by emailHash or raw email
    let user = await prisma.upward_user.findFirst({
      where: {
        OR: [
          { emailHash },
          { email },
        ],
      },
      include: {
        properties: true,
      },
    })

    if (!user) {
      console.log(`⚠️ User with email "${email}" not found by hash. Searching all user records with encryption key...`)
      const allUsers = await prisma.upward_user.findMany()
      const keyHex = process.env.ENCRYPTION_KEY || ''
      if (keyHex) {
        const key = Buffer.from(keyHex, 'hex')
        for (const u of allUsers) {
          if (u.email && u.email.includes(':')) {
            try {
              const parts = u.email.split(':')
              if (parts.length === 3) {
                const [ivHex, authTagHex, encryptedHex] = parts
                const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
                decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
                let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
                decrypted += decipher.final('utf8')
                if (decrypted.toLowerCase().trim() === email) {
                  const props = await prisma.upward_user_property.findMany({ where: { userId: u.id } })
                  user = { ...u, properties: props } as any
                  break
                }
              }
            } catch (e) {
              // ignore decipher error
            }
          }
        }
      }
    }

    if (!user) {
      console.log(`❌ No user found matching email "${email}". Skipping.\n`)
      continue
    }

    console.log(`\nFound User ID ${user.id} (UUID: ${user.uuid})`)

    const userPropertyIds = user.properties.map(p => p.id)
    console.log(`Linked Property IDs: [${userPropertyIds.join(', ')}]`)

    // 2. Fetch Payment Requests
    const paymentRequests = await prisma.upward_payment_request.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(userPropertyIds.length > 0 ? [{ userPropertyId: { in: userPropertyIds } }] : []),
        ],
      },
      select: { id: true, uuid: true },
    })

    const prIds = paymentRequests.map(pr => pr.id)
    console.log(`Found ${prIds.length} Payment Request(s): [${prIds.join(', ')}]`)

    // 3. Delete Line Item Records
    if (prIds.length > 0) {
      const deletedLineItems = await prisma.upward_payment_line_item.deleteMany({
        where: { paymentRequestId: { in: prIds } },
      })
      console.log(`Deleted ${deletedLineItems.count} Payment Line Item record(s).`)
    }

    // 4. Delete Payment Proofs
    if (prIds.length > 0) {
      const deletedProofs = await prisma.upward_payment_proof.deleteMany({
        where: { paymentRequestId: { in: prIds } },
      })
      console.log(`Deleted ${deletedProofs.count} Payment Proof record(s).`)
    }

    // 5. Delete PM Payment Requests
    if (prIds.length > 0) {
      const deletedPmPRs = await prisma.upward_pm_payment_request.deleteMany({
        where: { paymentRequestId: { in: prIds } },
      })
      console.log(`Deleted ${deletedPmPRs.count} PM Payment Request record(s).`)
    }

    // 6. Delete Rent Cycles
    const deletedRentCycles = await prisma.upward_rent_cycle.deleteMany({
      where: {
        OR: [
          { userId: user.id },
          ...(prIds.length > 0 ? [{ paymentRequestId: { in: prIds } }] : []),
          ...(userPropertyIds.length > 0 ? [{ userPropertyId: { in: userPropertyIds } }] : []),
        ],
      },
    })
    console.log(`Deleted ${deletedRentCycles.count} Rent Cycle record(s).`)

    // 7. Delete Overpayments
    const deletedOverpayments = await prisma.upward_overpayment.deleteMany({
      where: {
        OR: [
          { userId: user.id },
          ...(prIds.length > 0 ? [{ paymentRequestId: { in: prIds } }] : []),
        ],
      },
    })
    console.log(`Deleted ${deletedOverpayments.count} Overpayment record(s).`)

    // 8. Delete Platform Rent Payments
    if (userPropertyIds.length > 0) {
      const deletedPlatformPayments = await prisma.upward_platform_rent_payment.deleteMany({
        where: { userPropertyId: { in: userPropertyIds } },
      })
      console.log(`Deleted ${deletedPlatformPayments.count} Platform Rent Payment record(s).`)
    }

    // 9. Delete Transactions
    const deletedTransactions = await prisma.upward_transaction.deleteMany({
      where: {
        OR: [
          { userId: user.id },
          ...(prIds.length > 0 ? [{ paymentRequestId: { in: prIds } }] : []),
        ],
      },
    })
    console.log(`Deleted ${deletedTransactions.count} Transaction record(s).`)

    // 10. Delete Refund Logs
    const deletedRefundLogs = await prisma.upward_refund_log.deleteMany({
      where: {
        userId: user.id,
      },
    })
    console.log(`Deleted ${deletedRefundLogs.count} Refund Log record(s).`)

    // 11. Delete Payment Requests
    if (prIds.length > 0) {
      const deletedPRs = await prisma.upward_payment_request.deleteMany({
        where: { id: { in: prIds } },
      })
      console.log(`Deleted ${deletedPRs.count} Payment Request(s).`)
    }

    // 12. Reset Property Balances
    if (userPropertyIds.length > 0) {
      for (const prop of user.properties) {
        await prisma.upward_user_property.update({
          where: { id: prop.id },
          data: {
            amountPaid: 0,
            amountRemaining: prop.rentAmount || 0,
          },
        })
      }
      console.log(`Reset ${userPropertyIds.length} property balance(s) (amountPaid = 0, amountRemaining = rentAmount).`)
    }

    console.log(`✅ Successfully cleaned all payment data for "${email}".\n`)
  }
}

// Target email passed from arguments or default
const targetEmails = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['daniel.okafor@email.com']

cleanUserPayments(targetEmails)
  .catch((e) => {
    console.error('Error during cleanup:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
