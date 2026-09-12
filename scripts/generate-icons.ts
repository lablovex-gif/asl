import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Function to generate SVG for the App Icon / Favicon
// size: canvas size (e.g. 512)
// bg: background color (e.g. '#09090b' or null for transparent)
// fg: foreground color (e.g. '#ffffff' or '#09090b')
// isFaviconSmall: whether to boost thin stroke widths for small resolutions (16/32)
function getSvg({
  size = 512,
  bg = '#09090b',
  fg = '#ffffff',
  isFaviconSmall = false,
  roundedBg = false,
}: {
  size?: number;
  bg?: string | null;
  fg?: string;
  isFaviconSmall?: boolean;
  roundedBg?: boolean;
}) {
  const globeStroke = isFaviconSmall ? 10 : 7;
  const lensStroke = isFaviconSmall ? 26 : 22;
  const handleStroke = isFaviconSmall ? 40 : 36;
  const tagStroke = isFaviconSmall ? 14 : 12;
  const stringStroke = isFaviconSmall ? 7 : 5;

  const bgRect = bg
    ? roundedBg
      ? `<rect width="512" height="512" rx="115" fill="${bg}" />`
      : `<rect width="512" height="512" fill="${bg}" />`
    : '';

  // Scale & center the 340x340 graphic into 512x512
  // Original center is approx (145, 150).
  // We scale by approx 1.15 to 1.25 to make it fill the maskable safe zone (within 400x400)
  const scale = 1.18;
  const translateX = 256 - 145 * scale;
  const translateY = 256 - 150 * scale;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="tag-cut-icon">
      <rect x="-100" y="-100" width="800" height="800" fill="white" />
      <g transform="translate(170, 230) rotate(-10)">
        <path d="M 0 -40 L 35 -5 L 35 55 L -35 55 L -35 -5 Z" fill="black" stroke="black" stroke-width="32" stroke-linejoin="round" />
      </g>
    </mask>
    <mask id="tag-hole-text-icon">
      <rect x="-100" y="-100" width="200" height="200" fill="white" />
      <circle cx="0" cy="-24" r="7" fill="black" />
      <text x="0" y="24" font-size="58" font-family="system-ui, -apple-system, sans-serif" font-weight="900" fill="black" text-anchor="middle" dominant-baseline="central">$</text>
    </mask>
  </defs>

  ${bgRect}

  <g transform="translate(${translateX}, ${translateY}) scale(${scale})">
    <g mask="url(#tag-cut-icon)">
      <line x1="166" y1="166" x2="250" y2="250" stroke="${fg}" stroke-width="${handleStroke}" stroke-linecap="round" />
      <circle cx="110" cy="110" r="80" fill="none" stroke="${fg}" stroke-width="${lensStroke}" />
      <g fill="none" stroke="${fg}" stroke-width="${globeStroke}">
        <circle cx="110" cy="110" r="52" />
        <line x1="110" y1="58" x2="110" y2="162" />
        <line x1="58" y1="110" x2="162" y2="110" />
        <ellipse cx="110" cy="110" rx="26" ry="52" />
        <ellipse cx="110" cy="110" rx="52" ry="26" />
      </g>
    </g>
    <path d="M 166 206 Q 190 190 205 205" fill="none" stroke="${fg}" stroke-width="${stringStroke}" stroke-linecap="round" />
    <g transform="translate(170, 230) rotate(-10)">
      <path d="M 0 -40 L 35 -5 L 35 55 L -35 55 L -35 -5 Z" fill="${fg}" stroke="${fg}" stroke-width="${tagStroke}" stroke-linejoin="round" mask="url(#tag-hole-text-icon)" />
    </g>
  </g>
</svg>`;
}

async function generate() {
  const publicDir = path.join(process.cwd(), 'public');

  // 1. App Icon 512x512 (solid background for PWA and homescreen)
  const svg512 = getSvg({ size: 512, bg: '#09090b', fg: '#ffffff', roundedBg: false });
  fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), svg512);

  const buf512 = await sharp(Buffer.from(svg512)).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buf512);
  console.log('Created icon-512.png');

  // 2. App Icon 192x192
  const svg192 = getSvg({ size: 192, bg: '#09090b', fg: '#ffffff', roundedBg: false });
  const buf192 = await sharp(Buffer.from(svg192)).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buf192);
  console.log('Created icon-192.png');

  // 3. Apple Touch Icon 180x180 (iOS Home Screen)
  const svg180 = getSvg({ size: 180, bg: '#09090b', fg: '#ffffff', roundedBg: false });
  const buf180 = await sharp(Buffer.from(svg180)).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf180);
  console.log('Created apple-touch-icon.png');

  // 4. Favicon 32x32 and 16x16 with circular badge so it pops beautifully on ANY tab (dark, light, blue, etc.)
  const svgFavicon32 = getSvg({ size: 128, bg: '#09090b', fg: '#ffffff', isFaviconSmall: true, roundedBg: true });
  const buf32 = await sharp(Buffer.from(svgFavicon32)).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), buf32);
  console.log('Created favicon-32x32.png');

  const buf16 = await sharp(Buffer.from(svgFavicon32)).resize(16, 16).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), buf16);
  console.log('Created favicon-16x16.png');

  // 5. Update /public/logo.svg to be the crystal-clear SVG icon with dark rounded badge
  const svgLogo = getSvg({ size: 512, bg: '#09090b', fg: '#ffffff', roundedBg: true });
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgLogo);
  console.log('Created public/logo.svg');

  // Also create a standalone favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgLogo);
  console.log('Created public/favicon.svg');
}

generate().catch(console.error);
