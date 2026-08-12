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
  
  // Login as Admin
  await page.waitForSelector('input[type="text"]');
  await page.type('input[type="text"]', 'pborngreatmensah@gmail.com');
  await page.type('input[type="password"]', 'Pa$$w0rd');
  await page.click('button[type="submit"]');

  console.log('Waiting for admin login...');
  await sleep(4000);
  
  const adminPages = [
    { name: 'Admin_Dashboard', url: '/dashboard' },
    { name: 'Admin_Customers', url: '/customers' },
    { name: 'Admin_Jobs', url: '/jobs' },
    { name: 'Admin_Payments', url: '/payments' },
    { name: 'Admin_Settings', url: '/settings' },
    { name: 'Admin_Payment_Integrations', url: '/settings/payments' },
  ];

  for (const p of adminPages) {
    if (p.url === '/dashboard') {
      await page.screenshot({ path: `public/screenshots/${p.name}.png` });
      continue;
    }
    console.log(`Clicking to navigate to ${p.name} using text match...`);
    const linkText = p.name.replace('Admin_', '').replace('_', ' ');
    
    const clicked = await page.evaluate((text) => {
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find(l => l.textContent && l.textContent.toLowerCase().includes(text.toLowerCase()));
      if (link) {
        link.click();
        return true;
      }
      return false;
    }, linkText);
    
    if (!clicked) {
      console.log(`Could not find link with text ${linkText}, trying full navigation...`);
      await page.goto(`http://localhost:3000${p.url}`, { waitUntil: 'networkidle2' });
    }
    await sleep(3000);
    await page.screenshot({ path: `public/screenshots/${p.name}.png` });
  }

  // Logout Admin
  console.log('Logging out admin...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
  // Instead of clicking logout, we can just clear storage
  await page.evaluate(() => localStorage.clear());
  
  console.log('Navigating back to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Login as Customer
  console.log('Logging in as customer...');
  await page.type('input[type="text"]', 'CUST-9999');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  console.log('Waiting for customer login...');
  await sleep(4000);
  
  console.log('Capturing Customer Portal...');
  await page.screenshot({ path: `public/screenshots/Customer_Portal.png` });

  await browser.close();
  console.log('All screenshots captured successfully!');
})();
