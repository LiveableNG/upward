import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Replicate deterministic hash and encryption helper functions
function hash(text: string): string {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

function encrypt(text: string): string {
  const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';
  const key = Buffer.from(hexKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function main() {
  console.log('🗑️ Cleaning up existing data...')

  // Delete in order to respect foreign key constraints
  await prisma.upward_pm_rent_payment.deleteMany({})
  await prisma.upward_pm_payment_request.deleteMany({})
  await prisma.upward_payment_request.deleteMany({})
  await prisma.upward_user_property.deleteMany({})
  await prisma.upward_pm_unit.deleteMany({})
  await prisma.upward_pm_property.deleteMany({})
  await prisma.upward_pm_tenant.deleteMany({})
  
  await prisma.upward_auth_session.deleteMany({})
  await prisma.upward_pm_auth_session.deleteMany({})
  await prisma.upward_user.deleteMany({})
  await prisma.upward_property_manager.deleteMany({})

  await prisma.upward_attendance.deleteMany({})
  await prisma.upward_email_log.deleteMany({})
  await prisma.upward_waitlist.deleteMany({})
  await prisma.upward_session.deleteMany({})

  console.log('🌱 Seeding core application roles...')

  const defaultPassword = 'Password123'
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  // 1. Create a Mock Property Manager
  const pmEmail = 'pm@goodtenants.africa'
  const pm = await prisma.upward_property_manager.create({
    data: {
      email: pmEmail,
      emailHash: hash(pmEmail),
      passwordHash,
      firstName: 'Segun',
      firstNameHash: encrypt('Segun'),
      lastName: 'Akin',
      lastNameHash: encrypt('Akin'),
      businessName: 'Akin Properties Ltd',
      pmType: 'INDIVIDUAL',
      phone: '+2348031234567',
      phoneHash: encrypt('+2348031234567'),
      isVerified: true,
      country: 'Nigeria',
    }
  })
  console.log(`✅ Created Property Manager: ${pm.email} (Password: ${defaultPassword})`)

  // 2. Create a Mock Tenant (User)
  const tenantEmail = 'tenant@goodtenants.africa'
  const tenantUser = await prisma.upward_user.create({
    data: {
      email: tenantEmail,
      emailHash: hash(tenantEmail),
      passwordHash,
      firstName: 'Bolu',
      firstNameHash: encrypt('Bolu'),
      lastName: 'Adebayo',
      lastNameHash: encrypt('Adebayo'),
      phone: '+2348037654321',
      phoneHash: encrypt('+2348037654321'),
      profileSlug: 'bolu-adebayo',
      isIdentityVerified: true,
    }
  })
  console.log(`✅ Created Tenant User: ${tenantUser.email} (Password: ${defaultPassword})`)

  // 3. Create a Property for the Property Manager
  const property = await prisma.upward_pm_property.create({
    data: {
      pmId: pm.id,
      name: 'Akin Court',
      address: 'Plot 12, Lekki Phase 1, Lagos',
      propertyType: 'Residential',
      totalUnits: 5,
      country: 'Nigeria',
      state: 'Lagos',
      area: 'Lekki',
    }
  })
  console.log(`✅ Created Property: ${property.name}`)

  // 4. Create a Unit inside the Property
  const unit = await prisma.upward_pm_unit.create({
    data: {
      propertyId: property.id,
      unitName: 'Apartment 4B',
      rentAmount: 250000,
      rentStartDate: new Date(),
      rentDueDate: faker.date.soon({ days: 30 }),
      currency: 'NGN',
      status: 'OCCUPIED',
      rentType: 'Monthly',
      rentReminderEnabled: true,
      rentReminderDaysBefore: 3,
    }
  })
  console.log(`✅ Created Unit: ${unit.unitName}`)

  // 5. Create a Property Manager Tenant reference
  const pmTenant = await prisma.upward_pm_tenant.create({
    data: {
      pmId: pm.id,
      firstNameEncrypted: encrypt('Bolu'),
      firstNameSearch: 'Bolu',
      lastNameEncrypted: encrypt('Adebayo'),
      lastNameSearch: 'Adebayo',
      emailEncrypted: encrypt(tenantEmail),
      emailHash: hash(tenantEmail),
      phoneEncrypted: encrypt('+2348037654321'),
      phoneHash: hash('+2348037654321'),
      inviteStatus: 'ACCEPTED',
    }
  })

  // Connect the unit to this PM tenant
  await prisma.upward_pm_unit.update({
    where: { id: unit.id },
    data: { tenantId: pmTenant.id }
  })

  // 6. Connect the User (Tenant) to the Unit/Property via user_property link
  const userProperty = await prisma.upward_user_property.create({
    data: {
      userId: tenantUser.id,
      pmUnitId: unit.id,
      pmId: pm.id,
      rentAmount: 250000,
      rentStartDate: new Date(),
      rentEndDate: faker.date.future(),
      isVerified: true,
      verificationStatus: 'VERIFIED',
    }
  })

  // 7. Create a Payment Request (Invoice) for the rent
  const globalPaymentRequest = await prisma.upward_payment_request.create({
    data: {
      userId: tenantUser.id,
      amount: 250000,
      currency: 'NGN',
      description: 'Rent for Apartment 4B - June 2026',
      dueDate: faker.date.soon({ days: 15 }),
      status: 'PENDING',
      amountPaid: 0,
      allowPartial: true,
      minAmount: 50000,
      rentStartDate: new Date(),
      rentEndDate: faker.date.future(),
      rentType: 'Monthly',
    }
  })

  await prisma.upward_pm_payment_request.create({
    data: {
      pmId: pm.id,
      unitId: unit.id,
      tenantId: pmTenant.id,
      paymentRequestId: globalPaymentRequest.id,
      amount: 250000,
      currency: 'NGN',
      description: 'Rent Invoice - June 2026',
      dueDate: globalPaymentRequest.dueDate,
      status: 'PENDING',
      amountPaid: 0,
      allowPartial: true,
      minAmount: 50000,
      rentStartDate: globalPaymentRequest.rentStartDate,
      rentEndDate: globalPaymentRequest.rentEndDate,
      rentType: 'Monthly',
    }
  })
  console.log(`✅ Created Invoice: ${globalPaymentRequest.description} for Bolu Adebayo`)

  // 8. Seed Masterclass Sessions (from original seed)
  console.log('🌱 Seeding Masterclass Sessions...')
  const sessions = []
  for (let i = 0; i < 5; i++) {
    const session = await prisma.upward_session.create({
      data: {
        name: `Masterclass: ${faker.commerce.productName()}`,
        googleMeetLink: 'https://meet.google.com/abc-defg-hij',
        startTime: faker.date.soon({ days: 14 }),
        endTime: faker.date.soon({ days: 15 }),
      },
    })
    sessions.push(session)
  }
  console.log(`✅ Created ${sessions.length} sessions`)

  // 9. Seed Waitlist (from original seed)
  console.log('🌱 Seeding waitlist leads...')
  const totalWaitlist = 30
  const roles = ['Tenant', 'Landlord', 'Property Manager', 'Agent']
  const benefits = ['Early access', 'Reduced fees', 'Premium support']

  for (let i = 0; i < totalWaitlist; i++) {
    await prisma.upward_waitlist.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
        role: faker.helpers.arrayElement(roles),
        benefits: faker.helpers.arrayElements(benefits, { min: 1, max: 2 }),
        acceptTerms: true,
        country: 'Nigeria',
        city: faker.location.city(),
        selectedSession: faker.helpers.arrayElement(sessions).id,
      }
    })
  }
  console.log(`✅ Created ${totalWaitlist} waitlist records`)
  console.log('✨ Data seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
