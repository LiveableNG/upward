const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

process.env.DATABASE_URL = "postgresql://postgres:owr4JL1YWDHWfywDMaMl@upward-db.chkeeysys9ok.eu-west-1.rds.amazonaws.com:5432/upward?connection_limit=20";

const prisma = new PrismaClient();

const ENCRYPTION_KEY = '4a8fb008ac99a75788a473c7029bdf5b5b2a198c8dbc873b3efa637d08abfca8';
const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
const algorithm = 'aes-256-gcm';

function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, encrypted] = parts;
    if (!ivHex || !authTagHex || !encrypted) return encryptedText;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return encryptedText;
  }
}

async function main() {
  try {
    const company = await prisma.upward_company.findUnique({
      where: { id: 2 },
      include: {
        managers: true,
        properties: true
      }
    });

    console.log(`Company Name: ${decrypt(company.name)} | Email: ${company.email ? decrypt(company.email) : 'None'} | Phone: ${company.phone ? decrypt(company.phone) : 'None'}`);
    console.log(`Managers (${company.managers.length}):`);
    company.managers.forEach(m => {
      console.log(`  - Manager ID: ${m.id} | Name: ${decrypt(m.firstName)} ${decrypt(m.lastName)} | Email: ${decrypt(m.email)} | Phone: ${m.phone ? decrypt(m.phone) : 'None'}`);
    });
    console.log(`Properties Count: ${company.properties.length}`);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
