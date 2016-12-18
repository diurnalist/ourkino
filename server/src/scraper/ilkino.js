const log = require('debug')('scraper:ilkino');
const request = require('request');
const split = require('split');

const dataExtractRegex = /dataLayer\.push\((.*?)\);$/;

function getViewData() {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://www.kinoheld.de/kino-berlin/il-kino',
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
      Object.keys(shows).forEach((key) => {
        const showtime = shows[key];
        const movie = movies[showtime.movieId];
        movie.showtimes = movie.showtimes || [];
        movie.showtimes.push(showtime);
      });

      const films = Object.keys(movies).map((key) => {
        const movie = movies[key];
        return {
          title: movie.name,
          description: '',
          releaseYear: null,
          poster: movie.lazy_image && `https://kinoheld.de${movie.lazy_image}`,
          showtimes: movie.showtimes.map((showtime) => {
            return {
              location: 'Il Kino',
              showtime: new Date(showtime.start).toISOString(),
              language: showtime.flags[0]
            };
          })
        };
      });

      log(`got ${films.length} results`);

      callback(null, films);
    }, callback);
};
