const addDays = require('date-fns/add_days');
const async = require('async');
const cheerio = require('cheerio');
const datetime = require('../datetime');
const request = require('request');
const url = require('url');
const vm = require('vm');

const HOST = 'https://yorck.de';
const htmlFragmentCaptureRegex = /\.replaceWith\((.*?)\);$/;

function getShowtimesHTMLFragment(cinemaId) {
  return new Promise((resolve, reject) => {
    const fakeDomId = '_';
    // This endpoint (https://yorck.de/shows/<id>/movies.js)
    // is parameterized by a string id, which just refers to an HTML
    // DOM id, and can be any value. It returns a JS file that replaces
    // the contents of this DOM id with some HTML.
    // The only protection on this endpoint is on the X-Requested-With
    // header; it does not require any session spoofing.
    //
    // Params:
    //   `cinemaid`: the id of the cinema in the Yorck system
    //
    request({
      url: `${HOST}/shows/${fakeDomId}/movies.js`,
      qs: {
        cinemaid: cinemaId,
        filter_today: false,
        filter_subtitle: false,
        fitler_children: false
      },
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, (err, res) => {
      if (err) {
        return reject(err);
      }

      const [ htmlFragment ] = res.body.split('\n')
        .filter((line) => line.indexOf(`#${fakeDomId}`) >= 0)
        .map((line) => {
          const [, htmlString] = line.match(htmlFragmentCaptureRegex) || [];

          if (htmlString) {
            const sandbox = {};
            const script = new vm.Script(`html = ${htmlString}`);

            script.runInNewContext(sandbox);

            return sandbox.html.replace(/\r?\n/g, '');
          }
        });

      if (htmlFragment) {
        return resolve(htmlFragment);
      } else {
        return reject('Failed to parse showtimes');
      }
    });
  });
}

const extractShowtimes = (location, timezone) => (showtimesHTMLFragment) => {
  const $ = cheerio.load(showtimesHTMLFragment.replace(/\r?\n/g, ''));

  const showtimes = [];
  const today = datetime.today(timezone);

  // Structure of fragment:
  // There are two renderings of the program, one for wide browsers (.hidden-xs)
  // and one for narrow browsers (.visible-xs) - they are redundant and we only
  // need one. We parse the wide one.
  //
  // First we parse the movie information (.movie-details) and keep track of which
  // movie represents which visual row of results.
  //
  // Then we look at each column representing a day (.show-times-column) and
  // look at the show times for each movie (.show-time-row .show-ticket-time)
  //
  const program = $('.cinema-program.hidden-xs').first();

  const movies = program.find('.movie-details').map((_, elem) => {
    const $elem = $(elem);
    return {
      deepLink: `${HOST}${$elem.find('a').attr('href')}`,
      title: $elem.find('h3').text()
    };
  }).get();

  program.find('.show-times-column').each((_, dateColumn) => {
    const $dateColumn = $(dateColumn);
    const [ day, month ] = $dateColumn.find('.program-header > span').text()
                                      .split('.').map((i) => parseInt(i));

    if (!(day && month)) {
      console.log($dateColumn.find('.program-header > span').text().split('.').map(parseInt));
      throw 'Error parsing date from HTML fragment';
    }

    const baseDate = today.clone();
    // Handle case where we fetch showtimes in next year
    if (baseDate.month() + 1 == 12 && month == 1) {
      baseDate.add(1, 'year');
    }
    baseDate.month(month - 1);
    baseDate.date(day);

    $dateColumn.find('.show-time-row').each((movieIndex, movieRow) => {
      const $movieRow = $(movieRow);
      const { deepLink, title } = movies[movieIndex];

      $movieRow.find('.show-ticket-time').each((_, time) => {
        const $time = $(time);
        const [ hours, minutes ] = $time.contents().first().text().split(':');
        const showtime = baseDate.clone();
        showtime.hour(hours);
        showtime.minute(minutes);

        showtimes.push({
          deepLink,
          language: $time.find('.show-lang').text(),
          location,
          showtime,
          title
        });
      });
    });
  });

  return showtimes;
};

module.exports = (location, timezone, cinemaId) => (callback) => {
  const log = require('debug')(`scraper:${location.toLowerCase().replace(' ', '')}`);

  log('starting');
  getShowtimesHTMLFragment(cinemaId)
    .then(extractShowtimes(location, timezone))
    .then((showtimes) => {
      log(`got ${showtimes.length} results`);
      callback(null, showtimes);
    }, callback);
};
