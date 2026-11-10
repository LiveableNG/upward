const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([A-Za-z0-9_]+)="?(.*?)"?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/\\n/g, '\n');
    }
  });
}

const projectId = process.env.FCM_PROJECT_ID;
const clientEmail = process.env.FCM_CLIENT_EMAIL;
const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing FCM credentials in .env');
  process.exit(1);
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp,
    }),
  ).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.write(`${header}.${payload}`);
  sign.end();
  const sig = sign.sign(privateKey, 'base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await resp.json();
  return data.access_token;
}

async function convertApnsToken(apnsToken, accessToken) {
  for (const sandbox of [false, true]) {
    try {
      const resp = await fetch('https://iid.googleapis.com/iid/v1:batchImport', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          access_token_auth: 'true',
        },
        body: JSON.stringify({
          application: 'com.goodtenants.upward',
          sandbox,
          apns_tokens: [apnsToken],
        }),
      });

      if (!resp.ok) continue;
      const data = await resp.json();
      const result = data?.results?.[0];
      const fcmToken = result?.registration_token || result?.token;
      if (result?.status === 'OK' && fcmToken) {
        console.log(`✅ Successfully mapped APNs token to FCM (sandbox=${sandbox}):`, fcmToken.slice(0, 20) + '…');
        return fcmToken;
      }
    } catch (err) {
      console.warn(`Failed sandbox=${sandbox} import:`, err.message);
    }
  }
  return null;
}

async function sendPush(token, title, body, data = {}) {
  const accessToken = await getAccessToken();
  let targetToken = token.trim();

  if (/^[0-9a-fA-F]{64}$/.test(targetToken)) {
    console.log('Detected 64-hex char APNs device token. Converting to FCM token via batchImport...');
    const fcm = await convertApnsToken(targetToken, accessToken);
    if (fcm) targetToken = fcm;
    else console.warn('Could not map APNs token. Attempting direct send...');
  }

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const messageBody = {
    message: {
      token: targetToken,
      notification: { title, body },
      data,
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#d97757',
          sound: 'upward_chime',
          channel_id: 'upward_alerts',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'upward_chime.wav', badge: 1 },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messageBody),
  });

  const resText = await res.text();
  if (res.ok) {
    console.log('🎉 Push notification sent successfully!\nResponse:', resText);
  } else {
    console.error(`❌ FCM error (${res.status}):`, resText);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target) {
    console.log(`
Usage:
  node scripts/test-push.js <token | userId | email>

Examples:
  node scripts/test-push.js user@example.com
  node scripts/test-push.js 1
  node scripts/test-push.js dDqBRUN2RFufXZ4g...
`);
    process.exit(0);
  }

  const prisma = new PrismaClient();
  let tokens = [];

  if (target.includes('@')) {
    const emailHash = crypto.createHash('sha256').update(target.toLowerCase().trim()).digest('hex');
    const user = await prisma.upward_user.findFirst({
      where: {
        OR: [
          { email: target },
          { emailHash: emailHash },
        ],
      },
    });
    if (!user) {
      console.error('User not found with email:', target);
      process.exit(1);
    }
    const recs = await prisma.upward_device_token.findMany({ where: { userId: user.id } });
    tokens = recs.map((r) => r.token);
  } else if (/^\d+$/.test(target)) {
    const recs = await prisma.upward_device_token.findMany({ where: { userId: parseInt(target, 10) } });
    tokens = recs.map((r) => r.token);
  } else {
    tokens = [target];
  }

  if (tokens.length === 0) {
    console.log('No registered device tokens found for target.');
    process.exit(0);
  }

  console.log(`Found ${tokens.length} token(s). Sending test push...`);
  for (const t of tokens) {
    await sendPush(t, 'Upward Test Push 🚀', 'Your push notification configuration is working!', {
      type: 'SYSTEM',
      url: '/dashboard',
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
