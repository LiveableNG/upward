const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.upward_device_token.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      }
    }
  });

  console.log('--- ALL REGISTERED DEVICE TOKENS ---');
  tokens.forEach((t, i) => {
    console.log(`\n[${i + 1}] User ID: ${t.userId} (${t.user?.email || 'No User'})`);
    console.log(`    Platform: ${t.platform}`);
    console.log(`    Updated At: ${t.updatedAt}`);
    console.log(`    Token: ${t.token}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
