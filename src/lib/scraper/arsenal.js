const cheerio = require('cheerio');
const datetime = require('../datetime');
const log = require('debug')('scraper:arsenal');
const moment = require('moment-timezone');
const request = require('request');
const url = require('url');

module.exports = (callback) => {
  log('starting');
  const host = 'http://www.arsenal-berlin.de';

  request(url.resolve(host, 'en/calendar/week-view.html'), (err, res) => {
    if (err) {
      return callback(err);
    }

    const $ = cheerio.load(res.body);
    const showtimes = [];

    $('.dayWrapper').each((_, elem) => {
      const $dayElem = $(elem);
      const date = datetime.toUTC(moment($dayElem.text()));

      $dayElem
        .nextUntil('.dayWrapper')
        .filter('.calListEvent')
        .each((i, event) => {
          const headerTokens = $('h2', event);
          const descriptionTokens = $('.calListEventDescription strong', event);
          const deepLink = url.resolve(host, $('.calListLocationLink > a', event).attr('href'));

          const title = headerTokens.eq(1).text();
          const language = descriptionTokens.get().reduce((acc, token) => {
            const textContents = $(token).text();

            if (/^ov|ome?u/i.test(textContents)) {
              return textContents;
            } else {
              return acc;
            }
          }, null);

          const showtime = datetime.parse(date);
          const [ time, ampm ] = headerTokens.eq(0).text().split(' ');
          const [ hours, minutes ] = time.split(':');
          showtime.setUTCHours(parseInt(hours, 10) + (/pm/.test(ampm) ? 12 : 0));
          showtime.setUTCMinutes(parseInt(minutes, 10));

          showtimes.push({
            deepLink,
            language,
            location: 'Kino Arsenal',
            showtime,
            title
          });
        });
    });

    log(`got ${showtimes.length} results`);
    callback(null, showtimes);
  });
};
