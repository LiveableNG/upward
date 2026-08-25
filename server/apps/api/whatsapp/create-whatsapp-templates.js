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
    name: 'upward_seq_welcome_v2',
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
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_seq_day2_v2',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nYou joined Upward because your rent payments can do more than simply pay for your apartment — they can help build your rental reputation.\n\nYour Upward Score reflects your rent payment behaviour and helps build a verified rental profile that stays with you, even when you move.\n\n*View your Upward Score to see how your rental profile is developing.*\n\nIf you've consistently paid rent on time, request your previous rent payment history from your property manager(s) so you can receive credit for the responsible habits you've already built.\n\nEvery recorded rent payment strengthens your profile, and we're excited to help you build one that opens more opportunities.\n\n*The Upward Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_seq_day5_v2',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nHere's something many renters don't realize:\n\nTwo tenants can pay the exact same rent for years, but when it's time to move, both often have to start from scratch because their years of responsible payments don't follow them.\n\nWe think that should change. That's why we've put together a short guide on one of the most valuable things you can invest in as a tenant: *your rental reputation*.\n\nIn just a few minutes, you'll learn why your rental reputation matters, what strengthens or weakens it, and how Upward helps you keep building that reputation even when you move.\n\n*Read: 5 Ways to Build a Stronger Rental Reputation*\nIt only takes a few minutes to read, but the benefit can last for years.\n\n*The Upward Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_seq_day9_v2',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nA resident in Yaba recently paid over *₦1,000,000* in annual rent through Upward.\nAfter paying, her receipt was available instantly—and she watched her Upward Score increase.\n\nHere's what she said:\n_\"The whole process was so simple and clear. I paid my rent, and then saw my Upward Score go up. It honestly felt good knowing that my payment wasn't just gone — it was helping me build my rental reputation. It gave me a sense of control over my future as a tenant.\"_\n\nShe has now requested her previous rent payment history to make her rental profile even stronger.\nThat's what Upward is all about.\n\n*Open Upward and see your rental profile.*\n\n*The Upward Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_seq_day14_v2',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nYour account is ready, and every time you use Upward, you build a stronger rental reputation.\n*Today, you can:*\n✅ Build your rental profile.\n✅ View your rent payment receipts.\n✅ Get your previous rent payment history.\n✅ Keep your rental reputation wherever you move.\n*As you continue using Upward, you'll also be able to:*\n🏠 Discover available apartments that match your rental credibility.\n🎉 Save toward paying your rent and qualify for rent discounts and rewards.\n✨ Enjoy new benefits as introduced.\n\n*Open Upward and continue building your rental reputation.*\nThank you for choosing Upward. We're excited to be part of your rental journey.\n\n*The Upward Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_university_waitlist',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\n*Welcome to the Upward University Waitlist!*\n\nThank you for taking the first step toward building a ₦10M+ property management business.\n\nUpward helps responsible tenants build a verifiable rental reputation by tracking rent payments to unlock benefits like rent financing, rewards, discounts, and exclusive homes.\n\nFor landlords and property managers, Upward provides tenant verification, rental history, payment behaviour, and Tenant Scores for smarter rental decisions.\n\nWe support reputable firms, including *Diya Fatimilehin & Co.*, *Estatelinks*, and many others with their property management operations.\n\nWe’re excited to have you on board! Stay tuned as we share more details about the programme, what to expect, and how to begin your journey.\n\n*Welcome to Upward University.*\n\nBest regards,\n*The Upward Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward University'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Explore Upward',
            url: 'https://upward.goodtenants.io/university'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_waitlist_confirmation',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nYou're officially on the waitlist for Upward by GoodTenants.\n\nWe are building Upward to make renting simpler, more transparent, and more rewarding. We will notify you as soon as early access becomes available.\n\nThank you for joining early!\n\n*The Upward Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_data_deletion_request',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nWe received a request to delete all data associated with your email from our systems.\n\n*Important:* This process is irreversible. Your Rent Passport, payment history, and all account details will be permanently removed.\n\nIf you did not request this, please ignore this message.\n\n*The Upward Privacy Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_pm_invite',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\n*{{2}}* has requested to connect with you on Upward as their {{3}}!\n\nUpward is a platform designed to automate rent collection, streamline tenant communication, and provide powerful financial insights.\n\nClaim your profile or log in to approve this request.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'Jane Doe', 'Property Manager']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward PM'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward-pm.vercel.app/pm-login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_team_invitation',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\n*{{2}}* has invited you to collaborate on their properties on the Upward PM platform.\n\nClaim your access or log in to your dashboard to start managing properties.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'Jane Doe']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward PM'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward-pm.vercel.app/pm-login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_pm_password_reset_otp',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nWe received a request to reset your password for your Upward PM account.\n\nYour verification code is: *{{2}}*\n\nThis code expires in 15 minutes. If you did not request this, please ignore this message.\n\n*The Upward PM Team*",
        example: {
          body_text: [['John', '123456']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward PM'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward-pm.vercel.app/pm-login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_pm_auth_otp',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nUse the verification code below to securely access your Upward PM dashboard.\n\nVerification Code: *{{2}}*\n\nThis code expires in 10 minutes. If you did not request this, please ignore this message.\n\n*The Upward PM Team*",
        example: {
          body_text: [['John', '123456']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward PM'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward-pm.vercel.app/pm-login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_user_password_reset_otp',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nWe received a request to reset your password for your Upward account.\n\nYour verification code is: *{{2}}*\n\nThis code expires in 15 minutes. If you did not request this, please ignore this message.\n\n*The Upward Team*",
        example: {
          body_text: [['John', '123456']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_payment_request',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nYou have a new payment request for your property unit from *{{2}}*.\n\n*Amount:* {{3}}\n\nLog in to your Upward account to view details and make your payment securely.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'Jane Doe', 'NGN 1,000,000']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_credibility_request',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\n*{{2}}* has requested their past tenancy and payment records for *{{3}}*.\n\nFulfilling this request helps your former tenant build their credibility profile on Upward. Log in to your PM dashboard to fulfill the request.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'Jane Doe', '123 Main St']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward PM'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward-pm.vercel.app/pm-login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_new_user_records',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\n*{{2}}* has added your past rent records for *{{3}}* to Upward.\n\nLog in to complete your profile and see how this strengthens your Rent Passport.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'Jane Doe', '123 Main St']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_landlord_welcome',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nYou have been invited to the Upward Landlord Portal by your property manager.\n\nYour temporary password is: *{{2}}*\n\nPlease log in to change your password and view real-time analysis of your rental portfolio.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'tempPassword123']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward PM'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward-pm.vercel.app/pm-login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_landlord_property_assignment',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nA new property has been assigned to your portfolio on Upward by your property manager.\n\nLog in to your dashboard to view real-time analytics and updates.\n\n*The Upward Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward PM'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward-pm.vercel.app/pm-login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_record_added',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\n*{{2}}* has updated your rental payment history for *{{3}}* on Upward.\n\nThis update strengthens your Rent Passport score. Log in to view your profile.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'Jane Doe', '123 Main St']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_join_request_rejection',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nYour request to connect with *{{2}}* for the property at *{{3}}* has been declined.\n\n*Reason:* {{4}}\n\nLog in to try connecting again or contact the manager directly.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'Jane Doe', '123 Main St', 'Not a valid tenant']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_credibility_rejection',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nYour request for past tenancy records for *{{2}}* has been declined by the manager.\n\n*Reason:* {{3}}\n\nLog in to your dashboard to view updates.\n\n*The Upward Team*",
        example: {
          body_text: [['John', '123 Main St', 'Incorrect rent amount']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_rent_receipt',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hi {{1}},\n\nYour rent payment of *{{2}}* for *{{3}}* was successful.\n\n*Receipt Number:* {{4}}\n\nLog in to view your digital receipt and download your rent payment history.\n\n*The Upward Team*",
        example: {
          body_text: [['John', 'NGN 1,000,000', '123 Main St', 'RCP-12345']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'upward_support_ticket_resolved',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nThere is an update on your support ticket. Our team has marked it as resolved.\n\nLog in to check the details or reply to this message if you need further assistance.\n\n*The Upward Team*",
        example: {
          body_text: [['John']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },
  {
    name: 'tenant_property_verified_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Hello {{1}},\n\nYour property at *{{2}}* has been verified by your property manager *{{3}}*.\n\nYou can now manage payments for this unit and build your Rent Passport on Upward.\n\n*The Upward Team*",
        example: {
          body_text: [['John', '123 Main St', 'Jane Doe']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward By GoodTenants'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward.goodtenants.io/login'
          }
        ]
      }
    ]
  },

  {
    name: 'upward_system_alert',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: "Alert: {{1}}\n\nDetails: {{2}}\n\nLog in to the admin panel to view details.\n\n*The Upward Team*",
        example: {
          body_text: [['Bulk Import Failure', '10 records failed due to invalid emails']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Upward PM'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Log in',
            url: 'https://upward-pm.vercel.app/pm-login'
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
