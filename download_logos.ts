import fs from 'fs';
import path from 'path';
import https from 'https';

const stores = [
  { name: 'aliexpress', domain: 'aliexpress.com' },
  { name: 'alibaba', domain: 'alibaba.com' },
  { name: 'sunsky', domain: 'sunsky-online.com' },
  { name: 'banggood', domain: 'banggood.com' },
  { name: 'temu', domain: 'temu.com' },
  { name: 'shein', domain: 'shein.com' },
  { name: 'miniinthebox', domain: 'miniinthebox.com' },
  { name: 'lightinthebox', domain: 'lightinthebox.com' },
  { name: 'geekbuying', domain: 'geekbuying.com' }
];

const dir = path.join(process.cwd(), 'public', 'logos');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

stores.forEach(store => {
  const url = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${store.domain}&size=128`;
  const dest = path.join(dir, `${store.name}.png`);
  
  https.get(url, (res) => {
    const fileStream = fs.createWriteStream(dest);
    res.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      console.log(`Downloaded ${store.name}.png`);
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${store.name}: ${err.message}`);
  });
});

