import async from 'async';
import handlebars from 'handlebars';
import locations from './config/index.js';
import { today } from './lib/datetime.js';
import { pad } from './lib/utils.js';
import fs from 'fs-extra';
import path from 'path';
import program from 'commander';
import { fileURLToPath } from 'url';
import { getShowtimes } from './scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .version(process.env.npm_package_version)
  .option('-o, --output-dir [dir]', 'Output directory')
  .option('-w, --watch', 'Watch templates and recompile on template change')
  .parse(process.argv);

// Properly report stack traces on errors triggered from Promise chains
process.on('unhandledRejection', (err) => console.log(err));

const outputDir = program.outputDir || path.resolve(__dirname, '../dist');
const publicDir = path.resolve(__dirname, '../public');
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
  return !!locations[city].find((loc) => locationSearch.indexOf(loc) >= 0);
};

function daysFromNow(days, timezone) {
  const todayDatetime = today(timezone);
  // Cut-off is 3am to account for midnight movies
  const start = todayDatetime.clone().add(days, 'day').set('hour', 3);
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

function buildLocation(name, { timezone, kinos }, callback) {
  const locationDir = path.resolve(outputDir, name);

  return fs.ensureDir(locationDir)
    .then(() => {
      return fs.copy(publicDir, locationDir, {
        filter(src) {
          return ! /\.tmpl/.test(src);
        }
      })
    })
    .then(() => getShowtimes(kinos))
    .then((showtimes) => {
      const sorted = showtimes.sort(({ showtime: a }, { showtime: b }) => {
        if (a.isSame(b)) return 0;
        else if (a.isBefore(b)) return -1;
        else return 1;
      });
      const deduped = sorted.filter(dedupe());
      const today = deduped.filter(daysFromNow(0, timezone)).map(toTemplateData);
      const tomorrow = deduped.filter(daysFromNow(1, timezone)).map(toTemplateData);

      return getTemplate()
        .then((template) => {
          const indexHtml = path.join(locationDir, 'index.html');
          return fs.writeFile(indexHtml, template({ today, tomorrow }));
        });
    })
    .then(() => callback(null), callback);
}

export default () => async.parallel(
  Object.keys(locations).map((name) => {
    return (cb) => buildLocation(name, locations[name], cb);
  }),
  (err, res) => {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      process.exit();
    }
  }
);
