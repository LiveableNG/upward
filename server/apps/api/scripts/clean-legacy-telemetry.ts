import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cutoffDate = new Date('2026-10-15T00:00:00.000Z')
  console.log(`[Clean Telemetry] Cleaning legacy telemetry before ${cutoffDate.toISOString()}...`)

  // 1. Delete legacy app activity logs before Oct 15, 2026
  const deletedOldLogs = await prisma.upward_app_activity_log.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  })
  console.log(`[Clean Telemetry] Deleted ${deletedOldLogs.count} legacy activity logs created before Oct 15, 2026.`)

  // 2. Delete any ghost records where user is null (e.g. admin logins mistakenly logged)
  const deletedGhostLogs = await prisma.upward_app_activity_log.deleteMany({
    where: {
      OR: [
        { userEmail: null, userId: null },
        { userEmail: '' },
      ],
    },
  })
  console.log(`[Clean Telemetry] Deleted ${deletedGhostLogs.count} ghost activity logs without a tenant identity.`)

  // 3. Delete any remaining spam UPDATE profile or APP_INSTALL records
  const deletedSpamLogs = await prisma.upward_app_activity_log.deleteMany({
    where: {
      OR: [
        { action: 'UPDATE', entityType: 'PROFILE' },
        { action: 'APP_INSTALL' },
        { description: { contains: 'updated profile settings', mode: 'insensitive' } },
        { description: { contains: 'Mobile app installed', mode: 'insensitive' } },
      ],
    },
  })
  console.log(`[Clean Telemetry] Deleted ${deletedSpamLogs.count} spam profile update / install activity logs.`)

  // 3. Delete legacy session events before Oct 15, 2026
  try {
    const deletedSessionEvents = await (prisma as any).upward_user_session_event.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })
    console.log(`[Clean Telemetry] Deleted ${deletedSessionEvents.count} legacy session events.`)
  } catch (err: any) {
    console.warn(`[Clean Telemetry] Warning cleaning session events: ${err?.message || err}`)
  }

  // 4. Delete legacy sessions before Oct 15, 2026
  try {
    const deletedSessions = await (prisma as any).upward_user_session.deleteMany({
      where: {
        startedAt: {
          lt: cutoffDate,
        },
      },
    })
    console.log(`[Clean Telemetry] Deleted ${deletedSessions.count} legacy user sessions.`)
  } catch (err: any) {
    console.warn(`[Clean Telemetry] Warning cleaning sessions: ${err?.message || err}`)
  }

  console.log('[Clean Telemetry] Cleanup complete! Active dataset is now fresh from October 15, 2026 onward.')
}

main()
  .catch((e) => {
    console.error('Error running clean script:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
