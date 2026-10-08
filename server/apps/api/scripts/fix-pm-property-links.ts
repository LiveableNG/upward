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

async function fixPmPropertyLinks() {
  console.log('================================================================');
  console.log('       REPAIRING BROKEN PM PROPERTY LINKS (pmId & pmUnitId)     ');
  console.log('================================================================\n');

  // Load all PM units with property & tenant
  const allPmUnits = await prisma.upward_pm_unit.findMany({
    include: {
      property: true,
      tenant: true,
    }
  });

  console.log(`Loaded ${allPmUnits.length} PM Units from Database.`);

  const pmUnitByPropUuid = new Map<string, any>();
  const pmUnitByTenantEmailHash = new Map<string, any>();

  for (const unit of allPmUnits) {
    if (unit.userPropertyUuid) {
      pmUnitByPropUuid.set(unit.userPropertyUuid, unit);
    }
    if (unit.tenant && unit.tenant.emailHash) {
      pmUnitByTenantEmailHash.set(unit.tenant.emailHash, unit);
    }
  }

  // Load user properties missing pmId or pmUnitId
  const incompleteProperties = await prisma.upward_user_property.findMany({
    where: {
      OR: [
        { pmId: null },
        { pmUnitId: null }
      ]
    },
    include: {
      user: true,
      company: true,
    }
  });

  console.log(`Found ${incompleteProperties.length} user_property records missing pmId or pmUnitId.\n`);

  let repairedCount = 0;
  let skippedCount = 0;

  for (const prop of incompleteProperties) {
    let targetUnit = pmUnitByPropUuid.get(prop.uuid);

    if (!targetUnit && prop.user?.emailHash) {
      targetUnit = pmUnitByTenantEmailHash.get(prop.user.emailHash);
    }

    if (!targetUnit) {
      skippedCount++;
      continue;
    }

    const newPmId = targetUnit.property.pmId;
    const newPmUnitId = targetUnit.id;
    const userEmail = decrypt(prop.user?.email);

    console.log(`[REPAIRING] UserProperty ID #${prop.id} (${userEmail})`);
    console.log(`   Old pmId: ${prop.pmId ?? 'NULL'} -> New pmId: ${newPmId}`);
    console.log(`   Old pmUnitId: ${prop.pmUnitId ?? 'NULL'} -> New pmUnitId: ${newPmUnitId}`);

    // Update upward_user_property
    await prisma.upward_user_property.update({
      where: { id: prop.id },
      data: {
        pmId: newPmId,
        pmUnitId: newPmUnitId,
      }
    });

    // Ensure upward_pm_unit userPropertyUuid is synced back
    if (targetUnit.userPropertyUuid !== prop.uuid) {
      await prisma.upward_pm_unit.update({
        where: { id: targetUnit.id },
        data: {
          userPropertyUuid: prop.uuid,
          isSynced: true,
        }
      });
    }

    repairedCount++;
  }

  console.log('\n================================================================');
  console.log(` REPAIR SUMMARY:`);
  console.log(` ✅ Successfully Repaired Properties : ${repairedCount}`);
  console.log(` ℹ️ Skipped (No PM Link Found)      : ${skippedCount}`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

fixPmPropertyLinks().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
