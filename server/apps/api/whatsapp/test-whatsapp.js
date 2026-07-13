const fs = require('fs');
const path = require('path');

// Simple script to read .env file since this might be run without dotenv installed globally
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
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

if (!token || !phoneNumberId) {
  console.error('❌ Error: WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing from .env');
  process.exit(1);
}

// Get phone number from command line args
const phoneToTest = process.argv[2];
if (!phoneToTest) {
  console.error('❌ Error: Please provide a phone number to test.');
  console.error('Usage: node test-whatsapp.js <PHONE_NUMBER>');
  console.error('Example: node test-whatsapp.js +2348123456789');
  process.exit(1);
}

// Sanitize phone number (strip everything except digits)
const sanitizedPhone = phoneToTest.replace(/\D/g, '');

const payload = {
  messaging_product: 'whatsapp',
  to: sanitizedPhone,
  type: 'template',
  template: {
    name: 'upward_tenant_invite_v2',
    language: { code: 'en_US' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'John Doe' },
          { type: 'text', text: 'Jane Manager' },
          { type: 'text', text: 'Upward Realty' }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [
          { type: 'text', text: 'invite/test-123' }
        ]
      }
    ]
  }
};

const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

console.log(`\n⏳ Sending WhatsApp test message...`);
console.log(`📱 To: ${sanitizedPhone}`);
console.log(`🔗 URL: ${url}\n`);

fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
  .then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Failed to send message.');
      console.error('Status:', response.status);
      console.error('Meta Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('✅ Success! Message sent.');
      console.log('Meta Response:', JSON.stringify(data, null, 2));
    }
  })
  .catch((err) => {
    console.error('❌ Request error:', err);
  });
