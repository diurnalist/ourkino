import ical from '../lib/scraper/ical.js';
import imdb from '../lib/scraper/imdb.js';
import { gcalURL } from '../lib/utils.js';
import { parse } from '../lib/datetime.js';

const timezone = 'America/Chicago';

export default {
  timezone,
  kinos: [
    ical('Doc Films', gcalURL('c_spthp0oiu5ipot66r079im3ai0@group.calendar.google.com'), {
      onEvent({ start, summary }) {
        return {
          deepLink: 'http://docfilms.uchicago.edu/',
          showtime: parse(start, timezone)
        };
      }
    }),
    imdb('Gene Siskel', timezone, 'ci0006584'),
    imdb('ICON at Roosevelt', timezone, 'ci0015247'),
    imdb('Logan Theater', timezone, 'ci0005986'),
    imdb('Music Box', timezone, 'ci91815395')
  ]
};
