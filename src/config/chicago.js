const ical = require('../lib/scraper/ical');
const imdb = require('../lib/scraper/imdb');
const { gcalURL } = require('../lib/utils');
const moment = require('moment-timezone');

const timezone = 'America/Chicago';

module.exports = {
  'doc films': ical('Doc Films', gcalURL('docfilms.org_kdpc8vchre778r95fhl7eenm4o@group.calendar.google.com'), {
    onEvent({ start, summary }) {
      return {
        deepLink: 'http://docfilms.uchicago.edu/dev',
        showtime: moment(start).tz(timezone)
      };
    }
  }),
  'gene siskel':       imdb('Gene Siskel', timezone, 'ci0006584'),
  'icon at roosevelt': imdb('ICON at Roosevelt', timezone, 'ci0015247'),
  'logan':             imdb('Logan Theater', timezone, 'ci0005986'),
  'music box':         imdb('Music Box', timezone, 'ci91815395')
};
