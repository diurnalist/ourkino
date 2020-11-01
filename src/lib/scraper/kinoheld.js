import { parse } from '../datetime.js';
import request from 'request';
import url from 'url';
import debug from 'debug';

const HOST = 'https://www.kinoheld.de';

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

export default (location, timezone, permalink) => (callback) => {
  const log = debug(`scraper:${location.toLowerCase().replace(' ', '')}`);

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
