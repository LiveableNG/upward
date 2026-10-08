try {
  require('dotenv').config({ path: '.env' })
} catch (e) {
  const fs = require('fs')
  try {
    const envRaw = fs.readFileSync('.env', 'utf8')
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
  } catch (e2) {
    // ignore
  }
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PASS_PLACEHOLDERS = ['INVITED', 'SHADOW_USER_PENDING_ONBOARDING', 'SOCIAL_AUTH_NO_PASSWORD']

function morningForDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  if (days > 0) d.setHours(days === 0 ? 0 : 8, 0, 0, 0)
  return d
}

async function main() {
  try {
    console.log('Backfill: enrolling invited users who have set passwords...')

    // Find invited users who now have a real password
    const users = await prisma.upward_user.findMany({
      where: {
        isFromInvite: true,
        passwordHash: { notIn: PASS_PLACEHOLDERS },
      },
      select: { id: true, email: true, phone: true, firstName: true, phoneHash: true },
    })

    console.log(`Found ${users.length} invited users with real passwords`)

    let enrolledWA = 0
    let enrolledEmail = 0

    for (const u of users) {
      const hasPhone = !!u.phone
      const isPhoneOnly = (u.email || '').toLowerCase().endsWith('@upward.com')

      // check existing sequence logs
      const waCount = await prisma.upward_whatsapp_sequence_log.count({ where: { userId: u.id } })
      const emailCount = await prisma.upward_email_sequence_log.count({ where: { userId: u.id } })

      if (hasPhone && waCount === 0) {
        const now = new Date()
        const logs = [2,5,9,14].map(days => ({
          userId: u.id,
          phoneEncrypted: u.phone,
          phoneHash: u.phoneHash || null,
          stage: `DAY_${days}`,
          status: 'PENDING',
          scheduledFor: (function() { const d = new Date(now); d.setDate(d.getDate() + days); if (days>0) d.setHours(10,0,0,0); return d })(),
          templateName: `upward_seq_day${days}_v2`,
          templateData: { body_text: [[u.firstName || '']] },
        }))

        await prisma.upward_whatsapp_sequence_log.createMany({ data: logs, skipDuplicates: true })
        enrolledWA++
        console.log(`Enrolled WA sequences for user ${u.id}`)
      }

      if (!hasPhone && !isPhoneOnly && emailCount === 0) {
        const now = new Date()
        const logs = [ {days:2, tmpl:'DAY_2'}, {days:5, tmpl:'DAY_5'}, {days:9, tmpl:'DAY_9'}, {days:14, tmpl:'DAY_14'} ].map(item => ({
          userId: u.id,
          email: u.email,
          stage: item.tmpl,
          status: 'PENDING',
          scheduledFor: (function() { const d = new Date(now); d.setDate(d.getDate() + item.days); if (item.days>0) d.setHours(8,0,0,0); return d })(),
          templateName: item.tmpl,
          templateData: {},
        }))

        await prisma.upward_email_sequence_log.createMany({ data: logs })
        enrolledEmail++
        console.log(`Enrolled Email sequences for user ${u.id}`)
      }
    }

    console.log('\nBackfill complete:')
    console.log(`WhatsApp enrollments: ${enrolledWA}`)
    console.log(`Email enrollments: ${enrolledEmail}`)

    await prisma.$disconnect()
  } catch (err) {
    console.error('Backfill failed:', err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()
