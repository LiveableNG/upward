import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check details of upward_subscription_log table
  const columns: any = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'upward_subscription_log';
  `;
  console.log('Columns of upward_subscription_log:', columns);

  const rowCount: any = await prisma.$queryRaw`
    SELECT count(*)::int as count FROM "upward_subscription_log";
  `;
  console.log('Row count in upward_subscription_log:', rowCount);

  // Check the migrations log
  const migrations: any = await prisma.$queryRaw`
    SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at 
    FROM _prisma_migrations 
    ORDER BY started_at DESC 
    LIMIT 10;
  `;
  console.log('Recent migrations in _prisma_migrations:', JSON.stringify(migrations, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
