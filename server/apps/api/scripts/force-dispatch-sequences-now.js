// Usage: node scripts/force-dispatch-sequences-now.js <CHANNEL> <STAGE>
// Example: node scripts/force-dispatch-sequences-now.js EMAIL DAY_2

try { require('dotenv').config({ path: '.env' }) } catch (e) {}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { NestFactory } = require('@nestjs/core')

async function main() {
  const channel = (process.argv[2] || 'EMAIL').toUpperCase()
  const stage = process.argv[3] || 'DAY_2'

  console.log(`Force dispatch -> channel=${channel}, stage=${stage}`)

  try {
    const now = new Date()
    if (channel === 'EMAIL') {
      // Approve pending/on-hold email logs and set scheduledFor to now
      const res = await prisma.upward_email_sequence_log.updateMany({
        where: { stage, status: { in: ['PENDING', 'ON_HOLD'] } },
        data: { status: 'APPROVED', scheduledFor: now },
      })
      console.log(`Email logs updated: ${res.count}`)
    } else if (channel === 'WHATSAPP') {
      const res = await prisma.upward_whatsapp_sequence_log.updateMany({
        where: { stage, status: { in: ['PENDING', 'ON_HOLD'] } },
        data: { status: 'APPROVED', scheduledFor: now },
      })
      console.log(`WhatsApp logs updated: ${res.count}`)
    } else {
      console.error('Unsupported channel:', channel)
      process.exit(2)
    }

    // Now boot Nest and invoke processors
    const appModulePath = '../dist/src/app.module'
    const { AppModule } = require(appModulePath)
    const { ProcessPendingEmailSequencesUseCase } = require('../dist/src/application/use-cases/email-sequence/process-pending-email-sequences.use-case')
    const { ProcessPendingSequencesUseCase } = require('../dist/src/application/use-cases/whatsapp-sequence/process-pending-sequences.use-case')

    const app = await NestFactory.createApplicationContext(AppModule)

    if (channel === 'EMAIL') {
      const proc = app.get(ProcessPendingEmailSequencesUseCase)
      console.log('Invoking ProcessPendingEmailSequencesUseCase.execute()')
      await proc.execute()
    } else {
      const proc = app.get(ProcessPendingSequencesUseCase)
      console.log('Invoking ProcessPendingSequencesUseCase.execute()')
      await proc.execute()
    }

    await app.close()
    await prisma.$disconnect()
    console.log('Force dispatch complete')
    process.exit(0)
  } catch (err) {
    console.error('Force dispatch failed:', err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()
