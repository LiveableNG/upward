import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillUserTimestamps() {
  console.log('================================================================');
  console.log('       BACKFILLING invitedAt & joinedAt TIMESTAMPS FOR USERS   ');
  console.log('================================================================\n');

  const allUsers = await prisma.upward_user.findMany({
    include: {
      authSessions: {
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    }
  });

  console.log(`Found ${allUsers.length} total users in DB.`);

  let updatedInvitedCount = 0;
  let updatedJoinedCount = 0;

  for (const user of allUsers) {
    const isShadow =
      !user.passwordHash ||
      ['INVITED', 'SHADOW', 'INVITED_NO_PASSWORD', 'SHADOW_GUEST'].includes(user.passwordHash) ||
      (!user.passwordHash.startsWith('$2') && user.passwordHash !== 'SOCIAL_AUTH');

    const firstAuthSession = user.authSessions[0]?.createdAt;

    let newInvitedAt = user.invitedAt;
    let newJoinedAt = user.joinedAt;

    if (user.isFromInvite) {
      if (!newInvitedAt) {
        newInvitedAt = user.createdAt;
      }
      if (!newJoinedAt) {
        if (!isShadow) {
          newJoinedAt = firstAuthSession || user.updatedAt || user.createdAt;
        } else if (firstAuthSession) {
          newJoinedAt = firstAuthSession;
        }
      }
    } else {
      // Direct organic user
      if (!newJoinedAt) {
        newJoinedAt = firstAuthSession || user.createdAt;
      }
    }

    if (newInvitedAt !== user.invitedAt || newJoinedAt !== user.joinedAt) {
      await prisma.upward_user.update({
        where: { id: user.id },
        data: {
          invitedAt: newInvitedAt,
          joinedAt: newJoinedAt,
        }
      });
      if (newInvitedAt && !user.invitedAt) updatedInvitedCount++;
      if (newJoinedAt && !user.joinedAt) updatedJoinedCount++;
    }
  }

  console.log('\n================================================================');
  console.log(' BACKFILL SUMMARY:');
  console.log(` ✅ Backfilled invitedAt for : ${updatedInvitedCount} users`);
  console.log(` ✅ Backfilled joinedAt for  : ${updatedJoinedCount} users`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

backfillUserTimestamps().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
