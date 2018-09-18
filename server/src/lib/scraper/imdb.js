const addDays = require('date-fns/add_days');
const addHours = require('date-fns/add_hours');
const addMinutes = require('date-fns/add_minutes');
const async = require('async');
const cheerio = require('cheerio');
const datetime = require('../datetime');
const request = require('request');
const url = require('url');

const host = 'https://www.imdb.com';
const deepLinkReplaceRegex = /showtimes\/(title\/[^\/]+)\/.*$/;

function showtimesUrlForDate(permalink, date) {
  let day = date.getDate() + 1;
  if (day < 10) day = '0' + day;
  let month = date.getMonth() + 1;
  if (month < 10) month = '0' + month;
  const formatted = `${date.getFullYear()}-${month}-${day}`
  return url.resolve(host, `showtimes/cinema/US/${permalink}/US/12345/${formatted}`)
}

module.exports = (location, permalink) => (callback) => {
  const log = require('debug')(`scraper:${location.toLowerCase().replace(' ', '')}`);
  const today = datetime.todayUTC();
  const tomorrow = addDays(today, 1);

  const showtimesForDate = (date) => (callback) => {
    showtimesUrl = showtimesUrlForDate(permalink, date);
    log(showtimesUrl)
    request(showtimesUrl, (err, res) => {
      if (err) {
        return callback(err);
      }

      const $ = cheerio.load(res.body);
      const showtimes = [];

      $('.article.st [itemtype="http://schema.org/Movie"]').each((_, elem) => {
        const title = $('[itemprop=name]', elem).text().trim();
        const showtimeDeepLink = url.resolve(host, $('[itemprop=url]', elem).attr('href'));
        const deepLink = showtimeDeepLink.replace(deepLinkReplaceRegex, '$1');
        const showtimesTokens = $('.showtimes', elem).text().split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((s) => !isNaN(parseInt(s)))
          .map((s) => s.split(' '));

        showtimesTokens.forEach(([time, ampm]) => {
          let showtime = date;
          const [hours, minutes] = time.split(':').map((s) => parseInt(s));
          showtime = addMinutes(addHours(showtime, hours), minutes);
          if (ampm !== 'am') showtime = addHours(showtime, 12);

          showtimes.push({
            deepLink,
            language: null,
            location,
            showtime,
            title
          });
        });
      });

      callback(null, showtimes);
    });
  };

  log('starting');
  async.parallel([showtimesForDate(today), showtimesForDate(tomorrow)], (err, data) => {
    if (err) {
      callback(err);
    } else {
      const showtimes = data.reduce((acc, list) => acc.concat(list), []);
      log(`got ${showtimes.length} results`);
      callback(null, showtimes);
    }
  });
};
