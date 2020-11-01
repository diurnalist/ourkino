import async from 'async';
import program from 'commander';
import debug from 'debug';
import fs from 'fs-extra';
import handlebars from 'handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import locations from './config/index.js';
import { today } from './lib/datetime.js';
import { pad } from './lib/utils.js';
import { getShowtimes } from './scraper.js';

const log = debug('build');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .version(process.env.npm_package_version)
  .option('-o, --output-dir [dir]', 'Output directory')
  .option('-w, --watch', 'Watch templates and recompile on template change')
  .option('-l, --location [loc]', 'Only build certain location(s).')
  .parse(process.argv);

// Properly report stack traces on errors triggered from Promise chains
process.on('unhandledRejection', (err) => console.log(err));

const outputDir = program.outputDir || path.resolve(__dirname, '../dist');
const publicDir = path.resolve(__dirname, '../public');
const indexTemplate = path.resolve(publicDir, 'index.tmpl');
const showtimeTemplate = path.resolve(publicDir, 'showtime.tmpl');

function getTemplate() {
  return fs.readFile(indexTemplate, 'utf8')
      .then(handlebars.compile)
      .then((template) => {
        return fs.readFile(showtimeTemplate, 'utf8')
          .then((partial) => handlebars.registerPartial('showtime', partial))
          .then(() => template);
      });
}

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

async function buildLocation(name, showtimes) {
  const { timezone } = locations[name];
  const locationDir = path.resolve(outputDir, name);

  await fs.ensureDir(locationDir);
  await fs.copy(publicDir, locationDir, {
    filter(src) {
      return ! /\.tmpl/.test(src);
    }
  });

  const sorted = showtimes.sort(({ showtime: a }, { showtime: b }) => {
    if (a.isSame(b)) return 0;
    else if (a.isBefore(b)) return -1;
    else return 1;
  });
  const template = await getTemplate();
  const indexHtml = path.join(locationDir, 'index.html');
  const deduped = sorted.filter(dedupe());
  const today = deduped.filter(daysFromNow(0, timezone)).map(toTemplateData);
  const tomorrow = deduped.filter(daysFromNow(1, timezone)).map(toTemplateData);
  await fs.writeFile(indexHtml, template({ today, tomorrow }));
}

export default async function build() {
  const filteredLocations = Object.keys(locations).filter((name) => {
    return !program.location || program.location === name;
  });
  const showtimes = await async.parallel(
    filteredLocations.reduce((jobs, name) => {
      const { kinos } = locations[name];
      jobs[name] = getShowtimes.bind(null, kinos);
      return jobs;
    }, {})
  );
  
  async function buildAllLocations() {
    await async.parallel(
      filteredLocations.map((name) => buildLocation.bind(null, name, showtimes[name]))
    );
  }

  if (program.watch) {
    const chokidar = await import('chokidar');
    chokidar.watch(publicDir)
      .on('change', () => {
        buildAllLocations().then(() => log('Rebuilt output'));
      })
      .on('error', (err) => { throw err; });
      log('Started watcher. Output directory will be refreshed on changes to static assets.')
  } else {
    await buildAllLocations();
  }
}
