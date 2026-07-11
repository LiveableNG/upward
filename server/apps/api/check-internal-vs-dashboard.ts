import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const totalUpwardUsers = await prisma.upward_user.count();
  const internalUsers = await prisma.upward_user.count({ where: { isInternal: true } });
  const externalUsers = await prisma.upward_user.count({ where: { isInternal: false } });
  
  const totalPmTenants = await prisma.upward_pm_tenant.count();
  const waitlistUsers = await prisma.upward_waitlist.count();

  console.log('--- Database User Counts ---');
  console.log(`Total Accounts on upward_user table: ${totalUpwardUsers}`);
  console.log(`  -> isInternal=true: ${internalUsers}`);
  console.log(`  -> isInternal=false: ${externalUsers}`);
  console.log('');
  console.log(`Total PM Tenants (Guests): ${totalPmTenants}`);
  console.log('');
  console.log(`Waitlist Users: ${waitlistUsers}`);
  
  // Also check if there are users with different origin flags
  const waitlistFlags = await prisma.upward_user.count({ where: { isFromWaitlist: true } });
  const inviteFlags = await prisma.upward_user.count({ where: { isFromInvite: true } });
  
  console.log('');
  console.log(`Upward Users from Waitlist: ${waitlistFlags}`);
  console.log(`Upward Users from Invite: ${inviteFlags}`);
}

main().finally(() => prisma.$disconnect());
