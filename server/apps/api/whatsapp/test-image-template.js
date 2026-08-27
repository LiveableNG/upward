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
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Image path
const imagePath = path.resolve(process.cwd(), 'client/apps/web/public/attachments/family.png');

async function testSendImageTemplate(recipientPhone) {
  if (!recipientPhone) {
    console.error('❌ Error: Please provide a recipient phone number.');
    console.log('Usage: node test-image-template.js 2348012345678');
    process.exit(1);
  }

  if (!token || !phoneNumberId) {
    console.error('❌ Error: WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing in .env');
    process.exit(1);
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Error: Image file not found at ${imagePath}`);
    process.exit(1);
  }

  console.log(`📸 Uploading family.png to Meta WhatsApp Media API...`);
  
  // Step 1: Upload media to Meta WhatsApp Media API
  const fileBuffer = fs.readFileSync(imagePath);
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'image/png');
  form.append('file', new Blob([fileBuffer], { type: 'image/png' }), 'family.png');

  const uploadUrl = `https://graph.facebook.com/v25.0/${phoneNumberId}/media`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: form,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.id) {
    console.error('❌ Failed to upload image to WhatsApp Media API:', uploadData);
    process.exit(1);
  }

  const mediaId = uploadData.id;
  console.log(`✅ Uploaded media successfully! Media ID: ${mediaId}`);

  // Step 2: Send Template Message with Image Header
  const sanitizedPhone = recipientPhone.replace(/\D/g, '');
  console.log(`📩 Sending upward_sample_image_template to ${sanitizedPhone}...`);

  const payload = {
    messaging_product: 'whatsapp',
    to: sanitizedPhone,
    type: 'template',
    template: {
      name: 'upward_sample_image_template',
      language: {
        code: 'en_US',
      },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                id: mediaId,
              },
            },
          ],
        },
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: 'Friend',
            },
          ],
        },
      ],
    },
  };

  const messageUrl = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
  const messageRes = await fetch(messageUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const messageData = await messageRes.json();
  if (!messageRes.ok) {
    console.error('❌ Failed to send WhatsApp message:', JSON.stringify(messageData.error || messageData, null, 2));
  } else {
    console.log(`🎉 Success! Message sent. Message ID: ${messageData.messages?.[0]?.id}`);
  }
}

const targetPhone = process.argv[2];
testSendImageTemplate(targetPhone);
