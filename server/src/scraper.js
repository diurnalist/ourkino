const async = require('async');
const fs = require('fs');
const Levenshtein = require('levenshtein');
const log = require('debug')('scraper');
const path = require('path');

const scraperDir = path.resolve(__dirname, './scraper');
const scrapers = fs.readdirSync(scraperDir).map((filename) => {
  return require(path.join(scraperDir, filename));
});

function comparisonTitle(name) {
  return name.toLowerCase().trim()
    // ignore weird characters
    .replace(/[^a-z0-9]/g, '')
    // ignore common suffixes (language mostly)
    .replace(/ome?u|ov$/, '');
}

function findClosestTitle(films, film) {
  const title = comparisonTitle(film.title);

  let i = 0;
  for (; i < films.length; i++) {
    const otherTitle = comparisonTitle(films[i].title);
    const distance = new Levenshtein(title, otherTitle).distance;
    // scale distance against length of (shortest) title - this allows
    // us a cheap way to see what percentage of characters differ
    const scaled = distance / Math.min(title.length, otherTitle.length);

    if (scaled < 0.25) {
      log(`scaled distance between ${scaled} for ${title} ?= ${otherTitle}`);
      return films[i];
    }
  }

  return null;
}

function merge(results) {
  const flattened = results.reduce((acc, films) => acc.concat(films), []);
  // merge by name
  return flattened.reduce((acc, film) => {
    const closest = findClosestTitle(acc, film);

    if (closest) {
      closest.showtimes = closest.showtimes.concat(film.showtimes);
    } else {
      acc.push(film);
    }

    return acc;
  }, []);
}

module.exports = {
  getShowtimes() {
    return new Promise((resolve, reject) => {
      async.parallel(scrapers, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const merged = merge(data);
          resolve(merged);
        }
      });
    });
  }
};
