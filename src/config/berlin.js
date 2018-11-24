const arsenal = require('../lib/scraper/arsenal');
const kinoheld = require('../lib/scraper/kinoheld');
const yorck = require('../lib/scraper/yorck');

const timezone = 'Europe/Berlin';

module.exports = {
  timezone,
  kinos: [
    // 'arsenal':           arsenal,
    yorck('Babylon Kreuzberg', timezone, '54ec8ea868313813e3190000'),
    kinoheld('Babylon Mitte', timezone, 670)
    // 'b-ware': kinoheld('B-ware! Ladenkino', 'b-ware'),
    // 'brotfabrik': kinoheld('')
    // 'delphi lux',
    // 'eiszeit',
    // 'il kino',
    // 'intimes',
    // 'filmtheatre am friedrichshain',
    // 'fsk-kino',
    // 'hackesche höfe',
    // 'kino central',
    // 'neues off',
    // 'odeon',
    // 'passage',
    // 'rollberg',
    // 'sputnik',
    // 'tilsiter lichtspiele',
    // 'wolf'
  ]
};
