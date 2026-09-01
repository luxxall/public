const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('kredyty.html', 'utf-8');
const $ = cheerio.load(html);

const offers = [];
$('[class*="offers__content-item"]').each((i, el) => {
    const text = $(el).text();
    if (text.includes('RRSO')) {
        const bankImg = $(el).find('img[alt*="Logo banku"]').last().attr('alt');
        const bankName = bankImg ? bankImg.replace('Logo banku ', '') : 'Nieznany';
        
        // Extract exact numbers
        const rataMatch = text.match(/Rata([0-9\s,]+)zł/);
        const kwotaMatch = text.match(/Kwota do spłaty([0-9\s,]+)zł/);
        const rrsoMatch = text.match(/RRSO ([0-9,]+)%/);
        
        offers.push({
            bank: bankName,
            rrso: rrsoMatch ? rrsoMatch[1] + '%' : '',
            rata: rataMatch ? rataMatch[1].trim() + ' zł' : '',
            kwota: kwotaMatch ? kwotaMatch[1].trim() + ' zł' : ''
        });
    }
});
console.log(offers);

