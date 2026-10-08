import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Decryption helper matching EncryptionService
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

async function computeMetrics() {
  console.log('================================================================');
  console.log('       UPWARD USER PROPERTY DETAILED METRICS & AUDIT REPORT     ');
  console.log('================================================================\n');

  // Load all user properties with full relations
  const allProperties = await prisma.upward_user_property.findMany({
    include: {
      company: {
        include: {
          platform: true
        }
      },
      user: true,
      pm: true,
      paymentRequests: true,
    }
  });

  // Load all PM units and PM tenants to find orphan/broken PM links
  const allPmUnits = await prisma.upward_pm_unit.findMany({
    include: {
      property: true,
      tenant: true
    }
  });

  const allPmTenants = await prisma.upward_pm_tenant.findMany();

  // Maps for fast lookup
  const pmUnitByPropUuid = new Map<string, any>();
  allPmUnits.forEach((u) => {
    if (u.userPropertyUuid) pmUnitByPropUuid.set(u.userPropertyUuid, u);
  });

  const pmTenantEmailHashSet = new Set<string>();
  allPmTenants.forEach((t) => {
    if (t.emailHash) pmTenantEmailHashSet.add(t.emailHash);
  });

  const total = allProperties.length;
  console.log(`TOTAL USER PROPERTIES IN DB: ${total}\n`);

  let pmSyncedDirectCount = 0;
  let pmSyncedRecoveredCount = 0;
  let organicDirectCount = 0;

  let platformTotalCount = 0;
  let platformFullyLinked = 0;
  let platformMissingDirectId = 0;
  let platformMissingExternalUnitId = 0;
  let platformMissingBothExternalIds = 0;

  const platformMissingDetails: any[] = [];
  const platformFullyLinkedDetails: any[] = [];
  const pmSyncedDetails: any[] = [];

  for (const prop of allProperties) {
    const userEmail = decrypt(prop.user?.email);
    const platformName = prop.company?.platform?.name
      ? decrypt(prop.company.platform.name)
      : (prop.platformId ? `Platform #${prop.platformId}` : 'None');

    // Check if directly linked to PM
    const isDirectPm = !!prop.pmId || !!prop.pmUnitId;

    // Check if indirectly linked to PM via pm_unit or pm_tenant email match
    const linkedPmUnit = pmUnitByPropUuid.get(prop.uuid);
    const userEmailHash = prop.user?.emailHash;
    const isPmTenantMatch = userEmailHash ? pmTenantEmailHashSet.has(userEmailHash) : false;
    
    const isRecoveredPm = !isDirectPm && (!!linkedPmUnit || isPmTenantMatch);

    const effectivePlatformId = prop.platformId || prop.company?.platformId;

    // If PM property (and not explicitly a platform property)
    if ((isDirectPm || isRecoveredPm) && !effectivePlatformId) {
      if (isDirectPm) pmSyncedDirectCount++;
      else pmSyncedRecoveredCount++;

      pmSyncedDetails.push({
        id: prop.id,
        uuid: prop.uuid,
        userEmail,
        isDirectPm,
        pmId: prop.pmId || linkedPmUnit?.property?.pmId || 'N/A',
        pmUnitId: prop.pmUnitId || linkedPmUnit?.id || 'N/A',
        recoveryMethod: isDirectPm ? 'Direct Fields' : (linkedPmUnit ? 'PM Unit UserPropertyUUID' : 'PM Tenant Email Hash')
      });
      continue;
    }

    if (!effectivePlatformId) {
      organicDirectCount++;
      continue;
    }

    // Platform Property Analysis
    platformTotalCount++;

    const hasDirectPlatformId = !!prop.platformId;
    const hasExternalUnitId = !!prop.externalUnitId && prop.externalUnitId !== 'null';
    const hasExternalPropertyId = !!prop.externalPropertyId && prop.externalPropertyId !== 'null';

    if (!hasDirectPlatformId) platformMissingDirectId++;
    if (!hasExternalUnitId) platformMissingExternalUnitId++;
    if (!hasExternalUnitId && !hasExternalPropertyId) platformMissingBothExternalIds++;

    if (hasDirectPlatformId && hasExternalUnitId) {
      platformFullyLinked++;
      platformFullyLinkedDetails.push({
        id: prop.id,
        userEmail,
        platformName,
        platformId: prop.platformId,
        externalUnitId: prop.externalUnitId,
        externalPropertyId: prop.externalPropertyId,
      });
    } else {
      platformMissingDetails.push({
        id: prop.id,
        userId: prop.userId,
        userEmail,
        platformName,
        directPlatformId: prop.platformId,
        companyPlatformId: prop.company?.platformId,
        externalUnitId: prop.externalUnitId,
        externalPropertyId: prop.externalPropertyId,
        isPmSynced: isDirectPm || isRecoveredPm,
      });
    }
  }

  const totalPmSynced = pmSyncedDirectCount + pmSyncedRecoveredCount;

  console.log('----------------------------------------------------------------');
  console.log(' 1. OVERALL BREAKDOWN OF PROPERTIES');
  console.log('----------------------------------------------------------------');
  console.log(` Total Platform-Associated Properties : ${platformTotalCount} (${((platformTotalCount/total)*100).toFixed(1)}%)`);
  console.log(` Total Upward PM-Synced Properties    : ${totalPmSynced} (${((totalPmSynced/total)*100).toFixed(1)}%)`);
  console.log(`   └─ Directly Linked (pmId/pmUnitId) : ${pmSyncedDirectCount}`);
  console.log(`   └─ Recovered via PM Unit/Tenant    : ${pmSyncedRecoveredCount}`);
  console.log(` Total Organic / Direct Properties    : ${organicDirectCount} (${((organicDirectCount/total)*100).toFixed(1)}%)`);
  console.log('----------------------------------------------------------------\n');

  console.log('----------------------------------------------------------------');
  console.log(' 2. PLATFORM INTEGRATION METRICS & ISSUES');
  console.log('----------------------------------------------------------------');
  console.log(` Total Platform Properties                    : ${platformTotalCount}`);
  console.log(` ✅ Fully Linked (Has platformId & externalUnitId) : ${platformFullyLinked} (${platformTotalCount ? ((platformFullyLinked/platformTotalCount)*100).toFixed(1) : 0}%)`);
  console.log(` ⚠️ Missing Direct platformId on Property     : ${platformMissingDirectId} (Falling back to company.platformId)`);
  console.log(` ⚠️ Missing externalUnitId                    : ${platformMissingExternalUnitId}`);
  console.log(` ⚠️ Missing BOTH External Unit & Property IDs : ${platformMissingBothExternalIds}`);
  console.log('----------------------------------------------------------------\n');

  if (platformMissingDetails.length > 0) {
    console.log('----------------------------------------------------------------');
    console.log(` 3. PLATFORM PROPERTIES MISSING DIRECT PLATFORM ID / EXTERNAL IDs (${platformMissingDetails.length})`);
    console.log('----------------------------------------------------------------');
    platformMissingDetails.forEach((item, index) => {
      console.log(` ${index + 1}. UserProperty ID: ${item.id} | User: ${item.userEmail}`);
      console.log(`    - Platform Name                : ${item.platformName}`);
      console.log(`    - Direct platformId on Property: ${item.directPlatformId ?? 'NULL'}`);
      console.log(`    - Company platformId           : ${item.companyPlatformId ?? 'NULL'}`);
      console.log(`    - externalUnitId               : ${item.externalUnitId ?? 'NULL'}`);
      console.log(`    - externalPropertyId           : ${item.externalPropertyId ?? 'NULL'}`);
      console.log(`    - Also PM Synced?              : ${item.isPmSynced ? 'Yes' : 'No'}`);
    });
    console.log('----------------------------------------------------------------\n');
  }

  if (pmSyncedDetails.length > 0) {
    console.log('----------------------------------------------------------------');
    console.log(` 4. UPWARD PM SYNCED PROPERTIES AUDIT SAMPLE (${pmSyncedDetails.length} Total)`);
    console.log('----------------------------------------------------------------');
    pmSyncedDetails.slice(0, 15).forEach((item, index) => {
      console.log(` ${index + 1}. Property ID: ${item.id} | User: ${item.userEmail}`);
      console.log(`    - Detection Method : ${item.recoveryMethod}`);
      console.log(`    - PM ID            : ${item.pmId}`);
      console.log(`    - PM Unit ID       : ${item.pmUnitId}`);
    });
    if (pmSyncedDetails.length > 15) {
      console.log(`   ... and ${pmSyncedDetails.length - 15} more PM-synced properties.`);
    }
    console.log('----------------------------------------------------------------\n');
  }

  await prisma.$disconnect();
}

computeMetrics().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
