export function gcalURL(id) {
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
};

export function pad(number) {
  return (number < 10 ? '0' : '') + number;
};

export function toDisplayTime(showtime) {
  const hours = pad(showtime.hour());
  const minutes = pad(showtime.minute());
  return `${hours}:${minutes}`;
}