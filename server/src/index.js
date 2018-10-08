const addDays = require('date-fns/add_days');
const addHours = require('date-fns/add_hours');
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

function daysFromNow(days, timezone) {
  const today = datetime.today(timezone);
  // Cut-off is 3am to account for midnight movies
  const start = today.clone().add(days, 'day').set('hour', 3);
  const end = start.clone().add(1, 'day');

  return ({ showtime }) => {
    return showtime.isAfter(start) && showtime.isBefore(end);
  };
}

function dedupe() {
  const seenPairs = [];
  const isSeen = ({ title, showtime, location }) => {
    for (let pair, i = 0; pair = seenPairs[i++];) {
      if (title === pair.title &&
          showtime.isSame(pair.showtime) &&
          location === pair.location) return true;
    }
    return false;
  };
  return ({ title, showtime, location }) => {
    const pair = { title, showtime, location };
    if (isSeen(pair)) {
      return false;
    } else {
      seenPairs.push(pair);
      return true;
    }
  };
}

function pad(number) {
  return (number < 10 ? '0' : '') + number;
}

function toTemplateData({ deepLink, language, location, showtime, title }) {
  const hours = pad(showtime.hour());
  const minutes = pad(showtime.minute());
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

// TODO: parameterize by location
const timezone = 'America/Chicago';

scraper.getShowtimes(Object.values(config.locations.chicago))
  .then((showtimes) => {
    // sort by date
    return showtimes.sort(({ showtime: a }, { showtime: b }) => {
      if (a.isSame(b)) return 0;
      else if (a.isBefore(b)) return -1;
      else return 1;
    });
  })
  .then((showtimes) => {
    return new Promise((resolve, reject) => {
      const deduped = showtimes.filter(dedupe());
      const today = deduped.filter(daysFromNow(0, timezone)).map(toTemplateData);
      const tomorrow = deduped.filter(daysFromNow(1, timezone)).map(toTemplateData);

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
