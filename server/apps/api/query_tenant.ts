import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.upward_pm_tenant.findFirst({
    where: {
      OR: [
        { firstNameSearch: { contains: 'Abdulsalam', mode: 'insensitive' } },
        { lastNameSearch: { contains: 'Johnny', mode: 'insensitive' } },
        { commercialNameSearch: { contains: 'Abdulsalam Johnny', mode: 'insensitive' } }
      ]
    },
    include: {
      sentDocuments: true,
    }
  });

  console.log('Tenant:', JSON.stringify(tenant, null, 2));

  if (tenant) {
    const comms = await prisma.upward_communication_log.findMany({
      where: {
        OR: [
          { recipientName: { contains: 'Abdulsalam', mode: 'insensitive' } }
        ]
      }
    });
    console.log('Communication Logs:', JSON.stringify(comms, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
