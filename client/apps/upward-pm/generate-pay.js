const sharp = require('sharp');
const fs = require('fs');

const bgColor = '#faf9f5'; // Ivory
const inputSvg = '../upward-pay/public/favicon.svg';
const splashOut = '../upward-pay/splash_screen.png';
const featureOut = '../upward-pay/feature_graphic.png';

async function generate() {
  console.log('Generating Play Console Assets for upward-pay...');

  if (!fs.existsSync(inputSvg)) {
    console.error('Error: ' + inputSvg + ' not found!');
    return;
  }

  // 1. Play Store Feature Graphic (1024 x 500)
  await sharp(inputSvg)
    .resize(300, 300, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .extend({
      top: 100, bottom: 100, left: 362, right: 362, background: bgColor
    })
    .flatten({ background: bgColor })
    .toFile(featureOut);
  
  console.log('✅ Created feature_graphic.png in upward-pay');

  // 2. App Splash Screen (1080 x 1920 Portrait)
  await sharp(inputSvg)
    .resize(400, 400, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .extend({
      top: 760, bottom: 760, left: 340, right: 340, background: bgColor
    })
    .flatten({ background: bgColor })
    .toFile(splashOut);

  console.log('✅ Created splash_screen.png in upward-pay');
}

generate().catch(console.error);
