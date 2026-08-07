import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'ayeleru1234@gmail.com';
  const passwordPlain = 'Oluwaseun123@';
  const role = 'DEVELOPER';

  console.log(`Creating admin user: ${email} with role: ${role}`);

  const existing = await prisma.upward_admin.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`Admin ${email} already exists. Updating password and role to ${role}...`);
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    await prisma.upward_admin.update({
      where: { email },
      data: {
        passwordHash,
        role,
      },
    });
    console.log('Update complete!');
  } else {
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    await prisma.upward_admin.create({
      data: {
        email,
        passwordHash,
        role,
        mustChangePassword: false,
      },
    });
    console.log('Creation complete!');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
