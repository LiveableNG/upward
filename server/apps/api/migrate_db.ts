
import { PrismaClient } from '@prisma/client';

const sourceUrl = 'postgresql://postgres:owr4JL1YWDHWfywDMaMl@upward-db.chkeeysys9ok.eu-west-1.rds.amazonaws.com:5432/postgres';
const destUrl = 'postgresql://postgres:owr4JL1YWDHWfywDMaMl@upward-db.chkeeysys9ok.eu-west-1.rds.amazonaws.com:5432/upward';

async function main() {
  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const dest = new PrismaClient({ datasources: { db: { url: destUrl } } });

  try {
    console.log('Fetching data using raw SQL (to bypass schema differences)...');
    const data = await source.$queryRawUnsafe('SELECT * FROM "upward_waitlist"') as any[];
    console.log(`Found ${data.length} records.`);

    for (const record of data) {
        const { attendances, emailLogs, ...cleanData } = record as any;
        await dest.upward_waitlist.upsert({
            where: { email: cleanData.email },
            update: cleanData,
            create: cleanData
        });
    }
    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await source.$disconnect();
    await dest.$disconnect();
  }
}
main();
