const async = require('async');
const fs = require('fs');
const log = require('debug')('scraper');
const path = require('path');

const scraperDir = path.resolve(__dirname, './scraper');
const scrapers = fs.readdirSync(scraperDir).map((filename) => {
  return require(path.join(scraperDir, filename));
});

// Avoid making too many calls in parallel - some sites cannot take
// sudden bursts of traffic, even minor.
const concurrentTaskLimit = 4;

module.exports = {
  getShowtimes() {
    return new Promise((resolve, reject) => {
      async.parallelLimit(scrapers, concurrentTaskLimit, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.reduce((acc, list) => acc.concat(list), []));
        }
      });
    });
  }
};
