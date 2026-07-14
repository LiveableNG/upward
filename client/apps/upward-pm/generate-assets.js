const sharp = require('sharp');
const fs = require('fs');

// Set your background color here (Ivory or Forest Green)
const bgColor = '#faf9f5'; // Ivory
// const bgColor = '#166534'; // Forest Green

async function generate() {
  console.log('Generating Play Console Assets...');

  // Check if favicon exists
  if (!fs.existsSync('public/favicon.svg')) {
    console.error('Error: public/favicon.svg not found!');
    return;
  }

  // 1. Play Store Feature Graphic (1024 x 500)
  await sharp('public/favicon.svg')
    .resize(300, 300, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .extend({
      top: 100, bottom: 100, left: 362, right: 362, background: bgColor
    })
    .flatten({ background: bgColor })
    .toFile('feature_graphic.png');
  
  console.log('✅ Created feature_graphic.png (1024x500)');

  // 2. App Splash Screen (1080 x 1920 Portrait)
  await sharp('public/favicon.svg')
    .resize(400, 400, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .extend({
      top: 760, bottom: 760, left: 340, right: 340, background: bgColor
    })
    .flatten({ background: bgColor })
    .toFile('splash_screen.png');

  console.log('✅ Created splash_screen.png (1080x1920)');
}

generate().catch(console.error);
