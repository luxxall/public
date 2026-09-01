const fs = require('fs');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

async function fetchPageHtml(browser, url) {
    const page = await browser.newPage();
    // block images and fonts to speed up
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (req.resourceType() === 'image' || req.resourceType() === 'font' || req.resourceType() === 'stylesheet') {
            req.abort();
        } else {
            req.continue();
        }
    });
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.offers__item');
    const html = await page.content();
    await page.close();
    return cheerio.load(html);
}

function extractOffers($, limit = null) {
    const offers = [];
    $('.offers__container .offers__item').each((i, el) => {
        if (limit && offers.length >= limit) return;
        
        const nameLink = $(el).find('a.link-button.-text').text().trim();
        let bank = 'Nieznany';
        const alt = $(el).find('.offers__item-header-logo img').attr('alt');
        if (alt && alt !== 'Logo banku undefined' && alt !== 'Logo banku [object Object]') {
            bank = alt.replace('Logo banku ', '').trim();
        } else {
            const url = $(el).find('a.link-button').attr('href') || '';
            const banks = ['Millennium', 'Santander', 'Pekao', 'PKO', 'mBank', 'ING', 'Alior', 'BNP', 'Citi', 'VeloBank', 'Credit Agricole', 'Velo', 'Citi Handlowy', 'Erste Bank Polska', 'BOŚ Bank'];
            for (const b of banks) {
                if (url.toLowerCase().includes(b.toLowerCase().replace(' ', '-')) || nameLink.toLowerCase().includes(b.toLowerCase())) {
                    bank = b;
                    break;
                }
            }
        }

        let rata = '';
        let kwota = '';
        let marza = '';
        let prowizja = '';
        let rrso = '';

        $(el).find('.offers__item-content-attribute, .offers__item-content-attribute.-divided').each((j, attr) => {
            const label = $(attr).find('.offers__item-content-attribute-label').text().trim();
            const value = $(attr).find('.offers__item-content-attribute-value').text().trim();
            if (label === 'Rata') rata = value;
            if (label === 'Kwota do spłaty') kwota = value;
            if (label === 'Marża') marza = value;
            if (label === 'Prowizja') prowizja = value;
            if (label === 'RRSO') rrso = value;
        });
        
        const rrsoMatch = nameLink.match(/RRSO ([0-9,]+%)/);
        if (rrsoMatch) {
            rrso = rrsoMatch[1];
        }

        offers.push({
            bank,
            kredyt: nameLink.replace(/\(RRSO.*\)/, '').trim(),
            rata,
            kwota,
            marza,
            prowizja,
            rrso
        });
    });
    
    return offers;
}

async function updateProjectsHtml() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    console.log('Fetching Gotowkowe...');
    const $got = await fetchPageHtml(browser, 'https://www.bankier.pl/smart/kredyty-gotowkowe');
    const gotowkowe = extractOffers($got, 6);

    console.log('Fetching Konsolidacyjne...');
    const $kon = await fetchPageHtml(browser, 'https://www.bankier.pl/smart/kredyty-konsolidacyjne');
    const konsolidacyjne = extractOffers($kon, 5);

    console.log('Fetching Hipoteczne Stale...');
    const $hipoStale = await fetchPageHtml(browser, 'https://www.bankier.pl/smart/kredyty-hipoteczne#1/30/400000/500000/30/2/2/12/0/2/2');
    const hipoStale = extractOffers($hipoStale, 10);

    console.log('Fetching Hipoteczne Zmienne...');
    const $hipoZmienne = await fetchPageHtml(browser, 'https://www.bankier.pl/smart/kredyty-hipoteczne#1/30/400000/500000/30/2/2/12/0/2/1');
    const hipoZmienne = extractOffers($hipoZmienne, 10);

    console.log('Fetching Refinansowanie...');
    const $ref = await fetchPageHtml(browser, 'https://www.bankier.pl/smart/refinansowanie-kredytu-co-to-jest-kredyt-refinansowy');
    const refinansowanie = extractOffers($ref, 8);

    await browser.close();

    console.log('Reading public/sites/projects.html...');
    const htmlPath = '../public/sites/projects.html';
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const $html = cheerio.load(htmlContent);

    let gotHtml = '';
    gotowkowe.forEach((o, i) => {
        gotHtml += `<tr>
            <td>${i + 1}</td>
            <td class="fw-bold">${o.bank}</td>
            <td>${o.rrso}</td>
            <td class="fw-bold">${o.rata}</td>
            <td>${o.kwota}</td>
        </tr>\n`;
    });
    $html('#pills-gotowkowe tbody').html(gotHtml);

    let konHtml = '';
    konsolidacyjne.forEach((o, i) => {
        konHtml += `<tr>
            <td>${i + 1}</td>
            <td class="fw-bold">${o.bank}</td>
            <td>${o.rrso}</td>
            <td class="fw-bold">${o.rata}</td>
            <td>${o.kwota}</td>
        </tr>\n`;
    });
    $html('#pills-konsolidacyjne tbody').html(konHtml);

    let hipoStaleHtml = '';
    hipoStale.forEach((o, i) => {
        hipoStaleHtml += `<tr>
            <td>${i + 1}</td>
            <td class="fw-bold">${o.bank}</td>
            <td>${o.kredyt}</td>
            <td>${o.kwota}</td>
            <td>${o.marza}</td>
            <td>${o.prowizja}</td>
            <td>${o.rrso}</td>
            <td class="fw-bold">${o.rata}</td>
        </tr>\n`;
    });
    $html('#pills-hipoteka-stale tbody').html(hipoStaleHtml);

    let hipoZmienneHtml = '';
    hipoZmienne.forEach((o, i) => {
        hipoZmienneHtml += `<tr>
            <td>${i + 1}</td>
            <td class="fw-bold">${o.bank}</td>
            <td>${o.kredyt}</td>
            <td>${o.kwota}</td>
            <td>${o.marza}</td>
            <td>${o.prowizja}</td>
            <td>${o.rrso}</td>
            <td class="fw-bold">${o.rata}</td>
        </tr>\n`;
    });
    $html('#pills-hipoteka-zmienne tbody').html(hipoZmienneHtml);

    $html('#pills-refinansowanie thead tr').html('<th>Nr</th><th>Bank</th><th>Kwota do spłaty</th><th>Marża</th><th>Prowizja</th><th>RRSO</th><th>Rata</th>');
    let refHtml = '';
    refinansowanie.forEach((o, i) => {
        refHtml += `<tr>
            <td>${i + 1}</td>
            <td class="fw-bold">${o.bank}</td>
            <td>${o.kwota}</td>
            <td>${o.marza}</td>
            <td>${o.prowizja}</td>
            <td>${o.rrso}</td>
            <td class="fw-bold">${o.rata}</td>
        </tr>\n`;
    });
    $html('#pills-refinansowanie tbody').html(refHtml);

    fs.writeFileSync(htmlPath, $html.html());
    console.log('Updated projects.html successfully!');
}

updateProjectsHtml().catch(console.error);
