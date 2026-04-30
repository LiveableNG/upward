const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const ENCRYPTION_KEY = '1107dfc18c646779472c1676315cca08daaa14f375c0f1696ef26f7f89bba815';
const ALGORITHM = 'aes-256-gcm';

function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return encryptedText;
  }
}

async function main() {
  console.log('Checking for users with no password or placeholder passwords...');
  
  const users = await prisma.upward_user.findMany();

  const noPasswordUsers = [];
  const invitedUsers = [];
  const shadowUsers = [];
  const nonBcryptUsers = [];

  users.forEach(user => {
    const email = decrypt(user.email);
    const firstName = decrypt(user.firstName);
    const lastName = decrypt(user.lastName);
    const name = `${firstName} ${lastName}`;

    if (!user.passwordHash || user.passwordHash.trim() === '') {
      noPasswordUsers.push({ id: user.id, uuid: user.uuid, email, name, passwordHash: user.passwordHash });
    } else if (user.passwordHash === 'INVITED') {
      invitedUsers.push({ id: user.id, uuid: user.uuid, email, name });
    } else if (user.passwordHash === 'SHADOW_USER_PENDING_ONBOARDING') {
      shadowUsers.push({ id: user.id, uuid: user.uuid, email, name });
    } else if (!user.passwordHash.startsWith('$2a$') && !user.passwordHash.startsWith('$2b$')) {
      nonBcryptUsers.push({ id: user.id, uuid: user.uuid, email, name, passwordHash: user.passwordHash });
    }
  });

  console.log('\n--- Users with empty/null passwordHash ---');
  if (noPasswordUsers.length === 0) console.log('None found.');
  noPasswordUsers.forEach(u => console.log(`[${u.id}] ${u.name} (${u.email}) - Hash: "${u.passwordHash}"`));

  console.log('\n--- Users with "INVITED" placeholder ---');
  console.log(`Total: ${invitedUsers.length}`);
  if (invitedUsers.length > 0) {
    console.log('Showing first 5:');
    invitedUsers.slice(0, 5).forEach(u => console.log(`[${u.id}] ${u.name} (${u.email})`));
  }

  console.log('\n--- Users with "SHADOW_USER_PENDING_ONBOARDING" placeholder ---');
  console.log(`Total: ${shadowUsers.length}`);
  if (shadowUsers.length > 0) {
    console.log('Showing first 5:');
    shadowUsers.slice(0, 5).forEach(u => console.log(`[${u.id}] ${u.name} (${u.email})`));
  }

  console.log('\n--- Users with non-bcrypt hashes ---');
  console.log(`Total: ${nonBcryptUsers.length}`);
  nonBcryptUsers.forEach(u => console.log(`[${u.id}] ${u.name} (${u.email}) - Hash: "${u.passwordHash}"`));

  console.log('\nSummary:');
  console.log(`Empty Hash: ${noPasswordUsers.length}`);
  console.log(`Invited: ${invitedUsers.length}`);
  console.log(`Shadow: ${shadowUsers.length}`);
  console.log(`Non-Bcrypt: ${nonBcryptUsers.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
