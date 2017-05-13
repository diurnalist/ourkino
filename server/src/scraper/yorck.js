const addDays = require('date-fns/add_days');
const async = require('async');
const cheerio = require('cheerio');
const datetime = require('../lib/datetime');
const log = require('debug')('scraper:yorck');
const request = require('request');
const url = require('url');
const vm = require('vm');

const htmlFragmentCaptureRegex = /\.replaceWith\((.*?)\);$/;

function parseHtml(html) {
  return cheerio.load(html.replace(/\r?\n/g, ''));
}

function getFilms(callback) {
  const host = 'https://yorck.de';

  return new Promise((resolve, reject) => {
    request(url.resolve(host, 'filme'), (err, res) => {
      if (err) {
        return reject(err);
      }

      const $ = parseHtml(res.body);
      const films = $('.movie-row').map((i, elem) => {
        const $row = $(elem);

        return {
          id: $row.attr('id').replace('movie-', ''),
          title: $('.movie-details h2', $row).text(),
          deepLink: url.resolve(host, $('.movie-details > a', $row).attr('href'))
        };
      }).get();

      resolve(films);
    });
  });
}

function extractText(node) {
  return node.textValue;
}

function extractShowtimes({ deepLink, title }, eventShowtimesHtml) {
  const $ = parseHtml(eventShowtimesHtml);

  let currentLocation = null;
  let column = -1;
  const showtimes = [];

  const firstPage = $('.show-times-page').first();

  const now = datetime.todayUTC();
  const dateColumns = firstPage.find('.program-header')
    .map((i) => {
      return addDays(now, i);
    }).get();

  // This handles the case of an error page, or when there are no more films
  // available.
  if (dateColumns.length < 1) {
    return showtimes;
  }

  try {
    firstPage.children()
      .each((_, elem) => {
        const $elem = $(elem);

        // Skip headers
        if ($elem.find('.program-header').length > 0) return;

        // Keep track of which column we're in (`clearfix` indicates row breaks)
        if ($elem.hasClass('clearfix')) column = -1;
        if ($elem.hasClass('show-times-column')) column++;

        if ($elem.hasClass('cinema-name')) {
          currentLocation = $elem.text();
          return;
        }

        $('.show-ticket-time', $elem).each((__, time) => {
          const $time = $(time);
          const [ hours, minutes ] = $time.contents().first().text().split(':');

          const date = new Date(dateColumns[column]);
          date.setUTCHours(hours);
          date.setUTCMinutes(minutes);

          showtimes.push({
            deepLink,
            language: $('.show-lang', $time).text(),
            location: currentLocation,
            showtime: date.toISOString(),
            title
          });
        });
      });
  } catch (err) {
    log(err);
  }

  return showtimes;
}

function getShowtimesForFilm({ id, deepLink, title }, callback) {
  log(`getting showtimes for ${id}`);
  const fakeDomId = '_';
  // This endpoint (https://yorck.de/shows/<id>/cinemas.js)
  // is parameterized by a string id, which just refers to an HTML
  // DOM id, and can be any value. It returns a JS file that replaces
  // the contents of this DOM id with some HTML.
  // The only protection on this endpoint is on the X-Requested-With
  // header; it does not require any session spoofing.
  //
  // Params:
  //   `eventid`: the id of the film (it's possible this is a location-specific id)
  //
  request({
    url: `https://yorck.de/shows/${fakeDomId}/cinemas.js`,
    qs: {
      eventid: id,
      filter_today: false,
      filter_subtitle: false,
      fitler_children: false
    },
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  }, (err, res) => {
    if (err) {
      log(`failed to get showtimes for ${id}`);
      return callback(err);
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

    callback(null, htmlFragment && extractShowtimes({ deepLink, title }, htmlFragment));
  });
}

module.exports = (callback) => {
  log('starting');

  getFilms()
    .then((films) => {
      async.map(films, getShowtimesForFilm, (err, allShowtimes) => {
        const showtimes = allShowtimes.reduce((acc, list) => acc.concat(list), []);
        log(`got ${showtimes.length} results`);
        callback(err, showtimes);
      });
    });
};
