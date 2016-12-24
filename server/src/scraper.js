const async = require('async');
const fs = require('fs');
const log = require('debug')('scraper');
const path = require('path');

const scraperDir = path.resolve(__dirname, './scraper');
const scrapers = fs.readdirSync(scraperDir).map((filename) => {
  return require(path.join(scraperDir, filename));
});

module.exports = {
  getShowtimes() {
    return new Promise((resolve, reject) => {
      async.parallel(scrapers, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.reduce((acc, list) => acc.concat(list), []));
        }
      });
    });
  }
};
