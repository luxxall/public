const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.bankier.pl/smart/kredyty-gotowkowe', { waitUntil: 'networkidle2' });
    
    // get all text inside the page to see if data is rendered
    const text = await page.evaluate(() => document.body.innerText);
    console.log(text.substring(0, 1000));
    
    // get elements that might be ranking rows
    const rows = await page.evaluate(() => {
        // let's look for elements that have a bank logo or are styled as rows
        return Array.from(document.querySelectorAll('div')).filter(el => el.innerText.includes('Millennium')).map(el => el.className).slice(0, 10);
    });
    console.log('Found classes with Millennium:', rows);
    
    await browser.close();
})();
