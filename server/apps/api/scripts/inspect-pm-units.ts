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

async function inspectPmPropertiesWithoutUnitId() {
  console.log('=== INSPECTING PROPERTIES WITH pmId BUT NULL pmUnitId ===\n');

  const targetIds = [5, 7, 9, 10, 12, 32];

  const props = await prisma.upward_user_property.findMany({
    where: {
      OR: [
        { id: { in: targetIds } },
        {
          pmId: { not: null },
          pmUnitId: null
        }
      ]
    },
    include: {
      user: true,
      pm: true,
      contracts: true,
      rentCycles: true,
      paymentRequests: true
    }
  });

  console.log(`Found ${props.length} properties with pmId != null but pmUnitId == null:\n`);

  for (const prop of props) {
    const userEmail = decrypt(prop.user?.email);
    console.log(`Property ID #${prop.id} (User: ${userEmail})`);
    console.log(` - pmId: ${prop.pmId}`);
    console.log(` - pmUnitId: ${prop.pmUnitId ?? 'NULL'}`);
    console.log(` - Property Address / Name: ${prop.propertyAddress || 'N/A'}`);
    
    // Check if there are PM units for this pmId
    const pmUnitsForPm = await prisma.upward_pm_unit.findMany({
      where: {
        property: {
          pmId: prop.pmId!
        }
      },
      include: {
        tenant: true,
        property: true
      }
    });

    console.log(` - Total PM Units under PM #${prop.pmId}: ${pmUnitsForPm.length}`);
    pmUnitsForPm.forEach((u) => {
      console.log(`    * PM Unit #${u.id} ("${u.unitName}" under Property "${u.property.name}") | Status: ${u.status} | userPropertyUuid: '${u.userPropertyUuid}' | Tenant Email: ${decrypt(u.tenant?.emailEncrypted)}`);
    });

    console.log('----------------------------------------------------');
  }

  await prisma.$disconnect();
}

inspectPmPropertiesWithoutUnitId().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
