import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to export upward_waitlist emails to CSV
 * Usage: npx tsx scripts/export-waitlist-csv.ts
 */

const prisma = new PrismaClient();

async function main() {
  console.log('\n\x1b[35m==============================================================');
  console.log('             UPWARD WAITLIST EXPORTER (CSV)                  ');
  console.log('==============================================================\x1b[0m\n');

  try {
    console.log('>>> Fetching waitlist entries...');
    
    const waitlistUsers = await prisma.upward_waitlist.findMany({
      where: {
        unsubscribed: false, // Only export active subscribers
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (waitlistUsers.length === 0) {
      console.log('\n\x1b[33m[!] No active users found in the waitlist.\x1b[0m\n');
      return;
    }

    console.log(`>>> Found \x1b[32m${waitlistUsers.length}\x1b[0m active users.`);
    console.log('>>> Generating CSV content...');

    const csvHeader = 'email,firstName,lastName,joinedAt\n';
    const csvRows = waitlistUsers.map(user => {
      const email = user.email || '';
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const joinedAt = user.createdAt ? user.createdAt.toISOString() : '';
      
      // CSV escaping: wrap in quotes and escape internal quotes
      const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;
      
      return `${escape(email)},${escape(firstName)},${escape(lastName)},${escape(joinedAt)}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    const filename = `upward_waitlist_export_${new Date().toISOString().split('T')[0]}.csv`;
    const outputPath = path.join(process.cwd(), filename);
    
    fs.writeFileSync(outputPath, csvContent);

    console.log('\n\x1b[32m[SUCCESS]\x1b[0m Export completed!');
    console.log(`>>> File saved to: \x1b[36m${outputPath}\x1b[0m`);
    console.log('>>> You can now use this CSV to add users to your closed testing tracks.');

  } catch (err) {
    console.error('\n\x1b[31m[ERROR] Failed to export waitlist:\x1b[0m', err);
  }

  console.log('\n\x1b[35m==============================================================\x1b[0m\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
