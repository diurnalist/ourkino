export function gcalURL(id) {
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
};

export function pad(number) {
  return (number < 10 ? '0' : '') + number;
};
