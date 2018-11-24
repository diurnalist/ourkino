const async = require('async');
const config = require('./config');
const datetime = require('./lib/datetime');
const { pad } = require('./lib/utils');
const fs = require('fs-extra');
const handlebars = require('handlebars');
const path = require('path');
const program = require('commander');
const scraper = require('./scraper');

program
  .version(require('../package.json').version)
  .option('-o, --output-dir [dir]', 'Output directory')
  .option('-w, --watch', 'Watch templates and recompile on template change')
  .parse(process.argv);

// Properly report stack traces on errors triggered from Promise chains
process.on('unhandledRejection', (err) => console.log(err));

const outputDir = program.outputDir || path.resolve(__dirname, '../dist');
const watch = program.watch;

const getTemplate = (() => {
  const indexTemplate = path.resolve(__dirname, '../public/index.tmpl');
  const showtimeTemplate = path.resolve(__dirname, '../public/showtime.tmpl');

  function compile() {
    return fs.readFile(indexTemplate, 'utf8')
      .then(handlebars.compile)
      .then((template) => {
        return fs.readFile(showtimeTemplate, 'utf8')
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

function toTemplateData({ deepLink, language, location, showtime, title }) {
  const hours = pad(showtime.hour());
  const minutes = pad(showtime.minute());
  const textSearch = [ title, location, language ]
    .filter(Boolean)
    .map((s) => s.toLowerCase())
    .join(' | ');

  return {
    deepLink,
    isoTime: showtime.toISOString(),
    language,
    location,
    textSearch,
    time: `${hours}:${minutes}`,
    title
  };
}

// TODO: parameterize by location
const location = config.locations.berlin;
const timezone = 'Europe/Berlin';
// const location = config.locations.chicago;
// const timezone = 'America/Chicago';

fs.ensureDir(outputDir)
  .then(() => {
    return scraper.getShowtimes(Object.values(location))
      .then((showtimes) => {
        // sort by date
        return showtimes.sort(({ showtime: a }, { showtime: b }) => {
          if (a.isSame(b)) return 0;
          else if (a.isBefore(b)) return -1;
          else return 1;
        });
      })
  })
  .then((showtimes) => {
    const deduped = showtimes.filter(dedupe());
    const today = deduped.filter(daysFromNow(0, timezone)).map(toTemplateData);
    const tomorrow = deduped.filter(daysFromNow(1, timezone)).map(toTemplateData);

    return getTemplate()
      .then((template) => {
        return fs.writeFile(path.join(outputDir, 'index.html'), template({ today, tomorrow }));
      })
      .then(() => {
        return fs.copy(path.resolve(__dirname, '../public'), outputDir, {
          filter(src) {
            return ! /\.tmpl/.test(src);
          }
        });
      });
  });
