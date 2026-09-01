const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('kredyty.html', 'utf-8');
const $ = cheerio.load(html);

const offers = [];
$('*').each((i, el) => {
    const text = $(el).text();
    // We only want leaf-ish nodes that contain all the data, meaning they don't contain other nodes that ALSO contain all the data.
    // Or we can just find elements that contain "Rata", "Kwota do spłaty", and have a reasonable length
    if (text.includes('RRSO') && text.includes('Rata') && text.includes('Kwota do spłaty') && text.length < 500 && $(el).children().length === 0) {
       console.log('Leaf:', text);
    }
});

// Let's use a simpler approach. Just look for images of banks, go up to the closest container that has 'Rata'
$('img[alt*="Logo banku"]').each((i, el) => {
    const alt = $(el).attr('alt');
    const bankName = alt.replace('Logo banku ', '').replace('[object Object]', '').replace('undefined', '').trim();
    if (!bankName) return;
    
    let parent = $(el).parent();
    while (parent.length > 0 && !parent.text().includes('Kwota do spłaty')) {
        parent = parent.parent();
    }
    
    if (parent.length > 0) {
        const text = parent.text();
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

// remove duplicates
const unique = [];
offers.forEach(o => {
    if (!unique.find(u => u.bank === o.bank && u.rata === o.rata)) {
        unique.push(o);
    }
});
console.log(unique);

