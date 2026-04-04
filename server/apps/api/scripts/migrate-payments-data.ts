import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Starting Migration Script ---')

  // 1. Create a Test Tenant (User)
  const tenantEmail = 'test-tenant@upward.ng'
  const hashedPassword = await bcrypt.hash('Password123!', 10)

  const tenant = await prisma.upward_tenant.upsert({
    where: { email: tenantEmail },
    update: {
      passwordHash: hashedPassword,
      fullName: 'Test Tenant',
      isGuest: false,
    },
    create: {
      email: tenantEmail,
      passwordHash: hashedPassword,
      fullName: 'Test Tenant',
      isGuest: false,
    },
  })

  console.log(`- Tenant created/updated: ${tenant.email} (ID: ${tenant.id})`)

  // 2. Create Saved Landlords for this tenant
  const landlordsData = [
    {
      tenantId: tenant.id,
      name: 'Livable Properties Ltd',
      accountName: 'Livable Properties Management',
      accountNumber: '0123456789',
      bankName: 'Guaranty Trust Bank',
      bankCode: '058',
      lastAmount: 450000,
      lastPaid: new Date(),
    },
    {
      tenantId: tenant.id,
      name: 'Heritage Reality',
      accountName: 'Heritage Realty Services',
      accountNumber: '9876543210',
      bankName: 'Zenith Bank',
      bankCode: '057',
      lastAmount: 120000,
      lastPaid: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
  ]

  for (const l of landlordsData) {
    const landlord = await prisma.upward_saved_landlord.create({
      data: l,
    })
    console.log(`- Saved Landlord created: ${landlord.name} (ID: ${landlord.id})`)

    // 3. Create a transaction for each landlord
    const tx = await prisma.upward_transaction.create({
      data: {
        tenantId: tenant.id,
        type: 'RENT',
        status: 'SUCCESS',
        amount: l.lastAmount!,
        reference: `MIG-${Math.random().toString(36).substring(7).toUpperCase()}`,
        narration: `Migration payment for ${l.name}`,
        landlordId: landlord.id,
        receiptNumber: `RCP-${Math.floor(10000 + Math.random() * 90000)}`,
      },
    })
    console.log(`  - Transaction recorded: ${tx.reference} (Amount: ${tx.amount})`)
  }

  console.log('--- Migration Script Completed Successfully ---')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
