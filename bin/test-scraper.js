#!/usr/bin/env node
import { locations } from '../src/config/index.js';

const allScrapers = Object.values(locations).reduce((acc, config) => {
  for (var kino in config.kinos) {
    acc[kino.name] = kino
  }
  return acc;
}, {});
console.log(allScrapers);
const scraperName = process.argv[2].toLowerCase();
const scraper = allScrapers[scraperName];

console.log(allScrapers);

if (allScrapers.hasOwnProperty(scraperName)) {
  allScrapers[scraperName]((err, showtimes) => {
    if (err) {
      throw err;
    } else {
      console.log(JSON.stringify(showtimes));
    }
  });
} else {
  throw `Could not find scraper with name "${scraperName}"`
}
