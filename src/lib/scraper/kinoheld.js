const { parse } = require('../datetime');
const request = require('request');
const split = require('split');
const url = require('url');

const dataExtractRegex = /dataLayer\.push\((.*?)\);$/;
const HOST = 'https://www.kinoheld.de';
https://www.kinoheld.de/ajax/getShowsForCinemas?cinemaIds[]=670

function getViewData(cinemaId) {
  return new Promise((resolve, reject) => {
    request({
      url: url.resolve(HOST, `ajax/getShowsForCinemas`),
      qs: {
        cinemaIds: [cinemaId]
      },
      json: true
    }, (err, res) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(res.body);
      }
    });
  });
}

module.exports = (location, timezone, permalink) => (callback) => {
  const log = require('debug')(`scraper:${location.toLowerCase().replace(' ', '')}`);

  log('starting');
  getViewData(permalink)
    .then(({ shows, movies }) => {
      const showtimes = [];

      Object.keys(shows).forEach((key) => {
        const show = shows[key];
        const movie = Object.values(movies).find(({ id }) => show.movieId === id);

        if (!movie) {
          log(`could not find entry for movie with id=${show.movieId}`);
          return; // Skip
        }

        const deepLink = show.url && url.resolve(HOST, show.url);
        const language = show.flags
          .filter(({ category }) => category === 'language')
          .map(({ name }) => name)[0] || null;
        const showtime = parse(`${show.date}T${show.time}`, timezone);
        const title = movie.name.replace(/\((ov|ome?u)\)/i, '').trim();

        showtimes.push({
          deepLink,
          language,
          location,
          showtime,
          title
        });
      });

      log(`got ${showtimes.length} results`);
      callback(null, showtimes);
    }, callback);
};
