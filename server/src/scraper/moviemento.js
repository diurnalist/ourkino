const log = require('debug')('scraper:moviemento');
const request = require('request');
const split = require('split');
const url = require('url');

const dataExtractRegex = /dataLayer\.push\((.*?)\);$/;
const host = 'https://www.kinoheld.de';

function getViewData() {
  return new Promise((resolve, reject) => {
    request({
      url: url.resolve(host, 'kino-berlin/moviemento-kino'),
      qs: {
        layout: 'shows'
      }
    })
    .pipe(split())
    .on('data', (line) => {
      const [, json] = line.match(dataExtractRegex) || []

      if (json) {
        resolve(JSON.parse(json));
      }
    })
    .on('error', reject);
  });
}

module.exports = (callback) => {
  log('starting');
  getViewData()
    .then(({ shows, movies }) => {
      const showtimes = [];

      Object.keys(shows).forEach((key) => {
        const show = shows[key];
        const movie = movies[show.movieId];

        const deepLink = url.resolve(host, show.url);
        const language = show.flags[0];
        const showtime = new Date(show.start);
        const title = movie.name.replace(/\((ov|ome?u)\)/i, '').trim();

        showtimes.push({
          deepLink,
          language,
          location: 'Moviemento',
          showtime,
          title
        });
      });

      log(`got ${showtimes.length} results`);
      callback(null, showtimes);
    }, callback);
};
