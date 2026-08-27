import { PrismaClient } from '@prisma/client';
import { SubscriptionBillingScheduler } from '../src/scheduling/subscription-billing.scheduler';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../server/apps/api/.env') });

const prisma = new PrismaClient();

async function runCronJob() {
  console.log('\n====================================================================');
  console.log('      RUNNING SUBSCRIPTION BILLING CRON JOB                         ');
  console.log('====================================================================\n');

  const scheduler = new SubscriptionBillingScheduler(prisma);
  
  await scheduler.processBillingCycles();

  console.log('\n✅ Cron execution completed successfully!\n');
}

runCronJob()
  .catch((err) => console.error('Error executing cron job:', err))
  .finally(() => prisma.$disconnect());
