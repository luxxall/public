const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('kredyty.html', 'utf-8');
const $ = cheerio.load(html);

const offers = [];

// Let's find all containers that have RRSO and Rata
$('*').each((i, el) => {
    // find a div that contains "RRSO", "Rata", "Kwota do spłaty", and is a row (e.g. has an img inside)
    if ($(el).children().length > 0 && $(el).text().includes('RRSO') && $(el).text().includes('Kwota do spłaty')) {
        // we want the smallest container
        let isSmallest = true;
        $(el).children().each((j, child) => {
            if ($(child).text().includes('RRSO') && $(child).text().includes('Kwota do spłaty')) {
                isSmallest = false;
            }
        });
        
        if (isSmallest) {
            const text = $(el).text();
            
            // let's try to extract bank name. Often bank name is in an alt text or we can just get the whole text and parse it.
            let bankName = 'Nieznany';
            const img = $(el).find('img').first();
            if (img.length > 0) {
                const alt = img.attr('alt') || '';
                if (alt.includes('Logo banku')) {
                    bankName = alt.replace('Logo banku ', '').replace('[object Object]', '').replace('undefined', '').trim();
                } else if (alt) {
                    bankName = alt;
                }
            }
            
            // if bankName is still empty or 'Nieznany', try to guess from text
            if (!bankName || bankName === 'Nieznany') {
                const banks = ['Millennium', 'Santander', 'Pekao', 'PKO', 'mBank', 'ING', 'Alior', 'BNP', 'Citi', 'VeloBank', 'Credit Agricole'];
                for (const b of banks) {
                    if (text.includes(b)) {
                        bankName = b;
                        break;
                    }
                }
            }
            
            const rataMatch = text.match(/Rata([0-9\s,]+)zł/);
            const kwotaMatch = text.match(/Kwota do spłaty([0-9\s,]+)zł/);
            const rrsoMatch = text.match(/RRSO ([0-9,]+)%/);
            
            if (rataMatch && kwotaMatch) {
                offers.push({
                    bank: bankName,
                    rrso: rrsoMatch ? rrsoMatch[1] + '%' : '',
                    rata: rataMatch ? rataMatch[1].trim() + ' zł' : '',
                    kwota: kwotaMatch ? kwotaMatch[1].trim() + ' zł' : ''
                });
            }
        }
    }
});

// remove duplicates
const unique = [];
offers.forEach(o => {
    if (!unique.find(u => u.bank === o.bank && u.rata === o.rata)) {
        unique.push(o);
    }
});
console.log(unique);

