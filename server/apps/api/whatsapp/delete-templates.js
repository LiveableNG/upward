const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#\s]+)\s*=\s*(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    }
  });
}

const token = process.env.WHATSAPP_TOKEN;
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

if (!token || !wabaId) {
  console.error('❌ Missing WHATSAPP_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID');
  process.exit(1);
}

const templatesToDelete = [
  'upward_auth_otp_v2',
];

async function deleteTemplates() {
  console.log('🗑️ Attempting to delete existing templates...\n');
  for (const name of templatesToDelete) {
    const url = `https://graph.facebook.com/v25.0/${wabaId}/message_templates?name=${name}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(`❌ Failed to delete ${name}:`, data.error?.message || data);
      } else {
        console.log(`✅ Deleted: ${name}`);
      }
    } catch (err) {
      console.error(`❌ Request error for ${name}:`, err.message);
    }
  }
}

deleteTemplates();
