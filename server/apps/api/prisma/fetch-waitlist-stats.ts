import { PrismaClient } from '@prisma/client';

const dbUrl = 'postgresql://postgres:owr4JL1YWDHWfywDMaMl@upward-db.chkeeysys9ok.eu-west-1.rds.amazonaws.com:5432/upward?connection_limit=20';

async function main() {
  console.log('🔗 Connecting to database...');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    console.log('📊 Querying waitlist statistics...');
    
    // We use unnest(benefits) to expand the Postgres array column into rows
    // so we can count selections per role and benefit option
    const stats: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE(role, 'Unknown') as user_role,
        unnest(benefits) as benefit_option,
        COUNT(*)::int as selection_count
      FROM 
        upward_waitlist
      GROUP BY 
        user_role, 
        benefit_option
      ORDER BY 
        user_role, 
        selection_count DESC;
    `);

    if (stats.length === 0) {
      console.log('⚠️ No waitlist records found in the database.');
      return;
    }

    console.log('\n📈 Waitlist Benefits Breakdown:');
    console.table(stats);

  } catch (error) {
    console.error('❌ Failed to fetch waitlist stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
