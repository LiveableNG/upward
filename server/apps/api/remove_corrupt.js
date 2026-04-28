const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const migrationName = '20260428_whatsapp_tables';

  console.log(`Starting removal of migration: ${migrationName}`);

  try {
    const count = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
      migrationName
    );

    if (count > 0) {
      console.log(`Successfully deleted migration record: ${migrationName}`);
      console.log(`Rows affected: ${count}`);
    } else {
      console.log(`No migration record found with name: ${migrationName}`);
    }

  } catch (error) {
    console.error(' Error executing raw SQL:', error);
  } finally {
    await prisma.$disconnect();
    console.log(' Prisma disconnected.');
  }
}

main();
