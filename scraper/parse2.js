const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('kredyty.html', 'utf-8');
const $ = cheerio.load(html);

$('img').each((i, el) => {
    const alt = $(el).attr('alt') || '';
    if (alt.includes('Logo banku')) {
        const parent = $(el).closest('div');
        console.log('Found Bank:', alt);
        // let's print the entire text of the container that holds this offer
        const offerContainer = $(el).parents().filter((i, p) => $(p).text().includes('RRSO')).first();
        if (offerContainer.length > 0) {
            console.log('Offer details:', offerContainer.text().substring(0, 200).replace(/\s+/g, ' '));
        }
    }
});

