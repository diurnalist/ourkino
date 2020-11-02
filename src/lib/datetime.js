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

export function daysFromNow(days, timezone) {
  const todayDatetime = today(timezone);
  // Cut-off is 3am to account for midnight movies
  const start = todayDatetime.clone().add(days, 'day').set('hour', 3);
  const end = start.clone().add(1, 'day');

  return ({ showtime }) => {
    return showtime.isAfter(start) && showtime.isBefore(end);
  };
}