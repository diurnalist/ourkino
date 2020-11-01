import moment from 'moment-timezone';

export function parse(str, timezone) {
  if (timezone) {
    return moment.tz(str, timezone);
  } else {
    return moment(str);
  }
};

export function today(timezone) {
  return moment().tz(timezone).startOf('day');
};

export function todayUTC() {
  return moment().utc().startOf('day');
};

export function toUTC(date) {
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
};
