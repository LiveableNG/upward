import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('1. Applying DDL from migration.sql...');
  const migrationSqlPath = path.resolve(
    __dirname,
    '../../../../../projects/upward/server/apps/api/prisma/schema/migrations/20261011050000_decouple_settlement_accounts/migration.sql'
  );
  const sql = fs.readFileSync(migrationSqlPath, 'utf8');

  // Split and execute each SQL statement
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      console.log(`Executed statement successfully.`);
    } catch (err: any) {
      console.warn(`Statement execution warning: ${err.message}`);
    }
  }

  console.log('2. Migrating existing PM accounts into upward_settlement_account...');
  const pmAccounts = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, uuid, "pmId", "isPrimary", "title" FROM "upward_manual_account" WHERE "pmId" IS NOT NULL`
  );

  console.log(`Found ${pmAccounts.length} PM accounts in upward_manual_account.`);

  for (const acc of pmAccounts) {
    const existing = await (prisma as any).upward_settlement_account.findFirst({
      where: {
        manualAccountId: acc.id,
        pmId: acc.pmId,
      },
    });

    if (!existing) {
      const created = await (prisma as any).upward_settlement_account.create({
        data: {
          manualAccountId: acc.id,
          pmId: acc.pmId,
          isPrimary: Boolean(acc.isPrimary),
          title: acc.title || (acc.isPrimary ? 'Primary Settlement Account' : 'Settlement Account'),
        },
      });
      console.log(`Migrated PM #${acc.pmId} account #${acc.id} -> settlement_account #${created.id} (primary: ${created.isPrimary})`);
    } else {
      console.log(`PM #${acc.pmId} account #${acc.id} already exists in settlement_account #${existing.id}`);
    }
  }

  const allSettlementAccounts = await (prisma as any).upward_settlement_account.findMany({
    include: {
      manualAccount: true,
    },
  });
  console.log(`Total upward_settlement_account records in DB: ${allSettlementAccounts.length}`);
  console.log(JSON.stringify(allSettlementAccounts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
