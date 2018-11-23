#!/usr/bin/env node
const { locations } = require('../src/config');
const allScrapers = Object.assign.apply({}, Object.values(locations));
const scraperName = process.argv[2].toLowerCase();
const scraper = allScrapers[scraperName];

if (allScrapers.hasOwnProperty(scraperName)) {
  allScrapers[scraperName]((err, showtimes) => {
    console.log(JSON.stringify(showtimes))
  });
} else {
  throw `Could not find scraper with name "${scraperName}"`
}
