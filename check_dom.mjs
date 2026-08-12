import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="text"]', 'pborngreatmensah@gmail.com');
  await page.type('input[type="password"]', 'Pa$$w0rd');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4000));
  
  const html = await page.evaluate(() => {
    // Find the Cash Position Analysis card
    const headings = Array.from(document.querySelectorAll('h3, h2, div'));
    const container = headings.find(h => h.textContent && h.textContent.includes('Cash Position Analysis'))?.closest('.card, div');
    return container ? container.outerHTML : 'Not found';
  });
  
  console.log('HTML:', html);
  await browser.close();
})();
