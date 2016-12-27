const addDays = require('date-fns/add_days');
const config = require('./config');
const datetime = require('./lib/datetime');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const program = require('commander');
const scraper = require('./scraper');

program
  .version('0.0.1')
  .option('-o, --output-dir', 'Output directory')
  .parse(process.argv);

function getContentsSync(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath)).toString();
}

const template = handlebars.compile(getContentsSync('../index.tmpl'));
handlebars.registerPartial('showtime', getContentsSync('../showtime.tmpl'));

const outputDir = path.resolve(__dirname, '../public');

function locationMatches({ location }) {
  const locationSearch = location.toLowerCase();
  return !!config.locations.find((configLocation) => locationSearch.indexOf(configLocation) >= 0);
}

function daysFromNow(days) {
  const today = datetime.todayUTC();
  const start = addDays(today, days);
  const end = addDays(start, 1);

  return ({ showtime }) => {
    const showtimeDate = new Date(showtime);
    return showtimeDate >= start && showtimeDate < end;
  };
}

function pad(number) {
  return (number < 10 ? '0' : '') + number;
}

function toTemplateData({ deepLink, language, location, showtime, title }) {
  const showtimeDate = new Date(showtime);
  const hours = pad(showtimeDate.getUTCHours());
  const minutes = pad(showtimeDate.getUTCMinutes());

  return {
    deepLink,
    isoTime: showtime,
    language,
    location,
    time: `${hours}:${minutes}`,
    title
  };
}

scraper.getShowtimes()
  .then((showtimes) => showtimes.filter(locationMatches))
  .then((showtimes) => {
    // sort by date
    return showtimes.sort(({ showtime: a }, { showtime: b }) => {
      if (a === b) return 0;
      const aDate = Date.parse(a);
      const bDate = Date.parse(b);
      if (aDate < bDate) return -1;
      else return 1;
    });
  })
  .then((showtimes) => {
    return new Promise((resolve, reject) => {
      const today = showtimes.filter(daysFromNow(0)).map(toTemplateData);
      const tomorrow = showtimes.filter(daysFromNow(1)).map(toTemplateData);

      fs.writeFile(path.join(outputDir, 'index.html'), template({ today, tomorrow }), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
