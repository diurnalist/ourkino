// import arsenal from '../lib/scraper/arsenal';
import kinoheld from '../lib/scraper/kinoheld.js';
import yorck from '../lib/scraper/yorck.js';

const timezone = 'Europe/Berlin';

export default {
  timezone,
  kinos: [
    // 'arsenal':           arsenal,
    yorck('Babylon Kreuzberg', timezone, '54ec8ea868313813e3190000'),
    kinoheld('Babylon Mitte', timezone, 670),
    kinoheld('b-ware! Ladenkino', timezone, 108),
    // 'brotfabrik': kinoheld('')
    yorck('Cinema Paris', timezone, '54ed9d086831381d720f0000'),
    yorck('Delphi Lux', timezone, '59b4910661444044cd0f1b6b'),
    yorck('Delphi Filmpalast', timezone, '54ed8d1968313849e8010000'),
    kinoheld('Il Kino', timezone, 1563),
    kinoheld('Intimes', timezone, 714),
    yorck('Filmtheatre am Friedrichshain', timezone, '54ed9e276831381d72150000'),
    kinoheld('FSK Kino', timezone, 590),
    kinoheld('Hackesche Hoefe', timezone, 614),
    yorck('Kant Kino', timezone, '54eda1df6831381d72230000'),
    kinoheld('Kino Central', timezone, 163),
    yorck('Kino International', timezone, '54ed9ff26831381d721c0000'),
    yorck('Neues Off', timezone, '54eda3cb6831381d722b0000'),
    yorck('Odeon', timezone, '54eda5536831381d72330000'),
    yorck('Passage', timezone, '54eda6996831381d723a0000'),
    yorck('Rollberg', timezone, '54eef979683138488b0c0000'),
    kinoheld('Sputnik Kino', timezone, 1166),
    kinoheld('Tilsiter Lichtspiele', timezone, 1203),
    yorck('Yorck', timezone, '54eeff36683138488b240000'),
    kinoheld('Wolf Kino', timezone, 1856)
  ]
};
