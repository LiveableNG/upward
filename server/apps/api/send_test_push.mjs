import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse .env file
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error(`[Error] .env file not found at: ${envPath}`);
    return false;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
  return true;
}

const envPath = path.join(__dirname, '.env');
loadEnv(envPath);

const projectId = process.env.FCM_PROJECT_ID;
const clientEmail = process.env.FCM_CLIENT_EMAIL;
const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('[Error] Missing required Firebase variables in .env file.');
  console.error(`  FCM_PROJECT_ID: ${projectId ? 'Set' : 'MISSING'}`);
  console.error(`  FCM_CLIENT_EMAIL: ${clientEmail ? 'Set' : 'MISSING'}`);
  console.error(`  FCM_PRIVATE_KEY: ${privateKey ? 'Set' : 'MISSING'}`);
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

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Google OAuth token retrieval failed: ${resp.status} - ${errorText}`);
  }

  const json = await resp.json();
  return json.access_token;
}

async function fetchTokenFromDatabase() {
  console.log('Checking database for registered device tokens...');
  const prisma = new PrismaClient();
  try {
    const latestToken = await prisma.upward_device_token.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
    return latestToken;
  } catch (err) {
    console.error('Failed to query database for device token:', err.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

async function sendPush() {
  let targetToken = process.argv[2];
  let userInfoStr = '';

  if (!targetToken) {
    const dbRecord = await fetchTokenFromDatabase();
    if (dbRecord) {
      targetToken = dbRecord.token;
      const user = dbRecord.user;
      const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown';
      const userEmail = user ? user.email : 'Unknown';
      userInfoStr = ` (Belongs to User: ${userName} <${userEmail}>, Platform: ${dbRecord.platform})`;
      console.log(`\nFound latest device token in database: ${targetToken.slice(0, 15)}...${userInfoStr}`);
    } else {
      console.error('\n[Error] No token provided and no registered tokens found in the database.');
      console.error('Please either:');
      console.error('  1. Register a token by logging into the app on a device/emulator.');
      console.error('  2. Pass a token manually: node send_test_push.mjs <DEVICE_FCM_TOKEN>');
      process.exit(1);
    }
  }

  console.log(`Authenticating with Google OAuth...`);
  const accessToken = await getAccessToken();
  console.log(`Success! Access token obtained.`);

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const body = {
    message: {
      token: targetToken,
      notification: {
        title: 'Upward Test Push',
        body: 'If you see this, push notifications are configured correctly!',
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#d97757',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    },
  };

  console.log(`Sending push notification to token: ${targetToken.slice(0, 15)}...${userInfoStr}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const resText = await res.text();
  if (res.ok) {
    console.log('\n=========================================');
    console.log('🎉 Push Notification Sent Successfully!');
    console.log('=========================================');
    console.log(resText);
  } else {
    console.error('\n=========================================');
    console.error('❌ Push Notification Sending Failed!');
    console.error('=========================================');
    console.error(`Status Code: ${res.status}`);
    console.error(`Response details:\n${resText}`);
  }
}

sendPush().catch((err) => {
  console.error('\nUnexpected Error:', err.message);
});
