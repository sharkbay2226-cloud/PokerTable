const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZE = 256;
const RADIUS = 48;

async function main() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="48" fill="url(#bg)"/>
    <text x="128" y="175" font-size="180" text-anchor="middle" fill="#d4a843" font-family="sans-serif" font-weight="bold">♠</text>
  </svg>`;

  const pngBuffer = await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toBuffer();

  const icoPath = path.join(__dirname, '..', 'assets', 'icon', 'icon.ico');
  const ico = createIco(pngBuffer, SIZE);
  fs.writeFileSync(icoPath, ico);
  console.log(`Generated ${icoPath} (${ico.length} bytes, ${SIZE}x${SIZE})`);
}

function createIco(pngData, size) {
  const pngSize = pngData.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  const realSize = size >= 256 ? 0 : size;
  entry.writeUInt8(realSize, 0);
  entry.writeUInt8(realSize, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngSize, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngData]);
}

main().catch(e => { console.error(e.message); process.exit(1); });
