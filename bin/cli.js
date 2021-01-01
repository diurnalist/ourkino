#!/usr/bin/env node
import chalk from 'chalk';
import program from 'commander';
import moment from 'moment-timezone';
import { table } from 'table';
import { locations } from '../src/config/index.js';
import { getShowtimes } from '../src/scraper.js';
import { daysFromNow } from '../src/lib/datetime.js';
import { toDisplayTime } from '../src/lib/utils.js';

program
  .name('ourkino')
  .version(process.env.npm_package_version)
  .option('-l, --location [loc]', 'Which location to display showtimes for', 'chicago')
  .parse(process.argv);

const { kinos, timezone } = locations[program.location];
if (!kinos) {
  throw `Invalid location: "${program.location}"`;
}

const showtimes = await getShowtimes(kinos);
const rows = [['Time', 'Kino', 'Title']].concat(showtimes
  .filter(daysFromNow(0, timezone))
  .filter(({ showtime }) => {
    return showtime.isAfter(moment().subtract(1, 'hours'))
  })
  .map(({ showtime, title, location }) => {
    return [toDisplayTime(showtime), chalk.cyan(location), chalk.cyanBright.bold(title)];
  }));

console.log(chalk.cyan.bold('  Today'))
console.log(table(rows));
