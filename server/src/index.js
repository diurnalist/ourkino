const addDays = require('date-fns/add_days');
const async = require('async');
const config = require('./config');
const datetime = require('./lib/datetime');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const program = require('commander');
const scraper = require('./scraper');

program
  .version('0.0.1')
  .option('-o, --output-dir [dir]', 'Output directory')
  .option('-w, --watch', 'Watch templates and recompile on template change')
  .parse(process.argv);

// Properly report stack traces on errors triggered from Promise chains
process.on('unhandledRejection', (err) => console.log(err));

const outputDir = program.outputDir || path.resolve(__dirname, '../public');
const watch = program.watch;

const getTemplate = (() => {
  const indexTemplate = '../index.tmpl';
  const showtimeTemplate = '../showtime.tmpl';

  function compile() {
    return getContents(indexTemplate)
      .then(handlebars.compile)
      .then((template) => {
        return getContents(showtimeTemplate)
          .then((partial) => handlebars.registerPartial('showtime', partial))
          .then(() => template);
      });
  }

  let template = compile();

  if (watch) {
    require('chokidar')
      .watch([indexTemplate, showtimeTemplate])
      .on('change', () => template = compile());
  }

  return () => template;
})();

function getContents(relativePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, relativePath), (err, contents) => {
      if (err) reject(err);
      else resolve(contents.toString());
    });
  });
}

const locationMatches = (city) => ({ location }) => {
  const locationSearch = location.toLowerCase();
  return !!config.locations[city].find((configLocation) => locationSearch.indexOf(configLocation) >= 0);
};

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
  const textSearch = [ title, location, language ]
    .filter(Boolean)
    .map((s) => s.toLowerCase())
    .join(' | ');

  return {
    deepLink,
    isoTime: showtime,
    language,
    location,
    textSearch,
    time: `${hours}:${minutes}`,
    title
  };
}

scraper.getShowtimes()
  .then((showtimes) => showtimes.filter(locationMatches('chicago')))
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

      getTemplate()
        .then((template) => {
          fs.writeFile(path.join(outputDir, 'index.html'), template({ today, tomorrow }), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
    });
  });
