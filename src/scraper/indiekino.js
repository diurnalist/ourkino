const addDays = require('date-fns/add_days');
const cheerio = require('cheerio');
const datetime = require('../lib/datetime');
const log = require('debug')('scraper:indiekino');
const request = require('request');
const url = require('url');

module.exports = (callback) => {
  log('starting');

  const host = 'http://www.indiekino.de';

  request(url.resolve(host, 'kinoprogramm/de/berlin/'), (err, res) => {
    if (err)  {
      return callback(err);
    }

    const $ = cheerio.load(res.body);
    const $sections = $('.gp');

    const showtimes = [];

    const now = datetime.todayUTC();
    const dateColumns = $sections.map((i) => {
      return addDays(now, i);
    }).get();

    $sections.each((i, schedule) => {
      $('.pa', schedule).each((_, list) => {
        const location = $('.kino', list).text();

        $('.termin', list).each((__, item) => {
          const [ hours, minutes ] = $('.zi', item).text().split(':');
          const language = $('.fassung', item).text();
          const anchor = $('.titel > a', item);

          const title = anchor.length ? anchor.text() : $('.titel', item).text();
          const deepLink = anchor.length ? url.resolve(host, anchor.attr('href')) : null;

          const showtime = datetime.parse(dateColumns[i]);
          showtime.setUTCHours(hours);
          showtime.setUTCMinutes(minutes);

          showtimes.push({
            deepLink,
            language,
            location,
            showtime,
            title
          });
        });
      });
    });

    log(`got ${showtimes.length} results`);
    callback(null, showtimes);
  });
};
