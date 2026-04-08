// Use this to view DB: npx tsx scripts/view_db.ts
import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

// Minimal EncryptionService for standalone script usage
class SimpleEncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key: Buffer
  private readonly ivLength: number

  constructor() {
    const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
    this.key = Buffer.from(hexKey, 'hex')
    this.ivLength = parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10)
  }

  decrypt(encryptedText: string | null | undefined): string {
    if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.includes(':')) return encryptedText || ''
    try {
      const parts = encryptedText.split(':')
      if (parts.length !== 3) return encryptedText

      const [ivHex, authTagHex, encrypted] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      return `[Decryption Failed: ${encryptedText.slice(0, 10)}...]`
    }
  }
}

const prisma = new PrismaClient()
const encryption = new SimpleEncryptionService()

async function main() {
  console.log('\n\x1b[35m==============================================================')
  console.log('                 UPWARD DATABASE EXPLORER                    ')
  console.log('==============================================================\x1b[0m\n')

  try {
    // 1. USERS
    console.log('\x1b[36m>>> TABLE: upward_user\x1b[0m')
    const users = await prisma.upward_user.findMany({ take: 5 })
    console.table(users.map(u => ({
      id: u.id,
      email_RAW: u.email.slice(0, 15) + '...',
      email_DEC: encryption.decrypt(u.email),
      firstName: encryption.decrypt(u.firstName),
      lastName: encryption.decrypt(u.lastName),
      phone: encryption.decrypt(u.phone),
    })))

    // 2. COMPANIES
    console.log('\n\x1b[36m>>> TABLE: upward_company\x1b[0m')
    const companies = await prisma.upward_company.findMany({ take: 5 })
    console.table(companies.map(c => ({
      id: c.id,
      name_RAW: c.name.slice(0, 15) + '...',
      name_DEC: encryption.decrypt(c.name),
      primary_email: encryption.decrypt(c.email),
      platformId: c.platformId
    })))

    // 3. MANAGERS
    console.log('\n\x1b[36m>>> TABLE: upward_manager\x1b[0m')
    const managers = await prisma.upward_manager.findMany({ take: 5 })
    console.table(managers.map(m => ({
      id: m.id,
      companyId: m.companyId,
      name_DEC: `${encryption.decrypt(m.firstName)} ${encryption.decrypt(m.lastName)}`,
      email_DEC: encryption.decrypt(m.email)
    })))

    // 4. PROPERTIES & LOCATIONS
    console.log('\n\x1b[36m>>> TABLE: upward_user_property (Join with upward_location)\x1b[0m')
    const properties = await prisma.upward_user_property.findMany({ 
      take: 5,
      include: { location: true }
    })
    console.table(properties.map(p => ({
      id: p.id,
      userId: p.userId,
      rent: p.rentAmount,
      address: p.location?.address,
      area: p.location?.area,
      subarea: p.location?.subarea
    })))

    // 5. TRANSACTIONS
    console.log('\n\x1b[36m>>> TABLE: upward_transaction\x1b[0m')
    const transactions = await prisma.upward_transaction.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
    console.table(transactions.map(t => ({
      id: t.id,
      userId: t.userId,
      amount: t.amount,
      status: t.status,
      ref: t.reference,
      type: t.type
    })))

    // 6. SAVED LANDLORDS
    console.log('\n\x1b[36m>>> TABLE: upward_saved_landlord\x1b[0m')
    const landlords = await prisma.upward_saved_landlord.findMany({ take: 5 })
    console.table(landlords.map(l => ({
      id: l.id,
      userId: l.userId,
      name: l.name,
      acct: `${l.bankName} - ${l.accountNumber}`
    })))

    // 7. PLATFORMS
    console.log('\n\x1b[36m>>> TABLE: upward_platform\x1b[0m')
    const platforms = await prisma.upward_platform.findMany()
    console.table(platforms.map(p => ({
        id: p.id,
        name_DEC: encryption.decrypt(p.name),
        apiKey: p.apiKey.slice(0, 10) + '...',
        webhook: p.webhookUrl
    })))

    // 8. NOTIFICATIONS
    console.log('\n\x1b[36m>>> TABLE: upward_notification\x1b[0m')
    const notifications = await prisma.upward_notification.findMany({ take: 5 })
    console.table(notifications.map(n => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        read: n.isRead
    })))

    // 9. PAYMENT REQUESTS
    console.log('\n\x1b[36m>>> TABLE: upward_payment_request\x1b[0m')
    const requests = await prisma.upward_payment_request.findMany({ take: 5 })
    console.table(requests.map(r => ({
        id: r.id,
        userId: r.userId,
        amount: r.amount,
        status: r.status,
        dueDate: r.dueDate.toISOString().split('T')[0]
    })))

    // 10. COMPANY USERS (LINK TABLE)
    console.log('\n\x1b[36m>>> TABLE: upward_company_user\x1b[0m')
    const compUsers = await prisma.upward_company_user.findMany({ take: 10 })
    console.table(compUsers.map(cu => ({
        id: cu.id,
        companyId: cu.companyId,
        userId: cu.userId,
        invitedAt: cu.invitedAt
    })))

  } catch (err) {
    console.error('\n\x1b[31mError fetching data:\x1b[0m', err)
  }

  console.log('\n\x1b[35m==============================================================\x1b[0m\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
