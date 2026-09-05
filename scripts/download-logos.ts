import fs from 'fs';
import path from 'path';
import https from 'https';

const stores = [
  { name: 'amazon', domain: 'amazon.com' },
  { name: 'noon', domain: 'noon.com' },
  { name: 'aliexpress', domain: 'aliexpress.com' },
  { name: 'jarir', domain: 'jarir.com' },
  { name: 'extra', domain: 'extra.com' },
  { name: 'ebay', domain: 'ebay.com' },
  { name: 'temu', domain: 'temu.com' },
  { name: 'shein', domain: 'shein.com' },
  { name: 'alibaba', domain: 'alibaba.com' },
  { name: 'banggood', domain: 'banggood.com' },
  { name: 'walmart', domain: 'walmart.com' },
  { name: 'bestbuy', domain: 'bestbuy.com' },
  { name: 'apple', domain: 'apple.com' },
  { name: 'samsung', domain: 'samsung.com' },
  { name: 'anker', domain: 'anker.com' },
  { name: 'carrefour', domain: 'carrefour.com' },
  { name: 'lulu', domain: 'luluhypermarket.com' },
  { name: 'geekbuying', domain: 'geekbuying.com' },
  { name: 'newegg', domain: 'newegg.com' },
  { name: 'bhphotovideo', domain: 'bhphotovideo.com' },
  { name: 'asos', domain: 'asos.com' },
  { name: 'myprotein', domain: 'myprotein.com' },
  { name: 'zaful', domain: 'zaful.com' },
  { name: 'tvcmall', domain: 'tvcmall.com' },
  { name: 'gshopper', domain: 'gshopper.com' },
  { name: 'lightinthebox', domain: 'lightinthebox.com' },
  { name: 'miniinthebox', domain: 'miniinthebox.com' }
];

const downloadImage = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          downloadImage(response.headers.location, dest).then(resolve).catch(reject);
        } else {
          reject(new Error('Redirected without location header'));
        }
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  const logosDir = path.join(process.cwd(), 'public', 'logos');
  
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  console.log('Downloading store logos...');
  
  for (const store of stores) {
    const dest = path.join(logosDir, `${store.name}.png`);
    const extDest = path.join(logosDir, `${store.name}.ico`);
    const size = 128;
    const url = `https://www.google.com/s2/favicons?domain=${store.domain}&sz=${size}`;
    
    try {
      if (!fs.existsSync(dest) && !fs.existsSync(extDest)) {
        await downloadImage(url, dest);
        console.log(`✅ Downloaded: ${store.name}`);
      } else {
        console.log(`⏭️  Skipped (already exists): ${store.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed to download ${store.name}:`, err);
    }
  }
  
  console.log('Done downloading logos.');
}

main().catch(console.error);
