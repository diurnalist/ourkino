const ical = require('../lib/scraper/ical');
const imdb = require('../lib/scraper/imdb');
const { gcalURL } = require('../lib/utils');
const moment = require('moment-timezone');
const { toUTC } = require('../lib/datetime');

module.exports = {
  'doc films': ical('Doc Films', gcalURL('docfilms.org_kdpc8vchre778r95fhl7eenm4o@group.calendar.google.com'), {
    onEvent({ start, summary }) {
      // Adjust date to central time
      const chicagoDate = moment(start).tz('America/Chicago');
      return {
        showtime: toUTC(chicagoDate)
      };
    }
  }),
  'gene siskel':       imdb('Gene Siskel', 'ci0006584'),
  'icon at roosevelt': imdb('ICON at Roosevelt', 'ci0015247'),
  'logan':             imdb('Logan Theater', 'ci0005986'),
  'music box':         imdb('Music Box', 'ci91815395')
};
