import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching visible browser...");
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  console.log("Navigating to http://localhost:3000/register");
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
  
  console.log("Filling out registration form...");
  await page.type('input[name="fullName"]', 'Peter Mensah', {delay: 50});
  await page.type('input[name="companyName"]', 'SoluoTech', {delay: 50});
  await page.type('input[name="email"]', 'pborngreatmensah@gmail.com', {delay: 50});
  await page.type('input[name="phone"]', '+233541922954', {delay: 50});
  await page.type('input[name="password"]', 'Pa$$w0rd', {delay: 50});
  
  console.log("Submitting details to request OTP...");
  await page.click('button[type="submit"]');
  
  try {
    // Wait for the OTP input to appear
    await page.waitForSelector('input[maxLength="6"]', { timeout: 15000 });
    console.log("\n=======================================================");
    console.log("OTP Screen Reached!");
    console.log("An email has been sent to pborngreatmensah@gmail.com.");
    console.log("Please check your inbox and type the 6-digit code into the visible browser!");
    console.log("=======================================================\n");
  } catch (e) {
    console.log("\nFailed to reach OTP screen within 15 seconds. There might be an error on the page (like a duplicate email). Please check the browser window.");
  }
  
  // The browser stays open for the user to interact with
})();
