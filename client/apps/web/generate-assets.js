const sharp = require('sharp');
const fs = require('fs');

const bgColor = '#faf9f5';

async function generate() {
  console.log('Generating Web Assets...');

  if (!fs.existsSync('public/favicon.svg')) {
    console.error('Error: public/favicon.svg not found!');
    return;
  }

  await sharp('public/favicon.svg')
    .resize(512, 512)
    .toFile('public/icon-512.png');
  console.log('✅ Created icon-512.png (512x512)');

  await sharp('public/favicon.svg')
    .resize(192, 192)
    .toFile('public/icon-192.png');
  console.log('✅ Created icon-192.png (192x192)');

  await sharp('public/favicon.svg')
    .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 20, bottom: 20, left: 20, right: 20, background: bgColor
    })
    .flatten({ background: bgColor })
    .toFile('public/apple-icon.png');
  console.log('✅ Created apple-icon.png (180x180)');

  const logoWidth = 420;
  const logoHeight = 100;
  const fontSize = 48;
  const baseline = 70;
  const capHeight = fontSize * 0.72;
  const iconOvershoot = 1.5;
  const iconHeight = Math.round(capHeight * iconOvershoot);
  const iconWidth = iconHeight;
  const iconLeft = 4;
  const iconTop = Math.round(baseline - capHeight * 1.08);
  const textX = iconLeft + iconWidth - 2;

  const textSvg = `
    <svg width="${logoWidth}" height="${logoHeight}">
      <style>
        .title { fill: #1c1917; font-size: ${fontSize}px; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 800; letter-spacing: 0.5px; }
      </style>
      <text x="${textX}" y="${baseline + 10}" class="title">PWARD</text>
    </svg>
  `;

  const iconBuffer = await sharp('public/favicon.svg')
    .resize(iconWidth, iconHeight)
    .toBuffer();

  await sharp({
    create: {
      width: logoWidth,
      height: logoHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: Buffer.from(textSvg), top: 0, left: 0 },
      { input: iconBuffer, top: iconTop, left: iconLeft }
    ])
    .png()
    .toFile('public/receipt-logo.png');
  console.log('✅ Created receipt-logo.png (Icon + PWARD text aligned)');
}

generate().catch(console.error);