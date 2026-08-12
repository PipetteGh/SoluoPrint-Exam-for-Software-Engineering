import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync('public/screenshots')) {
    fs.mkdirSync('public/screenshots', { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  // Login with provided credentials
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'ernestobeng@gmail.com');
  await page.type('input[type="password"]', 'Provider@1');
  await page.click('button[type="submit"]');

  console.log('Waiting for login...');
  await sleep(5000);
  await page.screenshot({ path: 'public/screenshots/debug_login.png' });
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  if (currentUrl.includes('login')) {
    const errorText = await page.evaluate(() => {
      const el = document.querySelector('.error-alert');
      return el ? el.innerText : 'No error message found';
    });
    console.error('Login failed! Error:', errorText);
  }

  const pagesToCapture = [
    { name: 'dashboard', url: '/dashboard' },
    { name: 'customers', url: '/customers' },
    { name: 'jobs', url: '/jobs' },
    { name: 'payments', url: '/payments' },
    { name: 'receivables', url: '/receivables' },
    { name: 'reviews', url: '/reviews' },
    { name: 'expenses', url: '/expenses' },
    { name: 'revenue', url: '/reports/revenue' },
    { name: 'expense_report', url: '/reports/expense' },
    { name: 'profit_loss', url: '/reports/profit-loss' },
    { name: 'services', url: '/config/services' },
    { name: 'categories', url: '/config/categories' },
    { name: 'settings', url: '/settings' },
  ];

  for (const p of pagesToCapture) {
    console.log(`Navigating to ${p.name}...`);
    await page.goto(`http://localhost:3000${p.url}`, { waitUntil: 'networkidle2' });
    await sleep(2500); // wait for data to load
    await page.screenshot({ path: `public/screenshots/${p.name}.png` });
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
})();
