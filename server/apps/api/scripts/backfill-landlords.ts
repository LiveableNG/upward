import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const algorithm = 'aes-256-gcm';
const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';
const key = Buffer.from(hexKey, 'hex');

function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return encryptedText;
  }
}

const ivLength = parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10);

function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function hash(text: string): string {
  if (!text) return text;
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

async function run() {
  console.log('Fetching properties with old landlord fields...');
  
  const properties = await prisma.upward_pm_property.findMany({
    where: {
      landlordId: null,
      OR: [
        { landlordEmailEncrypted: { not: null } },
        { landlordPhoneEncrypted: { not: null } },
        { landlordNameEncrypted: { not: null } }
      ]
    },
    include: {
      pm: true
    }
  });

  console.log(`Found ${properties.length} properties to backfill.`);

  for (const prop of properties) {
    const email = prop.landlordEmailEncrypted ? decrypt(prop.landlordEmailEncrypted) : null;
    const phone = prop.landlordPhoneEncrypted ? decrypt(prop.landlordPhoneEncrypted) : null;
    const name = prop.landlordNameEncrypted ? decrypt(prop.landlordNameEncrypted) : null;

    if (!email) {
      console.log(`Skipping property ${prop.id} - no email`);
      continue;
    }

    console.log(`Ensuring landlord for property ${prop.id}: ${name} / ${email} / ${phone}`);
    
    // Find existing landlord by email
    const emailHash = hash(email);
    let landlord = await prisma.upward_pm_landlord.findUnique({ where: { emailHash } });
    
    if (!landlord) {
      landlord = await prisma.upward_pm_landlord.create({
        data: {
          email: encrypt(email),
          emailHash,
          passwordHash: 'BACKFILL',
          firstName: name ? encrypt(name) : undefined,
          phone: phone ? encrypt(phone) : undefined,
          phoneHash: phone ? hash(phone) : undefined,
        }
      });
    }

    // Ensure relation
    await prisma.upward_pm_landlord_relation.upsert({
      where: {
        pmId_landlordId: { pmId: prop.pmId, landlordId: landlord.id }
      },
      update: {},
      create: {
        pmId: prop.pmId,
        landlordId: landlord.id
      }
    });

    // Link property
    await prisma.upward_pm_property.update({
      where: { id: prop.id },
      data: { landlordId: landlord.id }
    });
    
    console.log(`Linked property ${prop.id} to landlord ${landlord.id}`);
  }

  console.log('Backfill complete!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
