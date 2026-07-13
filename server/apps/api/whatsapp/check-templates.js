const fs = require('fs');
const path = require('path');

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
  console.error('❌ Missing WHATSAPP_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID');
  process.exit(1);
}

const url = `https://graph.facebook.com/v25.0/${wabaId}/message_templates`;

fetch(url, {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error('Error fetching templates:', data.error);
      return;
    }
    console.log('--- ALL TEMPLATES ---');
    data.data.forEach(t => {
      console.log(`Name: ${t.name} | Language: ${t.language} | Status: ${t.status}`);
    });
  })
  .catch(console.error);
