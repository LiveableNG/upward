import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️ Cleaning up existing data...')

  // Delete in order to respect foreign key constraints
  await prisma.upward_attendance.deleteMany({})
  await prisma.upward_email_log.deleteMany({})
  await prisma.upward_waitlist.deleteMany({})
  await prisma.upward_session.deleteMany({})

  console.log('🌱 Seeding data...')

  // 1. Create Sessions
  const sessions = []
  const sessionCount = 5

  for (let i = 0; i < sessionCount; i++) {
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

  // 2. Create Mixed Waitlist Data (Completed and Drop-offs)
  const totalUsers = 40
  const roles = ['Tenant', 'Landlord', 'Property Manager', 'Agent']
  const benefitOptions = [
    'Early access to platform',
    'Reduced commission fees',
    'Premium support',
    'Exclusive property listings',
    'Tenant screening tools',
  ]

  console.log('👥 Generating 40 mixed lifecycle records...')

  for (let i = 0; i < totalUsers; i++) {
    const stage = faker.helpers.weightedArrayElement([
      { weight: 0.4, value: 'completed' },
      { weight: 0.2, value: 'stage_0' }, // Email only
      { weight: 0.15, value: 'stage_1' }, // Contact info
      { weight: 0.1, value: 'stage_2' }, // Role selected
      { weight: 0.1, value: 'stage_3' }, // Benefits selected
      { weight: 0.05, value: 'stage_4' }, // Confirmation step but no submit
    ]) as string

    const email = faker.internet.email().toLowerCase()
    const firstName = stage !== 'stage_0' ? faker.person.firstName() : null
    const lastName = stage !== 'stage_0' ? faker.person.lastName() : null
    const phone = stage !== 'stage_0' ? faker.phone.number() : null
    const city = stage !== 'stage_0' ? faker.location.city() : null

    const role = ['stage_2', 'stage_3', 'stage_4', 'completed'].includes(stage)
      ? faker.helpers.arrayElement(roles)
      : null

    const benefits = ['stage_3', 'stage_4', 'completed'].includes(stage)
      ? faker.helpers.arrayElements(benefitOptions, { min: 2, max: 2 })
      : []

    const selectedSessionId =
      ['stage_4', 'completed'].includes(stage) ||
      (stage === 'completed' && faker.datatype.boolean())
        ? faker.helpers.arrayElement(sessions).id
        : null

    const acceptTerms = stage === 'completed'
    const wantsAmbassador = ['stage_4', 'completed'].includes(stage) && faker.datatype.boolean()

    await prisma.upward_waitlist.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        role,
        benefits,
        acceptTerms,
        wantsAmbassador,
        country: stage !== 'stage_0' ? 'Nigeria' : null,
        city,
        selectedSession: selectedSessionId,
        confirmationSent: acceptTerms,
        createdAt: faker.date.past({ years: 0.1 }),
        updatedAt: faker.date.recent(),
      },
    })
  }

  console.log(`✅ Created ${totalUsers} mixed lifecycle records`)
  console.log('✨ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
