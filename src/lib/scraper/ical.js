const ical = require('ical');
const { parse } = require('../datetime');

module.exports = (location, url, { onEvent } = {}) => (callback) => {
  const log = require('debug')(`scraper:${location.toLowerCase().replace(' ', '')}`);

  log('starting');
  ical.fromURL(url, {}, (err, data) => {
    if (err) {
      return callback(err);
    }

    const showtimes = Object.values(data).map((event) => {
      const { start, summary } = event;

      return Object.assign({
        deepLink: null,
        language: null,
        location,
        showtime: parse(start),
        title: summary
      }, typeof onEvent === 'function' ? onEvent(event) : {});
    });

    log(`got ${showtimes.length} results`);
    callback(null, showtimes);
  })
};
