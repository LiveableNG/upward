import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting WhatsApp sequences backfill for existing users...')

  console.log('Cleaning up accidentally created sequence logs for shadow users...')
  
  // 1. Delete pending sequences for any user who doesn't have a real bcrypt password hash
  const deleteResult = await prisma.upward_whatsapp_sequence_log.deleteMany({
    where: {
      status: 'PENDING',
      user: {
        NOT: {
          passwordHash: {
            startsWith: '$2'
          }
        }
      }
    }
  })
  console.log(`Deleted ${deleteResult.count} sequence logs for shadow users.`)

  console.log('\nStarting WhatsApp sequences backfill for existing real users...')

  // Find all signed-up REAL users who DO NOT have any whatsapp sequence logs yet
  const usersToBackfill = await prisma.upward_user.findMany({
    where: {
      passwordHash: {
        startsWith: '$2'
      },
      whatsappSequenceLogs: {
        none: {}
      }
    },
    select: {
      id: true,
      firstName: true,
      phone: true,
      phoneHash: true,
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
      // User requested 8 AM
      date.setHours(8, 0, 0, 0)
    }
    return date
  }

  const dashboardUrl = 'https://upward.goodtenants.io/dashboard'
  let createdCount = 0

  for (const user of usersToBackfill) {
    const sequences = [
      {
        stage: 'WELCOME',
        templateName: 'upward_seq_welcome_v1',
        // For existing users backfill, we don't want to blast them at midnight.
        // We schedule the "Welcome" message for tomorrow at 10 AM.
        scheduledFor: getFutureDate(1),
        templateData: { body_text: [[user.firstName, 'GoodTenants Realty']] },
      },
      {
        stage: 'DAY_2',
        templateName: 'upward_seq_day2_v1',
        scheduledFor: getFutureDate(3), // Shifted by 1 day
        templateData: { body_text: [[user.firstName, dashboardUrl]] },
      },
      {
        stage: 'DAY_5',
        templateName: 'upward_seq_day5_v1',
        scheduledFor: getFutureDate(6), // Shifted by 1 day
        templateData: { body_text: [[user.firstName, dashboardUrl]] },
      },
      {
        stage: 'DAY_9',
        templateName: 'upward_seq_day9_v1',
        scheduledFor: getFutureDate(10), // Shifted by 1 day
        templateData: { body_text: [[user.firstName, dashboardUrl]] },
      },
      {
        stage: 'DAY_14',
        templateName: 'upward_seq_day14_v1',
        scheduledFor: getFutureDate(15), // Shifted by 1 day
        templateData: { body_text: [[user.firstName, dashboardUrl]] },
      }
    ]

    const logsToCreate = sequences.map(seq => ({
      userId: user.id,
      phoneEncrypted: user.phone || null,
      phoneHash: user.phoneHash || null,
      stage: seq.stage,
      status: 'PENDING',
      scheduledFor: seq.scheduledFor,
      templateName: seq.templateName,
      templateData: seq.templateData,
    }))

    // Use upward_whatsapp_sequence_log to insert
    await prisma.upward_whatsapp_sequence_log.createMany({
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
