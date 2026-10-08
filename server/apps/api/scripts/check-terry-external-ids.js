const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables manually if dotenv is not present
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envRaw = fs.readFileSync(envPath, 'utf8');
  envRaw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx);
    let val = trimmed.slice(idx + 1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  });
}

const prisma = new PrismaClient();

const keyHex = process.env.ENCRYPTION_KEY || '1107dfc18c646779472c1676315cca08daaa14f375c0f1696ef26f7f89bba815';
const key = Buffer.from(keyHex, 'hex');

function hash(text) {
  if (!text) return text;
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

function decrypt(val) {
  if (!val || typeof val !== 'string' || !val.includes(':')) return val;
  try {
    const parts = val.split(':');
    if (parts.length !== 3) return val;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return val;
  }
}

async function main() {
  const targetEmail = 'quafo@gmail.com';
  const emailHash = hash(targetEmail);

  console.log(`Searching for user: ${targetEmail}...`);

  const user = await prisma.upward_user.findFirst({
    where: { emailHash },
    include: {
      properties: true
    }
  });

  if (!user) {
    console.log(`User ${targetEmail} NOT found in database.`);
    return;
  }

  console.log('\n=== USER FOUND ===');
  console.log('ID:', user.id);
  console.log('UUID:', user.uuid);
  console.log('Email:', decrypt(user.email));
  console.log('Total Properties:', user.properties.length);

  user.properties.forEach((p, idx) => {
    console.log(`\n--- Property #${idx + 1} ---`);
    console.log('Property ID:', p.id);
    console.log('Property UUID:', p.uuid);
    console.log('Platform ID:', p.platformId ?? 'NULL');
    console.log('External Unit ID:', p.externalUnitId ?? 'NULL');
    console.log('External Property ID:', p.externalPropertyId ?? 'NULL');
  });
}

main()
  .catch((e) => console.error('Error running script:', e))
  .finally(() => prisma.$disconnect());
