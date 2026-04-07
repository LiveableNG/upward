//node_modules\.bin\tsx.cmd scripts/view_db.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('--- Tenants ---')
    const tenants = await prisma.upward_user.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
    console.table(tenants.map((t) => ({ id: t.id.slice(0, 8), email: t.email, name: t.fullName })))

    console.log('\n--- Announcements ---')
    const announcements = await prisma.upward_announcement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    })
    console.table(
      announcements.map((a) => ({ id: a.id.slice(0, 8), title: a.title, isActive: a.isActive })),
    )

    console.log('\n--- Announcement User States ---')
    const states = await prisma.upward_user_announcement_state.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
    })
    console.table(
      states.map((s) => ({
        tenantId: s.tenantId.slice(0, 8),
        announcementId: s.announcementId.slice(0, 8),
        seenP: s.seenPopup,
        interP: s.interactedPopup,
        seenB: s.seenBanner,
        interB: s.interactedBanner,
      })),
    )

    console.log('\n--- Transactions ---')
    const transactions = await prisma.upward_transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    })
    console.table(
      transactions.map((tx) => ({
        id: tx.id.slice(0, 8),
        amount: tx.amount,
        status: tx.status,
        ref: tx.reference.slice(0, 10),
      })),
    )

    console.log('\n--- Notifications ---')
    const notifications = await prisma.upward_notification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    })
    console.table(
      notifications.map((n) => ({
        id: n.id.slice(0, 8),
        tenant: n.tenantId.slice(0, 8),
        title: n.title,
        isRead: n.isRead,
      })),
    )
  } catch (err) {
    console.error('Error fetching data:', err)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
