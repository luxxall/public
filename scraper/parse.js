const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('kredyty.html', 'utf-8');
const $ = cheerio.load(html);

const images = $('img').map((i, el) => $(el).attr('alt')).get().filter(alt => alt && alt.toLowerCase().includes('bank'));
console.log('Bank logos:', new Set(images));

$('*').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Millennium') && text.length < 50 && $(el).children().length === 0) {
        console.log('Found Millennium in:', $(el).prop('tagName'), 'Class:', $(el).attr('class'), 'Text:', text.trim());
    }
});
