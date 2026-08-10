import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

// Immediately override the DATABASE_URL to target the test database if DATABASE_URL_TEST is set.
// This must happen before any NestJS modules or PrismaService gets instantiated.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
} else {
  // If not running in CI, print a warning.
  console.warn(
    '\n⚠️  WARNING: DATABASE_URL_TEST is not defined. Integration tests will run against DATABASE_URL, which might be production or development. Please define DATABASE_URL_TEST to prevent data loss.\n'
  );
}

export async function cleanDatabase(prisma: PrismaService) {
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error(
      'Refusing to run cleanDatabase: DATABASE_URL_TEST is not set. This is a safety check to prevent accidental database wiping.'
    );
  }

  // Get all table names in public schema
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  // Filter out migration history table
  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"${name}"`)
    .join(', ');

  if (tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }
}
