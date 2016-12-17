const addDays = require('date-fns/add_days');
const async = require('async');
const cheerio = require('cheerio');
const log = require('debug')('scraper:yorck');
const request = require('request');
const vm = require('vm');

const eventIdCaptureRegex = /data-event-id\s*=['"](\w+)['"]/i;
const htmlFragmentCaptureRegex = /\.replaceWith\((.*?)\);$/;

function parseHtml(html) {
  return cheerio.load(html.replace(/\r?\n/g, ''));
}

function getFilms(callback) {
  return new Promise((resolve, reject) => {
    request('https://yorck.de/filme', (err, res) => {
      if (err) {
        return reject(err);
      }

      const $ = parseHtml(res.body);
      const films = $('.movie-row').map((i, elem) => {
        const $row = $(elem);

        return {
          id: $row.attr('id').replace('movie-', ''),
          title: $('.movie-details h2', $row).text(),
          poster: $('.movie-poster img', $row).attr('src'),
          description: $('p', $row).eq(2).text(),
          // we will fetch the showtimes separately
          showtimes: []
        };
      }).get();

      resolve(films);
    });
  });
}

function extractText(node) {
  return node.textValue;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0);
  now.setMinutes(0);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now;
}

function extractShowtimes(eventShowtimesHtml) {
  const $ = parseHtml(eventShowtimesHtml);

  let currentListing = null;
  let column = -1;
  const listings = [];

  const firstPage = $('.show-times-page').first();

  const now = startOfToday();
  const dateColumns = firstPage.find('.program-header')
    .map((i) => {
      return addDays(now, i);
    }).get();

  firstPage.children()
    .each((i, elem) => {
      const $elem = $(elem);

      // Skip headers
      if ($elem.find('.program-header').length > 0) return;

      if ($elem.hasClass('clearfix')) column = -1;
      if ($elem.hasClass('show-times-column')) column++;

      if ($elem.hasClass('cinema-name')) {
        currentListing = {
          theatre: $elem.text(),
          showtimes: []
        };

        listings.push(currentListing);
      }

      $('.show-ticket-time', $elem).each((j, time) => {
        const $time = $(time);
        const [ hours, minutes ] = $time.contents().first().text().split(':');
        const lang = $('.show-lang', $time).text();
        const date = new Date(dateColumns[j]);
        date.setUTCHours(hours);
        date.setUTCMinutes(minutes);
        currentListing.showtimes.push(date.toUTCString());
      });
    });

  return listings;
}

function getShowtimesForEventId(eventId, callback) {
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
      eventid: eventId,
      filter_today: false,
      filter_subtitle: false,
      fitler_children: false
    },
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  }, (err, res) => {
    if (err) {
      return callback(err);
    }

    const [ htmlFragment ] = res.body.split('\n')
      .filter((line) => line.indexOf(`#${fakeDomId}`) >= 0)
      .map((line) => {
        const [, htmlString] = line.match(htmlFragmentCaptureRegex) || [];

        if (!htmlString) return null;

        const sandbox = {};
        const script = new vm.Script(`html = ${htmlString}`);

        script.runInNewContext(sandbox);

        return sandbox.html.replace(/\r?\n/g, '');
      });

    callback(null, htmlFragment && extractShowtimes(htmlFragment));
  });
}

module.exports = () => {
  return new Promise((resolve, reject) => {
    getFilms()
      .then((films) => {
        async.map(films.map(({ id }) => id), getShowtimesForEventId, (err, allShowtimes) => {
          films.forEach((film, i) => {
            film.showtimes = allShowtimes[i];
          });

          if (err) {
            reject(err)
          } else {
            resolve(films);
          }
        });
      });
  });
};
