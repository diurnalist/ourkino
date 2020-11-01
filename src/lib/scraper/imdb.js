import async from 'async';
import cheerio from 'cheerio';
import request from 'request';
import url from 'url';
import debug from 'debug';
import { today } from '../datetime.js';

const host = 'https://www.imdb.com';
const deepLinkReplaceRegex = /showtimes\/(title\/[^\/]+)\/.*$/;

function showtimesUrlForDate(permalink, date) {
  let day = date.date();
  if (day < 10) day = '0' + day;
  let month = date.month() + 1;
  if (month < 10) month = '0' + month;
  const formatted = `${date.year()}-${month}-${day}`
  return url.resolve(host, `showtimes/cinema/US/${permalink}/US/12345/${formatted}`)
}

export default (location, timezone, permalink) => (callback) => {
  const log = debug(`scraper:${location.toLowerCase().replace(/\s+/g, '')}`);
  const todayDatetime = today(timezone);
  const tomorrow = todayDatetime.clone().add(1, 'day');

  const showtimesForDate = (date) => (callback) => {
    const showtimesUrl = showtimesUrlForDate(permalink, date);
    log(showtimesUrl);
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
          let showtime = date.clone();
          const [hours, minutes] = time.split(':').map((s) => parseInt(s));
          showtime.set('hour', hours).set('minute', minutes);
          if (ampm !== 'am') showtime.add(12, 'hour');

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
  async.parallel([showtimesForDate(todayDatetime), showtimesForDate(tomorrow)], (err, data) => {
    if (err) {
      callback(err);
    } else {
      const showtimes = data.reduce((acc, list) => acc.concat(list), []);
      log(`got ${showtimes.length} results`);
      callback(null, showtimes);
    }
  });
};
