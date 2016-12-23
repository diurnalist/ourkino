const log = require('debug')('scraper:eiszeit');
const request = require('request');
const split = require('split');

const EVENT_PAYLOAD_DECLARATION = 'var event =';

function toDate(showTime) {
  const [ date, time ] = showTime.split(' ');
  const [ years, months, days ] = date.split('-');
  const [ hours, minutes ] = time.split(':');

  const d = new Date();
  d.setUTCFullYear(years);
  d.setUTCMonth(months - 1, days);
  d.setUTCHours(hours);
  d.setUTCMinutes(minutes);
  d.setUTCSeconds(0);
  d.setUTCMilliseconds(0);

  return d;
}

function normalize(event) {
  const { title, description, languageVersion, productionYear, showtimes } = event;

  return {
    title,
    description,
    releaseYear: productionYear,
    poster: null,
    showtimes: showtimes.map(({ showTime }) => {
      return {
        location: 'Eiszeit',
        showtime: toDate(showTime).toISOString(),
        language: languageVersion
      };
    })
  };
}

module.exports = (callback) => {
  const films = [];
  log('starting');
  request('http://eiszeit.berlin')
    .pipe(split())
    .on('data', (chunk) => {
      const line = chunk.toString('utf-8').trim();
      if (line.startsWith(EVENT_PAYLOAD_DECLARATION)) {
        const eventPayloadJson = line
          .replace(EVENT_PAYLOAD_DECLARATION, '')
          .replace(/;$/, '')
          .trim();
        films.push(normalize(JSON.parse(eventPayloadJson)));
      }
    })
    .on('end', () => {
      log(`got ${films.length} results`);
      callback(null, films)
    })
    .on('error', callback);
};
