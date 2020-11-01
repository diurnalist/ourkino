import ical from 'node-ical';
import { parse } from '../datetime.js';
import debug from 'debug';

export default (location, url, { onEvent } = {}) => (callback) => {
  const log = debug(`scraper:${location.toLowerCase().replace(' ', '')}`);

  log('starting');
  ical.async.fromURL(url, {}, (err, data) => {
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
