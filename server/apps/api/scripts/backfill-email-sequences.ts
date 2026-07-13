import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting Email sequences backfill for existing real users...')

  // Find all signed-up REAL users who DO NOT have any email sequence logs yet
  const usersToBackfill = await prisma.upward_user.findMany({
    where: {
      passwordHash: {
        startsWith: '$2'
      },
      emailSequenceLogs: {
        none: {}
      }
    },
    select: {
      id: true,
      email: true,
    }
  })

  console.log(`Found ${usersToBackfill.length} users to backfill.`)

  if (usersToBackfill.length === 0) {
    console.log('No users to backfill. Exiting.')
    return
  }

  const now = new Date()
  const getFutureDate = (days: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + days)
    if (days > 0) {
      date.setHours(8, 0, 0, 0)
    }
    return date
  }

  let createdCount = 0

  for (const user of usersToBackfill) {
    const sequences = [
      {
        stage: 'WELCOME',
        templateName: 'WELCOME_EMAIL',
        scheduledFor: getFutureDate(1), // Shifted by 1 day
        templateData: {},
      },
      {
        stage: 'DAY_2',
        templateName: 'DAY_2_EMAIL',
        scheduledFor: getFutureDate(3), // Shifted by 1 day
        templateData: {},
      },
      {
        stage: 'DAY_5',
        templateName: 'DAY_5_EMAIL',
        scheduledFor: getFutureDate(6), // Shifted by 1 day
        templateData: {},
      },
      {
        stage: 'DAY_9',
        templateName: 'DAY_9_EMAIL',
        scheduledFor: getFutureDate(10), // Shifted by 1 day
        templateData: {},
      },
      {
        stage: 'DAY_14',
        templateName: 'DAY_14_EMAIL',
        scheduledFor: getFutureDate(15), // Shifted by 1 day
        templateData: {},
      }
    ]

    const logsToCreate = sequences.map(seq => ({
      userId: user.id,
      email: user.email,
      stage: seq.stage,
      status: 'PENDING',
      scheduledFor: seq.scheduledFor,
      templateName: seq.templateName,
      templateData: seq.templateData,
    }))

    await prisma.upward_email_sequence_log.createMany({
      data: logsToCreate,
      skipDuplicates: true
    })
    
    createdCount += logsToCreate.length
  }

  console.log(`Successfully created ${createdCount} sequence logs for ${usersToBackfill.length} users.`)
}

main()
  .catch((e) => {
    console.error('Error during backfill:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
