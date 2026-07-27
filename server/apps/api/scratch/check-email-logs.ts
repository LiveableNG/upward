import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RECENT DEV EMAIL PREVIEWS ---');
  const previews = await prisma.upward_dev_email_preview.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.dir(previews, { depth: null });

  console.log('\n--- RECENT COMMUNICATION LOGS ---');
  const logs = await prisma.upward_communication_log.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.dir(logs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
