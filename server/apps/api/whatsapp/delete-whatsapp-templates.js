const fs = require('fs');
const path = require('path');

// Load .env variables
const envPath = path.resolve(__dirname, '../.env');
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
  console.error('❌ Error: WHATSAPP_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID is missing.');
  process.exit(1);
}

const templatesToDelete = [
  'upward_seq_day14_v1',
  'upward_seq_day9_v1',
  'upward_seq_day5_v1',
  'upward_seq_day2_v1',
  'upward_seq_welcome_v1',
  'upward_tenant_invite_v2',
  'hello_world'
];

async function deleteTemplates() {
  console.log('🚀 Attempting to delete templates via Meta API...\n');

  for (const templateName of templatesToDelete) {
    const url = `https://graph.facebook.com/v25.0/${wabaId}/message_templates?name=${templateName}`;

    try {
      console.log(`Deleting template: ${templateName}...`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(`❌ Failed to delete ${templateName}:`, JSON.stringify(data.error, null, 2));
      } else {
        console.log(`✅ Success! Deleted ${templateName}`);
      }
    } catch (err) {
      console.error(`❌ Request error for ${templateName}:`, err.message);
    }
  }
  
  console.log('\nDone!');
}

deleteTemplates();
