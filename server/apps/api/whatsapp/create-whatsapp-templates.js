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
    name: 'upward_seq_welcome_v1',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nWelcome to Upward! Your account has been successfully created through {{2}}.\n\n*With your account, you can view your rent receipts anytime, build a rental profile that improves every time you pay rent on time, manage rent payment requests from your property manager, and take your rental reputation with you wherever you move.*\n\nLog in now to complete your profile by clicking the prompt after signing in to unlock all available services.\n\n*Already have a history of paying rent on time?* Request your previous rent payment history from your property manager so you get credit for the positive record you've already built.\n\nWe're excited to help make renting more rewarding.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'GoodTenants Realty']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      }
    ]
  },
  {
    name: 'upward_seq_day2_v1',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nYou joined Upward because your rent payments can do more than simply pay for your apartment — they can help build your rental reputation.\n\nYour Upward Score reflects your rent payment behaviour and helps build a verified rental profile that stays with you, even when you move.\n\n*View your Upward Score to see how your rental profile is developing:* {{2}}\n\nIf you've consistently paid rent on time, request your previous rent payment history from your property manager(s) so you can receive credit for the responsible habits you've already built.\n\nEvery recorded rent payment strengthens your profile, and we're excited to help you build one that opens more opportunities.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'https://upward.goodtenants.io/dashboard']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      }
    ]
  },
  {
    name: 'upward_seq_day5_v1',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nHere's something many renters don't realize:\n\nTwo tenants can pay the exact same rent for years, but when it's time to move, both often have to start from scratch because their years of responsible payments don't follow them.\n\nWe think that should change. That's why we've put together a short guide on one of the most valuable things you can invest in as a tenant: *your rental reputation*.\n\nIn just a few minutes, you'll learn why your rental reputation matters, what strengthens or weakens it, and how Upward helps you keep building that reputation even when you move.\n\n*Read: 5 Ways to Build a Stronger Rental Reputation* {{2}}\nIt only takes a few minutes to read, but the benefit can last for years.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'https://upward.goodtenants.io/dashboard']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      }
    ]
  },
  {
    name: 'upward_seq_day9_v1',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nA resident in Yaba recently paid over *₦1,000,000* in annual rent through Upward.\nAfter paying, her receipt was available instantly—and she watched her Upward Score increase.\n\nHere's what she said:\n_\"The whole process was so simple and clear. I paid my rent, and then saw my Upward Score go up. It honestly felt good knowing that my payment wasn't just gone — it was helping me build my rental reputation. It gave me a sense of control over my future as a tenant.\"_\n\nShe has now requested her previous rent payment history to make her rental profile even stronger.\nThat's what Upward is all about.\n\n*Open Upward and see your rental profile:* {{2}}\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'https://upward.goodtenants.io/dashboard']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      }
    ]
  },
  {
    name: 'upward_seq_day14_v1',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nYour account is ready, and every time you use Upward, you build a stronger rental reputation.\n*Today, you can:*\n✅ Build your rental profile.\n✅ View your rent payment receipts.\n✅ Get your previous rent payment history.\n✅ Keep your rental reputation wherever you move.\n*As you continue using Upward, you'll also be able to:*\n🏠 Discover available apartments that match your rental credibility.\n🎉 Save toward paying your rent and qualify for rent discounts and rewards.\n✨ Enjoy new benefits as introduced.\n\n*Open Upward and continue building your rental reputation:* {{2}}\nThank you for choosing Upward. We're excited to be part of your rental journey.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'https://upward.goodtenants.io/dashboard']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
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
