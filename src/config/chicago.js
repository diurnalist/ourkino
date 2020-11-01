import ical from '../lib/scraper/ical.js';
import imdb from '../lib/scraper/imdb.js';
import { gcalURL } from '../lib/utils.js';
import moment from 'moment-timezone';

const timezone = 'America/Chicago';

export default {
  timezone,
  kinos: [
    ical('Doc Films', gcalURL('docfilms.org_kdpc8vchre778r95fhl7eenm4o@group.calendar.google.com'), {
      onEvent({ start, summary }) {
        return {
          deepLink: 'http://docfilms.uchicago.edu/dev',
          showtime: moment(start).tz(timezone)
        };
      }
    }),
    imdb('Gene Siskel', timezone, 'ci0006584'),
    imdb('ICON at Roosevelt', timezone, 'ci0015247'),
    imdb('Logan Theater', timezone, 'ci0005986'),
    imdb('Music Box', timezone, 'ci91815395')
  ]
};
