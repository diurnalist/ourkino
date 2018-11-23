const moment = require('moment-timezone');

module.exports = {
  parse(str) {
    return moment(str);
  },

  now() {
    return moment();
  },

  today(timezone) {
    return moment().tz(timezone).startOf('day');
  },

  todayUTC() {
    return moment().utc().startOf('day');
  },

  toUTC(date) {
    const localDate = moment(date);
    const utcDate = moment(date).utc();
    utcDate.year(localDate.year());
    utcDate.month(localDate.month());
    utcDate.date(localDate.date());
    utcDate.hour(localDate.hour());
    utcDate.minute(localDate.minute());
    utcDate.second(localDate.second());
    utcDate.millisecond(localDate.millisecond());
    return utcDate;
  }
};