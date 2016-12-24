const addDays = require('date-fns/add_days');
const cheerio = require('cheerio');
const datetime = require('../lib/datetime');
const request = require('request');

module.exports = (callback) => {
  request('http://www.indiekino.de/kinoprogramm/de/berlin/', (err, res) => {
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
          const title = $('.titel > a', item).text() || $('.titel').text();

          const showtime = new Date(dateColumns[i]);
          showtime.setUTCHours(hours);
          showtime.setUTCMinutes(minutes);

          showtimes.push({
            location,
            showtime,
            title,
            language
          });
        });
      });
    });

    // callback(null, showtimes);
    callback(null, []);
  });
};
