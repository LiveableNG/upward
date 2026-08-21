import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText) return 'N/A';
  if (!encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const [ivHex, authTagHex, encrypted] = parts;
    const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';
    const key = Buffer.from(hexKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText;
  }
}

async function fixPlatformPropertyIds() {
  console.log('================================================================');
  console.log('    BACKFILLING DIRECT platformId ON USER PROPERTIES FROM COMPANY');
  console.log('================================================================\n');

  // Find all user_property records where platformId is null but company.platformId is not null
  const propertiesToFix = await prisma.upward_user_property.findMany({
    where: {
      platformId: null,
      company: {
        platformId: {
          not: null
        }
      }
    },
    include: {
      user: true,
      company: {
        include: {
          platform: true
        }
      }
    }
  });

  console.log(`Found ${propertiesToFix.length} properties where platformId is NULL but company.platformId is set.\n`);

  let updatedCount = 0;

  for (const prop of propertiesToFix) {
    const platformIdToSet = prop.company!.platformId!;
    const platformName = prop.company?.platform?.name
      ? decrypt(prop.company.platform.name)
      : `Platform #${platformIdToSet}`;
    const userEmail = decrypt(prop.user?.email);

    console.log(`[FIXING] Property ID #${prop.id} (User: ${userEmail})`);
    console.log(`   Platform: ${platformName}`);
    console.log(`   Setting userProperty.platformId = ${platformIdToSet}...`);

    await prisma.upward_user_property.update({
      where: { id: prop.id },
      data: {
        platformId: platformIdToSet
      }
    });

    updatedCount++;
  }

  console.log('\n================================================================');
  console.log(` REPAIR SUMMARY:`);
  console.log(` ✅ Successfully Backfilled platformId for ${updatedCount} Properties`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

fixPlatformPropertyIds().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
