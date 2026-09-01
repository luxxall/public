const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const URLs = {
    gotowkowe: 'https://www.bankier.pl/smart/kredyty-gotowkowe',
    konsolidacyjne: 'https://www.bankier.pl/smart/kredyty-konsolidacyjne',
    hipoteka: 'https://www.bankier.pl/smart/kredyty-hipoteczne',
    refinansowanie: 'https://www.bankier.pl/smart/refinansowanie-kredytu-co-to-jest-kredyt-refinansowy'
};

async function scrapeBankier(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    // pretend to be a real browser to avoid blocks
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    const html = await page.evaluate(() => document.body.innerHTML);
    await browser.close();

    const $ = cheerio.load(html);
    const offers = [];

    // strategy: find bank logos and traverse up until we see 'Kwota do spłaty'
    $('img[alt*="Logo banku"], img[alt*="Logo"]').each((i, el) => {
        const alt = $(el).attr('alt') || '';
        let bankName = alt.replace('Logo banku', '').replace('Logo', '').replace('[object Object]', '').replace('undefined', '').trim();
        
        // If logo doesn't have bank name, skip for now to avoid 'Nieznany', but we could infer from text
        if (!bankName || bankName.includes('Bankier.pl') || bankName.includes('Facebook') || bankName.toLowerCase().includes('smart')) return;

        let parent = $(el).parent();
        let limit = 0;
        // Go up tree to find the row container
        while (parent.length > 0 && limit < 10) {
            const text = parent.text();
            if (text.includes('Kwota do spłaty') && text.includes('Rata')) {
                break;
            }
            parent = parent.parent();
            limit++;
        }

        if (parent.length > 0 && parent.text().includes('Kwota do spłaty')) {
            const text = parent.text();
            
            const rataMatch = text.match(/Rata.*?([0-9\s]+)zł/);
            const kwotaMatch = text.match(/Kwota do spłaty.*?([0-9\s]+)zł/);
            const rrsoMatch = text.match(/RRSO.*?([0-9,]+)%/i) || text.match(/([0-9,]+)%/); // Fallback for percentages

            offers.push({
                bank: bankName,
                rrso: rrsoMatch ? rrsoMatch[1] + '%' : '-',
                rata: rataMatch ? rataMatch[1].trim() + ' zł' : '-',
                kwota: kwotaMatch ? kwotaMatch[1].trim() + ' zł' : '-'
            });
        }
    });

    const unique = [];
    offers.forEach(o => {
        if (!unique.find(u => u.bank === o.bank && u.rata === o.rata)) {
            unique.push(o);
        }
    });
    
    return unique.slice(0, 10); // Return top 10
}

function generateTableHtml(offers) {
    if (offers.length === 0) {
        return `<tr><td colspan="6" class="text-muted py-4">Oferty w przygotowaniu...</td></tr>`;
    }
    
    let html = '';
    offers.forEach((o, index) => {
        html += `<tr>
            <td>${index + 1}</td>
            <td class="fw-bold">${o.bank}</td>
            <td>${o.rrso}</td>
            <td>${o.rata}</td>
            <td>${o.kwota}</td>
            <td class="text-success fw-bold">Sprawdź</td>
        </tr>\n`;
    });
    return html;
}

(async () => {
    console.log('Rozpoczynam pobieranie danych...');
    const results = {};
    for (const [key, url] of Object.entries(URLs)) {
        console.log(`Pobieranie ${key} z ${url}`);
        const offers = await scrapeBankier(url);
        console.log(`Znaleziono ${offers.length} ofert dla ${key}`);
        results[key] = generateTableHtml(offers);
    }
    
    // Read current HTML
    const htmlPath = path.join(__dirname, '../public/sites/projects.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // For each tab, replace the tbody content. 
    // We will use regex to find the tbody for each section and replace its content.
    const tabs = [
        { key: 'gotowkowe', id: 'pills-gotowkowe' },
        { key: 'konsolidacyjne', id: 'pills-konsolidacyjne' },
        { key: 'hipoteka', id: 'pills-hipoteka' },
        { key: 'refinansowanie', id: 'pills-refinansowanie' }
    ];

    for (const tab of tabs) {
        const startMarker = `id="${tab.id}"`;
        const startIdx = html.indexOf(startMarker);
        if (startIdx === -1) continue;
        
        // Find the next <tbody>
        const tbodyStart = html.indexOf('<tbody', startIdx);
        if (tbodyStart === -1) continue;
        const tbodyEndOpen = html.indexOf('>', tbodyStart);
        const tbodyClose = html.indexOf('</tbody>', tbodyEndOpen);
        
        if (tbodyEndOpen !== -1 && tbodyClose !== -1) {
            // Check if we need to replace headers too (from Konto, Karta... to RRSO, Rata...)
            const theadStart = html.lastIndexOf('<thead>', tbodyStart);
            const theadEnd = html.indexOf('</thead>', theadStart);
            if (theadStart !== -1 && theadStart > startIdx) {
                let theadHtml = html.substring(theadStart, theadEnd);
                theadHtml = theadHtml.replace(/<th>Konto<\/th><th>Karta<\/th><th>Bankomaty<\/th>/, '<th>RRSO</th><th>Rata</th><th>Kwota do spłaty</th>');
                html = html.substring(0, theadStart) + theadHtml + html.substring(theadEnd);
                
                // Recalculate indices since string length changed
                const newTbodyStart = html.indexOf('<tbody', html.indexOf(startMarker));
                const newTbodyEndOpen = html.indexOf('>', newTbodyStart);
                const newTbodyClose = html.indexOf('</tbody>', newTbodyEndOpen);
                
                const before = html.substring(0, newTbodyEndOpen + 1);
                const after = html.substring(newTbodyClose);
                html = before + '\n' + results[tab.key] + '\n                                    ' + after;
            } else {
                const before = html.substring(0, tbodyEndOpen + 1);
                const after = html.substring(tbodyClose);
                html = before + '\n' + results[tab.key] + '\n                                    ' + after;
            }
        }
    }

    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log('Zaktualizowano projects.html!');
    
    // We should also replace the Headers in projects.html if they are wrong.
})();
