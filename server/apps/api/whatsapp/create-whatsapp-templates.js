const fs = require('fs');
const path = require('path');

// Load .env variables
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
// Note: Creating templates requires the WhatsApp Business Account (WABA) ID, NOT the Phone Number ID.
// You can find your WABA ID in the Meta App Dashboard > WhatsApp > API Setup (at the top).
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID; 

if (!token || !wabaId) {
  console.error('❌ Error: WHATSAPP_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID is missing.');
  console.error('Please add WHATSAPP_BUSINESS_ACCOUNT_ID to your .env file to run this script automatically.');
  console.log('\n--- TEMPLATE DEFINITIONS YOU NEED TO CREATE ---');
}

/**
 * These are the exact templates your application needs based on the codebase.
 * You can create these automatically by running this script, or create them manually
 * in the Meta Business Manager > WhatsApp Manager > Message Templates.
 */
const templates = [
  {
    name: 'upward_auth_otp_v3',
    category: 'AUTHENTICATION',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        add_security_recommendation: true,
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'OTP',
            otp_type: 'COPY_CODE',
            text: 'Copy Code',
          }
        ]
      }
    ]
  },
  {
    name: 'upward_tenant_invite_v2',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hi *{{1}}*,\n\n{{2}} at {{3}} has invited you to join Upward, your new platform for rent payments and tenancy management.\n\nYour rent payments can now do more than pay for your home—they can work for you.\n\nWith Upward you can:\n✅ Build a verified rental credibility profile from your payment history.\n✅ Keep your rental history even when you move.\n✅ Access your rent records and receipts anytime.\n\n*Good news:* We will import your previous rent payment history, so you will not be starting from scratch.\n\nGetting started takes just a few minutes.',
        example: {
          body_text: [['John', 'Sarah Manager', 'GoodTenants Realty']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward by Goodtenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Accept Invitation',
            url: 'https://upward.goodtenants.io/{{1}}',
            example: ['invite/123']
          }
        ]
      }
    ]
  }
];

if (!token || !wabaId) {
  console.log(JSON.stringify(templates, null, 2));
  process.exit(1);
}

// Automatically create templates
async function createTemplates() {
  console.log('🚀 Attempting to create templates automatically via Meta API...\n');

  for (const template of templates) {
    const url = `https://graph.facebook.com/v25.0/${wabaId}/message_templates`;

    try {
      console.log(`Creating template: ${template.name}...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(`❌ Failed to create ${template.name}:`, JSON.stringify(data.error, null, 2));
      } else {
        console.log(`✅ Success! Template ID: ${data.id}`);
      }
    } catch (err) {
      console.error(`❌ Request error for ${template.name}:`, err.message);
    }
  }
  
  console.log('\nDone! Note: Templates usually require Meta review which takes a few minutes.');
}

createTemplates();
