import async from 'async';
import program from 'commander';
import debug from 'debug';
import fs from 'fs-extra';
import handlebars from 'handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import locations from './config/index.js';
import { daysFromNow } from './lib/datetime.js';
import { toDisplayTime } from './lib/utils.js';
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

function toTemplateData({ deepLink, language, location, showtime, title }) {
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
    time: toDisplayTime(showtime),
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

  const template = await getTemplate();
  const indexHtml = path.join(locationDir, 'index.html');
  const today = showtimes.filter(daysFromNow(0, timezone)).map(toTemplateData);
  const tomorrow = showtimes.filter(daysFromNow(1, timezone)).map(toTemplateData);
  await fs.writeFile(indexHtml, template({ today, tomorrow }));
}

export default async function build() {
  const filteredLocations = Object.keys(locations).filter((name) => {
    return !program.location || program.location === name;
  });
  const allShowtimes = await async.parallel(
    filteredLocations.reduce((jobs, name) => {
      const { kinos } = locations[name];
      jobs[name] = getShowtimes.bind(null, kinos);
      return jobs;
    }, {})
  );
  
  async function buildAllLocations() {
    await async.parallel(
      filteredLocations.map((name) => buildLocation.bind(null, name, allShowtimes[name]))
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
