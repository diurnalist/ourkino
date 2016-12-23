const scraper = require(`./server/dist/scraper/${process.argv[2]}`)

scraper((err, showtimes) => console.log(JSON.stringify(showtimes)));
