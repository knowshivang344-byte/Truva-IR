const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting browser...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    page.on('response', response => {
        if (!response.ok() && response.status() !== 200) {
            console.log(`HTTP ${response.status()}: ${response.url()}`);
        }
    });
    page.on('requestfailed', request => console.log('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log("Navigating to http://localhost:3000/investigate/demo?mode=judge ...");
    await page.goto('http://localhost:3000/investigate/demo?mode=judge', { waitUntil: 'networkidle2' });

    console.log("Waiting for 15 seconds to observe intro sequence...");
    await new Promise(r => setTimeout(r, 15000));

    await browser.close();
    console.log("Browser closed.");
})();
